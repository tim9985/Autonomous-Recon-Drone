"""Authenticated, short-lived worker readiness; it never grants flight or coordinate authority."""
import json
import os
from uuid import UUID
from typing import Literal
from fastapi import APIRouter, Request
from pydantic import Field
from .contracts import DTO, Hash
from .core import STORAGE, settings, workload, transaction, one, output, now, fail, owned_mission, event, mission

router=APIRouter()

class WorkerStatus(DTO):
    model_config_id: UUID
    artifact_sha256: Hash
    model_loaded: bool
    cuda_verified: bool
    state: str=Field(min_length=1,max_length=80)
    engine_sha256: Hash|None=None
    posture_sha256: Hash|None=None
    backend: Literal['pytorch_fp16','tensorrt']|None=None

class AppearanceQuery(DTO):
    upper: list[Literal['red','orange','yellow','green','blue','navy','purple','pink','white','gray','black','brown']]=Field(default_factory=list,max_length=12)

class SetAppearance(DTO):
    request_id: UUID
    query: AppearanceQuery

def appearance_query(c,mid):
    row=one(c,"SELECT payload FROM drone.mission_event WHERE mission_id=%s AND event_type='MISSION_EDITED' AND payload->>'kind'='APPEARANCE_QUERY' ORDER BY event_seq DESC LIMIT 1",(mid,))
    return row['payload']['query'] if row else mission(c,mid).get('appearance_query') or {}

@router.put('/api/v1/missions/{mid}/appearance-query',response_model=AppearanceQuery)
def set_appearance(mid:UUID,body:SetAppearance,request:Request):
    with transaction(events=True) as c:
        u,m=owned_mission(request,c,mid,'edit',True)
        payload={'kind':'APPEARANCE_QUERY','query':body.query.model_dump(mode='json')}
        event(c,'MISSION_EDITED',mid,m['drone_id'],u['user_id'],payload,eid=body.request_id)
        return appearance_query(c,mid)

@router.get('/api/v1/missions/{mid}/appearance-query')
def get_appearance(mid:UUID,request:Request):
    with transaction() as c:
        owned_mission(request,c,mid)
        return appearance_query(c,mid)

@router.get('/internal/v1/vision/models/{cid}')
def model(cid:UUID,request:Request):
    workload(request,'vision')
    with transaction() as c:
        row=one(c,"SELECT * FROM drone.config_version WHERE config_id=%s AND kind='MODEL'",(cid,))
        if not row or row['payload'].get('environment')!=settings().get('environment','SIM'):fail('MODEL_PROVENANCE_REQUIRED',422)
        return output(row)

@router.get('/internal/v1/vision/coordinate-configs/{cid}')
def coordinate_config(cid:UUID,request:Request):
    workload(request,'vision')
    with transaction() as c:
        row=one(c,"SELECT * FROM drone.config_version WHERE config_id=%s AND kind='COORDINATE' AND status='APPROVED'",(cid,))
        if not row or row['payload'].get('environment')!='SIM':fail('COORDINATE_PROVENANCE_REQUIRED',422)
        return output(row)

@router.post('/internal/v1/vision/status')
def status(body:WorkerStatus,request:Request):
    p=workload(request,'vision')
    row=model(body.model_config_id,request)
    expected=row['payload'].get('artifact_sha256')
    if expected!=body.artifact_sha256:fail('MODEL_HASH_MISMATCH',422)
    for key in ('engine_sha256','posture_sha256'):
        if row['payload'].get(key) and row['payload'][key]!=getattr(body,key):fail('MODEL_HASH_MISMATCH',422)
    if row['payload'].get('engine_sha256') and body.backend!='tensorrt':fail('MODEL_BACKEND_MISMATCH',422)
    if body.model_loaded and not body.cuda_verified:fail('CUDA_REQUIRED',422)
    value=body.model_dump(mode='json')|{'worker_id':p['id'],'received_at':now().isoformat()}
    STORAGE.mkdir(parents=True,exist_ok=True)
    path=STORAGE/'vision-status.json';tmp=path.with_suffix('.tmp')
    with tmp.open('w') as f:json.dump(value,f);f.flush();os.fsync(f.fileno())
    os.replace(tmp,path)
    return {'accepted':True}

def loaded(c):
    from datetime import datetime
    try:
        value=json.loads((STORAGE/'vision-status.json').read_text())
        age=(now()-datetime.fromisoformat(value['received_at'])).total_seconds()
        if not 0<=age<=45 or not value['model_loaded'] or not value['cuda_verified']:return False
        row=one(c,"SELECT payload FROM drone.config_version WHERE config_id=%s AND kind='MODEL'",(value['model_config_id'],))
        if row and any(row['payload'].get(k) and row['payload'][k]!=value.get(k) for k in ('engine_sha256','posture_sha256')):return False
        if row and row['payload'].get('engine_sha256') and value.get('backend')!='tensorrt':return False
        return bool(row and row['payload'].get('environment')==settings().get('environment','SIM') and row['payload'].get('artifact_sha256')==value['artifact_sha256'])
    except (OSError,ValueError,KeyError,TypeError):return False
