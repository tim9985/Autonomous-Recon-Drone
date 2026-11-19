import json
from app.body_limit import is_map_draft, BodyLimit
from app.spatial_compression import SpatialCompression, display_request, versioned_map_path
import hashlib
import hmac
import time
import asyncio
import ssl
from threading import BoundedSemaphore
from pathlib import Path
from fastapi import Depends, FastAPI, HTTPException, Request, Response, WebSocket, WebSocketDisconnect
from app.proxy_response import UpstreamResponse
from starlette.concurrency import run_in_threadpool
from starlette.websockets import WebSocketState
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from app.common import client, config, text, IDENTITY

app=FastAPI(docs_url=None,redoc_url=None,openapi_url=None)
app.add_middleware(BodyLimit)
app.add_middleware(SpatialCompression)
basic=HTTPBasic()
account=config('operator.json')
login_slots=BoundedSemaphore(2)
api=client('/run/backend-socket/service.sock','backend.internal')
# A reverse proxy must never retain a browser's session in its shared HTTP client.
from http.cookiejar import DefaultCookiePolicy
class NoSharedCookies(DefaultCookiePolicy):
    def set_ok(self,cookie,request):return False
    def return_ok(self,cookie,request):return False
api.cookies.jar.set_policy(NoSharedCookies())
web=client('/run/web-socket/service.sock','web.internal')
from school.observability import TRACE
def correlate(request):
    row=TRACE.get()
    if row:
        request.headers['X-Request-ID']=row['request_id']
        if row.get('operation_id'):request.headers['X-Operation-ID']=row['operation_id']
api.event_hooks['request']=[correlate]
web.event_hooks['request']=[correlate]

def operator(c:HTTPBasicCredentials=Depends(basic)):
    if len(c.username)>255 or len(c.password)>512: raise HTTPException(401,'Invalid operator login')
    if not login_slots.acquire(blocking=False): raise HTTPException(429,'Authentication capacity reached')
    try:
        digest=hashlib.pbkdf2_hmac('sha256',c.password.encode(),bytes.fromhex(account['salt']),1_000_000).hex()
        if not (hmac.compare_digest(c.username.encode(),account['username'].encode()) and hmac.compare_digest(digest,account['digest'])):
            raise HTTPException(401,'Invalid operator login',headers={'WWW-Authenticate':'Basic realm="Drone development"'})
    finally: login_slots.release()
    return c.username

def secured(response):
    headers={'Content-Type':response.headers.get('content-type','application/json'),
             'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
             'Content-Security-Policy':"default-src 'self'; frame-ancestors 'none'; base-uri 'none'",
             'Referrer-Policy':'no-referrer'}
    return Response(response.content,status_code=response.status_code,headers=headers)

@app.api_route('/api/{path:path}',methods=['GET','POST','PUT','PATCH','DELETE'])
async def api_read(path:str,request:Request):
    if path in ('v1/status','v1/probes'):
        if request.method!='GET': raise HTTPException(405,'Read-only development endpoint')
        await run_in_threadpool(operator,await basic(request))
        return secured(await run_in_threadpool(api.get,'/'+path,headers={'Authorization':'Bearer '+text('token')}))
    # Only operator business routes are exposed here; device/vision remain internal.
    roots={'auth','readiness','drones','missions','candidates','commands','media-assets','media-bundles','alerts','analysis-runs','configs','spatial-releases','mission-workspaces','simulations','communications','local-patrol','local-search','pc-sync'}
    parts=path.split('/')
    map_get=request.method=='GET' and (path.startswith(('map/','city/','environments/')) or path=='environments')
    if not map_get and (len(parts)<2 or parts[0]!='v1' or parts[1] not in roots):
        raise HTTPException(403 if request.method=='GET' else 405,'Not an exposed operator API')
    body=await request.body()
    if len(body)>(16777216 if path in ('v1/pc-sync/exchange','v1/pc-sync/plan-result','v1/pc-sync/recording') else 1048576 if is_map_draft(request.method,'/api/'+path) else 262144 if path.startswith('v1/local-search/cases/') and path.endswith(('/groups','/reviews')) else 65536): raise HTTPException(413,'Body too large')
    headers={'Authorization':'Bearer '+text('token'),'cookie':request.headers.get('cookie',''),'X-Request-ID':request.headers.get('x-request-id','')}
    for name in ('cookie','origin','x-csrf-token','content-type','range','if-none-match'):
        if name in request.headers: headers[name]=request.headers[name]
    target='/api/'+path
    if request.url.query: target+='?'+request.url.query
    try:
        upstream=await run_in_threadpool(api.send,api.build_request(request.method,target,headers=headers,content=body,timeout=65 if is_map_draft(request.method,target) else 30),stream=True)
    except Exception:
        raise HTTPException(503,'Backend unavailable')
    forwarded={k:v for k,v in upstream.headers.items() if k in ('content-type','content-length','content-range','accept-ranges','x-content-sha256','content-security-policy','x-frame-options','referrer-policy','x-request-id','server-timing','etag')}
    cacheable=request.method=='GET' and (versioned_map_path(request.url.path) or display_request(request.scope) and (request.query_params.get('view')=='map' or '/display/' in target))
    cache=upstream.headers.get('cache-control','no-store') if cacheable and upstream.status_code in (200,304) else 'no-store'
    # The business middleware deliberately marks every response no-store. At
    # this authenticated boundary, allow ONLY immutable public map geometry;
    # never mission/telemetry/user records, errors, keys or the 3D frame.
    if request.method=='GET' and versioned_map_path(request.url.path) and upstream.status_code in (200,304):cache='private, max-age=3600'
    forwarded.update({'Cache-Control':cache,'X-Content-Type-Options':'nosniff'})
    response=UpstreamResponse(upstream,status_code=upstream.status_code,headers=forwarded)
    for value in upstream.headers.get_list('set-cookie'):response.raw_headers.append((b'set-cookie',value.encode('latin1')))
    return response

@app.websocket('/api/v1/ws')
async def business_ws(ws:WebSocket):
    from websockets.asyncio.client import unix_connect
    from websockets.exceptions import ConnectionClosed
    context=ssl.create_default_context(cafile=str(IDENTITY/'ca.crt'))
    context.load_cert_chain(IDENTITY/'client.crt',IDENTITY/'client.key')
    headers={'Authorization':'Bearer '+text('token'),'Cookie':ws.headers.get('cookie','')}
    headers['X-Request-ID']=ws.headers.get('x-request-id','')
    try:
        async with unix_connect('/run/backend-socket/service.sock',uri='wss://backend.internal/api/v1/ws',ssl=context,
                 server_hostname='backend.internal',origin=ws.headers.get('origin'),additional_headers=headers,
                 max_size=65536,open_timeout=5) as upstream:
            await ws.accept()
            async def outgoing():
                while True:
                    value=await ws.receive_text()
                    if len(value.encode())>65536: await ws.close(1009); return
                    await upstream.send(value)
            async def incoming():
                async for value in upstream: await ws.send_text(value)
            tasks=[asyncio.create_task(outgoing()),asyncio.create_task(incoming())]
            try:
                await asyncio.wait(tasks,return_when=asyncio.FIRST_COMPLETED)
            finally:
                for task in tasks:task.cancel()
                await asyncio.gather(*tasks,return_exceptions=True)
                if ws.client_state==WebSocketState.CONNECTED and ws.application_state==WebSocketState.CONNECTED:
                    await ws.close(code=upstream.close_code or 1000)
    except (WebSocketDisconnect,ConnectionClosed): pass
    except Exception:
        await ws.close(code=1008)

@app.get('/diagnostics/{path:path}')
def diagnostics(path:str,user=Depends(operator)):
    if path not in ('','index.html','status.js','style.css'):raise HTTPException(404)
    return secured(web.get('/diagnostics/'+(path or 'index.html')))

@app.get('/simulation-lab')
@app.get('/simulation-lab.js')
def simulation_lab(request:Request):
    name='simulation-lab.js' if request.url.path.endswith('.js') else 'simulation-lab.html'
    return Response(Path(__file__).with_name(name).read_bytes(),media_type='application/javascript' if name.endswith('.js') else 'text/html',headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'"})

@app.get('/communication-monitor')
@app.get('/communication-monitor.js')
def communication_monitor(request:Request):
    name='communication-monitor.js' if request.url.path.endswith('.js') else 'communication-monitor.html'
    return Response(Path(__file__).with_name(name).read_bytes(),media_type='application/javascript' if name.endswith('.js') else 'text/html',headers={'Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'"})

@app.get('/{path:path}')
def static(path:str,request:Request):
    if path=='app-config.json':return {'mode':'school','environment':'SIM','flight_enabled':False}
    # Manifest is generated from the exact build; no directory enumeration or SPA fallback for unknown files.
    allowed=json.loads(Path('/run/web-allowlist.json').read_text(encoding='utf-8'))
    target='index.html' if path in ('','index.html','simulation','simulation/','gumi','gumi/') else path
    if target not in allowed:raise HTTPException(404)
    try:
        r=web.get('/'+target)
        response=Response(r.content,status_code=r.status_code,headers={'Content-Type':r.headers.get('content-type','application/octet-stream'),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' wss://localhost:18443; worker-src 'self' blob:; frame-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'"})
        if r.status_code==200 and target.endswith(('.js','.mjs','.css')):
            etag='W/\"'+hashlib.sha256(r.content).hexdigest()+'\"'
            response.headers.update({'Cache-Control':'private, no-cache','ETag':etag})
            if etag in [v.strip() for v in request.headers.get('if-none-match','').split(',')]:
                headers=dict(response.headers);headers.pop('content-length',None)
                return Response(status_code=304,headers=headers)
        return response
    except Exception:raise HTTPException(503,'Web service unavailable')
