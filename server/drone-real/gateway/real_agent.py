"""Field-side REAL control agent. One serial owner; durable at-most-once actions."""
import argparse
from concurrent.futures import Future
from datetime import datetime,timezone
import hashlib
import http.client
import json
from pathlib import Path
import queue
import socket
import sqlite3
import ssl
import threading
import time
from uuid import uuid4
from mavlink_executor import Executor,Fault

class ApiError(Exception):
    def __init__(self,code):self.code=code;super().__init__('HTTP_'+str(code))

class Authority:
    """A new lease or recovered connection cannot revive an abandoned operation."""
    def __init__(self,clock=time.monotonic,wallclock=time.time):
        self.clock,self.wallclock=clock,wallclock
        self.until=0;self.lease_id=None;self.owner=None;self.operation=None;self.blocked=True
    def update(self,reply):
        self.until=self.clock()+max(0,min(8,reply['lease_expires_at']-self.wallclock()))
        self.lease_id=reply['lease_id'];self.owner=reply['lease_owner_session_id']
        if reply['cancel_active']:self.abandon()
    def begin(self,job):self.operation=job;self.blocked=False
    def abandon(self):self.blocked=True
    def authorized(self):
        j=self.operation
        return bool(not self.blocked and self.clock()<self.until and j is not None
                    and j['lease_id']==self.lease_id and j['owner_session_id']==self.owner)

def complete_operation(job,future,authority):
    try:
        evidence=future.result()
        return ('RUNNING' if job['action']=='START' else 'SUCCEEDED'),evidence
    except Exception as exc:
        authority.abandon()
        return 'UNKNOWN',{'error':str(exc) if isinstance(exc,Fault) else type(exc).__name__,'completion_verified':False}

class API:
    def __init__(self,config):
        self.config=config
        self.context=ssl.create_default_context(cafile=config['ca_file'])
        self.context.load_cert_chain(config['cert_file'],config['key_file'])
        self.token=Path(config['token_file']).read_text().strip()
    def call(self,path,body):
        config=self.config
        class Connection(http.client.HTTPSConnection):
            def connect(inner):
                raw=socket.create_connection((config['server_host'],config['server_port']),timeout=2)
                try:inner.sock=self.context.wrap_socket(raw,server_hostname=config['tls_server_name'])
                except Exception:raw.close();raise
        conn=Connection(config['tls_server_name'],timeout=2,context=self.context)
        try:
            conn.request('POST',path,json.dumps(body,allow_nan=False),{'Authorization':'Bearer '+self.token,'Content-Type':'application/json'})
            res=conn.getresponse();data=res.read(65537)
            if res.status>=400:raise ApiError(res.status)
            if len(data)>65536:raise Fault('RESPONSE_TOO_LARGE')
            return json.loads(data)
        finally:conn.close()

class Journal:
    def __init__(self,path):
        self.path=path
        Path(path).parent.mkdir(parents=True,exist_ok=True)
        with sqlite3.connect(path) as c:
            c.execute('CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, digest TEXT, gateway TEXT, state TEXT, evidence TEXT, revision INTEGER, reported INTEGER)')
            c.execute('CREATE TABLE IF NOT EXISTS reports(id TEXT, revision INTEGER, gateway TEXT, state TEXT, evidence TEXT, reported INTEGER DEFAULT 0, PRIMARY KEY(id,revision))')
            # A restart is never proof that an in-flight operation failed or completed.
            c.execute("UPDATE jobs SET state='UNKNOWN',evidence='{}',revision=revision+1,reported=0 WHERE state IN ('CLAIMED','RUNNING')")
        Path(path).chmod(0o600)
    def claim(self,job,gateway):
        digest=hashlib.sha256(json.dumps(job,sort_keys=True,separators=(',',':')).encode()).hexdigest()
        with sqlite3.connect(self.path) as c:
            old=c.execute('SELECT digest FROM jobs WHERE id=?',(job['command_id'],)).fetchone()
            if old:
                if old[0]!=digest:raise Fault('LOCAL_ID_CONFLICT')
                return False
            c.execute("INSERT INTO jobs VALUES(?,?,?,'CLAIMED','{}',0,1)",(job['command_id'],digest,gateway))
            return True
    def result(self,jid,state,evidence):
        with sqlite3.connect(self.path) as c:
            c.execute('UPDATE jobs SET state=?,evidence=?,revision=revision+1,reported=0 WHERE id=?',
                      (state,json.dumps(evidence,allow_nan=False),jid))
            c.execute('INSERT INTO reports(id,revision,gateway,state,evidence) SELECT id,revision,gateway,state,evidence FROM jobs WHERE id=?',(jid,))
    def pending(self,gateway):
        with sqlite3.connect(self.path) as c:
            return c.execute('SELECT id,state,evidence,revision FROM reports WHERE reported=0 AND gateway=? ORDER BY id,revision',(gateway,)).fetchall()
    def sent(self,jid,revision):
        with sqlite3.connect(self.path) as c:c.execute('UPDATE reports SET reported=1 WHERE id=? AND revision=?',(jid,revision))

class FCWorker(threading.Thread):
    def __init__(self,executor):
        super().__init__(daemon=True);self.executor=executor;self.tasks=queue.Queue();self.active=None;self.last_request=0
    def submit(self,job):
        f=Future();self.tasks.put((job,f));return f
    def run(self):
        e=self.executor
        while True:
            try:
                e.receive()
                now=time.monotonic()
                if e.snapshot()['connected'] and now-self.last_request>10:
                    e.link.mav.request_data_stream_send(e.system,e.component,0,2,1)
                    for param in ('FS_GCS_ENABLE','FS_GCS_TIMEOUT','FS_OPTIONS','SYSID_MYGCS','ARMING_CHECK'):
                        e.link.mav.param_request_read_send(e.system,e.component,param.encode(),-1)
                    # EXTENDED_SYS_STATE is not included in every stream bundle.
                    e.link.mav.command_long_send(e.system,e.component,511,0,245,500000,0,0,0,0,0)
                    self.last_request=now
                try:job,future=self.tasks.get_nowait()
                except queue.Empty:continue
                try:
                    if time.time()>job['expires_at']:raise Fault('COMMAND_EXPIRED')
                    future.set_result(e.execute(job['action'],job['payload']))
                except Exception as exc:future.set_exception(exc)
            except Exception:
                e.state['connected']=False
                time.sleep(.2)

def run(config):
    from pymavlink import mavutil
    api=API(config);journal=Journal(config['journal_file']);sid=str(uuid4())
    lock=open(config['serial_lock_file'],'w')
    import fcntl
    fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    link=mavutil.mavlink_connection(config['connection'],baud=config['baud'],source_system=config['gcs_system_id'],source_component=190,
                                   autoreconnect=True,dialect='ardupilotmega',force_connected=False)
    # Deadline is monotonic; wall-clock changes cannot extend operator authority.
    authority=Authority()
    executor=Executor(link,config['target_system'],config['target_component'],config['gcs_system_id'],
                      authority.authorized,battery_min=config['battery_min_voltage'],battery_max=config['battery_max_voltage'])
    worker=FCWorker(executor);worker.start()
    connected=False;active=None;flight=None;last_error=None
    while True:
        started=time.monotonic()
        try:
            if not connected:
                reply=api.call('/device/v1/control/connect',{'producer_session_id':sid})
                if abs(reply['server_time']-time.time())>2:raise Fault('CLOCK_SYNCHRONIZATION_REQUIRED')
                connected=True
            if active and active[1].done():
                job,future=active;active=None
                state,evidence=complete_operation(job,future,authority)
                if state=='RUNNING':flight=job['command_id']
                journal.result(job['command_id'],state,evidence)
            snapshot=executor.snapshot()
            if flight and (snapshot.get('rc_override') or (not snapshot['connected']) or not authority.authorized()):
                authority.abandon();journal.result(flight,'UNKNOWN',{'reason':'CONTROL_OR_FC_LOST','auto_resume':False});flight=None
            elif flight and executor.was_airborne and snapshot['landed'] and not snapshot['armed']:
                authority.abandon();journal.result(flight,'LANDED',{'landed':True,'disarmed':True});flight=None;executor.flying=False;executor.gcs_active=False
            elif flight and snapshot['mode'] not in (3,6,9):
                authority.abandon();journal.result(flight,'ABORTED',{'reason':'MODE_CHANGED','auto_resume':False});flight=None
            for jid,state,evidence,revision in journal.pending(sid):
                try:
                    api.call('/device/v1/control/commands/'+jid+'/reports',{'producer_session_id':sid,'revision':revision,'state':state,'evidence':json.loads(evidence)})
                    journal.sent(jid,revision)
                except ApiError as exc:
                    if exc.code in (404,409):journal.sent(jid,revision)
                    else:raise
            api.call('/device/v1/control/heartbeat',{'producer_session_id':sid,'observed_at':datetime.now(timezone.utc).isoformat(),'status':snapshot})
            # Do not claim another command while the FC worker is busy. Continue status/lease exchange.
            polled=api.call('/device/v1/control/poll',{'producer_session_id':sid,'accept_job':active is None,
                'active_command_id':active[0]['command_id'] if active else flight})
            authority.update(polled)
            if polled['cancel_active'] and flight:
                journal.result(flight,'ABORTED',{'reason':'SERVER_CANCELLED_OR_PREEMPTED','auto_resume':False})
                flight=None;executor.flying=False
            job=polled['job']
            if job:
                if job['gateway_session_id']!=sid:raise Fault('OLD_DEVICE_SESSION')
                if journal.claim(job,sid):
                    authority.begin(job)
                    active=(job,worker.submit(job))
            last_error=None
        except Exception as exc:
            # No lease extension on network/auth errors; GCS heartbeats cease locally.
            name=type(exc).__name__+(':'+str(exc) if isinstance(exc,(Fault,ApiError)) else '')
            if name!=last_error:print(json.dumps({'event':'CONTROL_UNAVAILABLE','reason':name}),flush=True);last_error=name
            if isinstance(exc,ApiError) and exc.code==409:
                authority.abandon();connected=False;sid=str(uuid4())
        time.sleep(max(.05,1-(time.monotonic()-started)))

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--config',required=True);args=parser.parse_args()
    config=json.loads(Path(args.config).read_text())
    if not 0<float(config['battery_min_voltage'])<float(config['battery_max_voltage'])<100:
        raise ValueError('Explicit validated battery voltage limits required')
    run(config)

if __name__=='__main__':main()
