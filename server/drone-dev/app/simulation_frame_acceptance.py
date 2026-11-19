"""Single-request frame acceptance in an empty disposable SIM database, never live data."""
import base64,hashlib,json,os,uuid,struct
from unittest.mock import patch
from fastapi.testclient import TestClient
from drone_backend.deployment import app
from drone_backend.core import IDENTITY,transaction,one
from drone_backend import media
assert os.environ['DRONE_DB_NAME'].startswith('backend_verify_')
principals=json.loads((IDENTITY/'principals.json').read_text())
roles={r:next(p for p in principals if 'business.'+r in p['scopes']) for r in ('operator','vision','simulator')}
@app.middleware('http')
async def tls(request,call_next):
    p=next((p for p in roles.values() if request.headers.get('authorization')=='Bearer '+p['token']),None)
    if p:request.scope['client_certificate_sha256']=p['certificate_sha256']
    return await call_next(request)

headers={r:{'Authorization':'Bearer '+p['token'],'Origin':'https://localhost:18443'} for r,p in roles.items()}
client=TestClient(app,base_url='https://localhost:18443');passed=[]
uid=lambda:str(uuid.uuid4())
def check(name,value):assert value,name;passed.append(name)
def call(method,path,body=None,role='operator',status=200):
    r=client.request(method,path,json=body,headers=headers[role]);assert r.status_code==status,(path,r.status_code,r.text[:500]);return r.json()
login=call('POST','/api/v1/auth/login',{'login_id':'throughput-check','password':'<REDACTED>'})
headers['operator']['X-CSRF-Token']=login['csrf_token']
mid=uid();call('POST','/api/v1/missions',{'mission_id':mid,'drone_id':'sim-pi-01','environment':'SIM'},status=201)
cid='9e223e9c-bff2-5775-84bf-05b7e93818e2';rid=uid();sid=uid();base='/device/v1/simulations/runs/'+rid
call('POST','/api/v1/simulations/runs',{'run_id':rid,'worker_id':roles['simulator']['id'],'simulator_version':'NET_SITL/UE5.5.4/Cosys5.5-v3.3','pipeline_config':{'mission_id':mid,'model_config_id':cid}},status=201)
call('POST',base+'/claim',{'producer_session_id':sid},role='simulator')
headers['simulator']['X-Simulator-Session']=sid
raw=b'bounded fixture bytes';fid=uid();aid=uid();analysis=uid()
body={'producer_session_id':sid,'bundle_id':uid(),'byte_size':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),
 'analysis_run_id':analysis,'frame':{'frame_id':fid,'mission_id':mid,'input_asset_id':aid,'stream_id':'acceptance',
 'stream_epoch':0,'frame_seq':'0','capture_at':'2026-10-15T00:00:00Z','width':64,'height':48,'format':'JPEG'}}
def upload(value=body,data=raw,role='simulator',extra=None):
    return client.post(base+'/frames/content',content=data,headers=headers[role]|{'X-Frame-Metadata':base64.b64encode(json.dumps(value).encode()).decode()}|(extra or {}))
check('No identity rejected',client.post(base+'/frames/content',content=raw).status_code==401)
check('Wrong role rejected',upload(role='vision').status_code==403)
check('Wrong session rejected',upload(extra={'X-Simulator-Session':uid()}).status_code==409)
check('Other mission rejected',upload(body|{'frame':body['frame']|{'mission_id':uid()}}).status_code in (403,404))
check('Bad header rejected',upload(extra={'X-Frame-Metadata':'%invalid'}).status_code==422)
check('Oversized header rejected',upload(extra={'X-Frame-Metadata':'a'*8193}).status_code==422)
check('Truncated content rejected',upload(data=raw[:-1]).status_code==422)
check('Trailing content rejected',upload(data=raw+b'x').status_code==413)
check('Changed hash rejected',upload(body|{'sha256':'a'*64}).status_code==422)
check('Chunked excess rejected',upload(data=iter([raw,b'x'])).status_code==413)
with patch.object(media,'finalize_staged_locked',side_effect=RuntimeError('crash before finalize')):
    crashed=TestClient(app,base_url='https://localhost:18443',raise_server_exceptions=False)
    r=crashed.post(base+'/frames/content',content=raw,headers=headers['simulator']|{'X-Frame-Metadata':base64.b64encode(json.dumps(body).encode()).decode()})
    check('Interrupted finalize returns failure '+str(r.status_code)+' '+r.text[:250],r.status_code==500)
    crashed.close()
check('Changed metadata after partial write rejected',upload(body|{'analysis_run_id':uid()}).status_code==409)
r=upload();check('Retry recovers partial durable write',r.status_code==201)
check('Matching acknowledgement',r.json()=={'frame_id':fid,'analysis_run_id':analysis,'stored':True})
check('Lost acknowledgement retry identical',upload().json()==r.json())
check('Changed replay rejected',upload(body|{'frame':body['frame']|{'width':65}}).status_code==409)
with transaction() as c:
    check('One frame stored',one(c,'select count(*) n from drone.video_frame where frame_id=%s',(fid,))['n']==1)
    check('One analysis admitted',one(c,"select count(*) n from drone.mission_event where event_type='ANALYSIS_STARTED' and payload->>'analysis_run_id'=%s",(analysis,))['n']==1)
r=client.post('/internal/v1/analysis-runs/next-input',params={'model_config_id':cid},headers=headers['vision'])
check('Bundled worker input bytes',r.status_code==200 and r.content==raw)
meta=json.loads(base64.b64decode(r.headers['X-Analysis-Metadata']));job=meta['job']
check('Bundled worker input identity/hash',job['analysis_run_id']==analysis and meta['frame']['frame_id']==fid and r.headers['X-Content-SHA256']==body['sha256'])
check('Leased frame not handed out twice',call('POST','/internal/v1/analysis-runs/next-input',role='vision')=={'job':None})
complete={'claim_id':job['claim_id'],'attempt_no':job['attempt_no'],'observations':[]}
call('POST','/internal/v1/analysis-runs/'+analysis+'/completion',complete,role='vision')
check('Completed frame replay still identical',upload().json()=={'frame_id':fid,'analysis_run_id':analysis,'stored':True})
batch=[]
for n in range(5):
    batch.append(body|{'bundle_id':uid(),'analysis_run_id':uid(),'frame':body['frame']|{'frame_id':uid(),'input_asset_id':uid(),'frame_seq':str(n+1)}})
def upload_batch(values=batch,data=raw*5):
    return client.post(base+'/frames/batch/content',content=data,headers=headers['simulator']|{'X-Frame-Metadata':base64.b64encode(json.dumps({'frames':values}).encode()).decode()})
check('Batch count bounded',upload_batch(batch+batch[:1]).status_code==422)
check('Duplicate batch identities rejected',upload_batch([batch[0],batch[0]],raw*2).status_code==422)
check('One bad chunk rejects entire batch',upload_batch(data=raw*4+b'x'*len(raw)).status_code==422)
finalize=media.finalize_staged_locked;calls=[]
def partial_failure(*args):
    calls.append(1)
    if len(calls)==2:raise RuntimeError('crash after first finalized frame')
    return finalize(*args)
crashed=TestClient(app,base_url='https://localhost:18443',raise_server_exceptions=False)
with patch.object(media,'finalize_staged_locked',side_effect=partial_failure):
    r=crashed.post(base+'/frames/batch/content',content=raw*5,headers=headers['simulator']|{'X-Frame-Metadata':base64.b64encode(json.dumps({'frames':batch}).encode()).decode()})
    check('Partial batch returns failure',r.status_code==500)
crashed.close()
with transaction() as c:
    check('Partial batch registers no frames',one(c,'SELECT count(*) n FROM drone.video_frame WHERE frame_id=ANY(%s::uuid[])',([b['frame']['frame_id'] for b in batch],))['n']==0)
    check('Failed batch keeps all quota reservations',one(c,"SELECT count(*) n FROM drone.media_asset WHERE asset_id=ANY(%s::uuid[]) AND state='WRITING'",([b['bundle_id'] for b in batch],))['n']==5)
check('Partial batch metadata remains immutable',upload_batch([batch[0]|{'analysis_run_id':uid()}],raw).status_code==409)
r=upload_batch();check('Batch retry recovers all frames',r.status_code==201 and len(r.json()['frames'])==5)
check('Batch lost acknowledgement retry identical',upload_batch().json()==r.json())
with transaction() as c:
    check('Batch has exactly five registered frames',one(c,'SELECT count(*) n FROM drone.video_frame WHERE frame_id=ANY(%s::uuid[])',([b['frame']['frame_id'] for b in batch],))['n']==5)
fresh=body|{'bundle_id':uid(),'analysis_run_id':uid(),'frame':body['frame']|{'frame_id':uid(),'input_asset_id':uid(),'frame_seq':'6'}}
sync=media.sync_directory
def fail_barrier(path):
    if path.name==mid and media._sync_directories.get() is None:raise OSError('directory barrier failure')
    return sync(path)
def crashing_upload(value):
    broken=TestClient(app,base_url='https://localhost:18443',raise_server_exceptions=False)
    try:return broken.post(base+'/frames/content',content=raw,headers=headers['simulator']|{'X-Frame-Metadata':base64.b64encode(json.dumps(value).encode()).decode()})
    finally:broken.close()
with patch.object(media,'sync_directory',side_effect=fail_barrier):
    check('Failed directory barrier is not acknowledged',crashing_upload(fresh).status_code==500)
with transaction() as c:
    check('Failed directory barrier does not register frame',one(c,'SELECT count(*) n FROM drone.video_frame WHERE frame_id=%s',(fresh['frame']['frame_id'],))['n']==0)
barriers=[]
def observed_barrier(path):
    if path.name==mid and media._sync_directories.get() is None:barriers.append(str(path))
    return sync(path)
with patch.object(media,'sync_directory',side_effect=observed_barrier):
    check('Existing files are resynced on retry',upload(fresh).status_code==201 and bool(barriers))
fresh=body|{'bundle_id':uid(),'analysis_run_id':uid(),'frame':body['frame']|{'frame_id':uid(),'input_asset_id':uid(),'frame_seq':'7'}}
def leave_manifest_part(row):
    path=media.storage_file(row['storage_uri']).with_suffix('.part');path.write_bytes(b'partial')
    raise OSError('crash with manifest temp file')
with patch.object(media,'persist_manifest',side_effect=leave_manifest_part):
    check('Interrupted manifest is not acknowledged',crashing_upload(fresh).status_code==500)
check('Media lock cleans stale manifest before retry',upload(fresh).status_code==201)
fresh=body|{'bundle_id':uid(),'analysis_run_id':uid(),'frame':body['frame']|{'frame_id':uid(),'input_asset_id':uid(),'frame_seq':'8'}}
fsync=os.fsync
def fail_file_sync(fd):
    path=media.STORAGE/'missions'/mid/(fresh['frame']['input_asset_id']+'.bin')
    if path.exists() and path.stat().st_ino==os.fstat(fd).st_ino:raise OSError('file barrier failure')
    return fsync(fd)
with patch.object(os,'fsync',side_effect=fail_file_sync):
    check('Failed concurrent file barrier is not acknowledged',crashing_upload(fresh).status_code==500)
with transaction() as c:
    check('Failed file barrier registers no frame',one(c,'SELECT count(*) n FROM drone.video_frame WHERE frame_id=%s',(fresh['frame']['frame_id'],))['n']==0)
check('Retry syncs existing file after barrier failure',upload(fresh).status_code==201)
r=client.post('/internal/v1/analysis-runs/next-input-batch',params={'model_config_id':cid},headers=headers['simulator'])
check('Batch input rejects wrong role',r.status_code==403)
r=client.post('/internal/v1/analysis-runs/next-input-batch',params={'model_config_id':cid},headers=headers['vision'])
check('Batch input returns bounded binary',r.status_code==200 and r.headers['content-type']=='application/octet-stream')
length=struct.unpack('!I',r.content[:4])[0];entries=json.loads(r.content[4:4+length]);offset=4+length
check('Exactly five analyses leased',len(entries)==5)
results=[]
for entry in entries:
    job=entry['job'];chunk=r.content[offset:offset+entry['byte_size']];offset+=entry['byte_size']
    check('Batch input hash and frame identity '+job['analysis_run_id'],hashlib.sha256(chunk).hexdigest()==job['input_hash'] and job['frame_id']==entry['frame']['frame_id'])
    results.append({'analysis_run_id':job['analysis_run_id'],'result':{'claim_id':job['claim_id'],'attempt_no':job['attempt_no'],'observations':[]}})
check('Batch input consumes exactly declared bytes',offset==len(r.content))
bad=results[:-1]+[results[-1]|{'result':results[-1]['result']|{'claim_id':uid()}}]
call('POST','/internal/v1/analysis-runs/completion-batch',{'results':bad},role='vision',status=409)
with transaction() as c:
    check('One invalid completion rolls entire batch back',one(c,"SELECT count(*) n FROM drone.mission_event WHERE event_type='ANALYSIS_COMPLETED' AND payload->>'analysis_run_id'=ANY(%s)",([x['analysis_run_id'] for x in results],))['n']==0)
ack=call('POST','/internal/v1/analysis-runs/completion-batch',{'results':results},role='vision')
check('Batch completion acknowledges exact ordered IDs',ack=={'completed':[x['analysis_run_id'] for x in results]})
check('Lost batch completion reply is idempotent',call('POST','/internal/v1/analysis-runs/completion-batch',{'results':results},role='vision')==ack)
call('POST','/internal/v1/analysis-runs/completion-batch',{'results':results+results[:1]},role='vision',status=422)
check('Batch completion count bounded',True)
from drone_backend import analysis as analysis_api
original_input=analysis_api.input_file;poison=[];good=[]
def broken_input(rid,request):
    if not poison:poison.append(rid)
    if rid==poison[0]:raise OSError('corrupt oldest file')
    return original_input(rid,request)
with patch.object(analysis_api,'input_file',side_effect=broken_input):
    for _ in range(3):
        r=client.post('/internal/v1/analysis-runs/next-input-batch',params={'model_config_id':cid},headers=headers['vision'])
        assert r.status_code==200,r.text[:200]
        if r.headers['content-type']=='application/octet-stream':
            length=struct.unpack('!I',r.content[:4])[0];good.extend(json.loads(r.content[4:4+length]))
check('Unreadable oldest input does not block valid jobs',bool(poison) and bool(good) and all(e['job']['analysis_run_id']!=str(poison[0]) for e in good))
with transaction() as c:
    check('Unreadable input reaches explicit retry limit',analysis_api.terminal(c,poison[0])['event_type']=='ANALYSIS_FAILED')
schema=app.openapi();operation=schema['paths']['/device/v1/simulations/runs/{rid}/frames/content']['post']
check('Binary OpenAPI contract',operation['requestBody']['content'].get('application/octet-stream') is not None and 'FrameContent' in schema['components']['schemas'])
check('Batch binary OpenAPI contract',schema['paths'][base.replace(rid,'{rid}')+'/frames/batch/content']['post']['requestBody']['content'].get('application/octet-stream') is not None and 'FrameBatch' in schema['components']['schemas'])
print(json.dumps({'passed':len(passed),'checks':passed,'hardware':False}))

