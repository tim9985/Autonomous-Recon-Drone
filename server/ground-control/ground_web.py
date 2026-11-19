"""Loopback-only ground console using existing REAL operator authentication."""
import http.cookiejar,json,pathlib,secrets,ssl,subprocess,threading,time,urllib.error,urllib.request,uuid
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
ROOT=pathlib.Path('/home/se/drone-ground-control')
REAL=pathlib.Path('/home/se/sandboxes/drone-real')
BASE='https://localhost:19443'
SESSIONS={};JOBS={};LOCK=threading.Lock();BUSY=threading.Lock()
ORIGINS={'http://127.0.0.1:19800','http://localhost:19800'}

def upstream(session,method,path,body=None):
    headers={'Origin':BASE,'Accept':'application/json','X-CSRF-Token':session.get('up_csrf','')}
    if body is not None:headers['Content-Type']='application/json'
    req=urllib.request.Request(BASE+path,method=method,headers=headers,data=json.dumps(body).encode() if body is not None else None)
    try:
        with session['opener'].open(req,timeout=6) as response:return response.status,json.load(response)
    except urllib.error.HTTPError as exc:return exc.code,json.load(exc)

def execute(job):
    job['state']='RUNNING'
    try:
        cmd=['python3',str(ROOT/'motor_control.py')]
        if job.get('kind')=='fc_query':cmd+=['fc-query','--request-id',job['id']]
        else:cmd+=['motor-test','--motor',str(job['motor']),'--seconds',str(job['seconds']),'--props-removed','--request-id',job['id']]
        p=subprocess.run(cmd,capture_output=True,text=True,timeout=55)
        result=json.loads(p.stdout)
        job.update(state='COMPLETED' if result.get('ok') else 'FAILED',result=result)
    except Exception as exc:job.update(state='FAILED',result={'ok':False,'error':type(exc).__name__,'completion_verified':False})
    finally:
        (ROOT/'web-results').mkdir(exist_ok=True)
        try:(ROOT/'web-results'/(job['id']+'.json')).write_text(json.dumps(job,indent=2))
        finally:BUSY.release()

class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args):pass
    def send(self,code,value,cookie=None):
        data=json.dumps(value).encode();self.send_response(code)
        self.send_header('Content-Type','application/json');self.send_header('Cache-Control','no-store')
        if cookie:self.send_header('Set-Cookie',cookie)
        self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
    def session(self):
        from http.cookies import SimpleCookie
        jar=SimpleCookie(self.headers.get('Cookie',''));sid=jar.get('ground_session')
        s=SESSIONS.get(sid.value) if sid else None
        return s if s and time.time()<s['expires'] else None
    def do_GET(self):
        if self.headers.get('Host') not in ('127.0.0.1:19800','localhost:19800'):return self.send(403,{'error':'HOST_REJECTED'})
        if self.path=='/':
            data=(ROOT/'ground_web.html').read_bytes();self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Cache-Control','no-store');self.send_header('X-Frame-Options','DENY');self.send_header('Content-Length',str(len(data)));self.end_headers();return self.wfile.write(data)
        session=self.session()
        if not session:return self.send(401,{'error':'LOGIN_REQUIRED'})
        if self.path=='/api/status':
            try:
                code,d=upstream(session,'GET','/api/v1/drones/real-drone-01')
                return self.send(code,{'live':d.get('live_telemetry'),'busy':BUSY.locked(),'csrf':session['csrf']} if code==200 else {'error':'SESSION_OR_UPSTREAM_FAILED'})
            except Exception:return self.send(503,{'error':'UPSTREAM_UNAVAILABLE'})
        if self.path.startswith('/api/jobs/'):
            try:
                jid=str(uuid.UUID(self.path.rsplit('/',1)[-1]))
                job=JOBS.get(jid)
                if job is None and (ROOT/'web-results'/(jid+'.json')).exists():job=json.loads((ROOT/'web-results'/(jid+'.json')).read_text())
            except (ValueError,OSError):job=None
            if not job or job['user']!=session['user']:return self.send(404,{'error':'NOT_FOUND'})
            return self.send(200,job)
        return self.send(404,{'error':'NOT_FOUND'})
    def do_POST(self):
        if self.headers.get('Host') not in ('127.0.0.1:19800','localhost:19800') or self.headers.get('Origin') not in ORIGINS:return self.send(403,{'error':'ORIGIN_REJECTED'})
        if self.headers.get('Content-Type')!='application/json':return self.send(415,{'error':'JSON_REQUIRED'})
        try:
            length=int(self.headers.get('Content-Length','0'))
            if not 0<length<=4096:raise ValueError()
            body=json.loads(self.rfile.read(length))
        except Exception:return self.send(400,{'error':'INVALID_REQUEST'})
        if self.path=='/api/login':
            try:
                s={'opener':urllib.request.build_opener(urllib.request.HTTPSHandler(context=ssl.create_default_context(cafile=str(REAL/'secrets/ca.crt'))),urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))}
                code,d=upstream(s,'POST','/api/v1/auth/login',body)
                if code!=200:return self.send(401,{'error':'LOGIN_FAILED'})
                s['up_csrf']=d['csrf_token'];code,me=upstream(s,'GET','/api/v1/auth/me')
                if code!=200:return self.send(401,{'error':'LOGIN_FAILED'})
                if not any(p.get('drone_id')=='real-drone-01' and 'control' in p.get('scopes',[]) for p in me['permissions']):return self.send(403,{'error':'CONTROL_PERMISSION_REQUIRED'})
                sid=secrets.token_urlsafe(32);s.update(user=me['user_id'],csrf=secrets.token_urlsafe(32),expires=time.time()+1800);SESSIONS[sid]=s
                return self.send(200,{'csrf':s['csrf']},'ground_session='+sid+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800')
            except Exception:return self.send(503,{'error':'LOGIN_SERVICE_UNAVAILABLE'})
        s=self.session()
        if not s:return self.send(401,{'error':'LOGIN_REQUIRED'})
        if not secrets.compare_digest(self.headers.get('X-CSRF-Token',''),s['csrf']):return self.send(403,{'error':'CSRF_REJECTED'})
        if self.path=='/api/fc-query':
            try:
                jid=str(uuid.UUID(body['id']))
                code,me=upstream(s,'GET','/api/v1/auth/me')
                if code!=200 or not any(p.get('drone_id')=='real-drone-01' and 'control' in p.get('scopes',[]) for p in me['permissions']):return self.send(403,{'error':'CONTROL_PERMISSION_REQUIRED'})
                code,d=upstream(s,'GET','/api/v1/drones/real-drone-01');live=d.get('live_telemetry') or {};sample=live.get('sample') or {}
                if code!=200 or live.get('state')!='LIVE' or sample.get('armed') is not False:return self.send(409,{'error':'FRESH_DISARMED_FC_REQUIRED'})
            except Exception:return self.send(503,{'error':'UPSTREAM_UNAVAILABLE'})
            with LOCK:
                old=JOBS.get(jid)
                if old is None and (ROOT/'web-results'/(jid+'.json')).exists():old=json.loads((ROOT/'web-results'/(jid+'.json')).read_text())
                if old:
                    if (old.get('user'),old.get('kind'))!=(s['user'],'fc_query'):return self.send(409,{'error':'ID_CONFLICT'})
                    return self.send(200,old)
                if not BUSY.acquire(blocking=False):return self.send(409,{'error':'TEST_ALREADY_RUNNING'})
                job={'id':jid,'user':s['user'],'kind':'fc_query','state':'QUEUED'};JOBS[jid]=job
                threading.Thread(target=execute,args=(job,),daemon=True).start()
            return self.send(202,job)
        if self.path!='/api/motor-test':return self.send(404,{'error':'NOT_FOUND'})
        try:
            jid=str(uuid.UUID(body['id']));motor=body['motor'];seconds=body['seconds']
            if type(motor) is not int or not 0<=motor<=4 or type(seconds) is not int or not 1<=seconds<=20 or body.get('props_removed') is not True or body.get('observer_ready') is not True:raise ValueError()
        except Exception:return self.send(422,{'error':'CHECK_TEST_INPUTS'})
        with LOCK:
            old=JOBS.get(jid)
            if old is None and (ROOT/'web-results'/(jid+'.json')).exists():old=json.loads((ROOT/'web-results'/(jid+'.json')).read_text())
            if old:
                if (old['user'],old['motor'],old['seconds'])!=(s['user'],motor,seconds):return self.send(409,{'error':'ID_CONFLICT'})
                return self.send(200,old)
            # Recheck operator permission and fresh FC state for each physical action.
            try:
                code,me=upstream(s,'GET','/api/v1/auth/me')
                if code!=200 or not any(p.get('drone_id')=='real-drone-01' and 'control' in p.get('scopes',[]) for p in me['permissions']):return self.send(403,{'error':'CONTROL_PERMISSION_REQUIRED'})
                code,d=upstream(s,'GET','/api/v1/drones/real-drone-01');live=d.get('live_telemetry') or {};sample=live.get('sample') or {}
                if code!=200 or live.get('state')!='LIVE' or sample.get('armed') is not False:return self.send(409,{'error':'FRESH_DISARMED_FC_REQUIRED'})
            except Exception:return self.send(503,{'error':'UPSTREAM_UNAVAILABLE'})
            if not BUSY.acquire(blocking=False):return self.send(409,{'error':'TEST_ALREADY_RUNNING'})
            job={'id':jid,'user':s['user'],'motor':motor,'seconds':seconds,'state':'QUEUED'};JOBS[jid]=job
            threading.Thread(target=execute,args=(job,),daemon=True).start()
        return self.send(202,job)

if __name__=='__main__':ThreadingHTTPServer(('127.0.0.1',19800),Handler).serve_forever()
