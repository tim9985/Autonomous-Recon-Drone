"""In-process HTTP + actual core + isolated PostgreSQL, with simulated device/auth only."""
import json,os,subprocess,sys,time
from pathlib import Path
from uuid import UUID
from fastapi import FastAPI,HTTPException
from fastapi.testclient import TestClient
from drone_backend.core import transaction,one
from school import regional_search as planning,regional_execution as api
from school.regional_contract import validate_frame,CAPABILITIES

ROOT=Path('/check');MID='22222222-2222-4222-8222-222222222222';JID='44444444-4444-4444-8444-444444444444'
SID='99999999-9999-4999-8999-999999999999';EID='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
assert os.environ['DRONE_DB_NAME']=='regional_verify_execution_20261022'
planning.ROOT=api.ROOT=ROOT/'api-queue';planning.REGISTRY=api.REGISTRY=ROOT/'api-registry.json'
job=json.loads((ROOT/'api-job.json').read_text())
result=job['result'];package=json.loads((ROOT/'package/package.json').read_text())
(ROOT/'api-registry.json').write_text(json.dumps([dict(packageId=package['packageId'],adapterHash=result['adapterHash'],missionConditions=dict(altitude_m=30,speed_mps=3,observation_seconds=3))]))

def owner(request,c,mid,scope='read'):
    return dict(user_id=UUID('11111111-1111-4111-8111-111111111111')),one(c,'SELECT * FROM drone.mission WHERE mission_id=%s',(mid,))
planning.owned_mission=api.owned_mission=owner
api.simulator=lambda request,c:dict(id='contract-worker')
# Replaying old original timestamps, not pretending these are current captures.
api.validate_frame=lambda packet:validate_frame(packet,packet['receivedAt'])
app=FastAPI();app.include_router(planning.router);app.include_router(api.router)
c=TestClient(app)
def call(path,body=None,status=200):
    r=c.get(path) if body is None else c.post(path,json=body)
    assert r.status_code==status,(path,r.status_code,r.text[:500])
    return r.json()

h=dict(session_id=SID,package_id=package['packageId'],adapter_hash=result['adapterHash'],world_version=result['worldVersion'],capabilities=CAPABILITIES,ready=True,diagnostics=dict(scope='ISOLATED_SIMULATED_DEVICE'))
call('/device/v1/regional-search/heartbeat',h)
start=dict(execution_id=EID,worker_id='contract-worker',result_hash=job['result_hash'])
path=f'/api/v1/missions/{MID}/regional-search/{JID}'
assert call(path+'/execution-readiness?worker_id=contract-worker')['executable']
assert call(path+'/start',start,202)['state']=='QUEUED'
assert call(path+'/start',start,202)['execution_id']==EID
call(path+'/start',dict(start,result_hash='b'*64),409)
claim=call('/device/v1/regional-search/'+EID+'/claim',dict(session_id=SID))
assert claim['job']['result_hash']==job['result_hash']
call('/device/v1/regional-search/'+EID+'/progress',dict(session_id=SID,status=dict(phase='SEARCH')))
frames=[]
for i,p in enumerate(sorted((ROOT/'recorded-replay/frames').glob('*.json')),1):frames.append(dict(sequence=i,packet=json.loads(p.read_text())))
for i in range(0,len(frames),3):
    batch=dict(session_id=SID,frames=frames[i:i+3]);call('/device/v1/regional-search/'+EID+'/frames',batch)
    call('/device/v1/regional-search/'+EID+'/frames',batch)  # transport retry
call('/device/v1/regional-search/'+EID+'/finish',dict(session_id=SID,state='COMPLETED',status=dict(landedAndDisarmed=False)),409)
call('/device/v1/regional-search/'+EID+'/finish',dict(session_id=SID,state='COMPLETED',status=dict(landedAndDisarmed=True,scope='SIMULATED_FLIGHT_STATUS')))
subprocess.run([sys.executable,'-m','server_integration.regional_search.observe','--queue',str(api.ROOT),'--packages',str(ROOT/'packages'),
                '--execution',str(api.ROOT/'executions'/EID)],check=True,env=dict(os.environ,PYTHONPATH='/check'))
run=call(f'/api/v1/missions/{MID}/regional-executions/{EID}')
features=call(f'/api/v1/missions/{MID}/regional-executions/{EID}/coverage')['features']
assert run['state']=='COMPLETED' and run['actual']['percent']>0 and len(features)==130
with transaction() as db:
    assert one(db,'SELECT current_database() AS name')['name']==os.environ['DRONE_DB_NAME']
    cells=one(db,"SELECT count(*) AS n FROM drone.observation_cell WHERE state='OBSERVED'")['n']
    captures=one(db,'SELECT count(*) AS n FROM drone.regional_capture')['n']
assert cells==130 and captures==24
report=dict(status='PASS',scope='ISOLATED_HTTP_DATABASE_CAPTURE_REPLAY_WITH_SIMULATED_DEVICE_AUTH',
    captures=captures,completedParts=cells,actualPercent=run['actual']['percent'],checks=['start/readiness','duplicate/conflict','claim','capture/retry','actual-core','common-observation-db','coverage-api','landing-gate'])
(ROOT/'api-check.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
