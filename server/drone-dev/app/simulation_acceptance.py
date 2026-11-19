"""Runnable regression against a disposable restored DB, never production."""
import json, os, uuid
from fastapi.testclient import TestClient
from drone_backend.deployment import app
from drone_backend.core import IDENTITY,transaction,one

assert os.environ.get('DRONE_DB_NAME','').startswith('backend_verify_')
registry=json.loads((IDENTITY/'principals.json').read_text())
roles={role:next(p for p in registry if 'business.'+role in p['scopes']) for role in ('operator','device','vision')}
@app.middleware('http')
async def verified_tls(request,call_next):
    p=next((p for p in roles.values() if request.headers.get('authorization')=='Bearer '+p['token']),None)
    if p:request.scope['client_certificate_sha256']=p['certificate_sha256']
    return await call_next(request)

client=TestClient(app,base_url='https://localhost:18443')
headers={r:{'Authorization':'Bearer '+p['token'],'Origin':'https://localhost:18443'} for r,p in roles.items()}
passed=[]
def call(method,path,value=None,role='operator',status=200):
    r=client.request(method,path,json=value,headers=headers[role]);assert r.status_code==status,(path,r.status_code,r.text)
    return r.json()
def check(name,value):assert value,name;passed.append(name)
uid=lambda:str(uuid.uuid4())
base='/api/v1/simulations/runs';worker='/device/v1/simulations/runs'
check('no session denied',client.get(base).status_code==401)
login=call('POST','/api/v1/auth/login',{'login_id':'simulation-acceptance','password':'<REDACTED>'})
headers['operator']['X-CSRF-Token']=login['csrf_token']
rid=uid();body={'run_id':rid,'scenario':'CAPTURE','simulator_version':'NET_SITL/UE5.5.4/Cosys5.5-v3.3'}
first=call('POST',base,body,status=201);second=call('POST',base,body,status=201)
check('run retry retains identity',first==second)
call('POST',base,body|{'world':'Kumoh'},status=409);passed.append('changed run rejected')
call('POST',base,body|{'run_id':uid(),'environment':'REAL'},status=422);passed.append('REAL rejected')
call('POST',base,body|{'run_id':uid(),'scenario':'ROUTE'},status=422);passed.append('route required')
call('POST',base,body|{'run_id':uid(),'scenario':'ROUTE','waypoints':[{'north_m':101,'east_m':0,'altitude_m':15}]},status=422);passed.append('route range validated')
check('CSRF required',client.post(base,json=body,headers={'Authorization':headers['operator']['Authorization']}).status_code==403)
call('GET',worker,role='vision',status=403);passed.append('wrong workload denied')
pending=call('GET',worker,role='device');check('request delivered to worker',rid in [r['run_id'] for r in pending])
sid=uid();claimed=call('POST',worker+'/'+rid+'/claim',{'producer_session_id':sid},role='device')
check('claim retry same owner',claimed==call('POST',worker+'/'+rid+'/claim',{'producer_session_id':sid},role='device'))
call('POST',worker+'/'+rid+'/claim',{'producer_session_id':uid()},role='device',status=409);passed.append('second worker session denied')
commands=call('GET',worker+'/'+rid+'/commands',role='device');command=commands[0]
check('START command envelope',command['action']=='START' and command['sequence']=='0')
sample={'sample_id':uid(),'producer_session_id':sid,'sequence':'9007199254740993','sim_time_ns':'9007199254740994','kind':'TELEMETRY','data':{'coordinate_frame':'NED_M','position':{'north_m':1,'east_m':2,'down_m':-5}}}
target=worker+'/'+rid+'/samples'
call('POST',target,sample,role='device');check('sample retry idempotent',call('POST',target,sample,role='device')['duplicate'])
call('POST',target,sample|{'data':sample['data']|{'landed_state':1}},role='device',status=409);passed.append('changed sample rejected')
call('POST',target,sample|{'sample_id':uid()},role='device',status=409);passed.append('sequence collision rejected')
call('POST',target,sample|{'sample_id':uid(),'sequence':'2','producer_session_id':uid()},role='device',status=409);passed.append('wrong producer session denied')
call('POST',target,sample|{'sample_id':uid(),'sequence':'2','data':{'coordinate_frame':'WGS84'}},role='device',status=422);passed.append('coordinate contract validated')
def send(seq,kind,data):return call('POST',target,{'sample_id':uid(),'producer_session_id':sid,'sequence':str(seq),'kind':kind,'data':data},role='device')
send(3,'COMMAND_REPORT',{'command_id':command['command_id'],'state':'ACKNOWLEDGED'})
send(4,'PLAN',{'algorithm':'provided_route','version':'1','input_hash':'a'*64,'waypoints':[{'north_m':8,'east_m':0,'altitude_m':15}],'metrics':{'length_m':8}})
passed.append('plan provenance saved')
send(5,'COMMAND_REPORT',{'command_id':command['command_id'],'state':'COMPLETED'})
send(6,'RUN_STATUS',{'state':'COMPLETED'})
check('terminal run confirmed',call('GET',base+'/'+rid)['state']=='COMPLETED')
call('POST',worker+'/'+rid+'/claim',{'producer_session_id':sid},role='device',status=409);passed.append('terminal run not reexecuted')
send(7,'PIPELINE_EVENT',{'stage':'delayed-upload'})
page=call('GET',base+'/'+rid+'/samples')
check('late data retained',page['samples'][-1]['late'] is True)
check('int64 strings preserved',page['samples'][0]['sequence']==sample['sequence'] and page['samples'][0]['sim_time_ns']==sample['sim_time_ns'] and isinstance(page['next_cursor'],str))
check('cursor pagination',len(call('GET',base+'/'+rid+'/samples?after='+page['next_cursor'])['samples'])==0)
other=body|{'run_id':uid()};call('POST',base,other,status=201)
stopid=uid();stopped=call('POST',base+'/'+other['run_id']+'/stop',{'command_id':stopid},status=202)
check('stop retry idempotent',stopped==call('POST',base+'/'+other['run_id']+'/stop',{'command_id':stopid},status=202))
check('queued cancellation',call('GET',base+'/'+other['run_id'])['state']=='CANCELLED')
with transaction() as c:
    check('direct writes denied',not one(c,"SELECT has_table_privilege(current_user,'simulation.sample','INSERT') AS allowed")['allowed'])
    check('schema separated',one(c,"SELECT count(*) AS n FROM information_schema.tables WHERE table_schema='simulation' AND table_type='BASE TABLE'")['n']==3)
    check('samples accumulate',one(c,'SELECT count(*) AS n FROM simulation.sample WHERE run_id=%s',(rid,))['n']==6)
print(json.dumps({'passed':len(passed),'checks':passed}))
