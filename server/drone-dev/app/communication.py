"""Metadata-only tracing with a private durable spool independent of the business DB."""
import asyncio
import hashlib
import json
import logging
import os
import threading
import time
from datetime import datetime,timezone
from pathlib import Path
from uuid import UUID,uuid4
import re
from starlette.concurrency import run_in_threadpool
from school.observability import TRACE

LOG=logging.getLogger('uvicorn.error')
FIELDS=('event_id','event_at','source','service','kind','request_id','operation_id','run_id',
        'principal_id','actor_user_id','route','method','status','duration_ms','bytes_in','bytes_out',
        'timings','error_code','content_hash')

def uuid_value(value):
    try:return str(UUID(str(value)))
    except (ValueError,TypeError):return None

def encoded(row):return json.dumps(row,sort_keys=True,separators=(',',':'),allow_nan=False).encode()

class Spool:
    def __init__(self,folder,connect=None):
        self.folder=Path(folder);self.folder.mkdir(parents=True,exist_ok=True,mode=0o700)
        self.connect=connect;self.lock=threading.Lock();self.started=False;self.last_error=None
        self.write_slots=threading.BoundedSemaphore(4)
        self.event_locks=[threading.Lock() for _ in range(64)]
        for temp in self.folder.glob('*.tmp'):
            try:
                row=json.loads(temp.read_bytes())
                if row['event_id']!=temp.stem:raise ValueError('Invalid pending log')
                os.replace(temp,temp.with_suffix('.json'))
            except (ValueError,KeyError):LOG.critical('COMMUNICATION_INCOMPLETE_SPOOL event=%s',temp.stem)

    def emit(self,row):
        row={k:row.get(k) for k in FIELDS if k!='content_hash'}
        row['content_hash']=hashlib.sha256(encoded(row)).hexdigest()
        path=self.folder/(row['event_id']+'.json')
        # Keep identical IDs serialized, while HDD barriers for unrelated logs can overlap.
        with self.write_slots,self.event_locks[int(UUID(row['event_id']))%len(self.event_locks)]:
            if path.exists():
                if path.read_bytes()!=encoded(row):raise ValueError('Conflicting pending log event')
                return
            temp=self.folder/(row['event_id']+'.tmp')
            with temp.open('xb') as file:
                file.write(encoded(row));file.flush();os.fsync(file.fileno())
            os.chmod(temp,0o600);os.replace(temp,path)
            if hasattr(os,'O_DIRECTORY'):
                directory=os.open(self.folder,os.O_DIRECTORY)
                try:os.fsync(directory)
                finally:os.close(directory)
        with self.lock:
            if not self.started and self.connect:
                self.started=True;threading.Thread(target=self.worker,daemon=True,name='communication-writer').start()

    def drain(self):
        files=sorted(self.folder.glob('*.json'))[:100]
        if not files:return 0
        from psycopg.types.json import Jsonb
        rows=[json.loads(p.read_bytes()) for p in files]
        conflicts=set()
        with self.connect() as conn:
            conn.execute("SET LOCAL statement_timeout='3s'")
            conn.execute("SET LOCAL lock_timeout='500ms'")
            for row in rows:
                values=[Jsonb(row[k]) if k=='timings' else row[k] for k in FIELDS]
                result=conn.execute('INSERT INTO observability.communication_log('+','.join(FIELDS)+') VALUES ('+
                    ','.join(['%s']*len(FIELDS))+') ON CONFLICT (event_id) DO NOTHING RETURNING event_id',values).fetchone()
                if result is None:
                    old=conn.execute('SELECT content_hash FROM observability.communication_log WHERE event_id=%s',(row['event_id'],)).fetchone()
                    if old[0]!=row['content_hash']:conflicts.add(row['event_id'])
        for path in files:
            if path.stem in conflicts:
                os.replace(path,path.with_suffix('.conflict'));LOG.error('COMMUNICATION_LOG_ID_CONFLICT event=%s',path.stem)
            else:path.unlink()
        self.last_error='LOG_ID_CONFLICT' if conflicts else None
        return len(files)-len(conflicts)

    def worker(self):
        while True:
            try:self.drain()
            except Exception as exc:
                self.last_error=type(exc).__name__
                LOG.error('COMMUNICATION_SPOOL_PENDING error=%s',self.last_error)
            time.sleep(1 if self.last_error else .5)

    def health(self):
        stats=[]
        for path in self.folder.glob('*.json'):
            try:stats.append(path.stat())
            except FileNotFoundError:pass
        return {'pending_events':len(stats),'pending_bytes':sum(s.st_size for s in stats),
                'conflicting_events':len(list(self.folder.glob('*.conflict'))),'incomplete_events':len(list(self.folder.glob('*.tmp'))),
                'last_error':self.last_error,'oldest_pending_age_s':round(time.time()-min(s.st_mtime for s in stats),1) if stats else 0}

def log_connect():
    import psycopg
    from app.common import IDENTITY
    return psycopg.connect(host='/run/db-socket',dbname=os.getenv('DRONE_DB_NAME','drone_dev'),
        user='drone_log_writer',password=(IDENTITY/'db-log-password').read_text().strip(),connect_timeout=2)

SPOOL=None
SPOOL_LOCK=threading.Lock()
def spool():
    global SPOOL
    with SPOOL_LOCK:
        if SPOOL is None:SPOOL=Spool(os.getenv('COMMUNICATION_SPOOL','/data/communication'),log_connect)
    return SPOOL

class CommunicationTrace:
    def __init__(self,app,service):self.app=app;self.service=service
    async def __call__(self,scope,receive,send):
        if scope['type'] not in ('http','websocket'):return await self.app(scope,receive,send)
        headers=dict(scope.get('headers',[]))
        rid=uuid_value(headers.get(b'x-request-id',b'').decode('ascii',errors='ignore')) or str(uuid4())
        scope['headers']=[(k,v) for k,v in scope.get('headers',[]) if k!=b'x-request-id']+[(b'x-request-id',rid.encode())]
        row={'event_id':str(uuid4()),'event_at':datetime.now(timezone.utc).isoformat(),'request_id':rid,
            'operation_id':uuid_value(headers.get(b'x-operation-id',b'').decode('ascii',errors='ignore')),
            'source':'SERVER','service':self.service,'kind':'HTTP','method':scope.get('method','WS'),
            'route':'/<unmatched>','run_id':None,'principal_id':None,'actor_user_id':None,
            'timings':{},'duration_ms':0,'bytes_in':0,'bytes_out':0,'status':None,'error_code':None}
        if scope['type']=='http' and row['method'] not in ('GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'):row['method']='OTHER'
        token=TRACE.set(row);start=time.perf_counter();disconnected=False;response_complete=False;close_code=None;task=None
        def record(kind):
            value=dict(row);value['kind']=kind;value['event_id']=str(uuid4())
            route=scope.get('route');value['route']=getattr(route,'path','/<unmatched>')[:255]
            params=scope.get('path_params',{})
            if value['route'].startswith(('/api/v1/simulations/runs/','/device/v1/simulations/runs/')):
                value['run_id']=uuid_value(params.get('rid'))
            state=scope.get('state',{})
            value['run_id']=uuid_value(state.get('trace_run_id')) or value['run_id']
            value['operation_id']=uuid_value(state.get('trace_operation_id')) or value['operation_id']
            value['principal_id']=state.get('trace_principal');value['actor_user_id']=state.get('trace_user')
            value['duration_ms']=round((time.perf_counter()-start)*1000,3)
            value['timings']={k:round(v,3) for k,v in row['timings'].items()}
            if close_code is not None:value['timings']['ws_close_code']=close_code
            if scope['type']=='websocket' and close_code not in (None,1000,1001):
                value['error_code']=value['error_code'] or 'WS_CLOSE_'+str(close_code)
            # ASGI may report http.disconnect after the final body was sent.
            # Only an interrupted response is a transport failure.
            if disconnected and not value['error_code'] and ((scope['type']=='http' and not response_complete) or (scope['type']=='websocket' and close_code not in (1000,1001))):
                value['error_code']='PEER_DISCONNECTED'
            if value['error_code'] is not None and (not isinstance(value['error_code'],str) or not re.fullmatch(r'[A-Za-z0-9_]{1,80}',value['error_code'])):
                value['error_code']='APPLICATION_ERROR'
            try:spool().emit(value)
            except Exception as exc:LOG.critical('COMMUNICATION_SPOOL_WRITE_FAILED service=%s request_id=%s error=%s',self.service,rid,type(exc).__name__)
        async def checkpoint():
            while True:
                await asyncio.sleep(30);await run_in_threadpool(record,'WS_SNAPSHOT')
        async def traced_receive():
            nonlocal disconnected,close_code
            message=await receive();kind=message['type']
            if kind in ('http.request','websocket.receive'):
                row['bytes_in']+=len(message.get('body',b''))+len(message.get('bytes') or b'')+len((message.get('text') or '').encode())
            if kind in ('http.disconnect','websocket.disconnect'):
                disconnected=True;close_code=message.get('code')
            return message
        async def traced_send(message):
            nonlocal close_code,task,response_complete
            kind=message['type']
            if kind=='http.response.start':
                row['status']=message['status'];row['timings']['app_headers']=(time.perf_counter()-start)*1000
                if row['status']<400:row['error_code']=None
                if row['status']>=400 and not row['error_code']:row['error_code']='HTTP_'+str(row['status'])
                values=[(k,v) for k,v in message.get('headers',[]) if k not in (b'x-request-id',b'server-timing')]
                values.append((b'x-request-id',rid.encode()))
                values.append((b'server-timing',', '.join(f'{name};dur={value:.3f}' for name,value in row['timings'].items()).encode()))
                message={**message,'headers':values}
            if kind=='http.response.body':row['bytes_out']+=len(message.get('body',b''))
            if kind=='websocket.accept':
                row['status']=101;await run_in_threadpool(record,'WS_OPEN');task=asyncio.create_task(checkpoint())
            if kind=='websocket.send':row['bytes_out']+=len(message.get('bytes') or b'')+len((message.get('text') or '').encode())
            if kind=='websocket.close':close_code=message.get('code');row['status']=row['status'] or 403
            await send(message)
            if kind=='http.response.body' and not message.get('more_body',False):response_complete=True
        try:await self.app(scope,traced_receive,traced_send)
        except BaseException as exc:
            row['error_code']=type(exc).__name__;row['status']=row['status'] or 500;raise
        finally:
            if task:
                task.cancel();await asyncio.gather(task,return_exceptions=True)
            try:await run_in_threadpool(record,'HTTP' if scope['type']=='http' else 'WS_CLOSE')
            finally:TRACE.reset(token)
