import hashlib
import hmac
import time
import asyncio
import ssl
from threading import BoundedSemaphore
from pathlib import Path
from fastapi import Depends, FastAPI, HTTPException, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.responses import RedirectResponse, Response, StreamingResponse
from starlette.background import BackgroundTask
from starlette.concurrency import run_in_threadpool
from starlette.websockets import WebSocketState
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from app.common import client, config, text, IDENTITY
from app.body_limit import BodyLimit

app=FastAPI(docs_url=None,redoc_url=None,openapi_url=None)
app.add_middleware(BodyLimit)
basic=HTTPBasic()
account=config('operator.json')
login_slots=BoundedSemaphore(2)
api=client('/run/backend-socket/service.sock','backend.internal')
# An upstream HTTP client must never authenticate a different browser request.
from http.cookiejar import DefaultCookiePolicy
class NoSharedCookies(DefaultCookiePolicy):
    def set_ok(self,cookie,request):return False
    def return_ok(self,cookie,request):return False
api.cookies.jar.set_policy(NoSharedCookies())

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
    roots={'auth','readiness','drones','missions','candidates','commands','media-assets','media-bundles','alerts','analysis-runs','configs'}
    parts=path.split('/')
    if len(parts)<2 or parts[0]!='v1' or parts[1] not in roots:
        raise HTTPException(403 if request.method=='GET' else 405,'Not an exposed operator API')
    body=await request.body()
    if len(body)>65536: raise HTTPException(413,'Body too large')
    headers={'Authorization':'Bearer '+text('token'),'cookie':request.headers.get('cookie','')}
    for name in ('cookie','origin','x-csrf-token','content-type','range'):
        if name in request.headers: headers[name]=request.headers[name]
    target='/api/'+path
    if request.url.query: target+='?'+request.url.query
    try:
        upstream=await run_in_threadpool(api.send,api.build_request(request.method,target,headers=headers,content=body),stream=True)
    except Exception:
        raise HTTPException(503,'Backend unavailable')
    forwarded={k:v for k,v in upstream.headers.items() if k in ('content-type','content-length','content-range','accept-ranges','x-content-sha256')}
    forwarded.update({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'})
    response=StreamingResponse(upstream.iter_bytes(),status_code=upstream.status_code,headers=forwarded,background=BackgroundTask(upstream.close))
    for value in upstream.headers.get_list('set-cookie'):response.raw_headers.append((b'set-cookie',value.encode('latin1')))
    return response

@app.websocket('/api/v1/ws')
async def business_ws(ws:WebSocket):
    from websockets.asyncio.client import unix_connect
    from websockets.exceptions import ConnectionClosed
    context=ssl.create_default_context(cafile=str(IDENTITY/'ca.crt'))
    context.load_cert_chain(IDENTITY/'client.crt',IDENTITY/'client.key')
    headers={'Authorization':'Bearer '+text('token'),'Cookie':ws.headers.get('cookie','')}
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

@app.get('/{path:path}')
def static(path:str):
    if path in ('', 'index.html') and Path(__file__).with_name('school-web-enabled').is_file():
        return RedirectResponse('https://localhost:18443/local-real-map.html', status_code=302,
                                headers={'Cache-Control':'no-store'})
    entry={
        '':('real-console.html','text/html'),
        'index.html':('real-console.html','text/html'),
        'real-console.html':('real-console.html','text/html'),
        'real-missions.html':('real-control.html','text/html'),
        'real-missions.js':('real-control.js','application/javascript'),
        'real-control.html':('real-control.html','text/html'),
        'real-control.js':('real-control.js','application/javascript'),
        'real-console.js':('real-console.js','application/javascript'),
        'real-console.css':('real-console.css','text/css'),
        'real-live-map.js':('real-live-map.js','application/javascript'),
        'real-live-campus.json':('real-live-campus.json','application/json'),
    }.get(path)
    if not entry:
        raise HTTPException(404,'Not found')
    name, mime=entry
    return Response(Path(__file__).with_name(name).read_bytes(),media_type=mime,headers={
        'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
        'Content-Security-Policy':"default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"})
