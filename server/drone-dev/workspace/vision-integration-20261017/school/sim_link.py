"""Authenticated campus SIM adapter. Existing mission/control/command records remain authoritative."""
import base64
import math
import time
from datetime import timedelta
from threading import Lock
from uuid import UUID, uuid4
from typing import Literal
from fastapi import APIRouter, Request, Response
from pydantic import Field
from drone_backend.contracts import DTO, Counter, Control
from drone_backend.responses import Drone
from drone_backend.core import (transaction, device, locked_row, mutate, now, output, event,
    user, authorize, one, fail)

router = APIRouter()
ENV, WORLD = 'kumoh-campus-sim', '990bee4527600963'
FRAMES, FRAME_LOCK = {}, Lock()

class Binding(DTO):
    environmentId: str
    worldVersion: str
    runId: str = Field(min_length=8, max_length=80)

class Connect(DTO):
    session_id: UUID
    expected_control_epoch: Counter
    binding: Binding

class VideoHealth(DTO):
    state: Literal['OFF','STARTING','LIVE','DEGRADED','WAITING_TUNNEL','RECONNECTING','STOPPED']
    last_success_at: float | None = Field(default=None,allow_inf_nan=False)
    last_error_at: float | None = Field(default=None,allow_inf_nan=False)
    reason: Literal['VIDEO_DISABLED','SSH_CLOSED','SSH_RECONNECT_EXHAUSTED','UPLOAD_TIMEOUT','UPLOAD_FAILED','CAPTURE_ERROR','STALE_SOURCE'] | None = None

class Sample(DTO):
    session_id: UUID
    sequence: Counter
    binding: Binding
    connected: bool
    control_enabled: bool
    telemetry: dict
    flight_id: str | None = None
    video: VideoHealth | None = None

class Preview(DTO):
    session_id: UUID
    captured_at: float
    jpeg: str = Field(max_length=60000)

class DeviceStatus(DTO):
    control_epoch: Counter
    session_id: str | None

class HeartbeatReply(DTO):
    stored: bool
    authority_live: bool
    control_revision: Counter
    control_session_id: str | None

class Stored(DTO):
    stored: bool

class Renewed(DTO):
    renewed: bool

class SimState(DTO):
    connected: bool
    binding: Binding | None
    telemetry: dict | None
    received_at: float | None
    flight_id: str | None
    session_id: str | None
    control_revision: Counter
    control_owned: bool
    control_busy: bool
    control_enabled: bool
    preview_at: float | None
    video: VideoHealth | None = None
    scope: str
    real_flight_enabled: bool

def identity(request, c):
    p, d = device(request, c)
    if not p.get('local_sim_link'): fail('SIM_LINK_IDENTITY_REQUIRED', 403)
    return p, d

def owner_live(c, d):
    if not d['control_session_id'] or not d['control_expires_at'] or d['control_expires_at'] <= now(): return False
    s = one(c, "SELECT s.*,u.status,u.permissions FROM drone.user_session s JOIN drone.user_account u USING(user_id) WHERE session_id=%s", (d['control_session_id'],))
    return bool(s and not s['revoked_at'] and s['status']=='ACTIVE' and s['expires_at']>now()
        and any(x.get('drone_id')==d['drone_id'] and 'control' in x.get('scopes',[]) for x in s['permissions']))

def link_fresh(s):
    link = s.get('sim_link', {})
    return bool(link.get('connected') and -2 <= time.time()-link.get('received_at', 0) < 4
                and -2 <= time.time()-link.get('telemetry', {}).get('timestamp', 0) < 4)

def authority_live(c, d):
    s=d['gateway_state']; ping=s.get('sim_operator', {})
    return (owner_live(c,d) and ping.get('revision')==str(d['control_revision'])
        and ping.get('session_id')==str(d['control_session_id']) and time.time()-ping.get('at',0)<6)

@router.get('/device/v1/sim-link',response_model=DeviceStatus)
def device_status(request: Request):
    with transaction() as c:
        _, d=identity(request,c)
        return {'control_epoch':str(d['control_epoch']), 'session_id':d['gateway_state'].get('session_id')}

@router.post('/device/v1/sim-link/connect',response_model=Drone)
def connect(body: Connect, request: Request):
    if (body.binding.environmentId,body.binding.worldVersion)!=(ENV,WORLD): fail('SIM_WORLD_MISMATCH',422)
    with transaction(events=True) as c:
        _, d=identity(request,c);d=locked_row(c,'drone',d['drone_id']);s=d['gateway_state']
        if s.get('session_id')==str(body.session_id):
            if s.get('sim_link',{}).get('binding')!=body.binding.model_dump():fail('ID_CONFLICT')
            return output(d)
        if int(body.expected_control_epoch)!=d['control_epoch']:fail('OLD_CONTROL_EPOCH')
        if link_fresh(s):fail('SIM_LINK_BUSY')
        state={'session_id':str(body.session_id),'lease_id':str(uuid4()),'environment':'SIM','rc_taken':True,
               'lease_expires_at':now().isoformat(),'sim_link':{'binding':body.binding.model_dump(),'sequence':'0','connected':False}}
        value=mutate(c,'device_state',{'drone_id':d['drone_id'],'control_epoch':d['control_epoch']+1,'gateway_state':state})
        event(c,'DEVICE_CONNECTED',drone_id=d['drone_id'],payload={'session_id':str(body.session_id),'binding':body.binding.model_dump(),'source':'LOCAL_UNREAL_SITL'})
        return value

@router.post('/device/v1/sim-link/heartbeat',response_model=HeartbeatReply)
def heartbeat(body: Sample, request: Request):
    t=body.telemetry;pos=t.get('position');stamp=t.get('timestamp')
    if (not isinstance(pos,list) or len(pos)!=3 or any(type(x) not in (int,float) or not math.isfinite(x) for x in pos)
        or not -180<=pos[0]<=180 or not -90<=pos[1]<=90 or type(stamp) not in (int,float) or not math.isfinite(stamp)
        or stamp>time.time()+2 or type(t.get('valid')) is not bool or type(t.get('armed')) is not bool
        or t.get('source')!='ARDUPILOT_SITL'): fail('INVALID_SIM_TELEMETRY',422)
    # backend_device_state also takes the existing writer advisory lock. Take it
    # BEFORE the drone row, just as command/event writers do, to avoid deadlocks.
    with transaction(events=True) as c:
        _,d=identity(request,c);d=locked_row(c,'drone',d['drone_id']);s=d['gateway_state'];link=s.get('sim_link',{})
        if s.get('session_id')!=str(body.session_id):fail('OLD_DEVICE_SESSION')
        if link.get('binding')!=body.binding.model_dump():fail('SIM_WORLD_MISMATCH')
        if int(body.sequence)<=int(link.get('sequence','0')):fail('OLD_SEQUENCE')
        live=body.connected and t['valid'] and time.time()-stamp<3
        state=s|{'lease_expires_at':(now()+timedelta(seconds=4)).isoformat(),'rc_taken':not(live and body.control_enabled),
            'sim_link':{'binding':body.binding.model_dump(),'sequence':body.sequence,'connected':live,
                'control_enabled':body.control_enabled,'received_at':time.time(),'telemetry':t,'flight_id':body.flight_id,
                'video':body.video.model_dump() if body.video else None}}
        mutate(c,'device_state',{'drone_id':d['drone_id'],'control_epoch':d['control_epoch'],'gateway_state':state})
        return {'stored':True,'authority_live':authority_live(c,d),'control_revision':str(d['control_revision']),
                'control_session_id':str(d['control_session_id']) if d['control_session_id'] else None}

@router.post('/device/v1/sim-link/preview',response_model=Stored)
def preview_upload(body: Preview, request: Request):
    with transaction() as c:
        _,d=identity(request,c)
        if d['gateway_state'].get('session_id')!=str(body.session_id):fail('OLD_DEVICE_SESSION')
    if not -2<=time.time()-body.captured_at<4:fail('STALE_FRAME')
    try:raw=base64.b64decode(body.jpeg,validate=True)
    except ValueError:fail('INVALID_FRAME',422)
    if not raw.startswith(b'\xff\xd8') or not raw.endswith(b'\xff\xd9'):fail('INVALID_FRAME',422)
    with FRAME_LOCK:FRAMES[d['drone_id']]=(str(body.session_id),body.captured_at,raw)
    return {'stored':True}

@router.get('/api/v1/drones/{did}/sim-link',response_model=SimState)
def read_state(did: str, request: Request):
    with transaction() as c:
        u=user(request,c);authorize(u,did)
        d=one(c,'SELECT * FROM drone.drone WHERE drone_id=%s',(did,))
        if not d:fail('RESOURCE_NOT_FOUND',404)
        s=d['gateway_state'];link=s.get('sim_link',{});connected=link_fresh(s)
        mine=str(d['control_session_id'])==str(u['session_id']) and owner_live(c,d)
        with FRAME_LOCK:frame=FRAMES.get(did)
        return {'connected':connected,'binding':link.get('binding'),'telemetry':link.get('telemetry'),
            'received_at':link.get('received_at'),'flight_id':link.get('flight_id'),'session_id':s.get('session_id'),
            'control_revision':str(d['control_revision']),'control_owned':mine,'control_busy':owner_live(c,d) and not mine,
            'control_enabled':connected and link.get('control_enabled',False) and not s.get('rc_taken',True),
            'preview_at':frame[1] if frame and frame[0]==s.get('session_id') and time.time()-frame[1]<4 else None,
            'video':link.get('video'),
            'scope':'CAMPUS_SIM_BASIC_CONTROL','real_flight_enabled':False}

@router.post('/api/v1/drones/{did}/sim-link/control-heartbeat',response_model=Renewed)
def operator_ping(did: str, body: Control, request: Request):
    with transaction(events=True) as c:
        u=user(request,c,'control');authorize(u,did)
        d=locked_row(c,'drone',did)
        if not d:fail('RESOURCE_NOT_FOUND',404)
        if str(d['control_revision'])!=body.expected_control_revision:fail('REVISION_CONFLICT')
        if str(d['control_session_id'])!=str(u['session_id']) or not owner_live(c,d):fail('CONTROL_REQUIRED')
        ping=d['gateway_state'].get('sim_operator',{})
        if (ping.get('revision')==str(d['control_revision']) and ping.get('session_id')==str(u['session_id'])
                and not 0<=time.time()-ping.get('at',0)<6):
            fail('SIM_OPERATOR_HEARTBEAT_EXPIRED')
        s=d['gateway_state']|{'sim_operator':{'revision':body.expected_control_revision,'session_id':str(u['session_id']),'at':time.time()}}
        mutate(c,'device_state',{'drone_id':did,'control_epoch':d['control_epoch'],'gateway_state':s})
        return {'renewed':True}

@router.get('/api/v1/drones/{did}/sim-link/preview.jpg',response_class=Response,responses={200:{'content':{'image/jpeg':{'schema':{'type':'string','format':'binary'}}}}})
def browser_preview(did: str, request: Request):
    with transaction() as c:
        u=user(request,c);authorize(u,did);d=one(c,'SELECT gateway_state FROM drone.drone WHERE drone_id=%s',(did,))
        if not d or not link_fresh(d['gateway_state']):fail('SIM_OFFLINE',404)
        with FRAME_LOCK:frame=FRAMES.get(did)
        if not frame or frame[0]!=d['gateway_state'].get('session_id') or time.time()-frame[1]>=4:fail('STALE_FRAME',404)
    return Response(frame[2],media_type='image/jpeg',headers={'Cache-Control':'no-store','X-Frame-Time':str(frame[1])})

def command_guard(c,d,m):
    """Also called at dispatch: stale tabs, map swaps and revoked control cannot bypass the UI."""
    s=d['gateway_state']
    if 'sim_link' not in s:return
    if not link_fresh(s) or s.get('rc_taken',True):fail('SIM_OFFLINE')
    if not authority_live(c,d):fail('SIM_OPERATOR_HEARTBEAT_REQUIRED')
    row=one(c,'SELECT r.environment_id,r.world_version FROM drone.mission_spatial_revision f JOIN drone.spatial_release r USING(release_id) WHERE f.mission_id=%s AND f.revision=%s',(m['mission_id'],m['active_revision']))
    if not row or (row['environment_id'],row['world_version'])!=(ENV,WORLD):fail('SIM_WORLD_MISMATCH')

def validate_command(c,d,m,body):
    if 'sim_link' not in d['gateway_state']:return
    if body.action not in ('GOTO','PAUSE','RETURN','LAND'):fail('SIM_ACTION_UNSUPPORTED',422)
    binding=d['gateway_state']['sim_link']['binding']
    if body.payload.get('binding')!=binding:fail('SIM_RUN_MISMATCH')
    if set(body.payload)-{'binding','target'}:fail('INVALID_SIM_COMMAND',422)
    if body.action=='GOTO':
        target=body.payload.get('target',{})
        if set(target)!={'longitude','latitude'} or any(type(x) not in (int,float) or not math.isfinite(x) for x in target.values()):fail('INVALID_SIM_COMMAND',422)
        if not -180<=target['longitude']<=180 or not -90<=target['latitude']<=90:fail('INVALID_SIM_COMMAND',422)
    elif 'target' in body.payload:fail('INVALID_SIM_COMMAND',422)

def report_guard(d,row,body):
    if 'sim_link' not in d['gateway_state'] or body.state!='COMPLETED':return
    e=body.evidence
    if e.get('local_status')!='COMPLETED' or e.get('local_command_id')!=str(row['command_id']) or e.get('binding')!=row['payload'].get('binding'):fail('COMPLETION_EVIDENCE_REQUIRED',422)
    t=e.get('telemetry',{})
    if not t.get('valid') or t.get('source')!='ARDUPILOT_SITL' or not -2<=time.time()-t.get('timestamp',0)<5:fail('COMPLETION_EVIDENCE_REQUIRED',422)
    if row['action'] in ('RETURN','LAND') and t.get('armed') is not False:fail('COMPLETION_EVIDENCE_REQUIRED',422)
