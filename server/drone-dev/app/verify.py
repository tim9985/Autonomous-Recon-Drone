"""One runnable environment acceptance check. Only explicit SIM data is written."""
import json, ssl
from pathlib import Path
from uuid import uuid4
import httpx
from app.common import IDENTITY, text, config

passed=[]
def check(name,condition):
    assert condition,name
    passed.append(name)

def api(role,mutual=True,hostname='backend.internal'):
    ctx=ssl.create_default_context(cafile=str(IDENTITY/'ca.crt'))
    if mutual:ctx.load_cert_chain(IDENTITY/(role+'-client.crt'),IDENTITY/(role+'-client.key'))
    return httpx.Client(base_url='https://'+hostname,timeout=8,trust_env=False,
        transport=httpx.HTTPTransport(uds='/run/backend-socket/service.sock',verify=ctx))

def headers(role):return {'Authorization':'Bearer '+text(role+'-token')}
ctx=ssl.create_default_context(cafile=str(IDENTITY/'ca.crt'))
edge=httpx.Client(base_url='https://localhost',transport=httpx.HTTPTransport(uds='/run/gateway-socket/service.sock',verify=ctx),timeout=15,trust_env=False)
account=config('operator-login.json');login=(account['username'],account['password'])
check('operator authentication required',edge.get('/').status_code==401)
check('wrong password denied',edge.get('/',auth=(account['username'],'incorrect')).status_code==401)
check('authenticated Web served',edge.get('/',auth=login).status_code==200)
check('operator cannot write',edge.post('/api/v1/device/telemetry',auth=login,json={}).status_code==405)
check('operator cannot access service routes',edge.get('/api/v1/vision/jobs',auth=login).status_code==403)
device=api('sim-device');vision=api('vision')
check('missing service token rejected',device.get('/v1/status').status_code==401)
check('token bound to client certificate',device.get('/v1/status',headers=headers('gateway')).status_code==401)
check('vision cannot read operator probes',vision.get('/v1/probes',headers=headers('vision')).status_code==403)
check('device cannot impersonate vision',device.post('/v1/vision/heartbeat',headers=headers('sim-device'),json={}).status_code==403)
try:
    response=api('sim-device',mutual=False).get('/v1/status',headers=headers('gateway'))
    check('mTLS client certificate required',False)
except httpx.HTTPError:
    passed.append('mTLS client certificate required')
try:
    api('sim-device',hostname='wrong.internal').get('/v1/status',headers=headers('sim-device'))
    check('TLS hostname verified',False)
except httpx.HTTPError:
    passed.append('TLS hostname verified')
try:
    bad=httpx.Client(base_url='https://backend.internal',timeout=8,trust_env=False,
        transport=httpx.HTTPTransport(uds='/run/backend-socket/service.sock',verify=True))
    bad.get('/v1/status',headers=headers('sim-device'))
    check('untrusted CA rejected',False)
except httpx.HTTPError:
    passed.append('untrusted CA rejected')
msg={'msg_id':str(uuid4()),'drone_id':'sim-pi-01','source':'SIM','sequence':51,
     'latitude':37.0,'longitude':127.0,'captured_at':'2026-10-05T00:00:00Z'}
one=device.post('/v1/device/telemetry',headers=headers('sim-device'),json=msg)
check('SIM device data stored',one.status_code==200 and one.json()['stored'])
again=device.post('/v1/device/telemetry',headers=headers('sim-device'),json=msg)
check('same ID retry is idempotent',again.status_code==200 and again.json()['duplicate'])
check('same ID changed data rejected',device.post('/v1/device/telemetry',headers=headers('sim-device'),json={**msg,'latitude':38.0}).status_code==409)
check('REAL device input rejected',device.post('/v1/device/telemetry',headers=headers('sim-device'),json={**msg,'source':'REAL'}).status_code==422)
check('other device identity rejected',device.post('/v1/device/telemetry',headers=headers('sim-device'),json={**msg,'drone_id':'other-pi'}).status_code==422)
check('unknown request fields rejected',device.post('/v1/device/telemetry',headers=headers('sim-device'),json={**msg,'flight_enabled':True}).status_code==422)
check('timezone required',device.post('/v1/device/telemetry',headers=headers('sim-device'),json={**msg,'captured_at':'2026-10-05T00:00:00'}).status_code==422)
large=device.post('/v1/device/telemetry',headers={**headers('sim-device'),'Content-Type':'application/json'},content=json.dumps({**msg,'extra':'x'*70000}))
check('oversized body rejected',large.status_code==413)
result={'msg_id':str(uuid4()),'worker_id':'vision-01','source':'SIM','analysis_run_id':str(uuid4()),'detection_count':0,'model_loaded':False}
check('explicit SIM vision result stored',vision.post('/v1/vision/sim-results',headers=headers('vision'),json=result).status_code==200)
rows=edge.get('/api/v1/probes',auth=login)
check('Web reads API-persisted records',rows.status_code==200 and any(x['msg_id']==msg['msg_id'] for x in rows.json()) and any(x['msg_id']==result['msg_id'] for x in rows.json()))
status=edge.get('/api/v1/status',auth=login).json()
check('model and flight remain disabled',status['model_loaded'] is False and status['flight_enabled'] is False)
check('business schema and SIM business API are deployed; REAL is disabled',status['business_schema_deployed'] is True and status['business_api_ready'] is True and status['real_business_ready'] is False)
for _ in range(10):edge.get('/',auth=(account['username'],'incorrect'))
check('failed logins do not lock out valid operator',edge.get('/',auth=login).status_code==200)
check('no raw DB socket or storage mount',not Path('/run/db-socket').exists() and not Path('/data/postgres').exists())
print(json.dumps({'passed':len(passed),'checks':passed,'telemetry_msg_id':msg['msg_id'],'sim_result_msg_id':result['msg_id'],'status':status},ensure_ascii=False))
