"""Actual TLS/HTTP/WSS acceptance from the existing verifier container."""
import asyncio,json,ssl,uuid
from websockets.asyncio.client import unix_connect
from websockets.exceptions import ConnectionClosed,InvalidStatus
from app.common import client,config,IDENTITY

edge=client('/run/gateway-socket/service.sock','localhost',mutual=False)
account=config('operator-login.json')
headers={'Origin':'https://localhost:18443'}
passed=[]
def check(name,ok):
    assert ok,name
    passed.append(name)
check('business endpoint requires a session',edge.get('/api/v1/readiness').status_code==401)
login=edge.post('/api/v1/auth/login',headers=headers,json={'login_id':account['username'],'password':account['password']})
assert login.status_code==200,login.text
headers['X-CSRF-Token']=login.json()['csrf_token']
check('gateway forwards secure HttpOnly session cookie','HttpOnly' in login.headers['set-cookie'] and 'Secure' in login.headers['set-cookie'])
status=edge.get('/api/v1/readiness').json()
check('SIM API ready without flight or model',status['business_api_ready'] and not status['flight_enabled'] and not status['model_loaded'])
check('user can read permitted drone',edge.get('/api/v1/drones/sim-pi-01').status_code==200)
check('operator cannot reach device API',edge.post('/device/v1/telemetry',json={}).status_code in (404,405))
mid=str(uuid.uuid5(uuid.NAMESPACE_URL,'drone-business/live-SIM-acceptance'))
created=edge.post('/api/v1/missions',json={'mission_id':mid,'drone_id':'sim-pi-01'},headers=headers)
assert created.status_code==201,created.text
snapshot=edge.get('/api/v1/missions/'+mid+'/snapshot')
check('snapshot read through TLS gateway',snapshot.status_code==200 and snapshot.json()['event_cursor'].isdigit())
async def websocket_test():
    ctx=ssl.create_default_context(cafile=str(IDENTITY/'ca.crt'))
    cookie='; '.join(k+'='+v for k,v in edge.cookies.items())
    try:
        async with unix_connect('/run/gateway-socket/service.sock',uri='wss://localhost:18443/api/v1/ws',ssl=ctx,server_hostname='localhost',
              origin='https://untrusted.invalid',additional_headers={'Cookie':cookie},open_timeout=5):
            raise AssertionError('wrong WebSocket Origin accepted')
    except InvalidStatus:
        check('WebSocket rejects untrusted Origin',True)
    async with unix_connect('/run/gateway-socket/service.sock',uri='wss://localhost:18443/api/v1/ws',ssl=ctx,server_hostname='localhost',
          origin='https://localhost:18443',additional_headers={'Cookie':cookie},open_timeout=5) as ws:
        await ws.send(json.dumps({'mission_id':mid,'after_cursor':0}))
        try:
            await asyncio.wait_for(ws.recv(),5)
            raise AssertionError('numeric cursor accepted')
        except ConnectionClosed:
            check('WebSocket rejects malformed subscription with 1008',ws.close_code==1008)
    async with unix_connect('/run/gateway-socket/service.sock',uri='wss://localhost:18443/api/v1/ws',ssl=ctx,server_hostname='localhost',
          origin='https://localhost:18443',additional_headers={'Cookie':cookie},open_timeout=5) as ws:
        await ws.send(json.dumps({'mission_id':mid,'after_cursor':'0'}))
        event=json.loads(await asyncio.wait_for(ws.recv(),8))
        check('real WSS upgrade retains TLS workload and user identity',bool(event.get('events')))
        logout=edge.post('/api/v1/auth/logout',headers=headers)
        check('gateway forwards logout and revocation',logout.status_code==200 and edge.get('/api/v1/readiness').status_code==401)
        try:
            while True: await asyncio.wait_for(ws.recv(),5)
        except ConnectionClosed:
            check('active WebSocket revocation is enforced',ws.close_code==1008)
asyncio.run(websocket_test())
print(json.dumps({'passed':len(passed),'checks':passed,'model_loaded':False,'flight_enabled':False}))
