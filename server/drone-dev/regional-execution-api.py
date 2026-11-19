"""School operator -> authenticated PC -> isolated actual observation worker."""
import json
import time
from uuid import UUID
import psycopg
from fastapi import APIRouter, Request
from pydantic import Field
from drone_backend.contracts import DTO
from drone_backend.core import transaction, owned_mission, one, output, fail, digest, Jsonb, event, user, authorize
from app.simulation_api import simulator
from .regional_search import ROOT, REGISTRY, reconcile, atomic
from .regional_contract import PROFILE, CAPABILITIES, ACTIVE, ready_reasons, validate_frame

router=APIRouter()

def write(c, action, value):
    try:
        return one(c,'SELECT drone.regional_execute_write(%s,%s) AS value',(action,Jsonb(value)))['value']
    except (psycopg.errors.RaiseException,psycopg.errors.UniqueViolation) as exc:
        fail(exc.diag.message_primary if isinstance(exc,psycopg.errors.RaiseException) else 'EXECUTOR_BUSY',409)

def expire(c):
    for r in c.execute("SELECT execution_id FROM drone.regional_execution WHERE (state='QUEUED' AND expires_at<now()) OR (state IN ('RUNNING','STOP_REQUESTED') AND lease_until<now())").fetchall():
        write(c,'expire',dict(execution_id=str(r['execution_id'])))

def binding(c, mid, jid, worker_id):
    job=one(c,'SELECT * FROM drone.regional_search_job WHERE mission_id=%s AND job_id=%s',(mid,jid))
    if not job:fail('RESOURCE_NOT_FOUND',404)
    job=reconcile(c,job)
    mission=one(c,'SELECT * FROM drone.mission WHERE mission_id=%s',(mid,))
    worker=one(c,'SELECT * FROM drone.regional_executor WHERE worker_id=%s',(worker_id,))
    packages=json.loads(REGISTRY.read_text())
    package=next((p for p in packages if p['packageId']==job['package_id']),None)
    reasons=ready_reasons(job,mission,package,worker,time.time())
    conditions=one(c,'SELECT conditions FROM drone.mission_revision WHERE mission_id=%s AND revision=%s',(mid,job['mission_revision']))['conditions']
    if package and any(conditions.get(k)!=v for k,v in package['missionConditions'].items()):reasons.append('REGIONAL_SEARCH_CONDITIONS_MISMATCH')
    if mission['drone_id']!='sim-pi-01' or mission['test_conditions'].get('environment')!='SIM':reasons.append('REAL_FLIGHT_DISABLED')
    # The new executor cannot run concurrently with either older school control path.
    if one(c,"SELECT run_id FROM simulation.run WHERE state='RUNNING' OR (state='QUEUED' AND expires_at>now()) LIMIT 1"):
        reasons.append('OTHER_SIM_RUN_ACTIVE')
    d=one(c,"SELECT control_expires_at,gateway_state FROM drone.drone WHERE drone_id='sim-pi-01'")
    if d['control_expires_at'] and d['control_expires_at'].timestamp()>time.time():reasons.append('MANUAL_CONTROL_OWNED')
    if any(r['state'] in ACTIVE for r in c.execute('SELECT state FROM drone.regional_execution').fetchall()):reasons.append('EXECUTOR_BUSY')
    return job,worker,reasons

def publish(c, run):
    path=ROOT/'executions'/str(run['execution_id'])
    job=one(c,'SELECT * FROM drone.regional_search_job WHERE job_id=%s',(run['job_id'],))
    atomic(path/'request.json',dict(execution=output(run),job=output(job)))
    mark=path/'published.json';after=json.loads(mark.read_text())['sequence'] if mark.exists() else 0
    rows=c.execute('SELECT sequence,packet FROM drone.regional_capture WHERE execution_id=%s AND sequence>%s ORDER BY sequence LIMIT 600',(run['execution_id'],after)).fetchall()
    for r in rows:atomic(path/'frames'/f"{r['sequence']:08d}.json",r['packet'])
    if rows:atomic(mark,dict(sequence=rows[-1]['sequence']))

def observation(c, run):
    path=ROOT/'executions'/str(run['execution_id'])
    status=path/'observation.json'
    if not status.is_file():return run
    value=json.loads(status.read_text())
    # File is written by the separate, read-only numerical image; never by PC callers.
    job=one(c,'SELECT * FROM drone.regional_search_job WHERE job_id=%s',(run['job_id'],))
    if value['packageId']!=job['package_id'] or value['resultHash']!=job['result_hash']:fail('OBSERVATION_BINDING_CHANGED')
    after=run['applied_sequence'];through=min(value['sequence'],run['last_sequence'])
    cells=[]
    # Bounded DB reconciliation; more is drained by the next status/progress request.
    through=min(through,after+120)
    for n in range(after+1,through+1):
        delta=path/'completions'/f'{n:08d}.json'
        if not delta.is_file():through=n-1;break
        cells.extend(json.loads(delta.read_text()))
    actual={k:v for k,v in value.items() if k not in ('packageId','resultHash','sequence')}
    if through>=after:
        run=write(c,'observe',dict(execution_id=str(run['execution_id']),package_id=job['package_id'],result_hash=job['result_hash'],sequence=through,cells=cells,actual=actual))
    return run

class Start(DTO):
    execution_id:UUID
    worker_id:str=Field(min_length=1,max_length=128)
    result_hash:str=Field(pattern='^[0-9a-f]{64}$')

class Heartbeat(DTO):
    session_id:UUID
    package_id:str=Field(pattern='^[0-9a-f]{64}$')
    adapter_hash:str=Field(pattern='^[0-9a-f]{64}$')
    world_version:str
    capabilities:list[str]=Field(max_length=16)
    ready:bool
    diagnostics:dict

class Session(DTO):
    session_id:UUID

class Progress(Session):
    status:dict

class Frames(Session):
    frames:list[dict]=Field(min_length=1,max_length=5)

class Finish(Progress):
    state:str=Field(pattern='^(COMPLETED|FAILED|CANCELLED)$')

@router.get('/api/v1/simulations/regional-executors')
def executors(request:Request):
    with transaction(events=True) as c:
        u=user(request,c);authorize(u,'sim-pi-01');expire(c)
        return output(c.execute('SELECT * FROM drone.regional_executor ORDER BY worker_id').fetchall())

@router.get('/api/v1/missions/{mid}/regional-search')
def jobs(mid:UUID,request:Request):
    with transaction() as c:
        owned_mission(request,c,mid)
        return output(c.execute('SELECT job_id,mission_revision,region_id,state,plan_id,result_hash,created_at FROM drone.regional_search_job WHERE mission_id=%s ORDER BY created_at DESC LIMIT 100',(mid,)).fetchall())

@router.get('/api/v1/missions/{mid}/regional-search/{jid}/execution-readiness')
def readiness(mid:UUID,jid:UUID,request:Request,worker_id:str='sim-pi-01'):
    with transaction(events=True) as c:
        owned_mission(request,c,mid);expire(c)
        job,worker,reasons=binding(c,mid,jid,worker_id)
        return dict(executable=not reasons,reasons=reasons,planningReady=job['state']=='READY',planId=job['plan_id'],
                    executionProfile=PROFILE,actualCoverageConnected=True,realExecutable=False,worker=output(worker))

@router.post('/api/v1/missions/{mid}/regional-search/{jid}/start',status_code=202)
def start(mid:UUID,jid:UUID,body:Start,request:Request):
    with transaction(events=True) as c:
        actor,_=owned_mission(request,c,mid,'control');expire(c)
        meaning=dict(job_id=str(jid),worker_id=body.worker_id,result_hash=body.result_hash)
        old=one(c,'SELECT e.*,j.mission_id FROM drone.regional_execution e JOIN drone.regional_search_job j USING(job_id) WHERE execution_id=%s',(body.execution_id,))
        if old:
            if old['mission_id']!=mid or old['request_hash']!=digest(meaning):fail('ID_CONFLICT')
            return output(old)
        job,worker,reasons=binding(c,mid,jid,body.worker_id)
        if body.result_hash!=job['result_hash']:fail('PLAN_HASH_CHANGED')
        if reasons:fail(reasons[0])
        run=write(c,'start',dict(**meaning,execution_id=str(body.execution_id),creator_user_id=str(actor['user_id']),request_hash=digest(meaning)))
        event(c,'COMMAND_REQUESTED',mid,actor=actor['user_id'],payload=dict(action='REGIONAL_SEARCH_START',execution_id=str(body.execution_id),plan_id=str(job['plan_id']),environment='SIM'))
        return run

def operator_run(c,mid,eid,request,scope='read'):
    owned_mission(request,c,mid,scope)
    run=one(c,'SELECT e.* FROM drone.regional_execution e JOIN drone.regional_search_job j USING(job_id) WHERE e.execution_id=%s AND j.mission_id=%s',(eid,mid))
    if not run:fail('RESOURCE_NOT_FOUND',404)
    return run

@router.get('/api/v1/missions/{mid}/regional-executions')
def history(mid:UUID,request:Request):
    with transaction(events=True) as c:
        owned_mission(request,c,mid);expire(c)
        rows=c.execute('SELECT e.* FROM drone.regional_execution e JOIN drone.regional_search_job j USING(job_id) WHERE j.mission_id=%s ORDER BY e.created_at DESC LIMIT 100',(mid,)).fetchall()
        return output([observation(c,r) for r in rows])

@router.get('/api/v1/missions/{mid}/regional-executions/{eid}')
def get_run(mid:UUID,eid:UUID,request:Request):
    with transaction(events=True) as c:
        expire(c);run=operator_run(c,mid,eid,request);publish(c,run)
        return output(observation(c,run))

@router.post('/api/v1/missions/{mid}/regional-executions/{eid}/stop')
def stop(mid:UUID,eid:UUID,request:Request):
    with transaction(events=True) as c:
        operator_run(c,mid,eid,request,'control')
        return write(c,'stop',dict(execution_id=str(eid)))

@router.get('/api/v1/missions/{mid}/regional-executions/{eid}/coverage')
def coverage(mid:UUID,eid:UUID,request:Request):
    with transaction() as c:
        operator_run(c,mid,eid,request)
        return dict(type='FeatureCollection',features=[dict(type='Feature',geometry=r['geometry'],properties=dict(cellIndex=r['cell_index'],areaM2=r['area_m2'],completedAt=r['evidence']['endedAt'])) for r in c.execute('SELECT * FROM drone.regional_completion WHERE execution_id=%s ORDER BY cell_index',(eid,))])

def worker_run(c,request,eid,sid):
    p=simulator(request,c)
    run=one(c,'SELECT * FROM drone.regional_execution WHERE execution_id=%s AND worker_id=%s',(eid,p['id']))
    if not run:fail('RESOURCE_NOT_FOUND',404)
    if str(run['worker_session'])!=str(sid):fail('OLD_WORKER_SESSION')
    return p,run

@router.post('/device/v1/regional-search/heartbeat')
def heartbeat(body:Heartbeat,request:Request):
    with transaction(events=True) as c:
        p=simulator(request,c);expire(c)
        data=body.model_dump(mode='json')|dict(worker_id=p['id'])
        if body.ready and not set(CAPABILITIES).issubset(body.capabilities):fail('CAPABILITIES_MISSING')
        write(c,'heartbeat',data)
        rows=c.execute("SELECT * FROM drone.regional_execution WHERE worker_id=%s AND worker_session=%s AND state IN ('QUEUED','RUNNING','STOP_REQUESTED','UNCONFIRMED') ORDER BY created_at",(p['id'],body.session_id)).fetchall()
        return dict(worker_id=p['id'],pending=output(rows),serverTime=time.time())

@router.post('/device/v1/regional-search/{eid}/claim')
def claim(eid:UUID,body:Session,request:Request):
    with transaction(events=True) as c:
        p,run=worker_run(c,request,eid,body.session_id)
        j=one(c,'SELECT * FROM drone.regional_search_job WHERE job_id=%s',(run['job_id'],))
        active=json.loads(REGISTRY.read_text())
        if not any(v['packageId']==j['package_id'] and v['adapterHash']==j['request']['adapterHash'] for v in active):fail('REGIONAL_SEARCH_INPUT_CHANGED')
        run=write(c,'claim',dict(execution_id=str(eid),worker_id=p['id'],worker_session=str(body.session_id)))
        publish(c,run)
        return dict(execution=run,job=output(j))

@router.post('/device/v1/regional-search/{eid}/progress')
def progress(eid:UUID,body:Progress,request:Request):
    with transaction(events=True) as c:
        p,run=worker_run(c,request,eid,body.session_id)
        m=one(c,'SELECT m.draft_revision,j.mission_revision FROM drone.mission m JOIN drone.regional_search_job j USING(mission_id) WHERE j.job_id=%s',(run['job_id'],))
        if m['draft_revision']!=m['mission_revision']:write(c,'stop',dict(execution_id=str(eid)))
        run=write(c,'progress',dict(execution_id=str(eid),worker_id=p['id'],worker_session=str(body.session_id),status=body.status))
        publish(c,run);run=observation(c,run)
        return output(run)

@router.post('/device/v1/regional-search/{eid}/frames')
def frames(eid:UUID,body:Frames,request:Request):
    values=[]
    try:
        for f in body.frames:
            packet=f['packet'];eligible=validate_frame(packet)
            values.append(dict(sequence=int(f['sequence']),packet=packet|dict(eligible=eligible),content_hash=digest(packet)))
    except (KeyError,TypeError,ValueError,OverflowError) as exc:fail('INVALID_CAPTURE',422)
    with transaction(events=True) as c:
        p,_=worker_run(c,request,eid,body.session_id)
        run=write(c,'frames',dict(execution_id=str(eid),worker_id=p['id'],worker_session=str(body.session_id),frames=values))
        publish(c,run)
        return dict(last_sequence=str(run['last_sequence']))

@router.post('/device/v1/regional-search/{eid}/finish')
def finish(eid:UUID,body:Finish,request:Request):
    with transaction(events=True) as c:
        p,run=worker_run(c,request,eid,body.session_id)
        run=write(c,'finish',dict(execution_id=str(eid),worker_id=p['id'],worker_session=str(body.session_id),state=body.state,status=body.status))
        publish(c,run)
        return observation(c,run)
