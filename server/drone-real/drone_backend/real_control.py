"""REAL operator control and authenticated field-agent exchange."""
from functools import lru_cache
import math
import time
from typing import Literal
from uuid import UUID
from fastapi import APIRouter, Request
from pydantic import BaseModel, ConfigDict, Field, AwareDatetime
from .core import STORAGE, authorize, device, fail, now, one, owned_mission, transaction, user
from .real_control_store import Store, Refused, CHECKS

router=APIRouter()

class DTO(BaseModel):
    model_config=ConfigDict(extra='forbid')

class GroundCommand(DTO):
    command_id:UUID
    action:Literal['MODE','ARM','DISARM','RTL','LAND']
    mode:int|None=Field(default=None,ge=0,le=9)
    confirmed:Literal[True]

class Position(DTO):
    lat:float=Field(ge=-90,le=90,allow_inf_nan=False)
    lon:float=Field(ge=-180,le=180,allow_inf_nan=False)
    relative_altitude_m:float|None=Field(default=None,ge=-500,le=10000,allow_inf_nan=False)

class Connect(BaseModel):
    model_config=ConfigDict(extra='forbid')
    producer_session_id:UUID

class FC(DTO):
    connected:bool
    armed:bool
    landed:bool
    mode:int=Field(ge=0,le=4294967295)
    gps_ok:bool
    battery_ok:bool
    failsafe_ok:bool
    rc_override:bool
    position:Position|None=None
    battery_voltage_v:float|None=Field(default=None,ge=0,le=100,allow_inf_nan=False)
    gps_fix_type:int|None=Field(default=None,ge=0,le=8)
    satellites_visible:int|None=Field(default=None,ge=0,le=255)
    mission_current:int|None=Field(default=None,ge=0,le=65535)
    mission_reached:int|None=Field(default=None,ge=0,le=65535)

class Heartbeat(Connect):
    observed_at:AwareDatetime
    status:FC

class Poll(Connect):
    accept_job:bool=True
    active_command_id:UUID|None=None

class Report(Connect):
    revision:int=Field(ge=1)
    state:Literal['SUCCEEDED','FAILED','UNKNOWN','RUNNING','LANDED','ABORTED']
    evidence:dict=Field(default_factory=dict)

class Preflight(BaseModel):
    model_config=ConfigDict(extra='forbid')
    confirmations:dict[str,bool]

class Upload(BaseModel):
    model_config=ConfigDict(extra='forbid')
    command_id:UUID

@lru_cache(maxsize=1)
def store():return Store(STORAGE/'real-control'/'control.sqlite3')

def checked(fn,*args,**kwargs):
    try:return fn(*args,**kwargs)
    except Refused as exc:fail(str(exc),404 if str(exc)=='COMMAND_NOT_FOUND' else 409)

def operator(c,request,did,scope='control'):
    actor=user(request,c,scope);authorize(actor,did,scope)
    drone=one(c,'SELECT * FROM drone.drone WHERE drone_id=%s',(did,))
    if not drone or drone['gateway_state'].get('environment')!='REAL':fail('RESOURCE_NOT_FOUND',404)
    return actor,drone

def identity(actor):return str(actor['user_id']),str(actor['session_id'])

@router.post('/api/v1/drones/{did}/control/acquire')
def acquire(did:str,request:Request):
    with transaction() as c:
        actor,_=operator(c,request,did)
        return checked(store().acquire,did,*identity(actor))

@router.post('/api/v1/drones/{did}/control/heartbeat')
def renew(did:str,request:Request):
    with transaction() as c:
        actor,_=operator(c,request,did)
        return checked(store().renew,did,*identity(actor))

@router.post('/api/v1/drones/{did}/control/release')
def release(did:str,request:Request):
    with transaction() as c:
        actor,_=operator(c,request,did)
        checked(store().release,did,*identity(actor));return {'released':True,'queued_commands_cancelled':True}

@router.get('/api/v1/drones/{did}/control')
def control_status(did:str,request:Request):
    with transaction() as c:
        actor,_=operator(c,request,did,'read')
        result=store().status(did);lease=store().lease(did)
        result['control_held']=bool(lease)
        result['control_owned']=bool(lease and (lease['owner'],lease['sid'])==identity(actor))
        result['control_implemented']=True;result['environment']='REAL'
        return result

@router.post('/api/v1/drones/{did}/commands',status_code=202)
def issue(did:str,body:GroundCommand,request:Request):
    with transaction() as c:
        actor,_=operator(c,request,did)
        payload={'mode':body.mode} if body.action=='MODE' else {}
        return checked(store().enqueue,str(body.command_id),did,*identity(actor),body.action,payload)

@router.get('/api/v1/commands/{cid}')
def command_status(cid:UUID,request:Request):
    row=checked(store().get,str(cid))
    with transaction() as c:operator(c,request,row['drone_id'],'read')
    return row

def load_plan(mid,pid):
    from .real_mission_prepare import load
    return load(mid,pid)

def plan_payload(row):
    return {'plan_hash':row['content_hash'],'items':row['items'],'takeoff':row['plan']['takeoff'],
            'estimated_seconds':row['estimated_seconds'],'mission_id':row['mission_id'],'plan_id':row['plan']['plan_id']}

def readiness_for(actor,mission,row):
    did=mission['drone_id'];status=store().status(did);fc=status['fc'];blockers=[]
    if not fc.get('connected'):blockers.append('FC_DISCONNECTED_OR_STALE')
    if fc.get('armed') is not False or not fc.get('landed'):blockers.append('FRESH_DISARMED_LANDED_STATE_REQUIRED')
    for key in ('gps_ok','battery_ok','failsafe_ok'):
        if not fc.get(key):blockers.append(key.upper()+'_REQUIRED')
    if fc.get('rc_override'):blockers.append('RC_TAKEOVER')
    upload=status['upload']
    if not upload or upload['hash']!=row['content_hash'] or upload['gateway']!=status['gateway_session_id']:
        blockers.append('MISSION_READBACK_REQUIRED')
    lease=store().lease(did)
    if not lease or (lease['owner'],lease['sid'])!=identity(actor):blockers.append('CONTROL_LEASE_EXPIRED')
    if not store().preflight(did,*identity(actor),row['content_hash']):blockers.append('PREFLIGHT_CONFIRMATIONS_REQUIRED')
    position=fc.get('position');home=row['plan']['takeoff']
    if not position:blockers.append('GPS_HOME_POSITION_UNVERIFIED')
    else:
        try:
            meters=6371000*math.hypot(math.radians(position['lat']-home['lat']),math.radians(position['lon']-home['lon'])*math.cos(math.radians(home['lat'])))
            if not math.isfinite(meters) or meters>20:blockers.append('LAUNCH_POSITION_MISMATCH')
        except (KeyError,TypeError):blockers.append('GPS_HOME_POSITION_UNVERIFIED')
    return {'state':'BLOCKED' if blockers else 'READY','blockers':blockers,'can_dispatch':not blockers,
            'flight_enabled':not blockers,'control_implemented':True,'auto_start_on_reconnect':False,
            'plan_id':row['plan']['plan_id'],'drone_id':did,'fc':fc,'attestation_valid_seconds':120}

@router.post('/api/v1/missions/{mid}/execution-plans/{pid}/upload',status_code=202)
def upload(mid:UUID,pid:UUID,body:Upload,request:Request):
    with transaction() as c:
        actor,mission=owned_mission(request,c,mid,'control');row=load_plan(mid,pid)
        return checked(store().enqueue,str(body.command_id),mission['drone_id'],*identity(actor),'UPLOAD',plan_payload(row))

@router.post('/api/v1/missions/{mid}/execution-plans/{pid}/preflight')
def preflight(mid:UUID,pid:UUID,body:Preflight,request:Request):
    with transaction() as c:
        actor,mission=owned_mission(request,c,mid,'control');row=load_plan(mid,pid)
        return checked(store().attest,mission['drone_id'],*identity(actor),row['content_hash'],body.confirmations)

def submit_plan(actor,mission,row,request_id):
    # An exact retry reads the same outbox record. It never creates another start.
    try:
        existing=store().get(str(request_id))
        if existing['owner_session_id']!=str(actor['session_id']) or existing['payload'].get('plan_hash')!=row['content_hash']:
            fail('ID_CONFLICT')
        return existing
    except Refused:pass
    status=readiness_for(actor,mission,row)
    if status['blockers']:fail(status['blockers'][0])
    payload=plan_payload(row)|{'confirmations':store().preflight(mission['drone_id'],*identity(actor),row['content_hash'])}
    return checked(store().enqueue,str(request_id),mission['drone_id'],*identity(actor),'START',payload)

def device_identity(c,request,sid):
    principal,drone=device(request,c)
    if store().status(drone['drone_id'])['gateway_session_id']!=str(sid):fail('OLD_DEVICE_SESSION')
    return drone

@router.post('/device/v1/control/connect')
def connect(body:Connect,request:Request):
    # Control has its own session; existing camera/telemetry producer sessions are preserved.
    with transaction() as c:
        _,drone=device(request,c)
        store().heartbeat(drone['drone_id'],str(body.producer_session_id),{'connected':False})
    return {'connected':True,'environment':'REAL','auto_replay':False,'server_time':time.time()}

@router.post('/device/v1/control/heartbeat')
def device_heartbeat(body:Heartbeat,request:Request):
    age=(now()-body.observed_at).total_seconds()
    if not -2<=age<=3:fail('STATE_TIMESTAMP_OUT_OF_WINDOW',422)
    with transaction() as c:
        drone=device_identity(c,request,body.producer_session_id)
        store().heartbeat(drone['drone_id'],str(body.producer_session_id),body.status.model_dump(mode='json'))
    return {'stored':True,'server_time':time.time()}

def poll_for_device(request,sid=None,accept_job=True,active_command_id=None):
    with transaction() as c:
        _,drone=device(request,c)
        current=store().status(drone['drone_id'])['gateway_session_id']
        if not current:fail('CONTROL_AGENT_NOT_CONNECTED')
        if sid and current!=str(sid):fail('OLD_DEVICE_SESSION')
        lease=store().lease(drone['drone_id'])
        if lease:
            account=one(c,"SELECT u.permissions FROM drone.user_session s JOIN drone.user_account u USING(user_id) WHERE s.session_id=%s AND s.revoked_at IS NULL AND s.expires_at>now() AND u.status='ACTIVE'",(lease['sid'],))
            if not account or not any(p.get('drone_id')==drone['drone_id'] and 'control' in p.get('scopes',[]) for p in account['permissions']):
                store().revoke(drone['drone_id'])
        return checked(store().poll,drone['drone_id'],current,accept_job,str(active_command_id) if active_command_id else None)

@router.post('/device/v1/control/poll')
def poll(body:Poll,request:Request):return poll_for_device(request,body.producer_session_id,body.accept_job,body.active_command_id)

@router.post('/device/v1/control/commands/{cid}/reports')
def report(cid:UUID,body:Report,request:Request):
    if len(str(body.evidence))>8192:fail('REPORT_TOO_LARGE',413)
    with transaction() as c:
        drone=device_identity(c,request,body.producer_session_id)
        return checked(store().report,drone['drone_id'],str(body.producer_session_id),str(cid),body.revision,body.state,body.evidence)
