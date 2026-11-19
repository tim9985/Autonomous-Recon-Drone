"""REAL-shaped synthetic fixtures, exclusively against a disposable REAL verification DB."""
import hashlib,json,os,uuid
from datetime import datetime,timezone
from fastapi.testclient import TestClient
import psycopg
from drone_backend.real import app
from drone_backend.core import IDENTITY,settings,transaction

assert os.getenv('DRONE_DB_NAME','').startswith('real_verify_')
registry=json.loads((IDENTITY/'principals.json').read_text())
roles={r:next(p for p in registry if 'business.'+r in p['scopes']) for r in ('operator','device','vision')}
@app.middleware('http')
async def tls_fixture(request,call_next):
    p=next((p for p in registry if request.headers.get('authorization')=='Bearer '+p['token']),None)
    request.scope['client_certificate_sha256']=p['certificate_sha256'] if p else None
    return await call_next(request)
@app.exception_handler(psycopg.Error)
async def db_failure(request,exc):
    from drone_backend.main import database_error
    if exc.sqlstate not in ('23505','23503','23514'):raise exc
    print(json.dumps({'test_database_error':str(exc),'path':request.url.path}),flush=True)
    return await database_error(request,exc)

client=TestClient(app,base_url='https://localhost:19443')
headers={r:{'Authorization':'Bearer '+p['token']} for r,p in roles.items()}
headers['operator']['Origin']='https://localhost:19443'
passed=[]
def check(name,condition):
    assert condition,name
    passed.append(name)
def uid():return str(uuid.uuid4())
def call(method,path,data=None,role='operator',status=200):
    r=client.request(method,path,json=data,headers=headers[role]);assert r.status_code==status,(path,r.status_code,r.text)
    return r.json()

check('Unauthenticated operator rejected',client.get('/api/v1/readiness').status_code==401)
login=call('POST','/api/v1/auth/login',{'login_id':'real-operator','password':'<REDACTED>'})
headers['operator']['X-CSRF-Token']=login['csrf_token']
check('REAL cookie separated from SIM','drone_real_session' in client.cookies and 'drone_session' not in client.cookies)
check('REAL storage ready, no flight',call('GET','/api/v1/readiness')['flight_enabled'] is False)
mid=uid()
call('POST','/api/v1/missions',{'mission_id':mid,'drone_id':'real-drone-01','environment':'REAL'},status=201)
check('SIM rejected by REAL contract',client.post('/api/v1/missions',json={'mission_id':uid(),'drone_id':'real-drone-01','environment':'SIM'},headers=headers['operator']).status_code==422)
check('CSRF enforced',client.post('/api/v1/missions',json={'mission_id':uid(),'drone_id':'real-drone-01','environment':'REAL'},headers={k:v for k,v in headers['operator'].items() if k!='X-CSRF-Token'}).status_code==403)
sid=uid()
session={'session_id':sid,'control_epoch':'1','environment':'REAL'}
call('POST','/device/v1/sessions',session,'device')
check('Repeated session idempotent',call('POST','/device/v1/sessions',session,'device')['control_epoch']=='1')
tel={'sample_id':uid(),'mission_id':mid,'drone_id':'real-drone-01','producer_session_id':sid,'sequence':'1','source':'REAL',
 'clock_domain':'UTC','source_time_utc':datetime.now(timezone.utc).isoformat(),'pose':{'longitude':128,'latitude':36},'flight_state':{'mode':'HOLD'}}
call('POST','/device/v1/telemetry',tel,'device')
check('Telemetry retry idempotent',call('POST','/device/v1/telemetry',tel,'device')['duplicate'])
check('Changed telemetry rejected',client.post('/device/v1/telemetry',json=tel|{'pose':{}},headers=headers['device']).status_code==409)
check('Vision cannot upload device telemetry',client.post('/device/v1/telemetry',json=tel,headers=headers['vision']).status_code==403)
check('Wrong drone rejected',client.post('/device/v1/telemetry',json=tel|{'drone_id':'other'},headers=headers['device']).status_code==403)
modelid=uid()
model={'config_id':modelid,'version':'fixture-model','artifact_sha256':'a'*64,'pipeline_version':'fixture-v1','environment':'REAL'}
call('POST','/api/v1/configs/models',model,status=201)
check('Model metadata does not imply readiness',call('GET','/api/v1/readiness')['model_loaded'] is False)
bid=uid();raw=b'fixture bytes, not a trained model or real camera'
assets=[{'asset_id':uid(),'role':r,'byte_size':len(raw),'sha256':hashlib.sha256(raw).hexdigest()} for r in ('VIDEO','SIDECAR','FRAME')]
call('POST','/device/v1/media-bundles',{'bundle_id':bid,'mission_id':mid,'files':assets},'device',201)
for a in assets:
    r=client.put('/device/v1/media-assets/'+a['asset_id']+'/content',content=raw,headers=headers['device']);assert r.status_code==200,r.text
call('POST',f'/device/v1/media-bundles/{bid}/finalize',role='device')
fid=uid()
frame={'frame_id':fid,'mission_id':mid,'input_asset_id':assets[-1]['asset_id'],'producer_session_id':sid,'stream_id':'cam0','stream_epoch':1,'frame_seq':'1',
 'capture_at':tel['source_time_utc'],'time_source':'SIDECAR','width':640,'height':480,'format':'JPEG','source':'REAL','pose':{'reported':True}}
stored=call('POST','/device/v1/frames',frame,'device',201)
check('SIDECAR is not automatic clock verification',stored['capture_time_verified'] is False)
check('Vision polls pending frame',call('GET','/internal/v1/frames',role='vision')[0]['frame_id']==fid)
check('Vision reads verified input bytes',client.get(f'/internal/v1/frames/{fid}/input',headers=headers['vision']).content==raw)
vbid=uid();crop={'asset_id':uid(),'role':'FRAME','byte_size':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
call('POST','/internal/v1/vision/media-bundles',{'bundle_id':vbid,'mission_id':mid,'files':[crop]},'vision',201)
check('Vision cannot alter device assets',client.put('/internal/v1/vision/media-assets/'+assets[-1]['asset_id']+'/content',content=raw,headers=headers['vision']).status_code==403)
check('Vision uploads evidence without shared raw storage',client.put('/internal/v1/vision/media-assets/'+crop['asset_id']+'/content',content=raw,headers=headers['vision']).status_code==200)
call('POST',f'/internal/v1/vision/media-bundles/{vbid}/finalize',role='vision')
cid=uid();rid=uid()
result={'schema_version':'vision-ingest/1.0','message_id':rid,'producer_session_id':uid(),'sequence':'1','mission_id':mid,'frame_id':fid,'model_config_id':modelid,
 'emitted_at':tel['source_time_utc'],'analysis_state':'DONE','observations':[{'observation_id':uid(),'candidate_id':cid,'detection_index':0,
 'bbox':{'x1':10,'y1':20,'x2':30,'y2':40},'confidence':0.8,'worker_revision':'1','auto_confirmed':True,'snapshot_asset_id':crop['asset_id'],
 'geo':{'status':'VALID','lat':36,'lon':128,'error_ellipse':{'major_m':2,'minor_m':1,'azimuth_deg':45}},'appearance':{'upper':{'color':'red'}}}]}
check('Device cannot submit vision evidence',client.post('/internal/v1/vision/results',json=result,headers=headers['device']).status_code==403)
bad=json.loads(json.dumps(result));bad['observations'][0]['bbox']['x2']=900
check('Out of frame bbox rejected atomically',client.post('/internal/v1/vision/results',json=bad,headers=headers['vision']).status_code==422)
call('POST','/internal/v1/vision/results',result,'vision')
check('Vision retry idempotent',call('POST','/internal/v1/vision/results',result,'vision')['duplicate'])
check('Changed receipt rejected',client.post('/internal/v1/vision/results',json=result|{'reason':'different'},headers=headers['vision']).status_code==409)
candidates=call('GET',f'/api/v1/missions/{mid}/candidates')
check('Unverified candidates visible',len(candidates)==1)
cand=candidates[0]
check('VALID claim retained separately, not certified',cand['geo_status']=='PENDING' and cand['latest_position'] is None and cand['tracking']['geo_claim']['status']=='VALID')
check('Automatic confirmation separate from operator',cand['tracking']['auto_confirmed'] and cand['judgement'] is None)
check('Operator reads immutable detection evidence',call('GET',f'/api/v1/candidates/{cid}/observations')[0]['confidence']==0.8)
check('Operator reads crop by asset id',client.get('/api/v1/media-assets/'+cand['tracking']['media']['snapshot_asset_id']+'/content',headers=headers['operator']).content==raw)
call('POST',f'/api/v1/candidates/{cid}/judgements',{'request_id':uid(),'expected_row_version':cand['row_version'],'value':'UNDECIDED','reason':'fixture'})
check('Processed frame leaves queue',call('GET','/internal/v1/frames',role='vision')==[])
call('POST','/internal/v1/vision/reobservations',{'request_id':uid(),'candidate_id':cid,'reason':'GEO_PENDING'},'vision',201)
check('Operator reads reobservation and telemetry history',len(call('GET',f'/api/v1/missions/{mid}/reobservations'))==1 and len(call('GET',f'/api/v1/missions/{mid}/telemetry'))==1)
check('Only one active reobservation per candidate',client.post('/internal/v1/vision/reobservations',json={'request_id':uid(),'candidate_id':cid,'reason':'LOW_EVIDENCE'},headers=headers['vision']).status_code==409)
cmd={'message_id':uid(),'command_id':uid(),'mission_id':mid,'producer_session_id':sid,'sequence':'1','observed_at':tel['source_time_utc'],
 'action':'HOLD','reported_state':'COMPLETED','status_revision':1,'evidence':{'fixture':True,'source':'external_device_report'}}
call('POST','/device/v1/command-observations',cmd,'device')
check('Command evidence retry idempotent',call('POST','/device/v1/command-observations',cmd,'device')['duplicate'])
check('Operator reads command evidence',len(call('GET',f'/api/v1/missions/{mid}/command-observations'))==1)
check('REAL command issue disabled',client.post('/api/v1/drones/real-drone-01/commands',json={},headers=headers['operator']).status_code==503)
check('REAL device dispatch disabled',client.get('/device/v1/commands',headers=headers['device']).status_code==503)
check('REAL mission start disabled',client.post(f'/api/v1/missions/{mid}/start',headers=headers['operator']).status_code==503)
with transaction() as c:
    check('No commands or control leases created',c.execute('SELECT count(*) AS n FROM drone.flight_command').fetchone()['n']==0 and c.execute('SELECT control_session_id FROM drone.drone').fetchone()['control_session_id'] is None)
    check('Failed vision transaction left no receipt',c.execute('SELECT count(*) AS n FROM drone.ingest_receipt').fetchone()['n']==2)
    check('REAL storage role has no dispatch privileges',not c.execute("SELECT has_function_privilege(current_user,'drone.backend_add_flight_command(jsonb)','EXECUTE') AS allowed").fetchone()['allowed'])
    check('No direct mission DML',not c.execute("SELECT has_table_privilege(current_user,'drone.mission','INSERT') AS allowed").fetchone()['allowed'])
check('Chunked oversized input rejected',client.post('/internal/v1/vision/results',content=iter([b'x'*40000,b'x'*40000]),headers=headers['vision']).status_code==413)
check('SIM control route absent',client.post('/api/v1/drones/real-drone-01/control/acquire',json={},headers=headers['operator']).status_code==404)
with TestClient(app,base_url='https://localhost:19443',cookies=client.cookies) as another:
    check('New application lifecycle reads persisted candidate',another.get(f'/api/v1/missions/{mid}/candidates',headers=headers['operator']).json()[0]['candidate_id']==cid)
schema=app.openapi()
check('OpenAPI uses isolated REAL session cookie',schema['components']['securitySchemes']['OperatorSession']['name']=='drone_real_session')
import tempfile,pathlib
from app import vision_outbox
vision_outbox.text=lambda _: 'fixture-token'
class Reply:
    def __init__(self,ok):self.ok=ok
    def raise_for_status(self):
        if not self.ok:raise RuntimeError('fixture connection failed')
class Sender:
    ok=False
    def post(self,*args,**kwargs):return Reply(self.ok)
with tempfile.TemporaryDirectory() as tmp:
    root=pathlib.Path(tmp);queue=root/'outbox.jsonl';sender=Sender()
    queue.write_text('{"type":"result","body":{}}')
    check('Incomplete JSONL line retained',vision_outbox.send_pending(sender,root)==0)
    with queue.open('a') as f:f.write('\n')
    try:vision_outbox.send_pending(sender,root)
    except RuntimeError:pass
    check('Delivery failure does not advance acknowledgement',not (root/'ack.json').exists())
    sender.ok=True
    check('Outbox resumes after success exactly once',vision_outbox.send_pending(sender,root)==1 and vision_outbox.send_pending(sender,root)==0)
    queue.write_text('{"type":"result","body":{ }}\n')
    try:vision_outbox.send_pending(sender,root);raise AssertionError('Changed boundary accepted')
    except ValueError:passed.append('Changed acknowledged boundary rejected')
print(json.dumps({'passed':len(passed),'checks':passed,'fixtures':'synthetic REAL format, not hardware evidence','real_flight':False}))
