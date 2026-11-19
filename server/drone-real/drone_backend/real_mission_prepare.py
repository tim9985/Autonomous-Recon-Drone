"""REAL mission planning with an explicit authenticated execution handoff."""
import fcntl,hashlib,json,math
from datetime import datetime,timezone
from pathlib import Path
from typing import Literal
from uuid import UUID,uuid4
from fastapi import APIRouter,Request
from pydantic import BaseModel,ConfigDict,Field
from .core import STORAGE,authorize,fail,now,one,output,owned_mission,transaction
from .real_live_state import read_live

router=APIRouter()
BASE=STORAGE/'real-mission-preparation'

class Point(BaseModel):
    model_config=ConfigDict(extra='forbid')
    lat:float=Field(ge=-90,le=90,allow_inf_nan=False)
    lon:float=Field(ge=-180,le=180,allow_inf_nan=False)

class Waypoint(Point):
    altitude_m:float=Field(ge=15,allow_inf_nan=False)
    hold_seconds:int=Field(default=2,ge=0,le=60)

class Plan(BaseModel):
    model_config=ConfigDict(extra='forbid')
    plan_id:UUID
    task:Literal['PERSON_SEARCH']='PERSON_SEARCH'
    takeoff:Point
    takeoff_altitude_m:float=Field(default=20,ge=15,allow_inf_nan=False)
    speed_m_s:float=Field(default=3,gt=0,le=10,allow_inf_nan=False)
    video_start_altitude_m:float=Field(default=15,ge=1,allow_inf_nan=False)
    route:list[Waypoint]=Field(min_length=1,max_length=200)
    return_action:Literal['RTL']='RTL'

class StartRequest(BaseModel):
    model_config=ConfigDict(extra='forbid')
    request_id:UUID
    plan_id:UUID

def distance(a,b):
    p,q=math.radians(a['lat']),math.radians(b['lat'])
    u=math.sin((q-p)/2)**2+math.cos(p)*math.cos(q)*math.sin(math.radians(b['lon']-a['lon'])/2)**2
    return 6371000*2*math.asin(min(1,math.sqrt(u)))

def compile_plan(body):
    p=body.model_dump(mode='json');home=p['takeoff'];route=p['route']
    if max(distance(home,w) for w in route)>1000:raise ValueError('ROUTE_OUTSIDE_1KM_OPERATION_RANGE')
    if p['video_start_altitude_m']>max([p['takeoff_altitude_m']]+[w['altitude_m'] for w in route]):raise ValueError('VIDEO_THRESHOLD_UNREACHABLE')
    points=[home]+route+[home]
    length=sum(distance(a,b) for a,b in zip(points,points[1:]))
    vertical=p['takeoff_altitude_m']+route[-1]['altitude_m']+sum(abs(a['altitude_m']-b['altitude_m']) for a,b in zip([{'altitude_m':p['takeoff_altitude_m']}]+route,route))
    seconds=length/p['speed_m_s']+vertical+sum(w['hold_seconds'] for w in route)
    if seconds>900:raise ValueError('ESTIMATED_MISSION_EXCEEDS_15_MINUTES')
    def item(command,lat=0,lon=0,alt=0,params=None):
        return {'command':command,'frame':6 if command in (16,22) else 0,'x':round(lat*1e7),'y':round(lon*1e7),'z':alt,'params':params or [0,0,0,0],'autocontinue':1}
    items=[item(16,home['lat'],home['lon']),item(22,home['lat'],home['lon'],p['takeoff_altitude_m']),item(178,params=[1,p['speed_m_s'],-1,0])]
    items += [item(16,w['lat'],w['lon'],w['altitude_m'],[w['hold_seconds'],0,0,0]) for w in route]
    items += [item(20)]
    for i,it in enumerate(items):it['seq']=i
    return {'plan':p,'items':items,'estimated_distance_m':round(length,1),'estimated_seconds':round(seconds,1),
        'estimate_is_flight_validated':False,'phases':['CAMERA_WAKE_AND_VERIFY','PREFLIGHT','UPLOAD_AND_READBACK','EXPLICIT_START','TAKEOFF','SURROUNDINGS_REVIEW','SEARCH','RTL','LANDED_DISARMED'],
        'camera_policy':{'standby':'LOW_POWER','verify_before_takeoff':True,'video_start_relative_altitude_m':p['video_start_altitude_m'],'fresh_altitude_samples_required':2,'stop_after_landed_and_disarmed':True},
        'detection_requirement':{'postures':['standing','sitting','lying'],'model_input_min_width_px':25,'model_input_min_height_px':25,'validated_altitude_range_required':True},
        'mission_upload_verified':False,'flight_enabled':False,'auto_start_on_reconnect':False}

def path(mid,pid):return BASE/str(mid)/(str(pid)+'.json')
def load(mid,pid):
    try:return json.loads(path(mid,pid).read_text())
    except FileNotFoundError:fail('PLAN_NOT_FOUND',404)

def readiness(c,mission,row,actor):
    from .real_control import readiness_for
    return readiness_for(actor,mission,row)

@router.put('/api/v1/missions/{mid}/execution-plans/{pid}')
def prepare(mid:UUID,pid:UUID,body:Plan,request:Request):
    with transaction() as c:
        actor,mission=owned_mission(request,c,mid,'edit')
        if mission['test_conditions'].get('environment')!='REAL':fail('ENVIRONMENT_MISMATCH')
        if body.plan_id!=pid:fail('PLAN_ID_MISMATCH',422)
        try:row=compile_plan(body)
        except ValueError as exc:fail(str(exc),422)
        raw=json.dumps(row['plan'],sort_keys=True,separators=(',',':'));h=hashlib.sha256(raw.encode()).hexdigest()
        p=path(mid,pid);p.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
        with (p.parent/'.lock').open('w') as lock:
            fcntl.flock(lock,fcntl.LOCK_EX)
            if p.exists():
                old=load(mid,pid)
                if old['content_hash']!=h:fail('PLAN_ID_CONFLICT')
                return old
            row.update(mission_id=str(mid),drone_id=mission['drone_id'],created_by=str(actor['user_id']),created_at=now().isoformat(),content_hash=h,state='PREPARED_OFFLINE')
            tmp=p.with_suffix('.'+uuid4().hex+'.tmp');tmp.write_text(json.dumps(row,indent=2));tmp.chmod(0o600);tmp.replace(p)
        return row

@router.get('/api/v1/missions/{mid}/execution-plans/{pid}')
def get_plan(mid:UUID,pid:UUID,request:Request):
    with transaction() as c:owned_mission(request,c,mid);return load(mid,pid)

@router.get('/api/v1/missions/{mid}/execution-plans/{pid}/readiness')
def get_readiness(mid:UUID,pid:UUID,request:Request):
    with transaction() as c:
        actor,mission=owned_mission(request,c,mid,'control');return readiness(c,mission,load(mid,pid),actor)

@router.post('/api/v1/missions/{mid}/execution-requests')
def submit(mid:UUID,body:StartRequest,request:Request):
    from .real_control import submit_plan
    with transaction() as c:
        actor,mission=owned_mission(request,c,mid,'control')
        return submit_plan(actor,mission,load(mid,body.plan_id),body.request_id)
