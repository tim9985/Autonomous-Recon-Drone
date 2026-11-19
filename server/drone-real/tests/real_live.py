"""Real TLS and WSS on the installed services; only auth sessions are created here."""
import asyncio,json,ssl
from pathlib import Path
import httpx
from websockets.asyncio.client import unix_connect
from websockets.exceptions import InvalidStatus

IDENTITY=Path('/run/identity')
def client(role,socket,host,mutual=True):
    folder=IDENTITY/role
    ctx=ssl.create_default_context(cafile=str(folder/'ca.crt'))
    if mutual:ctx.load_cert_chain(folder/'client.crt',folder/'client.key')
    return httpx.Client(base_url='https://'+host,transport=httpx.HTTPTransport(uds=socket,verify=ctx),trust_env=False)

edge=client('gateway','/run/gateway-socket/service.sock','localhost',False)
device=client('device','/run/backend-socket/service.sock','backend.internal')
vision=client('vision','/run/backend-socket/service.sock','backend.internal')
operator=client('gateway','/run/backend-socket/service.sock','backend.internal')
passed=[]
def check(name,ok):assert ok,name;passed.append(name)
account=json.loads((IDENTITY/'operator-login.json').read_text())
origin={'Origin':'https://localhost:19443'}
check('Gateway rejects anonymous reads',edge.get('/api/v1/readiness').status_code==401)
check('Gateway bounds chunked bodies before authentication',edge.post('/api/v1/auth/login',content=iter([b'x'*40000,b'x'*40000])).status_code==413)
login=edge.post('/api/v1/auth/login',headers=origin,json={'login_id':account['username'],'password':account['password']})
check('Actual TLS login succeeds',login.status_code==200)
check('Cookie is secure and distinct','drone_real_session=' in login.headers['set-cookie'] and 'HttpOnly' in login.headers['set-cookie'])
status=edge.get('/api/v1/readiness')
check('Actual TLS reaches REAL DB',status.status_code==200 and status.json()['environment']=='REAL' and status.json()['storage_ready'])
check('Actual device mTLS/token accepted',device.get('/device/v1/commands',headers={'Authorization':'Bearer '+(IDENTITY/'device/token').read_text().strip()}).status_code==503)
check('Token without matching certificate denied',operator.get('/device/v1/commands',headers={'Authorization':'Bearer '+(IDENTITY/'device/token').read_text().strip()}).status_code==401)
check('Vision workload can poll frames',vision.get('/internal/v1/frames',headers={'Authorization':'Bearer '+(IDENTITY/'vision/token').read_text().strip()}).status_code==200)
check('Operator gateway cannot expose workload routes',edge.post('/device/v1/sessions',json={}).status_code in (404,405))
async def websocket():
    context=ssl.create_default_context(cafile=str(IDENTITY/'gateway/ca.crt'))
    cookie='; '.join(k+'='+v for k,v in edge.cookies.items())
    async with unix_connect('/run/gateway-socket/service.sock',uri='wss://localhost:19443/api/v1/ws',ssl=context,server_hostname='localhost',
        origin='https://localhost:19443',additional_headers={'Cookie':cookie},open_timeout=5) as ws:
        # Opening authenticates both the gateway workload and operator session. No fixture mission is inserted.
        check('Actual WSS carries operator and TLS workload identity',True)
        await ws.close()
    try:
        async with unix_connect('/run/gateway-socket/service.sock',uri='wss://localhost:19443/api/v1/ws',ssl=context,server_hostname='localhost',
            origin='https://untrusted.invalid',additional_headers={'Cookie':cookie},open_timeout=5):raise AssertionError('Wrong Origin accepted')
    except InvalidStatus:check('Actual WSS rejects untrusted Origin',True)
asyncio.run(websocket())
logout=edge.post('/api/v1/auth/logout',headers=origin|{'X-CSRF-Token':login.json()['csrf_token']})
check('Actual logout revokes session',logout.status_code==200 and edge.get('/api/v1/readiness').status_code==401)
print(json.dumps({'passed':len(passed),'checks':passed,'writes':'authentication session and audit events only','hardware':'NOT_RUN'}))
