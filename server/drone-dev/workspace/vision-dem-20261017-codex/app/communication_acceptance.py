"""Trace security/durability regression against a disposable restored database."""
import asyncio,concurrent.futures,json,os,tempfile,time,uuid
import threading
from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient
from drone_backend.deployment import app
from drone_backend.core import IDENTITY
from app.communication import CommunicationTrace,Spool,log_connect

assert os.environ['DRONE_DB_NAME'].startswith('backend_verify_')
registry=json.loads((IDENTITY/'principals.json').read_text())
operator=next(p for p in registry if 'business.operator' in p['scopes'])
worker=next(p for p in registry if p['id']=='sim-worker-01')
@app.middleware('http')
async def verified_test_transport(request,call_next):
    p=next((p for p in registry if request.headers.get('authorization')=='Bearer '+p['token']),None)
    if p:request.scope['client_certificate_sha256']=p['certificate_sha256']
    return await call_next(request)
checks=[]
def check(name,value):assert value,name;checks.append(name)
headers={'Authorization':'Bearer '+operator['token'],'Origin':'https://localhost:18443'}
with TestClient(app,base_url='https://backend.internal') as api:
    r=api.post('/api/v1/auth/login',json={'login_id':'simulation-acceptance','password':'<REDACTED>'},headers=headers)
    check('login',r.status_code==200)
    headers['X-CSRF-Token']=r.json()['csrf_token']
    creation_run=str(uuid.uuid4());stop_operation=str(uuid.uuid4())
    created=api.post('/api/v1/simulations/runs',json={'run_id':creation_run,'worker_id':'sim-worker-01','simulator_version':'acceptance-v1'},headers=headers)
    check('create_request_for_trace',created.status_code==201)
    stopped=api.post('/api/v1/simulations/runs/'+creation_run+'/stop',json={'command_id':stop_operation},headers=headers)
    check('stop_request_for_trace',stopped.status_code==202)
    r=api.get('/api/v1/communications/summary',headers=headers);check('monitor_scope',r.status_code==200)
    rid=str(uuid.uuid4());r=api.get('/api/v1/readiness',headers=headers|{'X-Request-ID':rid,'X-User-ID':'forged'})
    check('request_id_response',r.headers['x-request-id']==rid)
    check('server_timing_header_compatible','db_connect;dur=' in r.headers['server-timing'])
    unsupported=api.request('TRACE','/api/v1/communications/logs?private=redaction-test',headers=headers)
    check('unsupported_method_denied',unsupported.status_code==405)
    wh={'Authorization':'Bearer '+worker['token']}
    check('simulator_cannot_read_logs',api.get('/api/v1/communications/logs',headers=wh).status_code==403)
    denied=api.get('/api/v1/communications/logs')
    check('anonymous_cannot_read_logs',denied.status_code==401)
    check('error_body_id_matches_trace_header',denied.json()['error']['request_id']==denied.headers['x-request-id'])
    check('invalid_interval',api.get('/api/v1/communications/logs?since=2020-01-01T00:00:00Z',headers=headers).status_code==422)
    event={'event_id':str(uuid.uuid4()),'event_at':'2026-10-09T00:00:00Z','request_id':str(uuid.uuid4()),'route':'/device/v1/simulations/runs',
      'method':'GET','status':None,'duration_ms':23,'bytes_in':0,'bytes_out':0,'error_code':'NETWORK_ERROR'}
    check('client_failure_ingestion',api.post('/device/v1/communications/client-events',json={'events':[event]},headers=wh).status_code==202)
    check('client_cannot_forge_identity',api.post('/device/v1/communications/client-events',json={'events':[event|{'principal_id':'someone-else'}]},headers=wh).status_code==422)
    check('client_batch_limit',api.post('/device/v1/communications/client-events',json={'events':[event]*51},headers=wh).status_code==422)
    time.sleep(1)
    rows=api.get('/api/v1/communications/logs',headers=headers).json()['logs']
    trace=next(x for x in rows if x['request_id']==rid)
    check('authenticated_actor',trace['principal_id']==operator['id'] and trace['actor_user_id'] is not None)
    check('db_timings',trace['timings'].get('db_connect',0)>0 and trace['timings'].get('db_transaction',0)>0)
    check('route_redaction',trace['route']=='/api/v1/readiness' and 'forged' not in json.dumps(trace))
    unusual=next(x for x in rows if x['request_id']==unsupported.headers['x-request-id'])
    check('unsupported_method_logged_without_poisoning_writer',unusual['method']=='OTHER' and 'redaction-test' not in json.dumps(unusual))
    creation=next(x for x in rows if x['request_id']==created.headers['x-request-id'])
    stopping=next(x for x in rows if x['request_id']==stopped.headers['x-request-id'])
    check('create_trace_has_run_uuid',creation['run_id']==creation_run and creation['operation_id']==creation_run)
    check('stop_trace_has_command_uuid',stopping['run_id']==creation_run and stopping['operation_id']==stop_operation)
    check('keyset_paging',api.get('/api/v1/communications/logs?before='+rows[-1]['event_id'],headers=headers).status_code==200)
    monitor_row=api.get('/api/v1/communications/summary',headers=headers).json();check('percentiles',bool(monitor_row['groups']))

with tempfile.TemporaryDirectory() as temp:
    sink=Spool(temp)
    row={'event_id':str(uuid.uuid4()),'event_at':'2026-10-09T00:00:00Z','source':'SERVER','service':'backend','kind':'HTTP',
      'request_id':str(uuid.uuid4()),'route':'/test','method':'GET','status':200,'duration_ms':1,'bytes_in':0,'bytes_out':0,'timings':{}}
    def unavailable():raise OSError('Injected DB unavailable')
    sink.emit(row);sink.connect=unavailable
    try:sink.drain()
    except OSError:pass
    check('db_outage_keeps_spool',len(list(Path(temp).glob('*.json')))==1)
    resumed=Spool(temp,log_connect);resumed.started=True
    check('restart_upload',resumed.drain()==1)
    resumed.emit(row);check('duplicate_retry',resumed.drain()==1)
    resumed.emit(row|{'status':500})
    check('conflicting_uuid_rejected',resumed.drain()==0)
    check('conflict_quarantined_for_inspection',len(list(Path(temp).glob('*.conflict')))==1)
    resumed.emit(row|{'event_id':str(uuid.uuid4())});check('conflict_does_not_block_other_logs',resumed.drain()==1)
    with patch.object(Path,'open',side_effect=OSError('disk full')):
        try:sink.emit(row|{'event_id':str(uuid.uuid4())})
        except OSError:checks.append('disk_full_visible')
        else:raise AssertionError('Disk-full failure hidden')

class Memory:
    def __init__(self):self.rows=[]
    def emit(self,row):self.rows.append(row)
memory=Memory()
async def ws(scope,receive,send):
    await send({'type':'websocket.accept'});await receive();await send({'type':'websocket.send','text':'hello'})
    await receive();await send({'type':'websocket.close','code':1000})
messages=iter([{'type':'websocket.receive','text':'ping'},{'type':'websocket.disconnect','code':1001}])
async def receive():return next(messages)
async def send(message):pass
with patch('app.communication.spool',return_value=memory):
    asyncio.run(CommunicationTrace(ws,'backend')({'type':'websocket','path':'/api/v1/ws','headers':[]},receive,send))
check('ws_open_close',[r['kind'] for r in memory.rows]==['WS_OPEN','WS_CLOSE'])
check('ws_counts_close_code',memory.rows[-1]['bytes_in']==4 and memory.rows[-1]['bytes_out']==5 and memory.rows[-1]['timings']['ws_close_code']==1000 and memory.rows[-1]['error_code'] is None)
import app.communication as tracing
barrier=threading.Barrier(8)
def shared_spool(_):barrier.wait();return tracing.spool()
with patch.object(tracing,'SPOOL',None),patch.object(tracing,'Spool',side_effect=lambda *args:(time.sleep(.01),Memory())[1]):
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:instances=list(pool.map(shared_spool,range(8)))
check('concurrent_initialization_single_writer',len({id(x) for x in instances})==1)
async def recovered_http(scope,receive,send):
    tracing.TRACE.get()['error_code']='FORBIDDEN'
    await send({'type':'http.response.start','status':200,'headers':[]});await send({'type':'http.response.body','body':b'{}'})
with patch('app.communication.spool',return_value=memory):
    asyncio.run(CommunicationTrace(recovered_http,'backend')({'type':'http','method':'GET','path':'/','headers':[]},receive,send))
check('recovered_auth_fallback_not_a_failure',memory.rows[-1]['status']==200 and memory.rows[-1]['error_code'] is None)
with log_connect() as conn:
    for privilege in ('UPDATE','DELETE'):
        check('writer_no_'+privilege,not conn.execute("SELECT has_table_privilege(current_user,'observability.communication_log',%s)",(privilege,)).fetchone()[0])
print(json.dumps({'state':'passed','checks':len(checks),'passed':checks}))
