"""Parallel worker/API regression, only on a restored disposable DB."""
import concurrent.futures, json, os, threading, time, uuid
from datetime import datetime,timedelta,timezone
from fastapi.testclient import TestClient
from drone_backend.deployment import app
from drone_backend.core import IDENTITY,transaction,one

assert os.environ.get('DRONE_DB_NAME','').startswith('backend_verify_')
registry=json.loads((IDENTITY/'principals.json').read_text())
operator=next(p for p in registry if 'business.operator' in p['scopes'])
workers=[p for p in registry if 'business.simulator' in p['scopes']]
assert len(workers)==3
@app.middleware('http')
async def verified_test_transport(request,call_next):
    p=next((p for p in registry if request.headers.get('authorization')=='Bearer '+p['token']),None)
    if p:request.scope['client_certificate_sha256']=p['certificate_sha256']
    return await call_next(request)

client=TestClient(app,base_url='https://localhost:18443');passed=[]
headers={'Authorization':'Bearer '+operator['token'],'Origin':'https://localhost:18443'}
r=client.post('/api/v1/auth/login',json={'login_id':'simulation-acceptance','password':'<REDACTED>'},headers=headers);assert r.status_code==200,r.text
headers['X-CSRF-Token']=r.json()['csrf_token']
uid=lambda:str(uuid.uuid4())
base='/api/v1/simulations/runs';device='/device/v1/simulations/runs'
def check(name,ok):assert ok,name;passed.append(name)
def control(method,path,body=None,status=200):
    r=client.request(method,path,json=body,headers=headers);assert r.status_code==status,(path,r.status_code,r.text);return r.json()
def call(w,method,path,body=None,status=200):
    r=client.request(method,path,json=body,headers={'Authorization':'Bearer '+w['token']});assert r.status_code==status,(w['id'],path,r.status_code,r.text);return r.json()
def create(w):
    body={'run_id':uid(),'scenario':'CAPTURE','worker_id':w['id'],'simulator_version':'NET_SITL/UE5.5.4/Cosys5.5-v3.3'}
    control('POST',base,body,status=201);return body['run_id']

listed=control('GET','/api/v1/simulations/workers')
check('registered PC selector contains no credentials',all(set(x)=={'worker_id','label'} for x in listed) and {w['id'] for w in workers}<={x['worker_id'] for x in listed})
control('POST',base,{'run_id':uid(),'worker_id':'not-registered','simulator_version':'x'},status=422);passed.append('unregistered target denied')
runs=[create(w) for w in workers]
for i,w in enumerate(workers):
    pending=call(w,'GET',device);ids={r['run_id'] for r in pending}
    check('target isolation '+w['id'],runs[i] in ids and not ({*runs}-{runs[i]}) & ids)
    call(w,'GET',device+'/'+runs[(i+1)%3],status=404)
    call(w,'POST','/device/v1/sessions',{'session_id':uid(),'control_epoch':'100','rc_taken':False,'lease_id':uid(),'lease_expires_at':(datetime.now(timezone.utc)+timedelta(seconds=300)).isoformat()},status=403)
passed.append('simulator credentials cannot access other PC or device controls')

# Eight competing HTTP sessions for one request: the same PC identity has one winner.
race=runs[0];barrier=threading.Barrier(8);sids=[uid() for _ in range(8)]
def contender(sid):
    barrier.wait()
    r=client.post(device+'/'+race+'/claim',json={'producer_session_id':sid},headers={'Authorization':'Bearer '+workers[0]['token']})
    return sid,r.status_code
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:outcomes=list(pool.map(contender,sids))
winner=next(sid for sid,status in outcomes if status==200)
check('claim race one owner seven conflicts',sum(s==200 for _,s in outcomes)==1 and sum(s==409 for _,s in outcomes)==7)
call(workers[0],'POST',device+'/'+race+'/claim',{'producer_session_id':winner});passed.append('owner claim retry succeeds')
check('RUNNING requests excluded from polling',race not in {r['run_id'] for r in call(workers[0],'GET',device)})
call(workers[0],'GET',device+'/'+race+'/commands',status=422)
call(workers[0],'GET',device+'/'+race+'/commands?producer_session_id='+uid(),status=409)
passed.append('commands require owner session')
sessions=[winner,uid(),uid()]
for i in (1,2):call(workers[i],'POST',device+'/'+runs[i]+'/claim',{'producer_session_id':sessions[i]})

barrier=threading.Barrier(3)
def publish(i):
    w=workers[i];rid=runs[i];sid=sessions[i];barrier.wait()
    for n in range(30):
        sample={'sample_id':uid(),'producer_session_id':sid,'sequence':str(n),'kind':'METRIC','data':{'pc':w['id'],'n':n}}
        call(w,'POST',device+'/'+rid+'/samples',sample)
        assert call(w,'POST',device+'/'+rid+'/samples',sample)['duplicate']
    return True
started=time.monotonic()
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:assert all(pool.map(publish,range(3)))
elapsed=time.monotonic()-started
passed.append('three PCs parallel inserts and retries')
for i in range(3):
    page=control('GET',base+'/'+runs[i]+'/samples')
    check('samples isolated '+workers[i]['id'],len(page['samples'])==30 and all(s['worker_id']==workers[i]['id'] and s['data']['pc']==workers[i]['id'] for s in page['samples']))
    call(workers[(i+1)%3],'POST',device+'/'+runs[i]+'/samples',{'sample_id':uid(),'producer_session_id':sessions[i],'sequence':'31','kind':'METRIC','data':{}},status=404)
passed.append('foreign worker cannot submit even with known session')

# Stopping worker A must leave B/C running and their publications unchanged.
control('POST',base+'/'+race+'/stop',{'command_id':uid()},status=202)
for i,state in enumerate(('CANCELLED','COMPLETED','COMPLETED')):
    call(workers[i],'POST',device+'/'+runs[i]+'/samples',{'sample_id':uid(),'producer_session_id':sessions[i],'sequence':'30','kind':'RUN_STATUS','data':{'state':state}})
check('stop and completion do not affect other runs',[control('GET',base+'/'+rid)['state'] for rid in runs]==['CANCELLED','COMPLETED','COMPLETED'])
with transaction() as c:
    check('parallel data preserved',one(c,'SELECT count(*) AS n FROM simulation.sample WHERE run_id=ANY(%s)',(list(map(uuid.UUID,runs)),))['n']==93)
print(json.dumps({'passed':len(passed),'checks':passed,'claim_rivals':8,'workers':3,'stored_parallel_samples':90,'duplicate_retries':90,'parallel_seconds':round(elapsed,3),'physical_PCs':1,'real_Unreal_instances':0}))
