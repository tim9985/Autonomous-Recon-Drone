"""Resumable, authenticated low-resolution playback copy. Original stays in Drive."""
import base64
import hashlib
from uuid import UUID
from fastapi import APIRouter,Request
from pydantic import Field
from drone_backend.contracts import DTO
from drone_backend.core import fail,transaction,one
from app.pc_sync import attached,locked
from app.pc_paths import workspace
from app.local_patrol_api import load,save

router=APIRouter(prefix='/api/v1/pc-sync')


class Chunk(DTO):
    client_id:UUID
    run_id:UUID
    offset:int=Field(ge=0,le=256*1024*1024)
    total:int=Field(gt=0,le=256*1024*1024)
    sha256:str=Field(pattern='^[0-9a-f]{64}$')
    data:str=Field(max_length=1400000)


@router.post('/recording')
def recording(body:Chunk,request:Request):
    binding=attached(request,body.client_id)
    with transaction(snapshot=True) as c:
        row=one(c,'SELECT creator_user_id,state FROM simulation.run WHERE run_id=%s AND worker_id=%s',(body.run_id,binding['worker_id']))
        if not row or str(row['creator_user_id'])!=binding['owner']:fail('RESOURCE_NOT_FOUND',404)
        if row['state'] not in ('COMPLETED','FAILED','CANCELLED','EXPIRED'):fail('RECORDING_NOT_FINISHED',409)
    try:raw=base64.b64decode(body.data,validate=True)
    except ValueError:fail('INVALID_RECORDING_CHUNK',422)
    if len(raw)>1024*1024 or body.offset+len(raw)>body.total:fail('INVALID_RECORDING_CHUNK',422)
    with locked():
        folder=workspace()/'recordings'/str(body.run_id);folder.mkdir(parents=True,exist_ok=True)
        metadata=folder/'preview.json';expected=dict(total=body.total,sha256=body.sha256)
        prior=load(metadata)
        if prior and any(prior[k]!=v for k,v in expected.items()):fail('RECORDING_CONTENT_CHANGED',409)
        complete=folder/'video.mp4';partial=folder/'video.uploading'
        if complete.is_file():return dict(ready=True,next_offset=body.total)
        if not prior:
            used=sum(p.stat().st_size for p in (workspace()/'recordings').rglob('*') if p.is_file())
            if used+body.total>2*1024**3:fail('PC_PREVIEW_QUOTA_REACHED',507)
            save(metadata,expected)
        size=partial.stat().st_size if partial.exists() else 0
        if body.offset>size:return dict(ready=False,next_offset=size)
        if body.offset<size:
            with partial.open('rb') as f:f.seek(body.offset);stored=f.read(len(raw))
            if stored!=raw:fail('RECORDING_CHUNK_CONFLICT',409)
        else:
            with partial.open('ab') as f:f.write(raw)
            size+=len(raw)
        if size==body.total:
            h=hashlib.sha256()
            with partial.open('rb') as f:
                for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
            if h.hexdigest()!=body.sha256:fail('RECORDING_HASH_MISMATCH',409)
            partial.replace(complete);save(metadata,dict(expected,ready=True,original='PC_GOOGLE_DRIVE',representation='PLAYBACK_PREVIEW'))
        return dict(ready=complete.is_file(),next_offset=size)
