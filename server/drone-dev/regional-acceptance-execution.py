"""Live HTTPS acceptance with real operator auth; no flight when PC is unavailable."""
import http.cookiejar,json,ssl,sys,time,urllib.request,urllib.error
from pathlib import Path
from uuid import uuid4
ROOT=Path('/home/se/sandboxes/drone-dev');STAGE=ROOT/'regional-execution-stage';BASE='https://127.0.0.1:18443'
credentials=json.loads(sys.stdin.read());csrf='';checks=[]
client=urllib.request.build_opener(urllib.request.HTTPSHandler(context=ssl.create_default_context(cafile=str(ROOT/'certs/ca.crt'))),urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def call(path,body=None,expected=200,token=True):
    headers={'Origin':BASE,'Content-Type':'application/json'}
    if csrf and token:headers['X-CSRF-Token']=csrf
    req=urllib.request.Request(BASE+path,data=None if body is None else json.dumps(body).encode(),headers=headers)
    try:
        with client.open(req,timeout=70) as r:status=r.status;data=r.read()
    except urllib.error.HTTPError as e:status=e.code;data=e.read()
    assert status==expected,(path,status,data[:200].decode(errors='replace'))
    return json.loads(data)
report=dict(scope='LIVE_HTTPS_NO_FLIGHT',checks=checks,simulationStarted=False)
try:
    call('/api/v1/simulations/regional-executors',expected=401);checks.append('anonymous_rejected')
    csrf=call('/api/v1/auth/login',credentials)['csrf_token'];credentials.clear();checks.append('test_account_login')
    for name in ('regional-search.html','regional-search.js','regional-search.css','test-patrol.html'):
        with client.open(BASE+'/'+name) as r:content=r.read()
        assert content
        if name=='test-patrol.html':assert b'/regional-search.html' in content
    checks.append('live_web_assets_and_existing_console_link')
    mid=str(uuid4());report['missionId']=mid
    call('/api/v1/missions',dict(mission_id=mid,drone_id='sim-pi-01',environment='SIM'),201)
    draft=dict(request_id=str(uuid4()),expected_draft_revision=0,release_id='campus-04e1b46514574d45',selected_zone_ids=['zone-106c8e3a7e32'],name='지역수색 실행 연결 검증',mission_type='AREA_RECON',conditions=dict(altitude_m=30,speed_mps=3,observation_seconds=3,return_reserve_percent=20,priority_mode='UNIFORM'))
    call(f'/api/v1/missions/{mid}/map-drafts',draft,201)
    region=call(f'/api/v1/missions/{mid}/regions')[0];jid=str(uuid4());report['jobId']=jid
    path=f'/api/v1/missions/{mid}/regional-search'
    call(path,dict(job_id=jid,mission_revision=1,region_id=region['region_id']),202)
    began=time.monotonic()
    while time.monotonic()-began<150:
        job=call(path+'/'+jid)
        if job['state'] not in ('RUNNING','QUEUED'):break
        time.sleep(2)
    assert job['state']=='READY';checks.append('fresh_http_plan_ready')
    report['planning']={k:job['result'][k] for k in ('preparationSeconds','packageId','adapterHash','actualEvidenceWrites')}
    report['forecast']={k:job['result']['plan'].get(k) for k in ('predictedPercent','predictedFirstTargetSeconds')}
    ready=call(path+'/'+jid+'/execution-readiness?worker_id=sim-pi-01');report['readiness']=ready
    assert ready['actualCoverageConnected'] and not ready['executable']
    body=dict(execution_id=str(uuid4()),worker_id='sim-pi-01',result_hash=job['result_hash'])
    call(path+'/'+jid+'/start',body,403,False);checks.append('start_csrf_rejected')
    denied=call(path+'/'+jid+'/start',body,409)
    assert denied['error']['code'] in ('SIM_EXECUTOR_NOT_FRESH','SIM_EXECUTOR_NOT_READY');checks.append('disconnected_executor_start_rejected')
    assert call(f'/api/v1/missions/{mid}/regional-executions')==[];checks.append('no_execution_or_actual_coverage_fabricated')
    report['status']='PASS'
except Exception as exc:report.update(status='FAIL',error=repr(exc))
finally:
    credentials.clear()
    if csrf:
        try:call('/api/v1/auth/logout',{});report['logout']=True
        except Exception:report['logout']=False
    (STAGE/'https-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(report,ensure_ascii=True))
