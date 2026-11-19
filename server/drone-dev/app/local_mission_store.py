"""Owner-scoped mission drafts; plans and flight history remain immutable."""
import math
import time
from typing import Literal
from uuid import UUID, uuid4
from fastapi import APIRouter, Request
from pydantic import Field, model_validator
from drone_backend.contracts import DTO
from drone_backend.core import fail
from .local_patrol_api import CONTROL, TERMINAL, actor, locked, load, save

router = APIRouter(prefix='/missions')
# Pure contract, kept in parity with vision_core.color.COLORS without loading CV.
Color = Literal['red','orange','yellow','green','blue','navy','purple','pink','white','gray','black','brown']
ROUTE_FIELDS = ('region_ids','initial_region_id','priority_order','zone_version','case_id')

class MissionInput(DTO):
    title: str = Field(min_length=1, max_length=80)
    target_colors: list[Color] = Field(default_factory=list, max_length=12)
    region_ids: list[str] = Field(default_factory=list, max_length=128)
    initial_region_id: str | None = Field(default=None, max_length=200)
    priority_order: list[str] = Field(default_factory=list, max_length=128)
    zone_version: str = Field(default='', max_length=100)
    case_id: UUID | None = None
    revision: int | None = Field(default=None, ge=1)

    @model_validator(mode='after')
    def valid_selection(self):
        self.title = self.title.strip()
        if not self.title: raise ValueError('Title required')
        if len(self.region_ids) != len(set(self.region_ids)) or any(not r or len(r)>200 for r in self.region_ids):
            raise ValueError('Unique region ids required')
        if self.region_ids:
            if self.initial_region_id not in self.region_ids or not self.zone_version:
                raise ValueError('Initial region and zone version required')
            if len(self.priority_order)!=len(self.region_ids) or set(self.priority_order)!=set(self.region_ids) or self.priority_order[0]!=self.initial_region_id:
                raise ValueError('Complete visit order required')
        elif self.initial_region_id or self.priority_order:
            raise ValueError('Empty mission cannot have visit order')
        self.target_colors = list(dict.fromkeys(self.target_colors))
        return self

def mission_created_order(mission):
    stamp = mission.get('created_at')
    if not isinstance(stamp, (int, float)) or isinstance(stamp, bool) or not math.isfinite(stamp) or abs(stamp) > 8.64e12:
        stamp = math.inf
    return stamp, mission['mission_id']


def mission_value(mid, who):
    value = load(CONTROL/'missions'/f'{UUID(str(mid))}.json')
    if not value or value.get('owner')!=who or value.get('deleted_at'): fail('RESOURCE_NOT_FOUND',404)
    return value

def in_flight(mid):
    active = load(CONTROL/'active.json',{})
    request = load(CONTROL/'requests'/f"{active.get('job_id')}.json",{})
    state = load(CONTROL/'states'/f"{active.get('job_id')}.json",{})
    return request.get('search_context',{}).get('mission_id')==mid and state.get('state') not in TERMINAL

def save_mission(value):
    save(CONTROL/'missions'/f"{value['mission_id']}.json",value)
    return value

def check_case(cid, who):
    if cid:
        from .local_search_api import case_value, require_open
        require_open(case_value(cid,who))

def validate_mission_context(selection, who):
    if not selection.get('mission_id'): return
    value = mission_value(selection['mission_id'],who)
    if selection.get('mission_route_revision')!=value['route_revision']:
        fail('MISSION_ROUTE_CHANGED',409)
    if set(selection.get('region_ids',[]))!=set(value['region_ids']) or any(selection.get(k)!=value.get(k) for k in ('initial_region_id','zone_version','case_id')) or selection.get('priority_order')!=value['priority_order']:
        fail('MISSION_SELECTION_MISMATCH',409)

def attach_plan(selection, pid, who):
    if not selection.get('mission_id'): return
    value=mission_value(selection['mission_id'],who)
    value['plan_id']=pid
    value['plan_ids']=list(dict.fromkeys([*value.get('plan_ids',[]),pid]))
    save_mission(value)

@router.get('')
def missions(request:Request):
    who=actor(request)
    rows=[load(p) for p in (CONTROL/'missions').glob('*.json')]
    rows=[v for v in rows if v and v.get('owner')==who and not v.get('deleted_at')]
    return dict(missions=sorted(rows,key=mission_created_order))

@router.post('',status_code=201)
def create_mission(body:MissionInput,request:Request):
    who=actor(request,'edit')
    with locked():
        check_case(body.case_id,who)
        value=body.model_dump(mode='json',exclude={'revision'})
        value.update(mission_id=str(uuid4()),owner=who,revision=1,route_revision=1,plan_id=None,plan_ids=[],created_at=time.time(),updated_at=time.time())
        return save_mission(value)

@router.get('/{mid}')
def read_mission(mid:UUID,request:Request):
    return mission_value(mid,actor(request))

@router.post('/{mid}')
def update_mission(mid:UUID,body:MissionInput,request:Request):
    who=actor(request,'edit')
    with locked():
        value=mission_value(mid,who)
        if body.revision!=value['revision']: fail('MISSION_CHANGED',409)
        if in_flight(str(mid)): fail('MISSION_IN_FLIGHT',409)
        data=body.model_dump(mode='json',exclude={'revision'})
        if data['case_id']!=value.get('case_id'): check_case(data['case_id'],who)
        changed=any(data[k]!=value.get(k) for k in ROUTE_FIELDS)
        if changed:
            value['route_revision']+=1
            value['plan_id']=None
        value.update(data,revision=value['revision']+1,updated_at=time.time())
        return save_mission(value)
