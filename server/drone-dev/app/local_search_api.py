"""Local, owner-scoped case journal and historical-result triage. No inference."""
from datetime import datetime
from pathlib import Path
from typing import Literal
from uuid import UUID, uuid4
import time
import unicodedata
from fastapi import APIRouter, Request
from pydantic import Field, field_validator
from drone_backend.contracts import DTO
from drone_backend.core import fail
from .local_patrol_api import CONTROL, RUNS, SOURCE_RUN, TERMINAL, actor, locked, load, save
from .local_search_core import group_results, recommend, review_summary

router=APIRouter(prefix='/api/v1/local-search')

def case_value(cid, who):
    value=load(CONTROL/'search-cases'/f'{UUID(str(cid))}.json')
    if not value or value['owner']!=who or value.get('deleted_at'):fail('RESOURCE_NOT_FOUND',404)
    return value

def require_revision(value, revision, field='revision'):
    if value[field]!=revision:fail('SEARCH_CASE_CHANGED',409)

def require_open(value):
    if value['status']!='ACTIVE':fail('SEARCH_CASE_READ_ONLY',409)

def case_in_flight(value):
    active=load(CONTROL/'active.json',{})
    job=load(CONTROL/'states'/f"{active.get('job_id')}.json",{})
    return job.get('search_context',{}).get('case_id')==value['case_id'] and job.get('state') not in TERMINAL

def validate_plan_context(selection, who):
    from .local_mission_store import validate_mission_context
    validate_mission_context(selection,who)
    if selection.get('case_id'):
        value=case_value(selection['case_id'],who)
        require_revision(value,selection.get('case_revision'))
        if value['status']!='ACTIVE':fail('SEARCH_CASE_ARCHIVED',409)
    return True

def write_case(value, who, event):
    value['updated_at']=time.time()
    value.setdefault('audit',[]).append(dict(at=value['updated_at'],by=who,event=event,revision=value['revision'],review_revision=value['review_revision']))
    save(CONTROL/'search-cases'/f"{value['case_id']}.json",value)
    return value

class LastSeen(DTO):
    point:tuple[float,float]
    at:datetime
    label:str=Field(default='',max_length=120)
    @field_validator('point')
    @classmethod
    def location(cls,v):
        if not (-180<=v[0]<=180 and -90<=v[1]<=90):raise ValueError('Invalid coordinates')
        return v
    @field_validator('at')
    @classmethod
    def timestamp(cls,v):
        if v.tzinfo is None or v.timestamp()>time.time()+60:raise ValueError('A past timezone-aware time is required')
        return v

class CaseInput(DTO):
    title:str=Field(min_length=1,max_length=80)
    kind:Literal['MISSING','RESCUE','SEARCH']='MISSING'
    last_seen:LastSeen|None=None
    upper_color:Literal['black','white','gray','red','orange','yellow','green','blue','navy','purple','pink','brown','unknown']='unknown'
    speed_mps:float=Field(default=1.2,ge=0,le=15,allow_inf_nan=False)
    revisit_minutes:int=Field(default=30,ge=1,le=10080)
    status:Literal['ACTIVE','ARCHIVED']='ACTIVE'
    revision:int|None=Field(default=None,ge=1)
    @field_validator('title')
    @classmethod
    def nonempty(cls,v):
        if not v.strip():raise ValueError('Title required')
        return v.strip()

@router.get('/cases')
def cases(request:Request):
    who=actor(request)
    rows=[load(p) for p in (CONTROL/'search-cases').glob('*.json')]
    return dict(cases=[{k:v[k] for k in ('case_id','title','kind','status','revision','updated_at')} for v in sorted(rows,key=lambda v:v['updated_at'],reverse=True) if v['owner']==who and not v.get('deleted_at')])

@router.post('/cases',status_code=201)
def create_case(body:CaseInput,request:Request):
    who=actor(request,'edit')
    with locked():
        value=dict(body.model_dump(mode='json',exclude={'revision'}),case_id=str(uuid4()),owner=who,revision=1,review_revision=1,
            created_at=time.time(),source_run_id=None,coverage_job_id=None,reviews={},groups={})
        return write_case(value,who,'CREATED')

@router.get('/cases/{cid}')
def read_case(cid:UUID,request:Request):return case_value(cid,actor(request))

@router.post('/cases/{cid}')
def edit_case(cid:UUID,body:CaseInput,request:Request):
    who=actor(request,'edit')
    with locked():
        value=case_value(cid,who);require_revision(value,body.revision)
        if value['status']=='CLOSED':fail('SEARCH_CASE_READ_ONLY',409)
        if case_in_flight(value):fail('SEARCH_CASE_IN_FLIGHT',409)
        value.update(body.model_dump(mode='json',exclude={'revision'}));value['revision']+=1
        return write_case(value,who,'CONDITIONS_UPDATED')

class Link(DTO):
    revision:int=Field(ge=1)
    source_run_id:UUID|None=None
    coverage_job_id:UUID|None=None

@router.post('/cases/{cid}/sources')
def link(cid:UUID,body:Link,request:Request):
    who=actor(request,'edit')
    if body.source_run_id:observations(request,str(body.source_run_id))
    if body.coverage_job_id:
        job=load(CONTROL/'requests'/f'{body.coverage_job_id}.json')
        if not job or job.get('requested_by')!=who:fail('RESOURCE_NOT_FOUND',404)
    with locked():
        value=case_value(cid,who);require_revision(value,body.revision)
        require_open(value)
        if case_in_flight(value):fail('SEARCH_CASE_IN_FLIGHT',409)
        value.update(source_run_id=str(body.source_run_id) if body.source_run_id else None,coverage_job_id=str(body.coverage_job_id) if body.coverage_job_id else None)
        value['revision']+=1
        return write_case(value,who,'SOURCES_LINKED')

def observations(request,run_id):
    from .postflight_api import status
    if run_id is None or str(run_id)==SOURCE_RUN:
        return dict(run_id=run_id,results=[],results_total=0,capture={},analysis={},
                    analysis_policy='POSTFLIGHT',realtime_vision_enabled=False,run_state=None)
    return status(UUID(str(run_id)),request,limit=500)

def bound_coverage(value, who):
    from .local_coverage import coverage
    jid=value.get('coverage_job_id')
    active=load(CONTROL/'active.json',{})
    current=load(CONTROL/'states'/f"{active.get('job_id')}.json",{})
    if current.get('search_context',{}).get('case_id')==value['case_id']:jid=current['job_id']
    req=load(CONTROL/'requests'/f'{jid}.json',{}) if jid else {}
    job=load(CONTROL/'states'/f'{jid}.json',{}) if jid else {}
    if not job or req.get('requested_by')!=who:return dict(features=[],regions=[],state='UNLINKED')
    try:return coverage(job,CONTROL,RUNS)
    except (OSError,ValueError,KeyError):return dict(features=[],regions=[],state='UNAVAILABLE')

@router.get('/cases/{cid}/recommendations')
def recommendations(cid:UUID,request:Request):
    from .local_mission_api import catalog
    who=actor(request);value=case_value(cid,who);cov=bound_coverage(value,who)
    result=recommend(catalog(),value,cov,time.time())
    result.update(coverage_state=cov['state'],coverage=cov)
    return result

def summary_value(value, request, who):
    linked=bool(value.get('source_run_id'))
    snapshot=observations(request,value['source_run_id']) if linked else None
    review=review_summary(snapshot['results'],value.get('reviews',{})) if snapshot else None
    if review:review['truncated']=snapshot['results_total']>len(snapshot['results'])
    cov=bound_coverage(value,who)
    return dict(case_id=value['case_id'],revision=value['revision'],review_revision=value['review_revision'],
        status=value['status'],source_run_id=value.get('source_run_id'),historical=not snapshot or not snapshot['realtime_vision_enabled'],
        review=review,coverage={k:cov.get(k) for k in ('state','job_id','run_id','regions','observed_area_m2','target_area_m2')},
        in_flight=case_in_flight(value),closure=value.get('closure'))

@router.get('/cases/{cid}/summary')
def summary(cid:UUID,request:Request):
    who=actor(request)
    return summary_value(case_value(cid,who),request,who)

class CloseCase(DTO):
    revision:int=Field(ge=1)
    review_revision:int=Field(ge=1)
    reason:str=Field(min_length=1,max_length=1000)
    @field_validator('reason')
    @classmethod
    def reason_required(cls,value):
        if not value.strip():raise ValueError('Closure reason required')
        return value.strip()

@router.post('/cases/{cid}/close')
def close_case(cid:UUID,body:CloseCase,request:Request):
    who=actor(request,'edit')
    # Read evidence outside the file lock; recheck both versions under the lock.
    initial=case_value(cid,who)
    snapshot=summary_value(initial,request,who)
    with locked():
        value=case_value(cid,who);require_revision(value,body.revision);require_revision(value,body.review_revision,'review_revision')
        require_revision(value,snapshot['revision']);require_revision(value,snapshot['review_revision'],'review_revision')
        require_open(value)
        if case_in_flight(value):fail('SEARCH_CASE_IN_FLIGHT',409)
        value['closure']=dict(reason=body.reason,at=time.time(),by=who,remaining=snapshot['review'],coverage=snapshot['coverage'],source_run_id=snapshot['source_run_id'])
        value.setdefault('closures',[]).append(value['closure'].copy())
        value['status']='CLOSED';value['revision']+=1
        return write_case(value,who,'CASE_CLOSED')

class ReopenCase(DTO):
    revision:int=Field(ge=1)

@router.post('/cases/{cid}/reopen')
def reopen_case(cid:UUID,body:ReopenCase,request:Request):
    who=actor(request,'edit')
    with locked():
        value=case_value(cid,who);require_revision(value,body.revision)
        if value['status'] not in ('CLOSED','ARCHIVED'):fail('SEARCH_CASE_ALREADY_ACTIVE',409)
        if case_in_flight(value):fail('SEARCH_CASE_IN_FLIGHT',409)
        value['status']='ACTIVE';value['revision']+=1
        return write_case(value,who,'CASE_REOPENED')

@router.get('/results')
def results(request:Request,case_id:UUID|None=None,run_id:UUID|None=None):
    who=actor(request,history=not run_id);value=case_value(case_id,who) if case_id else {}
    source=str(run_id) if run_id else (value.get('source_run_id') or request.state.previous_recording)
    linked=bool(source and value.get('source_run_id')==source)
    snapshot=observations(request,source);rows=snapshot['results']
    reviews=value.get('reviews',{}) if linked else {}
    return dict(source_run_id=source,historical=bool(source and (not run_id or not snapshot['realtime_vision_enabled'])),gpu_execution_enabled=snapshot['realtime_vision_enabled'],analysis=snapshot['analysis'],run_state=snapshot['run_state'],linked=linked,
        total=snapshot['results_total'],truncated=snapshot['results_total']>len(rows),reviews=reviews,
        review_revision=value.get('review_revision'),groups=group_results(rows,value.get('groups',{}) if linked else {},reviews,value.get('upper_color')))

class ReviewInput(DTO):
    revision:int=Field(ge=1)
    observation_ids:list[UUID]=Field(min_length=1,max_length=5000)
    status:Literal['PENDING','REVIEWED','DISMISSED','NEEDS_FIELD_CHECK','FIELD_CHECKING','FIELD_CONFIRMED','DEFERRED']
    note:str=Field(default='',max_length=1000)

class GroupInput(DTO):
    revision:int=Field(ge=1)
    observation_ids:list[UUID]=Field(min_length=1,max_length=5000)
    action:Literal['MERGE','SPLIT','RESET']

def validate_members(value, ids, known):
    if not value.get('source_run_id'):fail('SEARCH_SOURCE_LINK_REQUIRED',409)
    if len(set(ids))!=len(ids) or not set(ids)<=known:fail('SEARCH_OBSERVATION_MISMATCH',422)

@router.post('/cases/{cid}/reviews')
def review(cid:UUID,body:ReviewInput,request:Request):
    who=actor(request,'edit');selected=case_value(cid,who)
    if not selected.get('source_run_id'):fail('SEARCH_SOURCE_LINK_REQUIRED',409)
    known={r['observation_id'] for r in observations(request,selected['source_run_id'])['results']};ids=[str(i) for i in body.observation_ids]
    with locked():
        value=case_value(cid,who);require_revision(value,body.revision,'review_revision');validate_members(value,ids,known)
        require_open(value)
        if body.status in ('FIELD_CONFIRMED','DEFERRED') and not body.note.strip():fail('SEARCH_REVIEW_NOTE_REQUIRED',422)
        for oid in ids:value['reviews'][oid]=dict(status=body.status,note=body.note,at=time.time(),by=who)
        value['review_revision']+=1
        value['audit'].append(dict(event='REVIEW',observation_ids=ids,status=body.status,note=body.note,by=who,at=time.time()))
        return write_case(value,who,'REVIEW_SAVED')

@router.post('/cases/{cid}/groups')
def regroup(cid:UUID,body:GroupInput,request:Request):
    who=actor(request,'edit');selected=case_value(cid,who)
    if not selected.get('source_run_id'):fail('SEARCH_SOURCE_LINK_REQUIRED',409)
    known={r['observation_id'] for r in observations(request,selected['source_run_id'])['results']};ids=[str(i) for i in body.observation_ids]
    with locked():
        value=case_value(cid,who);require_revision(value,body.revision,'review_revision');validate_members(value,ids,known)
        require_open(value)
        group='manual:'+str(uuid4())
        for oid in ids:
            if body.action=='RESET':value['groups'].pop(oid,None)
            else:value['groups'][oid]=group if body.action=='MERGE' else 'observation:'+oid
        value['review_revision']+=1
        value['audit'].append(dict(event=body.action,observation_ids=ids,by=who,at=time.time()))
        return write_case(value,who,'GROUPS_UPDATED')

class PlaceQuery(DTO):
    query:str=Field(min_length=2,max_length=120)
    category:Literal['AUTO','PLACE','ADDRESS']='AUTO'
    center:list[float]|None=None
    radius_m:int=Field(default=10000,ge=1000,le=20000)
    sort:Literal['distance','relevance']='distance'

    @field_validator('center')
    @classmethod
    def valid_center(cls,value):
        if value is None:return value
        import math
        if len(value)!=2 or not all(math.isfinite(v) for v in value) or not (-180<=value[0]<=180 and -90<=value[1]<=90):raise ValueError('Invalid search center')
        return [round(v,5) for v in value]

    @field_validator('query',mode='before')
    @classmethod
    def normalized_query(cls,value):
        if not isinstance(value,str):raise ValueError('A search term is required')
        value=' '.join(unicodedata.normalize('NFKC',value).split())
        if len(value)<2 or any(ord(c)<32 for c in value):raise ValueError('At least two characters are required')
        return value

@router.post('/places',status_code=202)
def place_search(body:PlaceQuery,request:Request):
    who=actor(request)
    with locked():
        now=time.time();pending=[]
        for path in (CONTROL/'search-requests').glob('*.json'):
            # Reuse is optional; a damaged old receipt cannot break a new search.
            try:
                req=load(path,{})
                response=load(CONTROL/'search-responses'/path.name)
            except Exception:continue
            if not isinstance(req,dict) or not isinstance(req.get('created_at'),(int,float)) or not isinstance(req.get('query'),str) or not req.get('request_id'):continue
            age=now-req.get('created_at',0)
            if not 0<=age<600:continue
            same=req.get('owner')==who and req.get('query','').casefold()==body.query.casefold() and req.get('category')==body.category and req.get('center')==body.center and req.get('radius_m',10000)==body.radius_m and req.get('sort','distance')==body.sort
            if same and isinstance(response,dict) and response.get('state')=='DONE' and isinstance(response.get('items'),list) and not response.get('partial') and age<(300 if response.get('items') else 30):
                return dict(response,request_id=req['request_id'],cached=True)
            if response is None and age<30:
                pending.append(path)
                if same:return dict(request_id=req['request_id'],state='QUEUED')
        if len(pending)>=10:fail('SEARCH_BUSY',429)
        rid=str(uuid4());save(CONTROL/'search-requests'/f'{rid}.json',dict(body.model_dump(),request_id=rid,owner=who,created_at=time.time()))
    from school.transport import service_client
    with service_client('map') as client:
        params=dict(query=body.query,category=body.category,radius_m=body.radius_m,sort=body.sort)
        if body.center:params.update(lon=body.center[0],lat=body.center[1])
        response=client.get('/api/map/place-search',params=params)
        response.raise_for_status();result=response.json()
    save(CONTROL/'search-responses'/f'{rid}.json',result)
    return dict(result,request_id=rid)

@router.get('/places/{rid}')
def place_result(rid:UUID,request:Request):
    who=actor(request);req=load(CONTROL/'search-requests'/f'{rid}.json')
    if not req or req['owner']!=who:fail('RESOURCE_NOT_FOUND',404)
    if time.time()-req['created_at']>600:return dict(state='EXPIRED',items=[])
    return load(CONTROL/'search-responses'/f'{rid}.json',dict(state='QUEUED' if time.time()-req['created_at']<30 else 'UNAVAILABLE',reason='SEARCH_QUEUE_TIMEOUT',items=[]))

from .local_mission_store import router as mission_router
router.include_router(mission_router)
from .local_real_map_api import router as real_map_router
router.include_router(real_map_router)
