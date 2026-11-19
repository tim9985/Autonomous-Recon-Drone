"""Local real-map preparation and CPU-only route previews. No flight commands."""
import asyncio
from pathlib import Path
import math
import time
from uuid import UUID, uuid4
import hashlib
import json
from fastapi import APIRouter, Request
from fastapi.responses import FileResponse
from pydantic import Field, field_validator, model_validator
from starlette.concurrency import run_in_threadpool
from drone_backend.contracts import DTO
from drone_backend.core import fail
from .local_patrol_api import CONTROL, actor, locked, load, save
from .local_mission_store import Color, mission_created_order

router = APIRouter(prefix='/real-map')


def fresh(path, seconds, now=None):
    # The host removes finished queue files while the API enumerates them.
    try: return not path.is_symlink() and (time.time() if now is None else now)-path.stat().st_mtime < seconds
    except FileNotFoundError: return False


class RegionRef(DTO):
    id: str = Field(min_length=1, max_length=200)
    name: str = Field(min_length=1, max_length=180)
    point: tuple[float, float]
    area_m2: float = Field(default=0, ge=0, allow_inf_nan=False)

    @field_validator('point')
    @classmethod
    def valid_point(cls, point):
        if not all(map(math.isfinite, point)) or not (-180 <= point[0] <= 180 and -85 <= point[1] <= 85):
            raise ValueError('Valid geographic point required')
        return point


class Preparation(DTO):
    title: str = Field(min_length=1, max_length=80)
    release_id: str = Field(pattern=r'^gumi-[a-zA-Z0-9_-]{1,100}$')
    regions: list[RegionRef] = Field(default_factory=list, max_length=32)
    initial_region_id: str | None = Field(default=None, max_length=200)
    target_colors: list[Color] = Field(default_factory=list, max_length=12)
    prepared: bool = False
    revision: int | None = Field(default=None, ge=1)
    launch: tuple[float,float] | None = None

    @field_validator('launch')
    @classmethod
    def valid_launch(cls,value):
        if value is not None and (not all(map(math.isfinite,value)) or not 124<=value[0]<=132 or not 33<=value[1]<=39):
            raise ValueError('A Korean map launch coordinate is required')
        return value

    @model_validator(mode='after')
    def selection(self):
        self.title = self.title.strip()
        if not self.title: raise ValueError('Title required')
        ids = [r.id for r in self.regions]
        if len(ids) != len(set(ids)): raise ValueError('Duplicate regions')
        if ids and self.initial_region_id != ids[0]: raise ValueError('Initial region must be first')
        if not ids and (self.initial_region_id or self.prepared): raise ValueError('Select regions first')
        self.target_colors = list(dict.fromkeys(self.target_colors))
        return self


def mission_value(mid, who):
    value = load(CONTROL/'real-map-missions'/f'{UUID(str(mid))}.json')
    if value and (value.get('owner') != who or value.get('deleted_at')): fail('RESOURCE_NOT_FOUND', 404)
    return value


def input_binding(value):
    return hashlib.sha256(json.dumps([value['release_id'],[r['id'] for r in value['regions']],value.get('launch')],sort_keys=True).encode()).hexdigest()


class PlanRequest(DTO):
    revision: int = Field(ge=1)


@router.post('/missions/{mid}/plan')
def plan_mission(mid:UUID,body:PlanRequest,request:Request):
    who=actor(request,'edit')
    with locked():
        value=mission_value(mid,who)
        if not value:fail('RESOURCE_NOT_FOUND',404)
        if value['revision']!=body.revision:fail('REAL_MAP_MISSION_CHANGED',409)
        if not value['regions'] or not value.get('launch'):fail('REAL_MAP_LAUNCH_REQUIRED',422)
        root=CONTROL/'real-map-plans';binding=input_binding(value)
        active=[]
        for path in root.glob('*.json'):
            p=load(path,{})
            if p.get('state') in ('QUEUED','RUNNING') and time.time()-p.get('updated_at',0)<7200:active.append(p)
        for p in active:
            if p.get('owner')==who and p.get('mission_id')==str(mid) and p.get('input_binding')==binding:return p
        heartbeat=load(Path('/data/city-planner-status/ready.json'),{})
        if heartbeat.get('engine')!='SCHOOL_CPU' or not 0<=time.time()-heartbeat.get('time',0)<20:
            fail('SCHOOL_CITY_PLANNER_UNAVAILABLE',503)
        if len(active)>=2:fail('REAL_MAP_PLANNER_BUSY',409)
        pid=str(uuid4());now=time.time()
        plan=dict(plan_id=pid,mission_id=str(mid),owner=who,input_binding=binding,input_revision=body.revision,state='QUEUED',executor='SCHOOL_CPU',
            release_id=value['release_id'],created_at=now,updated_at=now,launch=value['launch'],
            regions=[dict(id=r['id'],name=r['name'],state='PENDING') for r in value['regions']],
            route=dict(type='FeatureCollection',features=[]),predicted_only=True,actual_observed_percent=0,flight_enabled=False)
        save(root/f'{pid}.json',plan)
        save(CONTROL/'real-map-plan-requests'/f'{pid}.json',dict(plan_id=pid,mission= value,input_binding=binding))
        value['plan_id']=pid;save(CONTROL/'real-map-missions'/f'{mid}.json',value)
        return plan


@router.get('/plans/{pid}')
def read_plan(pid:UUID,request:Request):
    who=actor(request);value=load(CONTROL/'real-map-plans'/f'{pid}.json')
    if not value or value.get('owner')!=who:fail('RESOURCE_NOT_FOUND',404)
    current=mission_value(value['mission_id'],who)
    return dict(value,stale=not current or input_binding(current)!=value['input_binding'])


@router.post('/plans/{pid}/cancel')
def cancel_plan(pid:UUID,request:Request):
    actor(request,'edit');value=read_plan(pid,request)
    if value['state'] in ('QUEUED','RUNNING'):save(CONTROL/'real-map-plan-cancel'/f'{pid}.json',dict(at=time.time()))
    return dict(requested=True)


@router.get('/missions')
def missions(request: Request):
    who = actor(request)
    values = [load(p) for p in (CONTROL/'real-map-missions').glob('*.json')]
    return dict(missions=sorted([v for v in values if v and v.get('owner') == who and not v.get('deleted_at')], key=mission_created_order),
                mode='REAL_MAP_PREP', flight_enabled=False)


@router.post('/missions/{mid}')
def save_mission(mid: UUID, body: Preparation, request: Request):
    who = actor(request, 'edit')
    with locked():
        old = mission_value(mid, who)
        if body.revision != (old['revision'] if old else None): fail('REAL_MAP_MISSION_CHANGED', 409)
        value = body.model_dump(mode='json', exclude={'revision'})
        if old and old.get('plan_id') and input_binding(old)==input_binding(value):value['plan_id']=old['plan_id']
        value.update(mission_id=str(mid), owner=who, mode='REAL_MAP_PREP', flight_enabled=False,
                     revision=(old['revision'] if old else 0)+1,
                     created_at=old.get('created_at') if old else time.time(), updated_at=time.time())
        save(CONTROL/'real-map-missions'/f'{mid}.json', value)
        return value


@router.get('/tiles/{z}/{x}/{y}.png')
def tile(z:int,x:int,y:int,request:Request):
    actor(request)
    if not 0<=z<=19 or not 0<=x<2**z or not 0<=y<2**z:fail('INVALID_MAP_TILE',422)
    from school.transport import service_client
    from fastapi.responses import Response
    with service_client('map') as client:r=client.get(f'/api/map/tiles/{z}/{x}/{y}.png')
    return Response(r.content,status_code=r.status_code,media_type=r.headers.get('content-type','image/png'),headers={'Cache-Control':'private, max-age=86400' if r.status_code==200 else 'no-store'})
