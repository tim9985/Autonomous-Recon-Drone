"""Authenticated per-user PC bridge. No executable paths or shell commands cross this API."""
from contextlib import contextmanager
import fcntl
import hashlib
import json
import os
from pathlib import Path
import time
from uuid import UUID

from fastapi import APIRouter, Request
from pydantic import Field
from drone_backend.contracts import DTO
from drone_backend.core import fail, transaction, one, output
from app.local_patrol_api import actor, load, save
import re
from app.pc_paths import workspace, bounded_path, allowed_control, allowed_run

router=APIRouter(prefix='/api/v1/pc-sync')
ROOT=Path(os.environ.get('SCHOOL_PC_ROOT','/data/pc-workspaces'))
IDENTITIES=Path('/run/pc-identities')


@contextmanager
def locked():
    ROOT.mkdir(parents=True, exist_ok=True)
    with (ROOT/'registry.lock').open('a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX)
        try: yield
        finally: fcntl.flock(lock,fcntl.LOCK_UN)


class Enroll(DTO):
    client_id: UUID
    label: str=Field(min_length=1,max_length=80)


@router.post('/enroll')
def enroll(body:Enroll,request:Request):
    owner=actor(request,'control');root=workspace();now=time.time()
    with locked():
        registry=load(ROOT/'registry.json',{})
        old=registry.get(owner)
        if old and old['client_id']!=str(body.client_id):
            with transaction(snapshot=True) as c:
                active=one(c,"SELECT run_id FROM simulation.run WHERE worker_id=%s AND (state='RUNNING' OR (state='QUEUED' AND expires_at>now())) LIMIT 1",(old['worker_id'],))
            if now-old.get('last_seen',0)<30 or active:fail('ACCOUNT_PC_ALREADY_CONNECTED',409)
        worker=old['worker_id'] if old else next((p.name for p in sorted(IDENTITIES.glob('school-pc-*')) if p.is_dir() and p.name not in {v['worker_id'] for v in registry.values()}),None)
        if worker is None:fail('PC_IDENTITY_CAPACITY_REACHED',503)
        value=dict(owner=owner,client_id=str(body.client_id),label=body.label,worker_id=worker,last_seen=now)
        registry[owner]=value;save(ROOT/'registry.json',registry)
        (root/'control').mkdir(parents=True,exist_ok=True);(root/'runs').mkdir(exist_ok=True)
        save(root/'binding.json',value)
        identity=IDENTITIES/worker
        credentials={name:(identity/name).read_text() for name in ('ca.crt','client.crt','client.key','token')}
    return dict(worker_id=worker,identity=credentials,runtime=runtime(request),client_id=str(body.client_id))


def attached(request,client_id):
    who=actor(request,'control')
    value=load(workspace()/'binding.json',{})
    if value.get('owner')!=who or value.get('client_id')!=str(client_id):fail('PC_NOT_ATTACHED',409)
    return value


@router.get('/runtime')
def runtime(request:Request):
    actor(request)
    state=load(Path('/data/vision-status.json'),{})
    from drone_backend.vision_runtime import loaded
    with transaction(snapshot=True) as c:
        ready=loaded(c)
        model=one(c,"SELECT version FROM drone.config_version WHERE config_id=%s AND kind='MODEL' AND status='APPROVED'",(state.get('model_config_id'),))
    return dict(model_config_id=state.get('model_config_id'),model_name=model['version'] if model else None,
                coordinate_config_id=os.environ.get('SCHOOL_COORDINATE_CONFIG_ID'),
                model_loaded=ready,cuda_verified=bool(ready and state.get('cuda_verified')),
                state='running' if ready else 'unavailable',backend=state.get('backend'),
                updated_at=state.get('received_at'),model_policy='SERVER_ACTIVE_MODEL',
                release=os.environ.get('SCHOOL_RELEASE_VERSION','unknown'))


@router.get('/status')
def status(request:Request):
    actor(request);value=load(workspace()/'binding.json',{})
    return {k:value.get(k) for k in ('worker_id','label','last_seen')} | dict(online=0<=time.time()-value.get('last_seen',0)<15)


class FileValue(DTO):
    area: str=Field(pattern='^(control|runs)$')
    name: str=Field(min_length=1,max_length=300)
    data: str=Field(max_length=8*1024*1024)
    sha256: str=Field(pattern='^[0-9a-f]{64}$')


class Exchange(DTO):
    client_id: UUID
    files: list[FileValue]=Field(default_factory=list,max_length=32)
    known: dict[str,str]=Field(default_factory=dict,max_length=10000)


@router.post('/exchange')
def exchange(body:Exchange,request:Request):
    # Serialize enrollment/takeover with writes; an old PC cannot publish after
    # its account has been attached to a replacement PC.
    with locked():
        return exchange_locked(body,request)


def exchange_locked(body,request):
    binding=attached(request,body.client_id);root=workspace();accepted=[]
    registry=load(ROOT/'registry.json',{})
    if registry.get(binding['owner'],{}).get('client_id')!=str(body.client_id):fail('PC_NOT_ATTACHED',409)
    for item in body.files:
        # An already installed PC may finish a previous city job. Acknowledge its
        # obsolete output without allowing it to overwrite a school result.
        if item.area=='control' and re.fullmatch(r'real-map-plans/[0-9a-fA-F-]{36}\.json',item.name):
            accepted.append(item.area+'/'+item.name)
            continue
        if not (allowed_control(item.name,upload=True) if item.area=='control' else allowed_run(item.name)):
            fail('PC_PATH_NOT_ALLOWED',422)
        target=bounded_path(root/item.area,item.name)
        raw=item.data.encode('utf-8')
        if len(raw)>8*1024*1024 or hashlib.sha256(raw).hexdigest()!=item.sha256:fail('PC_FILE_HASH_MISMATCH',422)
        try: value=json.loads(raw)
        except ValueError: fail('PC_JSON_REQUIRED',422)
        if not isinstance(value,dict):fail('PC_OBJECT_REQUIRED',422)
        if item.area=='control' and item.name=='heartbeat.json':
            value['transport_received_at']=time.time();value['pc_worker_id']=binding['worker_id']
        save(target,value);accepted.append(item.area+'/'+item.name)
    binding['last_seen']=time.time();save(root/'binding.json',binding)
    registry[binding['owner']]=binding;save(ROOT/'registry.json',registry)
    outgoing=[];size=0
    for path in sorted((root/'control').rglob('*.json')):
        name=path.relative_to(root/'control').as_posix()
        if not allowed_control(name):continue
        if path.is_symlink():continue
        if path.stat().st_size>8*1024*1024:continue
        raw=path.read_bytes();sha=hashlib.sha256(raw).hexdigest()
        if body.known.get(name)==sha:continue
        if size+len(raw)>8*1024*1024:break
        outgoing.append(dict(name=name,data=raw.decode(),sha256=sha));size+=len(raw)
    return dict(files=outgoing,accepted=accepted,server_time=time.time())


class PlanResult(DTO):
    client_id: UUID
    job_id: UUID
    envelope: dict


@router.post('/plan-result')
def plan_result(body:PlanResult,request:Request):
    binding=attached(request,body.client_id)
    from drone_backend.core import owned_mission, digest
    with transaction(snapshot=True) as c:
        job=one(c,'SELECT * FROM drone.regional_search_job WHERE job_id=%s',(body.job_id,))
        if not job:fail('RESOURCE_NOT_FOUND',404)
        if str(job['creator_user_id'])!=binding['owner']:fail('RESOURCE_NOT_FOUND',404)
        owned_mission(request,c,job['mission_id'],'edit')
        value=body.envelope
        if str(value.get('jobId'))!=str(body.job_id) or value.get('requestHash')!=job['request_hash'] or value.get('resultHash')!=digest(value.get('result')):
            fail('REGIONAL_RESULT_BINDING_MISMATCH',422)
    save(Path('/data/regional-search/results')/(str(body.job_id)+'.json'),value)
    return dict(stored=True)
