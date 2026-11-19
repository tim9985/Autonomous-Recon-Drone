"""Review regressions plus normal acceptance, only in a disposable DB and storage volume."""
import asyncio,concurrent.futures,fcntl,multiprocessing,time
from pathlib import Path
from uuid import UUID
from starlette.datastructures import Headers
from unittest.mock import patch
from .acceptance import *
from drone_backend import main,media,analysis
from drone_backend.core import transaction,event,STORAGE,COOKIE

def admin(sql,args=()):
    assert os.environ['DRONE_DB_NAME'].startswith('backend_verify_')
    with psycopg.connect(host='/run/db-socket',dbname=os.environ['DRONE_DB_NAME'],user='drone_owner',
        password=(IDENTITY/'test-owner-password').read_text().strip()) as c:
        return c.execute(sql,args).fetchall() if sql.lstrip().upper().startswith('SELECT') else c.execute(sql,args)

login=call('POST','/api/v1/auth/login',{'login_id':'backend-acceptance','password':'<REDACTED>'})
headers['operator']['X-CSRF-Token']=login['csrf_token']
check('me recovers CSRF after browser reload',call('GET','/api/v1/auth/me')['csrf_token']==login['csrf_token'])
did='sim-pi-01'
def acquire():
    d=call('GET','/api/v1/drones/'+did)['drone']
    return call('POST',f'/api/v1/drones/{did}/control/acquire',{'expected_control_revision':d['control_revision']})
ctl=acquire();sid=uid()
call('POST','/device/v1/sessions',{'session_id':sid,'control_epoch':'2','rc_taken':False,'lease_id':uid(),'lease_expires_at':(now()+timedelta(seconds=600)).isoformat()},'device')
call('POST','/device/v1/telemetry',tel|{'sample_id':uid(),'producer_session_id':sid,'sequence':'1','source_time_utc':now().isoformat()},'device')
def issue_new():
    d=call('GET','/api/v1/drones/'+did)['drone']
    return call('POST',f'/api/v1/drones/{did}/commands',cmd|{'command_id':uid(),'expected_control_revision':d['control_revision']},expect=202)
old=issue_new();check('new generation command delivered',old['command_id'] in [r['command_id'] for r in call('GET','/device/v1/commands',role='device')])
call('POST',f'/api/v1/drones/{did}/control/release',{'expected_control_revision':ctl['control_revision']});ctl=acquire()
check('release and same-session reacquire cannot resurrect old command',old['command_id'] not in [r['command_id'] for r in call('GET','/device/v1/commands',role='device')])
response=client.post(f"/device/v1/commands/{old['command_id']}/reports",json=report|{'gateway_session_id':sid,'control_epoch':'2','request_hash':old['request_hash']},headers=headers['device'])
check('cached command cannot start after control generation changed',response.status_code==409)
queued=issue_new()
admin("UPDATE drone.user_account SET permissions='[{\"drone_id\":\"sim-pi-01\",\"scopes\":[\"read\",\"edit\"]}]' WHERE login_id='backend-acceptance'")
check('permission removal immediately stops command delivery',not call('GET','/device/v1/commands',role='device'))
admin("UPDATE drone.user_account SET permissions='[{\"drone_id\":\"sim-pi-01\",\"scopes\":[\"read\",\"edit\",\"control\"]}]' WHERE login_id='backend-acceptance'")
ctl=acquire()
check('permission restoration cannot resurrect commands',not call('GET','/device/v1/commands',role='device'))
issue_new();check('new authorized commands still delivered',bool(call('GET','/device/v1/commands',role='device')))
historical=report|{'gateway_session_id':sid,'control_epoch':'2','request_hash':old['request_hash'],'state':'EXECUTING','evidence_at':now().isoformat()}
recorded=call('POST',f"/device/v1/commands/{old['command_id']}/evidence",historical,'device')
check('historical evidence retained without enabling stale command',recorded['recorded'] and not recorded['reconciled'] and call('GET',f"/api/v1/commands/{old['command_id']}")['state']=='REQUESTED')
check('historical evidence retry is idempotent',call('POST',f"/device/v1/commands/{old['command_id']}/evidence",historical,'device')['duplicate'])
ongoing=issue_new();running=report|{'gateway_session_id':sid,'control_epoch':'2','request_hash':ongoing['request_hash'],'evidence_at':now().isoformat()}
call('POST',f"/device/v1/commands/{ongoing['command_id']}/reports",running,'device')
call('POST',f"/device/v1/commands/{ongoing['command_id']}/reports",running|{'status_revision':2,'state':'EXECUTING'},'device')
call('POST','/device/v1/sessions',{'session_id':uid(),'control_epoch':'3','rc_taken':False,'lease_id':uid(),'lease_expires_at':(now()+timedelta(seconds=600)).isoformat()},'device')
completed=running|{'status_revision':3,'state':'COMPLETED','evidence':{'sim_completed':True}}
check('terminal evidence survives device session change',call('POST',f"/device/v1/commands/{ongoing['command_id']}/reports",completed,'device')['state']=='COMPLETED')
check('recorded report retry survives session change',call('POST',f"/device/v1/commands/{issued['command_id']}/reports",report|{'status_revision':3,'state':'COMPLETED','evidence':{'sim_completed':True}},'device')['state']=='COMPLETED')

with transaction(events=True) as c:
    admin("INSERT INTO drone.drone(drone_id,name,gateway_state,link_state) VALUES ('other-sim','other','{}','{}')")
    event(c,'CONTROL_ACQUIRED',drone_id='other-sim',payload={'test':'excluded other drone'})
    event(c,'SESSION_CREATED',payload={'test':'excluded global session'})
events=call('GET',f'/api/v1/missions/{mid}/events?limit=100')['events']
check('mission replay includes control device and safety events',{'CONTROL_ACQUIRED','CONTROL_RELEASED','DEVICE_CONNECTED','SAFETY_REPORTED'}<={e['event_type'] for e in events})
check('mission replay excludes other drone and global session events',all(e['drone_id']!='other-sim' and e['event_type']!='SESSION_CREATED' for e in events))

failed_job,failed_claim=submit_job();rid=failed_job['analysis_run_id']
failure={'claim_id':failed_claim['claim_id'],'attempt_no':failed_claim['attempt_no'],'reason':'worker failed'}
call('POST',f'/internal/v1/analysis-runs/{rid}/attempt-failures',failure,'vision')
for suffix,method,body in [('/completion','POST',{'claim_id':failed_claim['claim_id'],'attempt_no':1,'observations':[]}),('/input','GET',None),('','GET',None)]:
    response=client.request(method,f'/internal/v1/analysis-runs/{rid}'+suffix,json=body,headers=headers['vision'])
    check('failed attempt rejected for '+suffix,response.status_code==409)
new_claim=call('POST','/internal/v1/analysis-runs/claim',role='vision')
check('failed claim retry keeps idempotence after next attempt',call('POST',f'/internal/v1/analysis-runs/{rid}/attempt-failures',failure,'vision')['duplicate'])
check('changed failure retry rejected',client.post(f'/internal/v1/analysis-runs/{rid}/attempt-failures',json=failure|{'reason':'changed'},headers=headers['vision']).status_code==409)
call('POST',f'/internal/v1/analysis-runs/{rid}/completion',{'claim_id':new_claim['claim_id'],'attempt_no':new_claim['attempt_no'],'observations':[]},'vision')
check('failed claim cannot retry a later successful completion',client.post(f'/internal/v1/analysis-runs/{rid}/completion',json={'claim_id':failed_claim['claim_id'],'attempt_no':failed_claim['attempt_no'],'observations':[]},headers=headers['vision']).status_code==409)

# Saturation is rejected before a database connection or password hash; usernames create no state.
main.login_slots.acquire();main.login_slots.acquire()
try:
    with patch.object(main,'password_ok',side_effect=AssertionError('hash must not run')):
        check('password workload rejected before hashing',client.post('/api/v1/auth/login',json={'login_id':'unique-id','password':'wrong'},headers=headers['operator']).status_code==429)
finally:main.login_slots.release();main.login_slots.release()
for n in range(12):
    with patch.object(main,'password_ok',return_value=False):
        assert client.post('/api/v1/auth/login',json={'login_id':str(n),'password':'bad'},headers=headers['operator']).status_code==401
login=call('POST','/api/v1/auth/login',{'login_id':'backend-acceptance','password':'<REDACTED>'})
headers['operator']['X-CSRF-Token']=login['csrf_token']
check('failed guesses do not lock correct login or retain username map',not hasattr(main,'login_failures'))

def bundle_new(size=5):
    return {'bundle_id':uid(),'mission_id':mid,'files':[{'asset_id':uid(),'role':role,'byte_size':size,'sha256':hashlib.sha256(b'x'*size).hexdigest()} for role in ('VIDEO','SIDECAR')]}
cancel_bundle=bundle_new();call('POST','/device/v1/media-bundles',cancel_bundle,'device',201)
first=cancel_bundle['files'][0]
assert client.put(f"/device/v1/media-assets/{first['asset_id']}/content",content=b'xxxxx',headers=headers['device']).status_code==200
row=call('POST',f"/api/v1/media-bundles/{cancel_bundle['bundle_id']}/cancel")
check('partial bundle cancellation preserves stored child',row['state']=='FAILED' and client.get(f"/api/v1/media-assets/{first['asset_id']}/content",headers=headers['operator']).content==b'xxxxx')
check('cancel retry idempotent',call('POST',f"/device/v1/media-bundles/{cancel_bundle['bundle_id']}/cancel",role='device')['state']=='FAILED')
check('cancelled reservation cannot finalize or upload',client.post(f"/device/v1/media-bundles/{cancel_bundle['bundle_id']}/finalize",headers=headers['device']).status_code==409 and client.put(f"/device/v1/media-assets/{cancel_bundle['files'][1]['asset_id']}/content",content=b'xxxxx',headers=headers['device']).status_code==409)
check('stored bundle remains protected from cancellation',client.post(f'/device/v1/media-bundles/{bid}/cancel',headers=headers['device']).status_code==409)
expired=bundle_new();call('POST','/device/v1/media-bundles',expired,'device',201)
admin('UPDATE drone.media_asset SET created_at=now()-interval \'2 hours\' WHERE asset_id=%s',(expired['bundle_id'],))
call('POST','/device/v1/media-bundles',bundle_new(),'device',201)
check('expired reservation automatically releases unfinished quota',call('GET',f"/device/v1/media-bundles/{expired['bundle_id']}",role='device')['state']=='FAILED')

# Cancellation commit precedes deletion; failed cleanup stays charged and is retried.
broken=bundle_new();call('POST','/device/v1/media-bundles',broken,'device',201)
target=STORAGE/'missions'/mid/(broken['files'][0]['asset_id']+'.bin');target.write_bytes(b'xxxxx')
with patch.object(media,'event',side_effect=RuntimeError('injected commit failure')):
    try:client.post(f"/device/v1/media-bundles/{broken['bundle_id']}/cancel",headers=headers['device']);raise AssertionError('failure not injected')
    except RuntimeError:pass
check('cancel transaction failure preserves uncommitted bytes',target.exists() and call('GET',f"/device/v1/media-bundles/{broken['bundle_id']}",role='device')['state']=='WRITING')
unlink=Path.unlink
def fail_delete(path,*a,**k):
    if path==target:raise PermissionError('injected deletion failure')
    return unlink(path,*a,**k)
with patch.object(Path,'unlink',fail_delete):
    check('filesystem cleanup failure returns retryable error',client.post(f"/device/v1/media-bundles/{broken['bundle_id']}/cancel",headers=headers['device']).status_code==503)
row=call('GET',f"/device/v1/media-bundles/{broken['bundle_id']}",role='device')
check('pending cleanup is cancelled but still charged',row['state']=='FAILED' and row['meta']['cleanup_pending'] and target.exists() and admin("SELECT count(*) FROM drone.media_asset WHERE state='FAILED' AND meta->>'cleanup_pending'='true'")[0][0]>0)
media.collect_expired()
check('cleanup resumes after failure without deleting stored children',not target.exists() and not call('GET',f"/device/v1/media-bundles/{broken['bundle_id']}",role='device')['meta']['cleanup_pending'] and client.get(f"/api/v1/media-assets/{first['asset_id']}/content",headers=headers['operator']).content==b'xxxxx')
expired=bundle_new();call('POST','/device/v1/media-bundles',expired,'device',201)
admin('UPDATE drone.media_asset SET created_at=now()-interval \'2 hours\' WHERE asset_id=%s',(expired['bundle_id'],))
config_before=media.settings()
with patch.object(media,'settings',return_value=config_before|{'max_storage_bytes':1}):
    assert client.post('/device/v1/media-bundles',json=bundle_new(),headers=headers['device']).status_code==503
check('quota rejection cannot roll back expiry reclamation',call('GET',f"/device/v1/media-bundles/{expired['bundle_id']}",role='device')['state']=='FAILED')
with patch.object(media,'durable_install',side_effect=AssertionError('manifest was rewritten')):
    check('stored finalize retry allocates no duplicate manifest',call('POST',f'/device/v1/media-bundles/{bid}/finalize',role='device')==stored)

crossing=bundle_new();call('POST','/device/v1/media-bundles',crossing,'device',201)
phase=[False];actual_now=media.now
class CrossingRequest:
    headers=Headers(headers['device'])
    scope={'client_certificate_sha256':roles['device']['certificate_sha256']}
    async def stream(self):yield b'xxxxx';phase[0]=True
with patch.object(media,'now',side_effect=lambda:actual_now()+timedelta(hours=2) if phase[0] else actual_now()):
    try:asyncio.run(media.upload(UUID(crossing['files'][0]['asset_id']),CrossingRequest()));raise AssertionError('Expired upload was stored')
    except main.HTTPException as exc:check('expiry rechecked after upload stream',exc.detail=='RESERVATION_EXPIRED')

# Exercise the cross-process lock, a stalled stream, cancellation contention and crash debris.
race=bundle_new();call('POST','/device/v1/media-bundles',race,'device',201);aid=race['files'][0]['asset_id']
part=STORAGE/'missions'/mid/(aid+'.part');part.write_bytes(b'orphan')
class SlowRequest:
    headers=Headers(headers['device'])
    scope={'client_certificate_sha256':roles['device']['certificate_sha256']}
    async def stream(self):
        started.set()
        while not release.is_set(): await asyncio.sleep(.01)
        yield b'xxxxx'
import threading
started=threading.Event();release=threading.Event()
def slow_upload():return asyncio.run(media.upload(UUID(aid),SlowRequest()))
with concurrent.futures.ThreadPoolExecutor() as pool:
    pending_upload=pool.submit(slow_upload)
    try:
        if not started.wait(5):pending_upload.result(1);raise AssertionError('upload did not start')
        check('orphan part recovered before new stream',part.exists() and part.stat().st_size==0)
        check('concurrent upload and cancellation fail promptly',client.put(f'/device/v1/media-assets/{aid}/content',content=b'xxxxx',headers=headers['device']).status_code==409 and client.post(f"/device/v1/media-bundles/{race['bundle_id']}/cancel",headers=headers['device']).status_code==409)
        def child_lock(q):
            try:
                with media.media_lock():q.put('unexpected')
            except main.HTTPException as e:q.put(e.detail)
        ctx=multiprocessing.get_context('fork');q=ctx.Queue();process=ctx.Process(target=child_lock,args=(q,));process.start()
        check('media exclusion holds across processes',q.get(timeout=5)=='MEDIA_BUSY');process.join(5)
    finally:release.set()
    check('original upload completes with single file',pending_upload.result(5)['stored'] and not part.exists())

# 100 active jobs must not hide the next eligible job.
jobs=[]
for i in range(101):
    j=job|{'analysis_run_id':uid()};call('POST','/api/v1/analysis-runs',j,expect=201);jobs.append(j)
    if i<100:call('POST','/internal/v1/analysis-runs/claim',role='vision')
claim101=call('POST','/internal/v1/analysis-runs/claim',role='vision')
check('claim considers jobs beyond first 100 active leases',claim101['analysis_run_id']==jobs[100]['analysis_run_id'])

# Use the real aggregation against 1001 selected observations.
selected=jobs[100]['analysis_run_id'];selected_job=claim101
admin("INSERT INTO drone.detection_observation(observation_id,candidate_id,frame_id,analysis_mode,detection_index,bbox,confidence,class_name,observation_kind,model_config_id,coordinate_config_id,association_evidence,geo_result,historical) SELECT gen_random_uuid(),%s,%s,'LIVE_DETECT',g,%s::jsonb,0.8,'person','SIM_DETECTION',%s,NULL,%s::jsonb,%s::jsonb,false FROM generate_series(1,1001) g",(cid,fid,json.dumps(obs['bbox']),config('MODEL'),json.dumps({'analysis_run_id':selected,'analysis_revision':selected_job['analysis_revision'],'job_hash':selected_job['job_hash']}),json.dumps(obs['geo_result'])))
admin("UPDATE drone.video_frame SET analysis_times=jsonb_build_object('selected_run_id',%s::text) WHERE frame_id=%s",(selected,fid))
with transaction(events=True) as c:analysis.summarize_candidates(c,{UUID(cid)})
check('candidate count is exact above 1000 observations',call('GET',f'/api/v1/missions/{mid}/candidates')[0]['evidence_count']==1001)

class Socket:
    headers=Headers(headers['operator'])
    cookies=dict(client.cookies)
    scope={'client_certificate_sha256':roles['operator']['certificate_sha256']}
    async def accept(self):pass
    async def receive_json(self):return {'mission_id':mid,'after_cursor':'0'}
    async def send_json(self,value):raise main.WebSocketDisconnect()
    async def close(self,code):raise AssertionError('unexpected WebSocket close '+str(code))
async def loop_progress():
    progressed=asyncio.Event()
    original=main.ws_page
    def slow_page(*args):
        time.sleep(.2)
        assert progressed.is_set(),'database call blocked the event loop'
        return original(*args)
    async def tick():await asyncio.sleep(.03);progressed.set()
    with patch.object(main,'ws_page',side_effect=slow_page):await asyncio.gather(main.ws(Socket()),tick())
asyncio.run(loop_progress());check('WebSocket database work permits event-loop progress',True)

# Deliberately slow Basic authentication must allow another coroutine to make progress.
import importlib
from types import SimpleNamespace
from unittest.mock import AsyncMock
import app.common as common
fake_upstream=SimpleNamespace(headers={'content-type':'application/json'},content=b'{}',status_code=200)
with patch.object(common,'config',return_value={'username':'test','salt':'00'*16,'digest':'unused'}),patch.object(common,'client',return_value=SimpleNamespace(get=lambda *a,**k:fake_upstream)):
    gateway=importlib.import_module('app.gateway')
async def gateway_progress():
    progressed=asyncio.Event()
    def slow_auth(credentials):time.sleep(.2);assert progressed.is_set(),'Basic hash blocked event loop'
    async def tick():await asyncio.sleep(.03);progressed.set()
    with patch.object(gateway,'operator',side_effect=slow_auth),patch.object(gateway,'basic',AsyncMock(return_value=None)),patch.object(gateway,'text',return_value='test'):
        response,_=await asyncio.gather(gateway.api_read('v1/status',SimpleNamespace(method='GET')),tick())
        assert response.status_code==200
asyncio.run(gateway_progress());check('gateway Basic authentication permits event-loop progress',True)
async def maintenance_started():
    from drone_backend.deployment import app as deployed
    called=threading.Event()
    with patch.object(media,'collect_expired',side_effect=lambda:called.set()):
        async with deployed.router.lifespan_context(deployed):
            for _ in range(100):
                if called.is_set():break
                await asyncio.sleep(.01)
            assert called.is_set(),'periodic cleanup was not started'
asyncio.run(maintenance_started());check('deployed lifespan starts idle reservation cleanup',True)

schema=app.openapi();operations=[(p,m,o) for p,ms in schema['paths'].items() for m,o in ms.items() if m in ('get','post','put')]
check('OpenAPI success responses have schemas',all('content' in r and all(v.get('schema') for v in r['content'].values()) for _,_,o in operations for n,r in o['responses'].items() if n.startswith('2')))
check('OpenAPI matches validation errors and security boundaries',all(o['responses']['422']['content']['application/json']['schema']['$ref'].endswith('/Error') and 'security' in o for _,_,o in operations))
check('binary downloads described as bytes',schema['paths']['/api/v1/media-assets/{aid}/content']['get']['responses']['200']['content']['application/octet-stream']['schema']['format']=='binary')
from release_tools.release_digest import check_migrations
import tempfile
with tempfile.TemporaryDirectory() as folder:
    root=Path(folder);installed=root/'installed';candidate=root/'candidate'
    for p in (installed,candidate):(p/'db/migrations').mkdir(parents=True)
    for p in (installed,candidate):(p/'db/migrations/001_initial.sql').write_text('SELECT 1;')
    check_migrations(candidate,installed)
    (installed/'db/migrations/002_pending.sql').write_text('SELECT 2;')
    try:check_migrations(candidate,installed);raise AssertionError('Untested pending migration accepted')
    except RuntimeError:check('deployment rejects untested pending production migration',True)
    (candidate/'db/migrations/002_pending.sql').write_text('SELECT 2;');check_migrations(candidate,installed)
    (candidate/'db/migrations/001_initial.sql').write_text('changed')
    try:check_migrations(candidate,installed);raise AssertionError('Changed installed migration accepted')
    except RuntimeError:check('deployment refuses to overwrite applied migration',True)
print(json.dumps({'passed':len(passed),'checks':passed,'environment':'disposable SIM','model_loaded':False,'flight_enabled':False},ensure_ascii=False))
