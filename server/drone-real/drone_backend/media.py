from . import responses as out
import hashlib
import os
import asyncio
import fcntl
import re
from contextlib import contextmanager
from uuid import UUID, uuid4
from fastapi import APIRouter,Request
from fastapi.responses import FileResponse
from . import contracts as dto
from .core import *

router=APIRouter()

def media_role(request):
    if request.url.path.startswith('/device/v1/simulations/'):
        return 'simulator'
    return 'vision' if request.url.path.startswith('/internal/v1/vision/') else 'device'

def media_workload(request):
    if media_role(request)=='simulator':
        from app.simulation_api import simulator
        with transaction() as c:return simulator(request,c)
    return workload(request,media_role(request))

def media_actor(request,c,mid,producer=None):
    if isinstance(producer,dict):
        if media_role(request)=='simulator' and producer.get('simulation_run_id')!=request.path_params['rid']:fail('FORBIDDEN',403)
        if media_role(request)=='simulator' and producer.get('simulation_session_id')!=request.headers.get('x-simulator-session'):fail('OLD_WORKER_SESSION')
        replay=True
        producer=producer.get('producer_id')
    else:replay=False
    if request.url.path.startswith('/device/v1/simulations/'):
        from app.simulation_api import frame_access
        p,d=frame_access(request,c,mid,allow_replay=replay)
        if producer is not None and producer!=p['id']:fail('FORBIDDEN',403)
        return p,d
    if media_role(request)=='device':return device(request,c)
    p=workload(request,'vision');m=mission(c,mid)
    if (settings().get('environment')!='REAL' or m['drone_id'] not in p.get('drone_ids',[])
        or (producer is not None and producer!=p['id'])):fail('FORBIDDEN',403)
    return p,{'drone_id':m['drone_id']}

@contextmanager
def media_lock():
    # ponytail: one active media mutation per storage volume; shard by bundle if throughput requires it.
    STORAGE.mkdir(parents=True,exist_ok=True)
    with storage_file('.media.lock').open('a') as lock:
        try: fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except BlockingIOError: fail('MEDIA_BUSY')
        try:
            # Previous process may have died while streaming. Only our known temporary names are removed.
            for part in (STORAGE/'missions').glob('*/*.part'):
                if re.fullmatch(r'[0-9a-f-]{36}(\.[0-9a-f-]{36})?\.part',part.name):
                    storage_file(str(part.relative_to(STORAGE))).unlink(missing_ok=True)
            collect_expired_locked()
            yield
        finally: fcntl.flock(lock,fcntl.LOCK_UN)

def cancel_writing(c,row,drone_id,reason):
    if row['state']=='STORED': fail('BUNDLE_ALREADY_STORED')
    if row['state']=='FAILED': return row
    value=mutate(c,'asset_cancel',{'asset_id':str(row['asset_id'])})
    event(c,'BUNDLE_CANCELLED',row['mission_id'],drone_id,payload={'bundle_id':str(row['asset_id']),'reason':reason})
    return value

def collect_expired_locked():
    # Commit cancellation before deleting bytes; pending cleanup remains charged to quota.
    with transaction(events=True) as c:
        rows=c.execute("SELECT a.*,m.drone_id FROM drone.media_asset a JOIN drone.mission m USING(mission_id) WHERE a.asset_type='SEGMENT_BUNDLE' AND a.state='WRITING' AND a.created_at<now()-(%s * interval '1 second')",(settings().get('reservation_seconds',3600),)).fetchall()
        for row in rows:cancel_writing(c,row,row['drone_id'],'RESERVATION_EXPIRED')
    cleanup_failed()

def cleanup_failed():
    with transaction(events=True) as c:
        rows=c.execute("SELECT * FROM drone.media_asset WHERE state='FAILED' AND meta->>'cleanup_pending'='true' ORDER BY asset_id").fetchall()
        for row in rows:
            path=storage_file(row['storage_uri'])
            try:
                path.unlink(missing_ok=True)
                if path.parent.exists():sync_directory(path.parent)
            except OSError:fail('STORAGE_CLEANUP_FAILED',503)
            mutate(c,'asset_reclaim',{'asset_id':str(row['asset_id'])})

def collect_expired():
    with media_lock():pass

def writable(row):
    if row['state']=='FAILED': fail('RESERVATION_CANCELLED')
    if row['state']=='WRITING' and (now()-row['created_at']).total_seconds()>settings().get('reservation_seconds',3600): fail('RESERVATION_EXPIRED')

def asset(c,aid):
    row=one(c,'SELECT * FROM drone.media_asset WHERE asset_id=%s',(aid,))
    if not row: fail('RESOURCE_NOT_FOUND',404)
    return row

@router.post('/device/v1/media-bundles',status_code=201,response_model=out.MediaAsset)
def reserve(body:dto.Bundle,request:Request):
    environment=settings().get('environment','SIM')
    if len({f.asset_id for f in body.files})!=len(body.files) or body.bundle_id in {f.asset_id for f in body.files}: fail('INVALID_CONTRACT',422)
    if media_role(request)=='device' and not request.url.path.startswith('/device/v1/simulations/') and not {'VIDEO','SIDECAR'}<={f.role for f in body.files}: fail('REQUIRED_MEDIA_MISSING',422)
    media_workload(request)
    with media_lock(),transaction(events=True) as c:
        old=one(c,'SELECT * FROM drone.media_asset WHERE asset_id=%s',(body.bundle_id,))
        p,d=media_actor(request,c,body.mission_id,old['meta'] if old else None);m=mission(c,body.mission_id)
        if m['drone_id']!=d['drone_id']: fail('FORBIDDEN',403)
        manifest=body.model_dump(mode='json');h=digest(manifest)
        scope_meta={'simulation_run_id':request.path_params['rid'],'simulation_session_id':request.headers.get('x-simulator-session')} if media_role(request)=='simulator' else {}
        if old:
            if old['meta'].get('manifest_hash')!=h or old['meta'].get('producer_id',p['id'])!=p['id']: fail('ID_CONFLICT')
            return output(old)
        reserved=one(c,"SELECT coalesce(sum(coalesce((meta->>'byte_size')::bigint,octet_length((meta->'manifest')::text),0)),0) AS n FROM drone.media_asset WHERE state IN ('WRITING','STORED') OR (state='FAILED' AND meta->>'cleanup_pending'='true')")['n']
        manifest_bytes=len(canonical(manifest).encode())
        if reserved+manifest_bytes+sum(f.byte_size for f in body.files)>settings()['max_storage_bytes']: fail('STORAGE_QUOTA_EXCEEDED',503)
        for f in body.files:
            if one(c,'SELECT asset_id FROM drone.media_asset WHERE asset_id=%s',(f.asset_id,)): fail('ID_CONFLICT')
            add(c,'media_asset',{'asset_id':str(f.asset_id),'mission_id':str(body.mission_id),'asset_type':f.role,
              'storage_uri':f'missions/{body.mission_id}/{f.asset_id}.bin','content_hash':f.sha256,'state':'WRITING',
              'quality_status':'UNVERIFIED_'+environment,'historical':False,'retention_class':'PROTECTED',
              'meta':f.model_dump(mode='json')|scope_meta|{'bundle_id':str(body.bundle_id),'environment':environment,'producer_id':p['id']}})
        row=add(c,'media_asset',{'asset_id':str(body.bundle_id),'mission_id':str(body.mission_id),'asset_type':'SEGMENT_BUNDLE',
              'storage_uri':f'missions/{body.mission_id}/{body.bundle_id}.json','content_hash':h,'state':'WRITING',
              'quality_status':'UNVERIFIED_'+environment,'historical':False,'retention_class':'PROTECTED',
              'meta':scope_meta|{'manifest':manifest,'manifest_hash':h,'byte_size':manifest_bytes,'persistence_status':'WRITING','environment':environment,'producer_id':p['id']}})
        event(c,'BUNDLE_RESERVED',body.mission_id,d['drone_id'],payload={'bundle_id':str(body.bundle_id),'manifest_hash':h})
        return output(row)

def verify_file(row):
    path=storage_file(row['storage_uri'])
    if not path.is_file(): fail('STORAGE_INTEGRITY_FAILED',503)
    h=hashlib.sha256();size=0
    with path.open('rb') as f:
        for block in iter(lambda:f.read(1048576),b''):
            size+=len(block);h.update(block)
    expected=row['meta'].get('byte_size')
    if h.hexdigest()!=row['content_hash'] or (expected is not None and size!=expected): fail('STORAGE_INTEGRITY_FAILED',503)
    return path

def durable_install(temp,path):
    try: os.link(temp,path) # Exclusive final path: never replace committed file content.
    except FileExistsError: pass
    finally: temp.unlink(missing_ok=True)
    sync_directory(path.parent)

def sync_directory(path):
    directory=os.open(path,os.O_RDONLY|os.O_DIRECTORY)
    try: os.fsync(directory)
    finally: os.close(directory)

@router.put('/device/v1/media-assets/{aid}/content',response_model=out.Stored)
async def upload(aid:UUID,request:Request):
    media_workload(request)
    with media_lock():
        try: return await asyncio.wait_for(upload_locked(aid,request),120)
        except TimeoutError: fail('UPLOAD_TIMEOUT',408)

async def upload_locked(aid,request):
    with transaction() as c:
        row=asset(c,aid);p,d=media_actor(request,c,row['mission_id'],row['meta']);m=mission(c,row['mission_id'])
        if m['drone_id']!=d['drone_id'] or row['asset_type']=='SEGMENT_BUNDLE': fail('FORBIDDEN',403)
        writable(row)
        writable(asset(c,row['meta']['bundle_id']))
    path=storage_file(row['storage_uri']);path.parent.mkdir(parents=True,exist_ok=True)
    sync_directory(path.parent.parent)
    sync_directory(path.parent.parent.parent)
    if path.exists():
        verify_file(row)
        count=0;h=hashlib.sha256()
        async for block in request.stream():
            count+=len(block)
            if count>row['meta']['byte_size']: fail('BODY_TOO_LARGE',413)
            h.update(block)
        if count!=row['meta']['byte_size'] or h.hexdigest()!=row['content_hash']: fail('CONTENT_HASH_MISMATCH',422)
        if row['state']=='STORED': return {'stored':True,'duplicate':True,'asset_id':str(aid)}
    else:
        temp=path.parent/(str(aid)+'.part')
        count=0;h=hashlib.sha256()
        try:
            with temp.open('xb') as f:
                async for block in request.stream():
                    count+=len(block)
                    if count>row['meta']['byte_size'] or count>settings()['max_upload_bytes']: fail('BODY_TOO_LARGE',413)
                    h.update(block);f.write(block)
                f.flush();os.fsync(f.fileno())
            if count!=row['meta']['byte_size'] or h.hexdigest()!=row['content_hash']: fail('CONTENT_HASH_MISMATCH',422)
            durable_install(temp,path)
            verify_file(row)
        finally: temp.unlink(missing_ok=True)
    with transaction(events=True) as c:
        p,d=media_actor(request,c,row['mission_id'],row['meta'])
        fresh=asset(c,aid)
        if fresh['state']=='STORED': return {'stored':True,'duplicate':True,'asset_id':str(aid)}
        writable(fresh);writable(asset(c,row['meta']['bundle_id']))
        value=mutate(c,'asset_store',{'asset_id':str(aid),'meta':row['meta']})
        event(c,'ASSET_STORED',row['mission_id'],d['drone_id'],payload={'asset_id':str(aid),'sha256':row['content_hash']})
    return {'stored':True,'duplicate':False,'asset_id':str(aid)}

@router.get('/device/v1/media-bundles/{bid}',response_model=out.MediaAsset)
def bundle_status(bid:UUID,request:Request):
    with transaction() as c:
        row=asset(c,bid);p,d=media_actor(request,c,row['mission_id'],row['meta'])
        if mission(c,row['mission_id'])['drone_id']!=d['drone_id'] or row['asset_type']!='SEGMENT_BUNDLE': fail('RESOURCE_NOT_FOUND',404)
        if row['state']=='STORED':
            verify_file(row)
            for f in row['meta']['manifest']['files']: verify_file(asset(c,f['asset_id']))
        return output(row)

@router.post('/device/v1/media-bundles/{bid}/finalize',response_model=out.Persisted)
def finalize(bid:UUID,request:Request):
    media_workload(request)
    with media_lock(): return finalize_locked(bid,request)

def finalize_locked(bid,request):
    with transaction() as c:
        row=asset(c,bid);p,d=media_actor(request,c,row['mission_id'],row['meta'])
        if mission(c,row['mission_id'])['drone_id']!=d['drone_id'] or row['asset_type']!='SEGMENT_BUNDLE': fail('RESOURCE_NOT_FOUND',404)
        writable(row)
        for f in row['meta']['manifest']['files']:
            child=asset(c,f['asset_id'])
            if child['state']!='STORED' or child['meta'].get('bundle_id')!=str(bid): fail('BUNDLE_NOT_READY')
            verify_file(child)
    path=storage_file(row['storage_uri']);raw=canonical(row['meta']['manifest']).encode()
    temp=path.parent/(str(bid)+'.part')
    path.parent.mkdir(parents=True,exist_ok=True)
    if not path.exists():
        with temp.open('xb') as f: f.write(raw);f.flush();os.fsync(f.fileno())
        durable_install(temp,path)
    verify_file(row)
    with transaction(events=True) as c:
        p,d=media_actor(request,c,row['mission_id'],row['meta'])
        fresh=asset(c,bid)
        if fresh['state']!='STORED':
            writable(fresh)
            mutate(c,'asset_store',{'asset_id':str(bid),'meta':row['meta']|{'persistence_status':'PERSISTED'}})
            event(c,'BUNDLE_PERSISTED',row['mission_id'],d['drone_id'],payload={'bundle_id':str(bid),'manifest_hash':row['content_hash']})
    return {'bundle_id':str(bid),'persistence_status':'PERSISTED','manifest_hash':row['content_hash'],'files':row['meta']['manifest']['files']}

@router.post('/device/v1/media-bundles/{bid}/cancel',response_model=out.MediaAsset)
@router.post('/api/v1/media-bundles/{bid}/cancel',response_model=out.MediaAsset)
def cancel(bid:UUID,request:Request):
    operator=request.url.path.startswith('/api/')
    workload(request,'operator' if operator else media_role(request))
    with media_lock():
        with transaction(events=True) as c:
            row=asset(c,bid)
            if row['asset_type']!='SEGMENT_BUNDLE': fail('RESOURCE_NOT_FOUND',404)
            if operator: _,m=owned_mission(request,c,row['mission_id'],'edit');did=m['drone_id']
            else:
                _,d=media_actor(request,c,row['mission_id'],row['meta']);did=d['drone_id']
                if mission(c,row['mission_id'])['drone_id']!=did: fail('RESOURCE_NOT_FOUND',404)
            cancel_writing(c,row,did,'REQUESTED')
        cleanup_failed()
        with transaction() as c:return output(asset(c,bid))

@router.get('/api/v1/media-assets/{aid}/content')
def content(aid:UUID,request:Request):
    with transaction() as c:
        row=asset(c,aid);owned_mission(request,c,row['mission_id'])
        if row['state']!='STORED': fail('ASSET_NOT_READY')
        path=verify_file(row)
    return FileResponse(path,media_type='application/octet-stream',filename=str(aid)+'.bin',headers={'X-Content-SHA256':row['content_hash']})
