from . import responses as out
from datetime import timedelta
from uuid import UUID, uuid4
import base64
import json
import struct
from fastapi import APIRouter,Request,HTTPException
from fastapi.responses import Response
from pydantic import Field
from . import contracts as dto
from .core import *
from .media import asset,verify_file,media_actor

router=APIRouter()

@router.post('/device/v1/frames',status_code=201,response_model=out.VideoFrame)
def frame(body:dto.Frame,request:Request):
    with transaction(events=True) as c:
        p,d=frame_actor(request,c,body.mission_id);m=mission(c,body.mission_id)
        if m['drone_id']!=d['drone_id']: fail('FORBIDDEN',403)
        a=asset(c,body.input_asset_id)
        if a['mission_id']!=body.mission_id or a['state']!='STORED' or a['asset_type']!='FRAME': fail('INPUT_ASSET_NOT_READY')
        if request.url.path.startswith('/device/v1/simulations/'):media_actor(request,c,body.mission_id,a['meta'])
        verify_file(a)
        value=body.model_dump(mode='json',exclude={'pose'} if body.pose is None else None);h=digest(value)
        previous=one(c,'SELECT * FROM drone.video_frame WHERE frame_id=%s',(body.frame_id,))
        if previous:
            if previous['time_evidence'].get('input_hash')!=h: fail('ID_CONFLICT')
            return output(previous)
        value.pop('input_asset_id')
        value.update(drone_id=d['drone_id'],frame_seq=int(body.frame_seq),identity_scope=d['gateway_state'].get('session_id','SIM'),
          capture_time_verified=body.pose is None or body.pose.clock_domain=='UTC',time_evidence={'environment':'SIM','input_hash':h,'input_asset_id':str(body.input_asset_id)},
          source_quality_status='SIM_VALIDATED',metadata_state='COMPLETE',pose_status='PENDING',pose_reason='SIM_PHYSICAL_VALIDATION_REQUIRED' if body.pose else 'POSE_MISSING',
          coverage={},analysis_state='UNASSIGNED',analysis_times={},task_quality_status='SIM_ONLY')
        result=add(c,'video_frame',value)
        event(c,'FRAME_RECEIVED',body.mission_id,d['drone_id'],payload={'frame_id':str(body.frame_id)})
        return output(result)

def frame_actor(request,c,mid):
    if request.url.path.startswith('/device/v1/simulations/'):
        from app.simulation_api import frame_access
        return frame_access(request,c,mid,allow_replay=True)
    return device(request,c)

@router.post('/api/v1/analysis-runs',status_code=201,response_model=out.Job)
def admit(body:dto.Analysis,request:Request):
    with transaction(events=True) as c:
        f=one(c,'SELECT * FROM drone.video_frame WHERE frame_id=%s',(body.frame_id,))
        if not f: fail('RESOURCE_NOT_FOUND',404)
        if request.url.path.startswith('/device/v1/simulations/'):
            frame_actor(request,c,f['mission_id']);u={'user_id':None}
        else:u,m=owned_mission(request,c,f['mission_id'],'edit')
        if f['stream_id'].startswith('unreal/'):
            run=one(c,'SELECT request,state FROM simulation.run WHERE run_id=%s',(UUID(f['stream_id'][7:]),))
            cfg=run['request'].get('pipeline_config',{}) if run else {}
            if cfg.get('analysis_policy')=='POSTFLIGHT' and run['state']!='COMPLETED':fail('POSTFLIGHT_NOT_READY',409)
            if cfg.get('analysis_policy')=='LIVE' and (not cfg.get('realtime_vision_enabled') or str(body.model_config_id)!=cfg.get('model_config_id') or str(body.coordinate_config_id)!=cfg.get('coordinate_config_id')):fail('LIVE_VISION_CONFIG_MISMATCH',422)
        f=locked_row(c,'video_frame',body.frame_id)
        a=asset(c,body.input_asset_id)
        if a['mission_id']!=f['mission_id'] or a['state']!='STORED' or f['time_evidence'].get('input_asset_id')!=str(body.input_asset_id): fail('INPUT_ASSET_NOT_READY')
        model=one(c,"SELECT * FROM drone.config_version WHERE config_id=%s AND kind='MODEL' AND status='APPROVED'",(body.model_config_id,))
        if not model or model['payload'].get('environment')!='SIM' or not model['payload'].get('artifact_ready'): fail('MODEL_NOT_READY',503)
        verify_file(a)
        value=body.model_dump(mode='json')|{'input_hash':a['content_hash'],'environment':'SIM','pipeline_version':'SIM_V1'}
        jh=digest(value)
        previous=one(c,"SELECT * FROM drone.mission_event WHERE event_type='ANALYSIS_STARTED' AND payload->>'analysis_run_id'=%s",(str(body.analysis_run_id),))
        if previous:
            if previous['payload']['job_hash']!=jh: fail('ID_CONFLICT')
            return output(previous['payload'])
        rev=one(c,"SELECT coalesce(max((payload->>'analysis_revision')::integer),0)+1 AS n FROM drone.mission_event WHERE event_type='ANALYSIS_STARTED' AND payload->>'frame_id'=%s",(str(body.frame_id),))['n']
        value.update(analysis_revision=rev,job_hash=jh)
        event(c,'ANALYSIS_STARTED',f['mission_id'],f['drone_id'],u['user_id'],value)
        return value

def ledger(c,rid):
    row=one(c,"SELECT * FROM drone.mission_event WHERE event_type='ANALYSIS_STARTED' AND payload->>'analysis_run_id'=%s",(str(rid),))
    if not row: fail('RESOURCE_NOT_FOUND',404)
    return row

def terminal(c,rid):
    return one(c,"SELECT * FROM drone.mission_event WHERE event_type IN ('ANALYSIS_COMPLETED','ANALYSIS_FAILED') AND payload->>'analysis_run_id'=%s",(str(rid),))

def latest_attempt(c,rid):
    return one(c,"SELECT * FROM drone.mission_event WHERE event_type='ANALYSIS_ATTEMPT_STARTED' AND payload->>'analysis_run_id'=%s ORDER BY (payload->>'attempt_no')::integer DESC LIMIT 1",(str(rid),))

def check_claim(c,p,rid,claim=None,attempt=None):
    a=latest_attempt(c,rid)
    if not a or a['payload']['worker_id']!=p['id']: fail('FORBIDDEN',403)
    if claim is not None and a['payload']['claim_id']!=str(claim): fail('CLAIM_EXPIRED')
    if attempt is not None and a['payload']['attempt_no']!=attempt: fail('OLD_ATTEMPT')
    if datetime.fromisoformat(a['payload']['expires_at'])<=now(): fail('CLAIM_EXPIRED')
    if one(c,"SELECT event_id FROM drone.mission_event WHERE event_type='ANALYSIS_ATTEMPT_FAILED' AND payload->>'analysis_run_id'=%s AND payload->>'attempt_no'=%s",(str(rid),str(a['payload']['attempt_no']))): fail('ATTEMPT_FAILED')
    return a

@router.post('/internal/v1/analysis-runs/claim',response_model=out.Claim|out.NoJob)
def claim(request:Request,model_config_id:UUID|None=None):
    with transaction(events=True) as c:
        p=workload(request,'vision')
        jobs=c.execute("SELECT * FROM drone.mission_event e WHERE event_type='ANALYSIS_STARTED' AND NOT EXISTS (SELECT 1 FROM drone.mission_event t WHERE t.event_type IN ('ANALYSIS_COMPLETED','ANALYSIS_FAILED') AND t.payload->>'analysis_run_id'=e.payload->>'analysis_run_id') AND NOT EXISTS (SELECT 1 FROM drone.mission_event a WHERE a.event_type='ANALYSIS_ATTEMPT_STARTED' AND a.payload->>'analysis_run_id'=e.payload->>'analysis_run_id' AND (a.payload->>'expires_at')::timestamptz>now() AND NOT EXISTS (SELECT 1 FROM drone.mission_event newer WHERE newer.event_type='ANALYSIS_ATTEMPT_STARTED' AND newer.payload->>'analysis_run_id'=a.payload->>'analysis_run_id' AND (newer.payload->>'attempt_no')::int>(a.payload->>'attempt_no')::int) AND NOT EXISTS (SELECT 1 FROM drone.mission_event f WHERE f.event_type='ANALYSIS_ATTEMPT_FAILED' AND f.payload->>'analysis_run_id'=a.payload->>'analysis_run_id' AND f.payload->>'attempt_no'=a.payload->>'attempt_no')) AND (%s::text IS NULL OR e.payload->>'model_config_id'=%s) ORDER BY event_seq LIMIT 100",(str(model_config_id) if model_config_id else None,)*2).fetchall()
        for row in jobs:
            job=row['payload'];rid=job['analysis_run_id'];a=latest_attempt(c,rid)
            failed=one(c,"SELECT event_id FROM drone.mission_event WHERE event_type='ANALYSIS_ATTEMPT_FAILED' AND payload->>'analysis_run_id'=%s AND payload->>'attempt_no'=%s",(rid,str(a['payload']['attempt_no']))) if a else None
            if a and not failed and datetime.fromisoformat(a['payload']['expires_at'])>now(): continue
            attempt=1 if not a else a['payload']['attempt_no']+1
            if attempt>settings()['analysis_attempt_limit']:
                event(c,'ANALYSIS_FAILED',row['mission_id'],row['drone_id'],payload=job|{'reason':'ATTEMPTS_EXHAUSTED','worker_id':a['payload']['worker_id']})
                continue
            value=job|{'attempt_no':attempt,'worker_id':p['id'],'claim_id':str(uuid4()),'expires_at':(now()+timedelta(seconds=settings()['analysis_claim_seconds'])).isoformat()}
            event(c,'ANALYSIS_ATTEMPT_STARTED',row['mission_id'],row['drone_id'],payload=value)
            return value
        return {'job':None}

@router.get('/internal/v1/analysis-runs/{rid}',response_model=out.JobStatus)
def get_job(rid:UUID,request:Request):
    with transaction() as c:
        p=workload(request,'vision');j=ledger(c,rid);a=check_claim(c,p,rid)
        return {'job':j['payload'],'claim':a['payload'],'terminal':output(terminal(c,rid))}

@router.get('/internal/v1/analysis-runs/{rid}/input')
def input_file(rid:UUID,request:Request):
    from fastapi.responses import FileResponse
    with transaction() as c:
        p=workload(request,'vision');j=ledger(c,rid);check_claim(c,p,rid)
        a=asset(c,j['payload']['input_asset_id'])
        if a['state']!='STORED' or a['content_hash']!=j['payload']['input_hash']: fail('INPUT_ASSET_NOT_READY')
        path=verify_file(a)
    return FileResponse(path,media_type='application/octet-stream',headers={'X-Content-SHA256':a['content_hash']})

@router.get('/internal/v1/analysis-runs/{rid}/frame',response_model=out.VideoFrame)
def input_metadata(rid:UUID,request:Request):
    with transaction() as c:
        p=workload(request,'vision');j=ledger(c,rid);check_claim(c,p,rid)
        from .vision_runtime import appearance_query
        f=output(one(c,'SELECT * FROM drone.video_frame WHERE frame_id=%s',(j['payload']['frame_id'],)))
        f['appearance_query']=appearance_query(c,f['mission_id'])
        return f

@router.post('/internal/v1/analysis-runs/next-input')
def next_input(request:Request,model_config_id:UUID|None=None):
    with transaction_group():
        job=claim(request,model_config_id)
        if 'analysis_run_id' not in job:return {'job':None}
        rid=UUID(job['analysis_run_id'])
        # A lost input response leaves an expiring lease, never a completed frame.
        frame=input_metadata(rid,request)
        encoded=base64.b64encode(json.dumps({'job':job,'frame':frame},default=str,separators=(',',':')).encode()).decode()
        if len(encoded)>16384:fail('FRAME_METADATA_TOO_LARGE',422)
        response=input_file(rid,request)
        response.headers['X-Analysis-Metadata']=encoded
        return response

@router.post('/internal/v1/analysis-runs/next-input-batch')
def next_input_batch(request:Request,model_config_id:UUID):
    entries=[];chunks=[]
    with transaction_group():
        for _ in range(5):
            job=claim(request,model_config_id)
            if 'analysis_run_id' not in job:break
            rid=UUID(job['analysis_run_id'])
            try:
                frame=input_metadata(rid,request);data=input_file(rid,request)
                with open(data.path,'rb') as file:raw=file.read(8388609)
                if len(raw)>8388608:fail('BODY_TOO_LARGE',413)
                entry={'job':job,'frame':frame,'byte_size':len(raw)}
                if len(json.dumps(entries+[entry],default=str,separators=(',',':')).encode())>65536:fail('FRAME_METADATA_TOO_LARGE',422)
            except (OSError,HTTPException) as exc:
                if isinstance(exc,HTTPException) and exc.status_code in (401,403):raise
                failure(rid,dto.AttemptFailure(claim_id=job['claim_id'],attempt_no=job['attempt_no'],reason='INPUT_UNAVAILABLE'),request)
                continue
            entries.append(entry);chunks.append(raw)
        if not entries:return {'jobs':[]}
        metadata=json.dumps(entries,default=str,separators=(',',':')).encode()
        if len(metadata)>65536:fail('FRAME_METADATA_TOO_LARGE',422)
    return Response(struct.pack('!I',len(metadata))+metadata+b''.join(chunks),media_type='application/octet-stream')

class BatchCompletion(dto.DTO):
    analysis_run_id: UUID
    result: dto.Result

class CompletionBatch(dto.DTO):
    results:list[BatchCompletion]=Field(min_length=1,max_length=5)

@router.post('/internal/v1/analysis-runs/completion-batch')
def complete_batch(body:CompletionBatch,request:Request):
    ids=[item.analysis_run_id for item in body.results]
    if len(set(ids))!=len(ids):fail('INVALID_CONTRACT',422)
    with transaction_group():
        for item in body.results:complete(item.analysis_run_id,item.result,request)
    return {'completed':[str(rid) for rid in ids]}


def summarize_candidates(c,ids):
    for cid in sorted(ids):
        rows=c.execute("SELECT d.*,f.capture_at,f.time_evidence,count(*) OVER() AS total_evidence FROM drone.detection_observation d JOIN drone.video_frame f USING(frame_id) WHERE candidate_id=%s AND d.association_evidence->>'analysis_run_id'=f.analysis_times->>'selected_run_id' ORDER BY f.capture_at DESC NULLS LAST,d.detection_index LIMIT 1",(cid,)).fetchall()
        if rows:
            latest=rows[0];g=latest['geo_result'];valid=g['status']=='VALID'
            mutate(c,'candidate_summary',{'candidate_id':str(cid),'latest_observation_id':str(latest['observation_id']),
                'evidence_count':latest['total_evidence'],'last_seen':latest['capture_at'],'geo_status':g['status'],
                'geo_reason':None if valid else g['reason'],'position':{'type':'Point','coordinates':[g['lon'],g['lat']]} if valid else None,
                'ellipse':g.get('error_ellipse'),'coordinate_config_id':str(latest['coordinate_config_id']) if latest['coordinate_config_id'] else None})
        else:
            mutate(c,'candidate_summary',{'candidate_id':str(cid),'latest_observation_id':None,'evidence_count':0,
                'last_seen':None,'geo_status':'PENDING','geo_reason':'NO_SELECTED_EVIDENCE','position':None,'ellipse':None,'coordinate_config_id':None})

@router.post('/internal/v1/analysis-runs/{rid}/completion',response_model=out.Completed)
def complete(rid:UUID,body:dto.Result,request:Request):
    with transaction(events=True) as c:
        p=workload(request,'vision');j=ledger(c,rid);job=j['payload']
        # Absent v1.2 fields must not change hashes of already queued v1.1 completions.
        result={'analysis_run_id':str(rid),'job_hash':job['job_hash'],'observations':[o.model_dump(mode='json',exclude={'appearance','state','track_id'}-o.model_fields_set) for o in body.observations]}
        rh=digest(result);old=terminal(c,rid)
        if old:
            owner=latest_attempt(c,rid)
            if not owner or owner['payload']['worker_id']!=p['id']: fail('FORBIDDEN',403)
            if owner['payload']['claim_id']!=str(body.claim_id) or owner['payload']['attempt_no']!=body.attempt_no: fail('ID_CONFLICT')
            if old['event_type']!='ANALYSIS_COMPLETED' or old['payload']['result_hash']!=rh: fail('ID_CONFLICT')
            return {'completed':True,'duplicate':True,'result_hash':rh}
        check_claim(c,p,rid,body.claim_id,body.attempt_no)
        f=locked_row(c,'video_frame',job['frame_id'])
        if len({o.detection_index for o in body.observations})!=len(body.observations): fail('INVALID_DETECTION_INDEX',422)
        affected={r['candidate_id'] for r in c.execute('SELECT candidate_id FROM drone.detection_observation WHERE frame_id=%s',(job['frame_id'],))}
        affected.update(o.candidate_id for o in body.observations)
        for o in sorted(body.observations,key=lambda x:str(x.candidate_id)):
            cand=locked_row(c,'person_candidate',o.candidate_id)
            if cand and cand['mission_id']!=j['mission_id']: fail('FORBIDDEN',403)
            if not cand:
                add(c,'person_candidate',{'candidate_id':str(o.candidate_id),'mission_id':str(j['mission_id']),
                    'first_frame_id':job['frame_id'],'first_seen':f['capture_at'],'association_state':'SIM_UNVERIFIED',
                    'geo_status':'PENDING','geo_reason':'NO_SELECTED_EVIDENCE'})
            if o.geo_result.get('status')=='VALID':
                # Physical pose/time/coordinate validation is not yet available: do not manufacture VALID.
                fail('REAL_COORDINATE_VALIDATION_NOT_READY',503)
            add(c,'detection_observation',{'observation_id':str(o.observation_id),'candidate_id':str(o.candidate_id),
                'frame_id':job['frame_id'],'analysis_mode':job['analysis_mode'],'detection_index':o.detection_index,
                'bbox':o.bbox,'confidence':o.confidence,'class_name':o.class_name,'observation_kind':'SIM_DETECTION','track_id':o.track_id,
                'model_config_id':job['model_config_id'],'coordinate_config_id':job['coordinate_config_id'],
                'association_evidence':{'analysis_run_id':str(rid),'analysis_revision':job['analysis_revision'],'job_hash':job['job_hash'],
                    'appearance':o.appearance,'reported_state':o.state,'worker_id':p['id'],'physical_validation':'NOT_VERIFIED'},
                'geo_result':o.geo_result,'historical':job['analysis_mode']=='HISTORICAL'})
        event(c,'ANALYSIS_COMPLETED',j['mission_id'],j['drone_id'],payload=job|{'result_hash':rh,'detection_count':len(body.observations)})
        selected=f['analysis_times'].get('selected_analysis_revision',0)
        if job['analysis_revision']>selected:
            mutate(c,'frame_selection',{'frame_id':job['frame_id'],'mode':job['analysis_mode'],'model_config_id':job['model_config_id'],
                   'pipeline_version':job['pipeline_version'],'selection':{'selected_run_id':str(rid),'selected_analysis_revision':job['analysis_revision'],'selected_at':now().isoformat()}})
            summarize_candidates(c,affected)
        return {'completed':True,'duplicate':False,'result_hash':rh,'detection_count':len(body.observations)}

@router.post('/internal/v1/analysis-runs/{rid}/attempt-failures',response_model=out.Failed)
@router.post('/internal/v1/analysis-runs/{rid}/final-failure',response_model=out.Failed)
def failure(rid:UUID,body:dto.AttemptFailure,request:Request):
    final=request.url.path.endswith('/final-failure')
    with transaction(events=True) as c:
        p=workload(request,'vision');j=ledger(c,rid)
        kind='ANALYSIS_FAILED' if final else 'ANALYSIS_ATTEMPT_FAILED'
        payload=j['payload']|body.model_dump(mode='json')|{'worker_id':p['id']}
        old=one(c,"SELECT * FROM drone.mission_event WHERE event_type=%s AND payload->>'analysis_run_id'=%s AND payload->>'attempt_no'=%s",(kind,str(rid),str(body.attempt_no)))
        if old:
            if old['payload'].get('worker_id')!=p['id']: fail('FORBIDDEN',403)
            if old['payload']!=payload: fail('ID_CONFLICT')
            return {'failed':True,'duplicate':True}
        if terminal(c,rid): fail('ANALYSIS_ALREADY_TERMINAL')
        check_claim(c,p,rid,body.claim_id,body.attempt_no)
        event(c,kind,j['mission_id'],j['drone_id'],payload=payload)
        return {'failed':True,'duplicate':False}
