"""Runnable integration check against a disposable PostgreSQL database, never production."""
import hashlib,json,os,uuid
from datetime import timedelta
from fastapi.testclient import TestClient
from drone_backend.main import app
from drone_backend.core import IDENTITY,now,settings
import psycopg
@app.exception_handler(psycopg.Error)
async def database_test_failure(request,exc):
    # Disposable DB diagnostics only, never installed in the production application.
    raise exc

assert os.environ.get('DRONE_DB_NAME','').startswith('backend_verify_'),'A disposable test DB is required'
principals=json.loads((IDENTITY/'principals.json').read_text())
roles={role:next(p for p in principals if 'business.'+role in p['scopes']) for role in ('operator','device','vision')}
@app.middleware('http')
async def tls_test_socket(request,call_next):
    # Test transport simulates the verified TLS scope, not an HTTP identity header.
    token=request.headers.get('authorization','')
    p=next((p for p in principals if token=='Bearer '+p['token']),None)
    request.scope['client_certificate_sha256']=p['certificate_sha256'] if p else None
    return await call_next(request)

client=TestClient(app,base_url='https://localhost:18443')
origin={'Origin':'https://localhost:18443'}
headers={role:({'Authorization':'Bearer '+p['token']}|origin) for role,p in roles.items()}
passed=[]
def check(name,value):
    assert value,name
    passed.append(name)
def call(method,path,body=None,role='operator',expect=200):
    response=client.request(method,path,json=body,headers=headers[role])
    assert response.status_code==expect,(method,path,response.status_code,response.text)
    return response.json()
def uid():return str(uuid.uuid4())

check('operator authentication required',client.get('/api/v1/drones').status_code==401)
login=call('POST','/api/v1/auth/login',{'login_id':'backend-acceptance','password':'<REDACTED>'})
headers['operator']['X-CSRF-Token']=login['csrf_token']
check('session login and permission contract',len(login['permissions'])==1 and bool(client.cookies))
check('password omitted from validation errors', 'AcceptanceOnly' not in client.post('/api/v1/auth/login',json={'password':'<REDACTED>'}).text)
check('CSRF missing is rejected',client.post('/api/v1/missions',json={'mission_id':uid(),'drone_id':'sim-pi-01'},headers={'Authorization':headers['operator']['Authorization']}|origin).status_code==403)
check('unknown object hidden',client.get('/api/v1/drones/other',headers=headers['operator']).status_code==404)
mid=uid();call('POST','/api/v1/missions',{'mission_id':mid,'drone_id':'sim-pi-01'},expect=201)
call('POST','/api/v1/missions',{'mission_id':mid,'drone_id':'sim-pi-01'},expect=201)
check('mission creation retry retains one row',len(call('GET','/api/v1/missions'))==1)
config=lambda k:str(uuid.uuid5(uuid.NAMESPACE_URL,'drone-business/SIM/'+k))
rev={'expected_draft_revision':0,'area_geom':{'type':'MultiPolygon','coordinates':[[[[127,37],[127.001,37],[127.001,37.001],[127,37.001],[127,37]]]]},'grid_version':'SIM_GRID_1',
     'spatial_config_id':config('SPATIAL'),'coordinate_config_id':config('COORDINATE'),'policy_config_id':config('POLICY'),'model_config_id':config('MODEL')}
call('POST',f'/api/v1/missions/{mid}/revisions',rev,expect=201)
check('stale revision rejected',client.post(f'/api/v1/missions/{mid}/revisions',json=rev,headers=headers['operator']).status_code==409)
call('POST',f'/api/v1/missions/{mid}/approve',{'expected_draft_revision':1})
rg={'region_id':uid(),'mission_revision':1,'geometry':rev['area_geom']}
call('POST',f'/api/v1/missions/{mid}/regions',rg,expect=201)
call('POST',f'/api/v1/missions/{mid}/regions',rg,expect=201)
pl={'plan_id':uid(),'mission_revision':1,'region_id':rg['region_id'],'route':{'environment':'SIM'}}
call('POST',f'/api/v1/missions/{mid}/plans',pl,expect=201)
check('SIM plan and region registration match revision',len(call('GET',f'/api/v1/missions/{mid}/plans'))==1 and len(call('GET',f'/api/v1/missions/{mid}/regions'))==1)
cell={'cell_id':'SIM_CELL_1','mission_revision':1,'region_id':rg['region_id'],'geometry':rev['area_geom']}
call('POST',f'/api/v1/missions/{mid}/observation-cells',cell,expect=201)
check('unverified belief is not presented as confidence',call('GET',f'/api/v1/missions/{mid}/observation-cells')[0]['belief'] is None)
check('REAL start is fail closed',client.post(f'/api/v1/missions/{mid}/start',headers=headers['operator']).status_code==503)
ctl=call('POST','/api/v1/drones/sim-pi-01/control/acquire',{'expected_control_revision':'0'})
sid=uid();lease=uid()
call('POST','/device/v1/sessions',{'session_id':sid,'control_epoch':'1','rc_taken':False,'lease_id':lease,'lease_expires_at':(now()+timedelta(seconds=300)).isoformat()},'device')
tel={'sample_id':uid(),'drone_id':'sim-pi-01','mission_id':mid,'producer_session_id':sid,'sequence':'9007199254740993','source_time_utc':now().isoformat(),'longitude':127,'latitude':37,'flight_state':{'mode':'SIM_HOLD'}}
call('POST','/device/v1/telemetry',tel,'device')
check('telemetry retry idempotent',call('POST','/device/v1/telemetry',tel,'device')['duplicate'])
check('same ID changed content rejected',client.post('/device/v1/telemetry',json=tel|{'latitude':38},headers=headers['device']).status_code==409)
check('int64 string precision retained',call('GET','/api/v1/drones/sim-pi-01')['latest_telemetry']['sequence']=='9007199254740993')
cmd={'command_id':uid(),'expected_control_revision':str(ctl['control_revision']),'mission_id':mid,'mission_revision':1,'action':'HOLD'}
issued=call('POST','/api/v1/drones/sim-pi-01/commands',cmd,expect=202)
check('command retry keeps issued envelope',call('POST','/api/v1/drones/sim-pi-01/commands',cmd,expect=202)['request_hash']==issued['request_hash'])
check('device polls approved command',len(call('GET','/device/v1/commands',role='device'))==1)
report={'request_hash':issued['request_hash'],'status_revision':1,'gateway_session_id':sid,'control_epoch':'1','state':'ACCEPTED','evidence_at':now().isoformat(),'evidence':{'fc_ack':True}}
call('POST',f"/device/v1/commands/{issued['command_id']}/reports",report,'device')
check('FC ACK is not COMPLETED',call('GET',f"/api/v1/commands/{issued['command_id']}")['state']=='ACCEPTED')
call('POST',f"/device/v1/commands/{issued['command_id']}/reports",report|{'status_revision':2,'state':'EXECUTING'},'device')
check('completion requires actual SIM evidence',client.post(f"/device/v1/commands/{issued['command_id']}/reports",json=report|{'status_revision':3,'state':'COMPLETED'},headers=headers['device']).status_code==422)
call('POST',f"/device/v1/commands/{issued['command_id']}/reports",report|{'status_revision':3,'state':'COMPLETED','evidence':{'sim_completed':True}},'device')
bid=uid();assets=[{'asset_id':uid(),'role':role,'byte_size':len(raw),'sha256':hashlib.sha256(raw).hexdigest()} for role,raw in [('VIDEO',b'SIM VIDEO'),('SIDECAR',b'SIM SIDECAR'),('FRAME',b'SIM FRAME')]]
bundle={'bundle_id':bid,'mission_id':mid,'files':assets}
call('POST','/device/v1/media-bundles',bundle,'device',201)
check('bundle cannot finalize before files',client.post(f'/device/v1/media-bundles/{bid}/finalize',headers=headers['device']).status_code==409)
for a,raw in zip(assets,[b'SIM VIDEO',b'SIM SIDECAR',b'SIM FRAME']):
    response=client.put(f"/device/v1/media-assets/{a['asset_id']}/content",content=raw,headers=headers['device'])
    assert response.status_code==200,response.text
check('stored file rejects changed content',client.put(f"/device/v1/media-assets/{assets[0]['asset_id']}/content",content=b'BAD',headers=headers['device']).status_code==422)
stored=call('POST',f'/device/v1/media-bundles/{bid}/finalize',role='device')
check('PERSISTED confirmation matches manifest',stored['persistence_status']=='PERSISTED' and call('POST',f'/device/v1/media-bundles/{bid}/finalize',role='device')==stored)
fid=uid();frame={'frame_id':fid,'mission_id':mid,'input_asset_id':assets[2]['asset_id'],'stream_id':'SIM','stream_epoch':0,'frame_seq':'1','capture_at':now().isoformat(),'width':640,'height':480,'format':'JPEG'}
call('POST','/device/v1/frames',frame,'device',201)
job={'analysis_run_id':uid(),'frame_id':fid,'input_asset_id':assets[2]['asset_id'],'model_config_id':config('MODEL')}
call('POST','/api/v1/analysis-runs',job,expect=201)
check('analysis admission retry retains revision',call('POST','/api/v1/analysis-runs',job,expect=201)['analysis_revision']==1)
claim=call('POST','/internal/v1/analysis-runs/claim',role='vision')
result={'claim_id':claim['claim_id'],'attempt_no':claim['attempt_no'],'observations':[]}
done=call('POST',f"/internal/v1/analysis-runs/{job['analysis_run_id']}/completion",result,'vision')
check('zero detections is completed',done['completed'] and done['detection_count']==0)
check('analysis completion retry one effect',call('POST',f"/internal/v1/analysis-runs/{job['analysis_run_id']}/completion",result,'vision')['duplicate'])
cid=uid()
def submit_job():
    new=job|{'analysis_run_id':uid()}
    call('POST','/api/v1/analysis-runs',new,expect=201)
    return new,call('POST','/internal/v1/analysis-runs/claim',role='vision')
second,claimed=submit_job()
obs={'observation_id':uid(),'candidate_id':cid,'detection_index':0,
     'bbox':{'convention':'PIXEL_XYXY','source_width':640,'source_height':480,'x1':10,'y1':10,'x2':100,'y2':200},
     'confidence':0.8,'geo_result':{'status':'PENDING','reason':'SIM_HAS_NO_REAL_POSE'}}
call('POST',f"/internal/v1/analysis-runs/{second['analysis_run_id']}/completion",{'claim_id':claimed['claim_id'],'attempt_no':claimed['attempt_no'],'observations':[obs]},'vision')
candidate=call('GET',f'/api/v1/missions/{mid}/candidates')[0]
check('nonzero analysis creates candidate atomically',candidate['candidate_id']==cid and candidate['evidence_count']==1)
judged={'request_id':uid(),'expected_row_version':candidate['row_version'],'value':'CONFIRMED','reason':'SIM test'}
call('POST',f'/api/v1/candidates/{cid}/judgements',judged)
check('judgement retry idempotent',call('POST',f'/api/v1/candidates/{cid}/judgements',judged)['duplicate'])
third,claim3=submit_job();fourth,claim4=submit_job()
call('POST',f"/internal/v1/analysis-runs/{fourth['analysis_run_id']}/completion",{'claim_id':claim4['claim_id'],'attempt_no':claim4['attempt_no'],'observations':[]},'vision')
call('POST',f"/internal/v1/analysis-runs/{third['analysis_run_id']}/completion",{'claim_id':claim3['claim_id'],'attempt_no':claim3['attempt_no'],'observations':[obs|{'observation_id':uid()}]},'vision')
candidate=call('GET',f'/api/v1/missions/{mid}/candidates')[0]
check('out-of-order analysis cannot restore retracted evidence',candidate['evidence_count']==0 and candidate['latest_position'] is None)
check('operator judgement survives AI correction',candidate['judgement']['value']=='CONFIRMED')
call('POST',f'/api/v1/candidates/{cid}/reobservations',{'request_id':uid()})
check('vision cannot issue commands',client.post('/api/v1/drones/sim-pi-01/commands',json=cmd,headers=headers['vision']).status_code==403)
snap=call('GET',f'/api/v1/missions/{mid}/snapshot')
check('snapshot event cursor is a decimal string',snap['event_cursor'].isdigit())
ev=call('GET',f'/api/v1/missions/{mid}/events?after_cursor=0&limit=2')
check('replay pagination does not skip',len(ev['events'])==2 and ev['has_more'])
call('POST','/device/v1/safety-reports',{'event_id':uid(),'gateway_session_id':sid,'control_epoch':'1','kind':'RC_TAKEOVER','evidence':{'environment':'SIM'}},'device')
check('RC takeover prevents new commands',client.post('/api/v1/drones/sim-pi-01/commands',json=cmd|{'command_id':uid()},headers=headers['operator']).status_code==409)
call('POST','/api/v1/auth/logout')
check('logout revokes session',client.get('/api/v1/drones',headers=headers['operator']).status_code==401)
if __name__=='__main__': print(json.dumps({'passed':len(passed),'checks':passed,'environment':'disposable SIM','model_loaded':False,'flight_enabled':False},ensure_ascii=False))
