"""Outbound school PC executor. Explicit --enable-execution; --probe never arms."""
import argparse
import hashlib
import http.client
import json
import os
from pathlib import Path
import queue
import socket
import ssl
import sys
import threading
import time
import uuid
from .package import verify,read,save,digest,adapter_hash
from .motion import Timeline,validate_local_binding
from server_integration.school.regional_contract import CAPABILITIES

ROOT=Path(__file__).resolve().parents[2]

class School:
    def __init__(self,identity,port):
        self.context=ssl.create_default_context(cafile=str(identity/'ca.crt'))
        self.context.load_cert_chain(str(identity/'client.crt'),str(identity/'client.key'))
        self.token=(identity/'token').read_text().strip();self.port=port
    def call(self,path,body):
        from server_integration.local_sim.agent import TunnelHTTPS
        c=TunnelHTTPS(self.port,self.context);c.timeout=15 if path.endswith('/claim') else 2
        try:
            c.request('POST','/device/v1/regional-search'+path,json.dumps(body,allow_nan=False).encode(),
                {'Authorization':'Bearer '+self.token,'Content-Type':'application/json'})
            r=c.getresponse();raw=r.read(32*1024*1024+1)
            if len(raw)>32*1024*1024:raise RuntimeError('SERVER_RESULT_TOO_LARGE')
            value=json.loads(raw)
            if r.status>=300:raise RuntimeError('School HTTP '+str(r.status)+' '+str(value)[:200])
            return value
        finally:c.close()


def probe(config,manifest,scene):
    import psutil
    reasons=[]
    for port,label in [(5762,'SITL'),(41451,'AIRSIM')]:
        try:
            with socket.create_connection(('127.0.0.1',port),.5):pass
        except OSError:reasons.append(label+'_UNAVAILABLE')
    try:
        proc=read(ROOT/'simulation_world/runtime/processes.json');ue=psutil.Process(proc['unrealPid'])
        if ue.name()!='UnrealEditor.exe':raise ValueError('stale UE PID')
        plan=dict(worldVersion=manifest['worldVersion'],sceneVersion=scene['version'])
        validate_local_binding(config,plan,scene,' '.join(ue.cmdline()))
        if scene.get('buildingActivityVersion')!=manifest['buildingActivityVersion']:raise ValueError('unbound scene policy')
    except (OSError,ValueError,KeyError,psutil.Error):reasons.append('SIM_SCENE_BINDING_UNAVAILABLE')
    # The legacy relay must not concurrently own MAVLink/control.
    try:
        with socket.create_connection(('127.0.0.1',8766),.3):reasons.append('LEGACY_GATEWAY_ACTIVE')
    except OSError:pass
    return dict(ready=not reasons,reasons=reasons,checkedAt=time.time())


def executable_plan(job,manifest,scene):
    result=job['result']
    if job['result_hash']!=digest(result) or result['packageId']!=manifest['packageId'] or result['adapterHash']!=adapter_hash():
        raise ValueError('PLAN_INPUT_BINDING_CHANGED')
    if result['worldVersion']!=manifest['worldVersion'] or result['buildingActivityVersion']!=manifest['buildingActivityVersion']:
        raise ValueError('WORLD_CHANGED')
    if result['state']!='READY' or result['realExecutable'] is not False:raise ValueError('SIM_ONLY')
    e=result['execution']
    if e['profile']!='SIM_BODY_YAW_PHASES_V1' or e['automaticStart'] is not False:raise ValueError('UNSUPPORTED_EXECUTION')
    p=dict(e,scope='LOCAL_UNREAL_ARDUCOPTER_SITL_ONLY',packageId=manifest['packageId'],worldVersion=manifest['worldVersion'],
        sceneVersion=scene['version'],predictedSeconds=sum(sum(r['seconds'] for r in leg['phases'])+leg['otherSeconds'] for leg in e['legs']))
    Timeline(p)
    return p


class RemoteObservation:
    def __init__(self,school,sid,eid):
        self.school=school;self.sid=sid;self.eid=eid;self.trial=None;self.seq=0;self.last_success=time.monotonic()
    def call(self,name,body):
        return self.school.call('/'+self.eid+'/'+name,dict(session_id=self.sid,**body))
    def pump(self):
        t=self.trial;pending=[];last_progress=0.;last_processed=-1;processed_at=time.time()
        while not t.stop.is_set():
            try:
                if not pending:
                    while len(pending)<3:
                        try:p=t.pending.get_nowait()
                        except queue.Empty:break
                        t.pending.task_done()
                        if p['type']=='FRAME':
                            self.seq+=1;pending.append(dict(sequence=self.seq,packet={k:v for k,v in p.items() if k!='type'}))
                if pending:
                    self.call('frames',dict(frames=pending));pending=[]
                if time.monotonic()-last_progress>.5:
                    result=self.call('progress',dict(status=dict(phase=t.phase,telemetry=t.state,searchStartedAt=t.search_start)))
                    actual=result.get('actual',{});count=actual.get('frameCounts',{}).get('received',0)
                    if count!=last_processed:processed_at=time.time();last_processed=count
                    if result['state'] in ('STOP_REQUESTED','UNCONFIRMED'):raise RuntimeError('OPERATOR_STOP_OR_LEASE_EXPIRED')
                    t.observer_status=dict(event='READY' if actual.get('state') in ('READY','FINISHED') else 'PREPARING',
                        percent=actual.get('percent',0),counts=actual.get('frameCounts',{}),responseAt=processed_at)
                    last_progress=time.monotonic()
                self.last_success=time.monotonic()
            except Exception as exc:
                if 'OPERATOR_STOP' in str(exc) or time.monotonic()-self.last_success>3:
                    t.error='SCHOOL_CONNECTION_OR_EXECUTION_LOST: '+str(exc);break
            t.stop.wait(.03)


def main():
    p=argparse.ArgumentParser();p.add_argument('--package',type=Path,required=True);p.add_argument('--scene',type=Path,required=True)
    p.add_argument('--identity',type=Path,default=ROOT/'server_integration/.local-sim');p.add_argument('--port',type=int,default=18444)
    p.add_argument('--output',type=Path,required=True);p.add_argument('--enable-execution',action='store_true');p.add_argument('--probe',action='store_true')
    a=p.parse_args();manifest=verify(a.package);scene=read(a.scene);config=read(ROOT/'simulation_world/runtime/config.json')
    school=School(a.identity,a.port);sid=str(uuid.uuid4());seen=set();a.output.mkdir(parents=True,exist_ok=True)
    while True:
        state=probe(config,manifest,scene)
        report=dict(session_id=sid,package_id=manifest['packageId'],adapter_hash=adapter_hash(),world_version=manifest['worldVersion'],
            capabilities=CAPABILITIES,ready=state['ready'] and a.enable_execution and not a.probe,diagnostics=state)
        save(a.output/'pc-probe.json',dict(report,simulationStarted=False))
        try:reply=school.call('/heartbeat',report)
        except Exception as exc:
            save(a.output/'connection-error.json',dict(error=str(exc),at=time.time(),simulationStarted=False))
            if a.probe:print(json.dumps(dict(state='CONNECTION_ERROR',diagnostics=state)));return
            time.sleep(2);continue
        if a.probe:print(json.dumps(dict(state='PROBED',diagnostics=state,schoolWorker=reply['worker_id'])));return
        for execution in reply['pending']:
            eid=execution['execution_id']
            if execution['state']!='QUEUED' or eid in seen or not report['ready']:continue
            seen.add(eid);remote=RemoteObservation(school,sid,eid)
            result=None
            try:
                envelope=remote.call('claim',{});job=envelope['job']
                if not probe(config,manifest,scene)['ready']:raise RuntimeError('LOCAL_PREFLIGHT_CHANGED')
                plan=executable_plan(job,manifest,scene)
                from .pc_flight import Trial
                result=Trial(plan,config,'school-'+eid,a.output/eid,remote).run()
                state_name='COMPLETED' if result['status']=='COMPLETED_FLIGHT' else 'FAILED'
                remote.call('finish',dict(state=state_name,status=result))
            except Exception as exc:
                save(a.output/(eid+'-error.json'),dict(error=str(exc),at=time.time()))
                # Never claim landing based only on a network exception.
                if result and result.get('landedAndDisarmed'):
                    try:remote.call('finish',dict(state='FAILED',status=result))
                    except Exception:pass
        time.sleep(1)

if __name__=='__main__':main()
