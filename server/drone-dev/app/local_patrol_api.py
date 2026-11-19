"""Authenticated local queue for the fixed Windows SIM capture launcher."""
from contextlib import contextmanager
import fcntl
import hashlib
import json
from pathlib import Path
import time
from typing import Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Request
from fastapi.responses import FileResponse, Response
from drone_backend.contracts import DTO
from drone_backend.core import transaction, user, authorize, fail

router=APIRouter()
from app.pc_paths import ScopedPath, bind, workspace
CONTROL=ScopedPath('control')
RUNS=ScopedPath('runs')
SOURCE_RUN='bf6bf349-6afa-4d19-864c-a141ef5d66ee'
TERMINAL={'COMPLETED','PARTIAL','FAILED','CANCELLED','INTERRUPTED','EXPIRED'}
ARCHIVES=ScopedPath('recordings')

def recording_path(value):
    rid=str(UUID(value['run_id']))
    if value.get('state') not in TERMINAL or not value.get('landed_disarmed'):return None
    # The encoder publishes the final name atomically. Never stream a partial.
    for path in (ARCHIVES/rid/'video.mp4',RUNS/rid/'drive-archive/video.mp4'):
        if path.is_file() and not path.is_symlink() and path.stat().st_size>0:return path
    return None

@router.get('/api/v1/local-patrol/{job_id}/recording')
def recording(job_id:UUID,request:Request):
    actor(request)
    value=load(CONTROL/'states'/f'{job_id}.json')
    path=recording_path(value) if value else None
    if path is None:fail('RECORDING_NOT_READY',404)
    return FileResponse(path,media_type='video/mp4',headers={'Cache-Control':'private, no-cache'},
        filename='recon-'+str(value['run_id'])+'.mp4',content_disposition_type='inline')

@router.get('/api/v1/local-patrol/recordings/{run_id}')
def recording_info(run_id:UUID,request:Request):
    actor(request);rid=str(run_id)
    for path in CONTROL.joinpath('requests').glob('*.json'):
        try:
            request_value=load(path,{})
            if request_value.get('run_id')!=rid:continue
            value=job(str(UUID(request_value['job_id'])))
            if not value or value['run_id']!=rid:continue
            return dict(run_id=rid,job_id=value['job_id'],recorded_frames=value.get('recorded_frames') or value.get('capture_frames'),
                execution_state=value.get('state'),execution_error=value.get('error'),runner_failure=value.get('runner_failure'),
                mode=value.get('recording_mode'),ready=recording_path(value) is not None,archive_state=value.get('archive',{}).get('state'),
                video_url=f"/api/v1/local-patrol/{value['job_id']}/recording")
        except (ValueError,OSError,KeyError):continue
    return dict(run_id=rid,ready=False)

class Start(DTO):
    request_id: UUID
    route: Literal['kumoh-local-square-8m-v1']='kumoh-local-square-8m-v1'
    result_policy: Literal['REUSE_EXISTING','LIVE']='LIVE'
    plan_id: UUID|None=None
    plan_hash: str|None=None
    connection_id: UUID|None=None

class Connect(DTO):
    request_id: UUID
    plan_id: UUID
    plan_hash: str

class FlightCommand(DTO):
    request_id: UUID
    action: Literal['pause','resume','return']

def load(path, default=None):
    for attempt in range(4):
        try:return json.loads(path.read_text(encoding='utf-8'))
        except FileNotFoundError:return default
        except (PermissionError,json.JSONDecodeError):
            if attempt==3:fail('LOCAL_STATE_UNAVAILABLE',503)
            time.sleep(.015)


def map_snapshot(data,request,*,encoded=None):
    """Already validated display data; avoid FastAPI's recursive JSON re-encoding."""
    if encoded is None:
        body=json.dumps(data,ensure_ascii=False,separators=(',',':'),allow_nan=False).encode('utf-8')
        etag='W/"'+hashlib.sha256(body).hexdigest()+'"'
    else:body,etag=encoded
    headers={'ETag':etag,'Cache-Control':'private, no-cache','Vary':'Accept-Encoding'}
    matches=[v.strip() for v in request.headers.get('if-none-match','').split(',')]
    if etag in matches:return Response(status_code=304,headers=headers)
    return Response(body,media_type='application/json',headers=headers)

def save(path,value):
    path.parent.mkdir(parents=True,exist_ok=True)
    temporary=path.with_name(path.name+'.'+str(uuid4())+'.tmp')
    temporary.write_text(json.dumps(value,ensure_ascii=False,allow_nan=False),encoding='utf-8')
    for attempt in range(40):
        try:temporary.replace(path);break
        except PermissionError:
            if attempt==39:raise
            time.sleep(.05)

@contextmanager
def locked():
    if not CONTROL.is_dir():fail('LOCAL_RUNNER_UNAVAILABLE',503)
    with (CONTROL/'api.lock').open('a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX)
        try:yield
        finally:fcntl.flock(lock,fcntl.LOCK_UN)

def actor(request,scope='read',*,history=False):
    with transaction(snapshot=True) as c:
        value=user(request,c,scope);authorize(value,'sim-pi-01',scope)
        owner=str(value['user_id']);bind(owner)
        if history:
            from app.personal_scope import previous_recording
            request.state.previous_recording=previous_recording(c,owner)
        (workspace()/'control').mkdir(parents=True,exist_ok=True)
        return owner

def heartbeat():
    value=load(CONTROL/'heartbeat.json',{})
    age=time.time()-value.get('time',0)
    return {'online':0<=age<15,'ready':bool(value.get('ready')) and 0<=age<15,
        'reason':value.get('reason','LOCAL_RUNNER_UNAVAILABLE'),
        'free_physical_gib':value.get('free_physical_gib'),'free_commit_gib':value.get('free_commit_gib')}

def storage_status(*, required=False):
    from .pc_storage import status
    return status(required)

@router.get('/api/v1/local-patrol/recording-storage')
def storage(request:Request):
    actor(request)
    return storage_status()

def connection_ready(value):
    t=value.get('telemetry') or {};now=time.time()
    return (value.get('state')=='READY' and 0<=now-value.get('updated_at',0)<5
        and t.get('valid') is True and t.get('armed') is False and t.get('landed') is True
        and 0<=now-t.get('timestamp',0)<5 and value.get('source')=='LOCAL_SITL_PREFLIGHT')

def connection_value():
    cid=load(CONTROL/'connection-active.json',{}).get('connection_id')
    value=load(CONTROL/'connection-states'/f'{cid}.json',{}) if cid else {}
    result={k:value.get(k) for k in ('connection_id','plan_id','plan_hash','package_id','state','phase','updated_at','telemetry','error','source')}
    result['ready']=connection_ready(value)
    if value.get('state')=='READY' and not result['ready']:result.update(state='LOST',error='LOCAL_DRONE_TELEMETRY_STALE')
    if value.get('state')=='CONNECTING' and not 0<=time.time()-value.get('updated_at',0)<15:result.update(state='LOST',error='LOCAL_DRONE_TELEMETRY_STALE')
    stop=load(CONTROL/'connection-stop'/f'{cid}.json',{}) if cid else {}
    if value.get('state')!='DISCONNECTED' and stop.get('requested_at',0)>value.get('disconnect_attempt_at',0):
        result.update(state='DISCONNECTING',ready=False,error=None)
    return result

def idle_flight():
    active=load(CONTROL/'active.json',{})
    previous=job(active['job_id']) if active.get('job_id') else None
    if previous and previous['state'] not in TERMINAL:fail('LOCAL_PATROL_BUSY',409)

def simulation_admission():
    from .local_sim_recovery import reconcile
    with transaction() as c:
        assigned=load(workspace()/'binding.json',{}).get('worker_id')
        if not assigned:fail('PC_NOT_ATTACHED',409)
        result=reconcile(c,CONTROL,RUNS,worker_id=assigned)
    # Commit proven recovery even if an unrelated active run still blocks entry.
    if result['blockers']:fail('OTHER_SIM_RUN_ACTIVE',409)
    return result

@router.post('/api/v1/local-patrol/recover-simulations')
def recover_simulations(request:Request):
    actor(request,'control')
    with locked():
        idle_flight()
        return simulation_admission()

@router.post('/api/v1/local-patrol/connection',status_code=202)
def connect(body:Connect,request:Request):
    who=actor(request,'control');cid=str(body.request_id)
    with locked():
        existing=load(CONTROL/'connection-requests'/f'{cid}.json')
        if existing:
            if existing.get('requested_by')!=who or existing.get('plan_id')!=str(body.plan_id) or existing.get('plan_hash')!=body.plan_hash:fail('ID_CONFLICT',409)
            return load(CONTROL/'connection-states'/f'{cid}.json',{})
        idle_flight()
        current=connection_value()
        if current.get('state') in ('QUEUED','CONNECTING','READY','CLAIMED','DISCONNECTING','LOST'):fail('LOCAL_DRONE_CONNECTION_BUSY',409)
        if not heartbeat()['ready']:fail('LOCAL_RUNNER_NOT_READY',503)
        from .local_mission_api import plan_value
        from .local_search_api import validate_plan_context
        plan=plan_value(str(body.plan_id))
        if not plan or plan.get('state')!='READY' or plan.get('plan_hash')!=body.plan_hash:fail('LOCAL_PLAN_CHANGED',409)
        validate_plan_context(plan.get('selection',{}),who)
        if plan['kind'] in ('REGIONAL','GLOBAL'):
            ready=load(CONTROL/'regional-readiness.json',{})
            if not ready.get('ready') or not 0<=time.time()-ready.get('time',0)<15 or ready.get('package_id')!=plan.get('package_id'):fail('REGIONAL_PREPARATION_REQUIRED',409)
        storage_status(required=True)
        simulation_admission()
        now=time.time();value=dict(connection_id=cid,plan_id=str(body.plan_id),plan_hash=body.plan_hash,
            package_id=plan.get('package_id'),requested_by=who,created_at=now,expires_at=now+300)
        save(CONTROL/'connection-requests'/f'{cid}.json',value)
        state={k:v for k,v in value.items() if k not in ('requested_by','expires_at')}
        state.update(state='QUEUED',phase='QUEUED',updated_at=now,source='LOCAL_SITL_PREFLIGHT',ready=False)
        save(CONTROL/'connection-states'/f'{cid}.json',state)
        save(CONTROL/'connection-active.json',{'connection_id':cid})
        return state

@router.post('/api/v1/local-patrol/connection/{connection_id}/disconnect',status_code=202)
def disconnect(connection_id:UUID,request:Request):
    who=actor(request,'control');cid=str(connection_id)
    with locked():
        idle_flight()
        value=load(CONTROL/'connection-states'/f'{cid}.json')
        if not value or load(CONTROL/'connection-active.json',{}).get('connection_id')!=cid:fail('RESOURCE_NOT_FOUND',404)
        if value.get('state')=='DISCONNECTED':return {'state':'DISCONNECTED'}
        save(CONTROL/'connection-stop'/f'{cid}.json',dict(requested_by=who,requested_at=time.time()))
        return {'state':'DISCONNECTING'}

def final_telemetry(value,sample,control):
    final=control.get('final_telemetry') or {}
    if (control.get('job_id')==value.get('job_id') and control.get('run_id')==value.get('run_id')
        and control.get('plan_hash')==value.get('plan_hash') and control.get('phase')=='LANDED'
        and final.get('valid') is True and final.get('armed') is False
        and isinstance(final.get('timestamp'),(int,float)) and final['timestamp']>=(sample or {}).get('timestamp',0)):
        return final
    return sample

def job(job_id):
    value=load(CONTROL/'states'/f'{job_id}.json')
    if not value:return value
    archive=load(RUNS/str(UUID(value['run_id']))/'archive.json',{})
    if archive:value['archive']={**{k:archive.get(k) for k in ('state','cloud_verified','originals_retained','frame_count','updated_at')},'video_ready':recording_path(value) is not None}
    control=load(CONTROL/'operator-status'/f'{job_id}.json',{})
    if control.get('run_id')==value['run_id']:
        value['operator_control']=control
        value['telemetry']=final_telemetry(value,value.get('telemetry'),control)
        if control.get('final_telemetry') and control['final_telemetry'] is value['telemetry']:
            value['landed_disarmed']=True
    command=load(CONTROL/'commands'/f'{job_id}.json')
    if command and command.get('run_id')==value['run_id']:
        result=load(CONTROL/'command-results'/job_id/f"{command['request_id']}.json")
        value['operator_command']=result or {**{k:command[k] for k in ('request_id','action','requested_at')},
            'state':'PENDING' if time.time()<command['expires_at'] and value['state'] not in TERMINAL else 'EXPIRED'}
    return value

@router.get('/api/v1/local-patrol/telemetry')
def telemetry(request:Request):
    actor(request)
    active=load(CONTROL/'active.json',{}).get('job_id')
    value=load(CONTROL/'states'/f'{UUID(active)}.json',{}) if active else {}
    sample=value.get('telemetry');report={}
    if value.get('run_id'):
        report=load(RUNS/str(UUID(value['run_id']))/'session.json',{})
        latest=report.get('latest_telemetry')
        if (report.get('run_id')==value['run_id'] and report.get('plan_hash')==value.get('plan_hash')
            and latest and latest.get('timestamp',0)>(sample or {}).get('timestamp',0)):
            sample=latest
        if report.get('run_id')!=value['run_id'] or report.get('plan_hash')!=value.get('plan_hash'):report={}
    control=load(CONTROL/'operator-status'/f'{active}.json',{}) if active else {}
    sample=final_telemetry(value,sample,control)
    from .local_coverage import progress
    try:observed=progress(value,CONTROL,RUNS)
    except (OSError,ValueError,KeyError,TypeError):observed=None
    return dict(job_id=value.get('job_id'),run_id=value.get('run_id'),state=value.get('state'),
        telemetry=sample,connection=connection_value(),server_time=time.time(),observation_progress=observed,
        flight_timing=report.get('flight_timing') or value.get('flight_timing'),
        region_timing=report.get('region_timing') or value.get('region_timing'),
        global_status=report.get('global_status') or value.get('global_status'),
        recorded_frames=report.get('recorded_frames',value.get('recorded_frames')))

@router.get('/api/v1/local-patrol')
def state(request:Request):
    actor(request,history=True)
    active=load(CONTROL/'active.json',{})
    return {'runner':heartbeat(),'job':job(active['job_id']) if active.get('job_id') else None,
        'result_policy':'LIVE','source_run_id':request.state.previous_recording,'gpu_execution_enabled':True,'launch_mode':'CONNECT_THEN_START',
        'vision':load(RUNS/str(job(active['job_id'])['run_id'])/'live-vision.json',{}) if active.get('job_id') and job(active['job_id']) else {},
        'connection':connection_value(),'storage':storage_status(),
        'regional':load(CONTROL/'regional-readiness.json',{'ready':False,'reasons':['REGIONAL_PREPARATION_REQUIRED']})}

@router.post('/api/v1/local-patrol/start',status_code=202)
def start(body:Start,request:Request):
    who=actor(request,'control');job_id=str(body.request_id)
    with locked():
        existing=load(CONTROL/'requests'/f'{job_id}.json')
        if existing:
            if existing['requested_by']!=who:fail('RESOURCE_NOT_FOUND',404)
            if existing.get('plan_id')!=(str(body.plan_id) if body.plan_id else None) or existing.get('plan_hash')!=body.plan_hash or existing.get('connection_id')!=(str(body.connection_id) if body.connection_id else None):fail('ID_CONFLICT',409)
            return job(job_id)
        active=load(CONTROL/'active.json',{})
        previous=job(active['job_id']) if active.get('job_id') else None
        if previous and previous['state'] not in TERMINAL:fail('LOCAL_PATROL_BUSY',409)
        if not heartbeat()['ready']:fail('LOCAL_RUNNER_NOT_READY',503)
        connection=connection_value()
        if not body.plan_id or not body.connection_id or not connection.get('ready'):fail('LOCAL_DRONE_CONNECTION_REQUIRED',409)
        if connection.get('connection_id')!=str(body.connection_id) or connection.get('plan_id')!=str(body.plan_id) or connection.get('plan_hash')!=body.plan_hash:fail('LOCAL_DRONE_CONNECTION_MISMATCH',409)
        if (CONTROL/'connection-stop'/f'{body.connection_id}.json').exists():fail('LOCAL_DRONE_CONNECTION_REQUIRED',409)
        selected=None
        if body.plan_id:
            from .local_mission_api import plan_value
            selected=plan_value(str(body.plan_id))
            from .local_search_api import validate_plan_context
            if not selected or selected.get('state')!='READY' or selected.get('plan_hash')!=body.plan_hash:fail('LOCAL_PLAN_CHANGED',409)
            validate_plan_context(selected.get('selection',{}),who)
            if selected['kind'] in ('REGIONAL','GLOBAL'):
                ready=load(CONTROL/'regional-readiness.json',{})
                if not ready.get('ready') or not 0<=time.time()-ready.get('time',0)<15 or ready.get('package_id')!=selected.get('package_id'):fail('REGIONAL_PREPARATION_REQUIRED',409)
        elif body.plan_hash:fail('LOCAL_PLAN_REQUIRED',422)
        storage_status(required=True)
        simulation_admission()
        now=time.time();run_id=str(uuid4())
        value={'job_id':job_id,'run_id':run_id,'requested_by':who,'route':body.route,
            'connection_id':str(body.connection_id),
            'result_policy':body.result_policy,'source_run_id':SOURCE_RUN,'created_at':now,'expires_at':now+120}
        if selected:value.update(plan_id=str(body.plan_id),plan_hash=body.plan_hash,route=selected['route_kind'],region_id=selected['region_id'])
        if selected and selected.get('selection',{}).get('case_id'):
            value['search_context']={k:selected['selection'][k] for k in ('case_id','case_revision')}
        if selected and selected.get('selection',{}).get('mission_id'):
            from .local_mission_store import mission_value
            mission=mission_value(selected['selection']['mission_id'],who)
            value.setdefault('search_context',{}).update(mission_id=mission['mission_id'],mission_title=mission['title'],mission_revision=mission['revision'],target_colors=mission['target_colors'])
        initial={k:v for k,v in value.items() if k not in ('requested_by','expires_at')}
        initial.update(state='QUEUED',phase='QUEUED',registered=False,updated_at=now,
            gpu_execution_enabled=body.result_policy=='LIVE',capture_frames=0)
        save(CONTROL/'states'/f'{job_id}.json',initial)
        save(CONTROL/'requests'/f'{job_id}.json',value)
        save(CONTROL/'active.json',{'job_id':job_id})
        return initial

@router.post('/api/v1/local-patrol/{job_id}/cancel',status_code=202)
def cancel(job_id:UUID,request:Request):
    who=actor(request,'edit')
    with locked():
        value=job(str(job_id))
        if not value:fail('RESOURCE_NOT_FOUND',404)
        if value['state'] not in TERMINAL:
            save(CONTROL/'cancel'/f'{job_id}.json',{'requested_at':time.time(),'requested_by':who})
        return {'job_id':str(job_id),'cancel_requested':value['state'] not in TERMINAL}

@router.post('/api/v1/local-patrol/{job_id}/commands',status_code=202)
def flight_command(job_id:UUID,body:FlightCommand,request:Request):
    who=actor(request,'control');jid=str(job_id);rid=str(body.request_id)
    with locked():
        value=job(jid)
        if not value:fail('RESOURCE_NOT_FOUND',404)
        receipt=CONTROL/'command-requests'/jid/f'{rid}.json'
        existing=load(receipt)
        if existing:
            if existing['action']!=body.action or existing['requested_by']!=who:fail('ID_CONFLICT',409)
            return load(CONTROL/'command-results'/jid/f'{rid}.json',{'request_id':rid,'action':body.action,'state':'PENDING' if time.time()<existing['expires_at'] else 'EXPIRED'})
        if value['state'] in TERMINAL or load(CONTROL/'active.json',{}).get('job_id')!=jid:fail('LOCAL_FLIGHT_NOT_ACTIVE',409)
        status=value.get('operator_control',{})
        if not heartbeat()['online'] or not 0<=time.time()-status.get('updated_at',0)<3:fail('LOCAL_FLIGHT_CONTROL_STALE',409)
        if status.get('version')!=1 or body.action not in status.get('actions',[]):fail('LOCAL_FLIGHT_ACTION_UNAVAILABLE',409)
        if value.get('operator_command',{}).get('state') in ('PENDING','ACCEPTED'):fail('LOCAL_FLIGHT_COMMAND_PENDING',409)
        if (CONTROL/'cancel'/f'{jid}.json').exists():fail('LOCAL_FLIGHT_STOPPING',409)
        now=time.time()
        command=dict(request_id=rid,job_id=jid,run_id=value['run_id'],plan_hash=value.get('plan_hash'),
            action=body.action,requested_by=who,requested_at=now,expires_at=now+10)
        save(receipt,command);save(CONTROL/'commands'/f'{jid}.json',command)
        return {'request_id':rid,'action':body.action,'state':'PENDING','requested_at':now}

@router.get('/api/v1/local-patrol/{job_id}/track')
def track(job_id:UUID,request:Request):
    actor(request)
    value=job(str(job_id))
    if not value:fail('RESOURCE_NOT_FOUND',404)
    from .local_file_snapshots import encoded_snapshot
    path=CONTROL/'tracks'/f'{job_id}.json'
    def build():
        data=load(path,{'run_id':value['run_id'],'samples':[]})
        if data['run_id']!=value['run_id']:fail('LOCAL_TRACK_BINDING_CHANGED',409)
        return data
    return map_snapshot(None,request,encoded=encoded_snapshot(('track',str(path),value['run_id']),[path],build))

@router.get('/api/v1/local-patrol/{job_id}/coverage')
def observation_coverage(job_id:UUID,request:Request):
    actor(request)
    value=job(str(job_id))
    if not value:fail('RESOURCE_NOT_FOUND',404)
    from .local_coverage import coverage,dependencies
    from .local_file_snapshots import encoded_snapshot
    try:
        paths=dependencies(value,CONTROL,RUNS)
        encoded=encoded_snapshot(('coverage',str(CONTROL),value['job_id'],value['run_id'],value.get('plan_hash')),paths,
            lambda:coverage(value,CONTROL,RUNS))
        return map_snapshot(None,request,encoded=encoded)
    except (OSError,ValueError,KeyError,TypeError):fail('LOCAL_COVERAGE_UNAVAILABLE',409)
