"""Authenticated operator requests and local Unreal worker ingestion; no REAL writes."""
from datetime import timedelta
from typing import Literal
from uuid import UUID, uuid5, NAMESPACE_URL
from fastapi import APIRouter, Request, Query, HTTPException
from pydantic import Field, field_validator, model_validator
from drone_backend.contracts import DTO, Counter, Time, Frame, Analysis, Bundle, Hash
from drone_backend.core import transaction, one, user, authorize, device, workload, IDENTITY, fail, digest, output, now, canonical, Jsonb, owned_mission
import json
import asyncio
import base64
import binascii
import hashlib
from threading import BoundedSemaphore
from pydantic import ValidationError
from starlette.concurrency import run_in_threadpool

from app.personal_scope import bound_worker, check_worker, personal, require_owner, visible_workers
from app.guarded_sim_profile import bind_profile,profile,admit

router=APIRouter()

class VisionPipeline(DTO):
    mission_id: UUID
    model_config_id: UUID
    camera_name: str=Field(default='0',min_length=1,max_length=255)
    interval_s: float=Field(default=0.2,ge=0.1,le=60)
    image_format: Literal['JPEG','PNG']='JPEG'
    coordinate_config_id: UUID|None=None
    analysis_policy: Literal['LIVE','POSTFLIGHT']='POSTFLIGHT'
    realtime_vision_enabled: bool=False

    @model_validator(mode='after')
    def analysis_policy_matches(self):
        if self.realtime_vision_enabled != (self.analysis_policy=='LIVE'):
            raise ValueError('Real-time vision must match the explicit analysis policy')
        return self

class RunFrame(DTO):
    producer_session_id: UUID
    frame: Frame
    analysis_run_id: UUID

class FrameContent(RunFrame):
    bundle_id: UUID
    byte_size: int=Field(gt=0,le=8388608)
    sha256: Hash

class FrameBatch(DTO):
    frames: list[FrameContent]=Field(min_length=1,max_length=5)

frame_upload_slots=BoundedSemaphore(2)

class Waypoint(DTO):
    north_m: float=Field(ge=-350,le=350)
    east_m: float=Field(ge=-350,le=350)
    altitude_m: float=Field(ge=3,le=60)

class RunRequest(DTO):
    regional_execution_id: UUID | None=None
    execution_profile: Literal['SCHOOL_FC_GUARDED_V1'] | None=None
    run_id: UUID
    environment: Literal['SIM']='SIM'
    scenario: Literal['CAPTURE','ROUTE']='CAPTURE'
    world: Literal['TestField','Kumoh']='TestField'
    simulator_version: str=Field(min_length=1,max_length=255)
    coordinate_frame: Literal['NED_M']='NED_M'
    seed: Counter='0'
    duration_s: int=Field(default=5,ge=1,le=60)
    speed_m_s: float=Field(default=1.5,ge=0.5,le=3)
    waypoints: list[Waypoint]=Field(default_factory=list,max_length=64)
    pipeline_config: dict=Field(default_factory=dict)
    ttl_s: int=Field(default=1800,ge=60,le=86400)
    worker_id: str | None=Field(default=None,min_length=1,max_length=255)

    @model_validator(mode='after')
    def valid_request(self):
        if (self.scenario=='ROUTE') != bool(self.waypoints): raise ValueError('ROUTE requires waypoints; CAPTURE has none')
        canonical(self.pipeline_config)
        if self.pipeline_config:VisionPipeline.model_validate(self.pipeline_config)
        return self

class Claim(DTO):
    execution_profile: Literal['SCHOOL_FC_GUARDED_V1'] | None=None
    producer_session_id: UUID

class Stop(DTO):
    command_id: UUID

class Sample(DTO):
    sample_id: UUID
    producer_session_id: UUID
    sequence: Counter
    sim_time_ns: Counter | None=None
    captured_at: Time | None=None
    kind: Literal['TELEMETRY','DETECTION','PLAN','PIPELINE_EVENT','METRIC','COMMAND_REPORT','RUN_STATUS']
    schema_version: Literal['1']='1'
    data: dict

    @field_validator('data')
    @classmethod
    def finite(cls,value):
        canonical(value)
        return value

    @model_validator(mode='after')
    def contract(self):
        if self.kind=='RUN_STATUS' and self.data.get('state') not in ('COMPLETED','FAILED','CANCELLED'): raise ValueError('Invalid run status')
        if self.kind=='COMMAND_REPORT':
            UUID(self.data.get('command_id',''))
            if self.data.get('state') not in ('ACKNOWLEDGED','COMPLETED','FAILED','CANCELLED'): raise ValueError('Invalid command report')
        if self.kind=='PLAN':
            if not all(isinstance(self.data.get(k),str) and self.data[k] for k in ('algorithm','version','input_hash')): raise ValueError('Plan provenance required')
            if len(self.data['input_hash'])!=64 or any(c not in '0123456789abcdef' for c in self.data['input_hash']): raise ValueError('Plan input hash required')
            points=self.data.get('waypoints')
            if not isinstance(points,list) or not 1<=len(points)<=64: raise ValueError('Plan waypoints required')
            for p in points: Waypoint.model_validate(p)
        if self.kind=='TELEMETRY':
            if self.data.get('coordinate_frame')!='NED_M': raise ValueError('Telemetry must declare NED metres')
            p=self.data.get('position')
            if not isinstance(p,dict) or not all(isinstance(p.get(k),(int,float)) and not isinstance(p[k],bool) for k in ('north_m','east_m','down_m')): raise ValueError('NED position required')
        return self

def write(c,action,value):
    return output(one(c,'SELECT simulation.write(%s,%s) AS value',(action,Jsonb(value)))['value'])

def operator_run(c,request,rid,scope='read'):
    actor=user(request,c,scope);authorize(actor,'sim-pi-01',scope)
    row=one(c,'SELECT * FROM simulation.run WHERE run_id=%s',(rid,))
    if not row: fail('RESOURCE_NOT_FOUND',404)
    require_owner(c,actor,row['creator_user_id'])
    return row

def simulator(request,c):
    try:return workload(request,'simulator')
    except HTTPException as exc:
        if exc.status_code!=403:raise
        return device(request,c,'sim-pi-01')[0]

def registered_workers(c):
    legacy=one(c,"SELECT gateway_id FROM drone.drone WHERE drone_id='sim-pi-01'")
    result=[{'worker_id':legacy['gateway_id'],'label':'기존 로컬 연결기'}] if legacy and legacy['gateway_id'] else []
    registry=json.loads((IDENTITY/'principals.json').read_text())
    result.extend({'worker_id':p['id'],'label':p.get('label',p['id'])} for p in registry if 'business.simulator' in p['scopes'])
    return result

def worker_run(c,request,rid):
    p=simulator(request,c)
    row=one(c,'SELECT * FROM simulation.run WHERE run_id=%s AND worker_id=%s',(rid,p['id']))
    if not row: fail('RESOURCE_NOT_FOUND',404)
    return p,row

@router.post('/api/v1/simulations/runs',status_code=201)
def create(body:RunRequest,request:Request):
    request.scope.setdefault('state',{}).update(trace_run_id=str(body.run_id),trace_operation_id=str(body.run_id))
    with transaction() as c:
        actor=user(request,c,'edit');authorize(actor,'sim-pi-01','edit')
        if body.pipeline_config:
            pipeline=VisionPipeline.model_validate(body.pipeline_config)
            _,m=owned_mission(request,c,pipeline.mission_id,'edit')
            if m['drone_id']!='sim-pi-01':fail('FORBIDDEN',403)
            model=one(c,"SELECT * FROM drone.config_version WHERE config_id=%s AND kind='MODEL' AND status='APPROVED'",(pipeline.model_config_id,))
            if not model or model['payload'].get('environment')!='SIM' or not model['payload'].get('artifact_ready'):fail('MODEL_NOT_READY',503)
        workers=registered_workers(c)
        if not workers:fail('SIM_WORKER_NOT_CONFIGURED',503)
        assigned_worker=bound_worker(actor) if personal(actor) else None
        selected=body.worker_id or assigned_worker or workers[0]['worker_id']
        check_worker(actor,selected)
        existing=one(c,'SELECT creator_user_id FROM simulation.run WHERE run_id=%s',(body.run_id,))
        if existing and existing['creator_user_id']!=actor['user_id']:fail('RESOURCE_NOT_FOUND',404)
        if selected.startswith('school-pc-'):
            from pathlib import Path
            assigned=Path('/data/pc-workspaces')/str(actor['user_id'])/'binding.json'
            if not assigned.is_file() or json.loads(assigned.read_text()).get('worker_id')!=selected:fail('PC_WORKER_NOT_OWNED',403)
        if selected not in {w['worker_id'] for w in workers}:fail('SIM_WORKER_NOT_CONFIGURED',422)
        value=body.model_dump(mode='json')
        if body.pipeline_config:value['pipeline_config']=pipeline.model_dump(mode='json')
        if body.regional_execution_id is None:value.pop('regional_execution_id')
        elif body.simulator_version!='LOCAL_REGIONAL_POSTFLIGHT_V1':fail('REGIONAL_EXECUTION_MISMATCH',422)
        if body.worker_id is None:value.pop('worker_id')  # Preserve hashes of existing legacy requests.
        value=bind_profile(selected,value)
        admit(c,selected,body.run_id,value)
        return write(c,'create',{'run_id':str(body.run_id),'creator_user_id':str(actor['user_id']),
          'worker_id':selected,'request_hash':digest(value),'request':value,
          'command_id':str(uuid5(NAMESPACE_URL,'unreal-start/'+str(body.run_id))),
          'expires_at':(now()+timedelta(seconds=body.ttl_s)).isoformat()})

@router.get('/api/v1/simulations/workers')
def workers(request:Request):
    with transaction() as c:
        actor=user(request,c);authorize(actor,'sim-pi-01')
        return [w|{'capabilities':profile(w['worker_id'])} for w in visible_workers(actor,registered_workers(c))]

@router.get('/api/v1/simulations/runs')
def runs(request:Request,limit:int=Query(default=50,ge=1,le=100)):
    with transaction() as c:
        actor=user(request,c);authorize(actor,'sim-pi-01')
        return output(c.execute('SELECT * FROM simulation.run WHERE drone.school_owner_visible(%s,creator_user_id) ORDER BY requested_at DESC,run_id LIMIT %s',(actor['user_id'],limit)).fetchall())

@router.get('/api/v1/simulations/runs/{rid}')
def get_run(rid:UUID,request:Request):
    with transaction() as c:
        row=operator_run(c,request,rid)
        counts=c.execute('SELECT kind,count(*) AS count FROM simulation.sample WHERE run_id=%s GROUP BY kind',(rid,)).fetchall()
        return output(row)|{'sample_counts':{r['kind']:r['count'] for r in counts}}

@router.post('/api/v1/simulations/runs/{rid}/stop',status_code=202)
def stop(rid:UUID,body:Stop,request:Request):
    request.scope.setdefault('state',{})['trace_operation_id']=str(body.command_id)
    with transaction() as c:
        operator_run(c,request,rid,'control')
        return write(c,'stop',{'run_id':str(rid),'command_id':str(body.command_id)})

@router.get('/api/v1/simulations/runs/{rid}/samples')
def samples(rid:UUID,request:Request,after:Counter='0',limit:int=Query(default=100,ge=1,le=200),kind:str | None=None):
    with transaction() as c:
        operator_run(c,request,rid)
        rows=c.execute('SELECT * FROM simulation.sample WHERE run_id=%s AND cursor>%s AND (%s::text IS NULL OR kind=%s) ORDER BY cursor LIMIT %s',(rid,int(after),kind,kind,limit)).fetchall()
        result=output(rows)
        for r in result:
            r['cursor']=str(r['cursor'])
            if r['sim_time_ns'] is not None:r['sim_time_ns']=str(r['sim_time_ns'])
        return {'samples':result,'next_cursor':str(rows[-1]['cursor']) if rows else after}

@router.get('/device/v1/simulations/runs')
def pending(request:Request):
    with transaction() as c:
        p=simulator(request,c)
        return output(c.execute("SELECT * FROM simulation.run WHERE worker_id=%s AND state='QUEUED' AND expires_at>clock_timestamp() ORDER BY requested_at LIMIT 20",(p['id'],)).fetchall())

@router.post('/device/v1/simulations/runs/{rid}/claim')
def claim(rid:UUID,body:Claim,request:Request):
    request.scope.setdefault('state',{})['trace_operation_id']=str(body.producer_session_id)
    with transaction() as c:
        p,row=worker_run(c,request,rid)
        if row['request'].get('execution_profile')=='SCHOOL_FC_GUARDED_V1' and body.execution_profile!='SCHOOL_FC_GUARDED_V1':fail('GUARDED_WORKER_REQUIRED',403)
        return write(c,'claim',{'run_id':str(rid),'worker_id':p['id'],'producer_session_id':str(body.producer_session_id)})

@router.get('/device/v1/simulations/runs/{rid}')
def worker_state(rid:UUID,request:Request):
    with transaction() as c:
        _,row=worker_run(c,request,rid)
        return output(row)

@router.get('/device/v1/simulations/runs/{rid}/commands')
def commands(rid:UUID,request:Request,producer_session_id:UUID | None=None):
    with transaction() as c:
        p,row=worker_run(c,request,rid)
        if 'business.simulator' in p['scopes'] and producer_session_id is None:fail('WORKER_SESSION_REQUIRED',422)
        if producer_session_id is not None and row['worker_session_id']!=producer_session_id:fail('OLD_WORKER_SESSION')
        return output(c.execute("SELECT * FROM simulation.command WHERE run_id=%s AND state IN ('QUEUED','ACKNOWLEDGED') AND expires_at>clock_timestamp() ORDER BY sequence",(rid,)).fetchall())

@router.get('/device/v1/simulations/runs/{rid}/vision-status')
def vision_status(rid:UUID,request:Request,producer_session_id:UUID):
    """Read completed inference for this worker/run/session; storage ACK is insufficient."""
    with transaction() as c:
        _,row=worker_run(c,request,rid)
        if row['worker_session_id']!=producer_session_id:fail('OLD_WORKER_SESSION')
        cfg=row['request'].get('pipeline_config',{})
        if not cfg:return []
        rows=c.execute("""SELECT f.frame_id,f.capture_at,
            e.payload->>'analysis_run_id' AS analysis_run_id,
            e.payload->>'detection_count' AS detection_count
            FROM drone.video_frame f JOIN drone.mission_event e
            ON e.event_type='ANALYSIS_COMPLETED'
            AND e.payload->>'analysis_run_id'=f.analysis_times->>'selected_run_id'
            AND e.payload->>'frame_id'=f.frame_id::text
            WHERE f.mission_id=%s AND f.stream_id=%s AND f.identity_scope=%s
            AND e.payload->>'model_config_id'=%s
            ORDER BY f.capture_at DESC LIMIT 5""",
            (cfg['mission_id'],'unreal/'+str(rid),str(producer_session_id),cfg['model_config_id'])).fetchall()
        return [dict(run_id=str(rid),producer_session_id=str(producer_session_id),
            frame_id=str(r['frame_id']),analysis_run_id=r['analysis_run_id'],analysis_state='COMPLETED',
            capture_at=r['capture_at'].isoformat() if r['capture_at'] else None,
            detection_count=int(r['detection_count'] or 0),coordinate_status='UNVERIFIED',posture_status='UNVERIFIED') for r in rows]

@router.post('/device/v1/simulations/runs/{rid}/samples')
def store(rid:UUID,body:Sample,request:Request):
    request.scope.setdefault('state',{})['trace_operation_id']=str(body.sample_id)
    with transaction() as c:
        p,_=worker_run(c,request,rid)
        value=body.model_dump(mode='json')|{'run_id':str(rid),'worker_id':p['id']}
        return write(c,'sample',value|{'content_hash':digest(value)})

def frame_access(request,c,mid,allow_replay=False):
    rid=UUID(request.path_params['rid']);p,row=worker_run(c,request,rid)
    cfg=row['request'].get('pipeline_config',{})
    session=request.headers.get('x-simulator-session')
    if not session or str(row['worker_session_id'])!=session:fail('OLD_WORKER_SESSION')
    states=('RUNNING','COMPLETED','CANCELLED','FAILED') if allow_replay else ('RUNNING',)
    if not cfg or cfg.get('mission_id')!=str(mid) or row['state'] not in states or row['expires_at']<=now():fail('FORBIDDEN',403)
    return p,{'drone_id':'sim-pi-01','gateway_state':{'session_id':session}}

@router.post('/device/v1/simulations/runs/{rid}/media-bundles',status_code=201)
def reserve_frame(rid:UUID,body:Bundle,request:Request):
    from drone_backend import media
    if any(f.role!='FRAME' for f in body.files):fail('INVALID_FRAME_BUNDLE',422)
    return media.reserve(body,request)

@router.put('/device/v1/simulations/runs/{rid}/media-assets/{aid}/content')
async def upload_frame(rid:UUID,aid:UUID,request:Request):
    from drone_backend import media
    return await media.upload(aid,request)

@router.post('/device/v1/simulations/runs/{rid}/media-bundles/{bid}/finalize')
def finalize_frame(rid:UUID,bid:UUID,request:Request):
    from drone_backend import media
    return media.finalize(bid,request)

@router.post('/device/v1/simulations/runs/{rid}/frames',status_code=201)
def register_frame(rid:UUID,body:RunFrame,request:Request):
    from drone_backend import analysis
    if request.headers.get('x-simulator-session')!=str(body.producer_session_id):fail('OLD_WORKER_SESSION')
    with transaction() as c:
        frame_access(request,c,body.frame.mission_id,allow_replay=True)
        _,row=worker_run(c,request,rid)
        cfg=row['request']['pipeline_config'];model_id=cfg['model_config_id']
        if cfg.get('analysis_policy')=='POSTFLIGHT' and body.frame.stream_id!='unreal/'+str(rid):fail('INVALID_FRAME_STREAM',422)
    frame=analysis.frame(body.frame,request)
    if cfg.get('analysis_policy')=='POSTFLIGHT':
        return {'frame':frame,'job':None,'analysis_deferred':True}
    job=analysis.admit(Analysis(analysis_run_id=body.analysis_run_id,frame_id=body.frame.frame_id,
        input_asset_id=body.frame.input_asset_id,model_config_id=model_id,coordinate_config_id=cfg.get('coordinate_config_id')),request)
    return {'frame':frame,'job':job}

@router.post('/device/v1/simulations/runs/{rid}/frames/content',status_code=201)
@router.post('/device/v1/simulations/runs/{rid}/frames/batch/content',status_code=201)
async def frame_content(rid:UUID,request:Request):
    from drone_backend import media
    from drone_backend.core import transaction_group
    await run_in_threadpool(media.media_workload,request)
    batch='/frames/batch/' in request.url.path
    encoded=request.headers.get('x-frame-metadata','')
    if len(encoded)>(12288 if batch else 8192):fail('INVALID_FRAME_METADATA',422)
    try:
        decoded=base64.b64decode(encoded,validate=True)
        frames=FrameBatch.model_validate_json(decoded).frames if batch else [FrameContent.model_validate_json(decoded)]
    except (ValueError,ValidationError,binascii.Error):fail('INVALID_FRAME_METADATA',422)
    if any(str(body.producer_session_id)!=request.headers.get('x-simulator-session') for body in frames):fail('OLD_WORKER_SESSION')
    ids=[v for b in frames for v in (b.bundle_id,b.frame.input_asset_id,b.frame.frame_id,b.analysis_run_id)]
    if len(set(ids))!=len(ids):fail('INVALID_CONTRACT',422)
    size=sum(b.byte_size for b in frames)
    if size>8388608:fail('BODY_TOO_LARGE',413)
    def authorize_frame():
        with transaction() as c:
            for body in frames:frame_access(request,c,body.frame.mission_id,allow_replay=True)
            _,run=worker_run(c,request,rid)
            return run['request'].get('pipeline_config',{}).get('analysis_policy')=='POSTFLIGHT'
    deferred=await run_in_threadpool(authorize_frame)
    if not frame_upload_slots.acquire(blocking=False):fail('FRAME_UPLOAD_BUSY',503)
    try:
        async def read():
            raw=bytearray()
            async for block in request.stream():
                if len(raw)+len(block)>size:fail('BODY_TOO_LARGE',413)
                raw.extend(block)
            if len(raw)!=size:fail('CONTENT_HASH_MISMATCH',422)
            offset=0
            for body in frames:
                if hashlib.sha256(memoryview(raw)[offset:offset+body.byte_size]).hexdigest()!=body.sha256:fail('CONTENT_HASH_MISMATCH',422)
                offset+=body.byte_size
            return bytes(raw)
        try:raw=await asyncio.wait_for(read(),15)
        except TimeoutError:fail('UPLOAD_TIMEOUT',408)
        def persist():
            # Keep the shared lock off the network receive path; existing phases remain replayable.
            items=[];offset=0
            for body in frames:
                chunk=raw[offset:offset+body.byte_size];offset+=body.byte_size
                async def receive(data=chunk):return {'type':'http.request','body':data,'more_body':False}
                scope=request.scope|{'state':dict(request.scope.get('state',{}))|{'frame_content_hash':digest(body.model_dump(mode='json'))}}
                buffered=Request(scope,receive)
                bundle=Bundle(bundle_id=body.bundle_id,mission_id=body.frame.mission_id,files=[
                    {'asset_id':body.frame.input_asset_id,'role':'FRAME','byte_size':body.byte_size,'sha256':body.sha256}])
                items.append((body,buffered,bundle))
            with media.media_lock():
                with transaction_group():
                    for body,buffered,bundle in items:media.reserve_locked(bundle,buffered)
                # Slow disk barriers must not hold the global DB writer lock and delay control/status.
                with media.durable_batch():
                    for body,buffered,bundle in items:
                        asyncio.run(media.stage_upload_locked(body.frame.input_asset_id,buffered))
                        with transaction() as c:manifest=media.asset(c,body.bundle_id)
                        media.persist_manifest(manifest)
                # Reservation remains charged if any later phase fails; committed file bytes are reusable.
                with transaction_group():
                    for body,buffered,bundle in items:
                        media.store_staged_upload_locked(body.frame.input_asset_id,buffered)
                        media.finalize_staged_locked(body.bundle_id,buffered)
                        register_frame(rid,RunFrame(**body.model_dump(exclude={'bundle_id','byte_size','sha256'})),buffered)
        await run_in_threadpool(persist)
        acks=[{'frame_id':str(b.frame.frame_id),'analysis_run_id':None if deferred else str(b.analysis_run_id),'stored':True,'analysis_deferred':deferred} for b in frames]
        return {'frames':acks} if batch else acks[0]
    finally:frame_upload_slots.release()
