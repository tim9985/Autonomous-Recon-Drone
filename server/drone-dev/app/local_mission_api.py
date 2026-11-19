"""Local dashboard outbox. Registered regions only; no command/path input."""
import hashlib
import json
from pathlib import Path
import time
from uuid import UUID
from fastapi import APIRouter, Request
from pydantic import Field
from drone_backend.contracts import DTO
from drone_backend.core import fail, transaction, one
from .local_patrol_api import CONTROL, SOURCE_RUN, actor, locked, load, save
from .local_file_snapshots import read_json as cached_json
from .local_route_geometry import project_route

def read_json(path,default=None):
    return cached_json(path,default,loader=load)

router=APIRouter()
REGISTRY=Path('/data/regional-search/packages.json')
RESULTS=Path('/data/regional-search/results')
SHORT='kumoh-local-square-8m-v1'

def catalog():
    packages=load(REGISTRY,[])
    rows=[]
    for p in packages:
        if p.get('environment')!='SIM':continue
        for entry in p.get('semanticRegions',[]):
            rows.append(dict(entry,geometry=p['regions'][entry['id']],package_id=p['packageId'],
                building_policy=p['buildingActivityVersion'],kind='REGIONAL'))
    return rows

def route_3d(value,*,include_return=True):
    if value.get('state')!='READY':return []
    try:
        if value.get('kind')=='SHORT':return project_route(value)
        binding=value.get('binding',{});jid=str(UUID(binding['backend_job_id']))
        result=read_json(RESULTS/f'{jid}.json',{})
        if result.get('resultHash')!=value.get('result_hash') or not value.get('result_hash'):return []
        payload=result.get('result',{})
        return project_route(value,payload.get('execution'),include_return=include_return,world_version=payload.get('worldVersion'))
    except (OSError,ValueError,KeyError,TypeError):return []

def plan_value(pid, *, summary=False, context=None):
    value=read_json(CONTROL/'plans'/f'{pid}.json',{})
    if not value:fail('RESOURCE_NOT_FOUND',404)
    current,ready=context if context is not None else (read_json(REGISTRY,[]),read_json(CONTROL/'regional-readiness.json',{}))
    stale=value.get('kind') in ('REGIONAL','GLOBAL') and not any(p['packageId']==value.get('package_id') for p in current)
    binding=value.get('binding',{})
    if value.get('state')=='READY' and ready.get('local_adapter_hash'):
        if value.get('kind')=='GLOBAL' and binding.get('local_adapter_hash')!=ready['local_adapter_hash']:stale=True
        if value.get('kind')=='REGIONAL' and binding.get('completion_contract')!=ready.get('completion_contract'):stale=True
    if stale:
        value=dict(value,state='STALE',stored_state=value.get('state'),error='LOCAL_INPUT_VERSION_MISMATCH',
            route=[],predicted_percent=None,predicted_seconds=None,note='이전 입력의 계획 기록입니다. 현재 지도에서 다시 계획하세요.')
    if value.get('kind')=='GLOBAL':
        tasks=[];spatial=[]
        for index,task in enumerate(value.get('tasks',[])):
            p=read_json(CONTROL/'plans'/f"{task['plan_id']}.json",{})
            tasks.append(dict(task,state='STALE' if stale else p.get('state','WAITING'),error=p.get('error'),route=[] if stale or summary else p.get('display_route',p.get('route',[])),
                predicted_percent=None if stale else p.get('predicted_percent'),predicted_seconds=None if stale else p.get('predicted_seconds')))
            if not stale and not summary:spatial.extend(route_3d(p,include_return=index==len(value['tasks'])-1))
        value=dict(value,tasks=tasks,route=tasks[0]['route'] if tasks else [])
        if not summary:value['route_3d']=dict(type='FeatureCollection',features=spatial)
    elif not summary:
        value=dict(value,route_3d=dict(type='FeatureCollection',features=[] if stale else route_3d(value)))
    if summary:
        value={k:v for k,v in value.items() if k not in ('execution','route','route_3d','display_route','geometry','binding','validation')}
        if 'tasks' in value:value['tasks']=[{k:v for k,v in t.items() if k not in ('route','geometry','execution','binding')} for t in value['tasks']]
    return value

class Plan(DTO):
    request_id:UUID
    region_id:str=Field(min_length=1,max_length=200)

class GlobalPlan(DTO):
    request_id:UUID
    region_ids:list[str]=Field(min_length=1,max_length=128)
    initial_region_id:str=Field(min_length=1,max_length=200)
    zone_version:str=Field(min_length=1,max_length=100)
    priority_order:list[str]|None=Field(default=None,max_length=128)
    case_id:UUID|None=None
    case_revision:int|None=Field(default=None,ge=1)
    mission_id:UUID|None=None
    mission_route_revision:int|None=Field(default=None,ge=1)

@router.post('/api/v1/local-patrol/global-plans',status_code=202)
def create_global(body:GlobalPlan,request:Request):
    who=actor(request,'edit');pid=str(body.request_id);options={r['id']:r for r in catalog()}
    ids=body.region_ids
    if len(ids)!=len(set(ids)) or any(i not in options for i in ids):fail('GLOBAL_UNSUPPORTED_REGIONS',422)
    if body.initial_region_id not in ids:fail('GLOBAL_INITIAL_REGION_REQUIRED',422)
    packages={options[i]['package_id'] for i in ids}
    if len(packages)!=1:fail('GLOBAL_PACKAGE_MISMATCH',409)
    package=next(p for p in load(REGISTRY,[]) if p['packageId'] in packages)
    if body.zone_version!=package['gridVersion']:fail('GLOBAL_ZONE_VERSION_CHANGED',409)
    meaning=dict(region_ids=sorted(ids),initial_region_id=body.initial_region_id,zone_version=body.zone_version)
    if body.priority_order is not None:
        if len(body.priority_order)!=len(ids) or set(body.priority_order)!=set(ids) or body.priority_order[0]!=body.initial_region_id:fail('SEARCH_ORDER_INVALID',422)
        meaning['priority_order']=body.priority_order
    if bool(body.case_id)!=(body.case_revision is not None):fail('SEARCH_CASE_BINDING_REQUIRED',422)
    if body.case_id:meaning.update(case_id=str(body.case_id),case_revision=body.case_revision)
    if bool(body.mission_id)!=(body.mission_route_revision is not None):fail('MISSION_BINDING_REQUIRED',422)
    if body.mission_id:meaning.update(mission_id=str(body.mission_id),mission_route_revision=body.mission_route_revision)
    with locked():
        from .local_search_api import validate_plan_context
        validate_plan_context(meaning,who)
        old=load(CONTROL/'plan-requests'/f'{pid}.json')
        if old:
            if old['requested_by']!=who or old.get('selection')!=meaning:fail('ID_CONFLICT',409)
            return plan_value(pid)
        value=dict(plan_id=pid,region_id='global-'+pid,name=f'선택 {len(ids)}개 구역 전역 정찰',kind='GLOBAL',
            state='QUEUED',selection=meaning,package_id=package['packageId'],created_at=time.time(),gpu_execution_enabled=False)
        save(CONTROL/'plans'/f'{pid}.json',value)
        save(CONTROL/'plan-requests'/f'{pid}.json',dict(value,requested_by=who))
        from .local_mission_store import attach_plan
        attach_plan(meaning,pid,who)
        return value

class Review(DTO):
    review_id:UUID
    source_run_id:UUID
    observation_id:UUID
    plan_id:UUID|None=None
    capture_run_id:UUID|None=None

@router.get('/api/v1/local-patrol/catalog')
def regions(request:Request):
    actor(request,history=True)
    config=load(CONTROL/'map-binding.json',{})
    return dict(regions=[dict(id=SHORT,name='캠퍼스 짧은 검증 구역',kind='SHORT',areaM2=64,
        description='고정 8m 사각 경로 · 고도 15m · 전체 구역 수색 아님',**config.get('short',{})),*catalog()],
        gpu_execution_enabled=False,source_run_id=request.state.previous_recording)

@router.post('/api/v1/local-patrol/plans',status_code=202)
def create(body:Plan,request:Request):
    who=actor(request,'edit');pid=str(body.request_id)
    options={r['id']:r for r in catalog()}
    if body.region_id!=SHORT and body.region_id not in options:fail('REGISTERED_REGION_REQUIRED',422)
    with locked():
        previous=load(CONTROL/'plan-requests'/f'{pid}.json')
        if previous:
            if previous['requested_by']!=who or previous['region_id']!=body.region_id:fail('ID_CONFLICT',409)
            return plan_value(pid)
        row=options.get(body.region_id,dict(name='캠퍼스 짧은 검증 구역',kind='SHORT'))
        value=dict(plan_id=pid,region_id=body.region_id,name=row['name'],kind=row['kind'],
            state='QUEUED',package_id=row.get('package_id'),created_at=time.time(),gpu_execution_enabled=False)
        save(CONTROL/'plans'/f'{pid}.json',value)
        save(CONTROL/'plan-requests'/f'{pid}.json',dict(value,requested_by=who))
        return value

@router.get('/api/v1/local-patrol/plans/{pid}')
def plan(pid:UUID,request:Request):
    actor(request);return plan_value(str(pid))

@router.get('/api/v1/local-patrol/plans')
def plans(request:Request):
    actor(request)
    files=sorted((CONTROL/'plans').glob('*.json'),key=lambda p:p.stat().st_mtime,reverse=True)[:30]
    context=(read_json(REGISTRY,[]),read_json(CONTROL/'regional-readiness.json',{}))
    return {'plans':[plan_value(p.stem,summary=True,context=context) for p in files]}

@router.post('/api/v1/local-patrol/plans/{pid}/prepare',status_code=202)
def prepare(pid:UUID,request:Request):
    actor(request,'edit');value=plan_value(str(pid))
    if value['state']!='READY' or value['kind'] not in ('REGIONAL','GLOBAL'):fail('REGIONAL_PLAN_NOT_READY',409)
    if value['kind']=='GLOBAL':pid=UUID(value['tasks'][0]['plan_id'])
    with locked():save(CONTROL/'scene-requests'/f'{pid}.json',dict(plan_id=str(pid),created_at=time.time()))
    return {'plan_id':str(pid),'state':'QUEUED'}

@router.post('/api/v1/local-patrol/reviews',status_code=201)
def review(body:Review,request:Request):
    who=actor(request,'edit')
    from .postflight_api import recording,binding
    with transaction(snapshot=True) as c:
        row,cfg=recording(c,request,body.source_run_id)
        if row['state']!='COMPLETED':fail('PREVIOUS_RESULT_SOURCE_REQUIRED',422)
        record=one(c,"""SELECT o.observation_id FROM drone.detection_observation o
            JOIN drone.video_frame f USING(frame_id) WHERE o.observation_id=%s AND f.mission_id=%s AND f.stream_id=%s AND f.identity_scope=%s""",
            (body.observation_id,*binding(row,cfg)))
        if not record:fail('RESOURCE_NOT_FOUND',404)
    if body.plan_id:plan_value(str(body.plan_id))
    value=dict(body.model_dump(mode='json'),confirmed_at=time.time(),confirmed_by=who,
        meaning='PREVIOUS_RESULT_VIEWED_NOT_NEW_CAPTURE_ANALYSIS',gpu_execution_enabled=False)
    with locked():
        path=CONTROL/'reviews'/f'{body.review_id}.json';previous=load(path)
        if previous:
            if any(previous[k]!=value[k] for k in body.model_dump()):fail('ID_CONFLICT',409)
            return previous
        save(path,value)
    return value

@router.get('/api/v1/local-patrol/reviews')
def reviews(request:Request):
    actor(request)
    files=sorted((CONTROL/'reviews').glob('*.json'),key=lambda p:p.stat().st_mtime,reverse=True)[:30]
    return {'reviews':[load(p) for p in files]}

from .local_search_api import router as search_router
router.include_router(search_router)
