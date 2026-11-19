"""Local SIM recording reads and explicit analysis after confirmed completion."""
from uuid import UUID,uuid5,NAMESPACE_URL
from fastapi import APIRouter,Request,Query
from pydantic import Field
from drone_backend.contracts import DTO,Analysis
from drone_backend.core import transaction,one,output,fail
from .simulation_api import operator_run

router=APIRouter()

class Dispatch(DTO):
    after:int=Field(default=-1,ge=-1)
    limit:int=Field(default=100,ge=1,le=100)

def recording(c,request,rid,scope='read'):
    row=operator_run(c,request,rid,scope)
    cfg=row['request'].get('pipeline_config',{})
    if (cfg.get('analysis_policy'),cfg.get('realtime_vision_enabled')) not in (('POSTFLIGHT',False),('LIVE',True)):
        fail('POSTFLIGHT_RECORDING_REQUIRED',422)
    return row,cfg

def binding(row,cfg):
    return (cfg['mission_id'],'unreal/'+str(row['run_id']),str(row['worker_session_id']))

@router.get('/api/v1/simulations/runs/{rid}/postflight')
def status(rid:UUID,request:Request,limit:int=Query(default=100,ge=1,le=200)):
    with transaction(snapshot=True) as c:
        row,cfg=recording(c,request,rid)
        args=binding(row,cfg)
        capture=one(c,"""SELECT count(*) AS frames_stored,
            count(*) FILTER(WHERE pose IS NOT NULL) AS pose_present
            FROM drone.video_frame WHERE mission_id=%s AND stream_id=%s AND identity_scope=%s""",args)
        latest=one(c,"""SELECT frame_id,time_evidence->>'input_asset_id' AS asset_id,
            capture_at,width,height,pose,frame_seq FROM drone.video_frame
            WHERE mission_id=%s AND stream_id=%s AND identity_scope=%s
            ORDER BY frame_seq DESC LIMIT 1""",args)
        counts=one(c,"""WITH jobs AS (
            SELECT e.payload->>'analysis_run_id' AS id FROM drone.mission_event e
            JOIN drone.video_frame f ON f.frame_id::text=e.payload->>'frame_id'
            WHERE e.event_type='ANALYSIS_STARTED' AND f.mission_id=%s AND f.stream_id=%s AND f.identity_scope=%s
        ), states AS (
            SELECT j.id,
              EXISTS(SELECT 1 FROM drone.mission_event e WHERE e.event_type='ANALYSIS_COMPLETED' AND e.payload->>'analysis_run_id'=j.id) AS completed,
              EXISTS(SELECT 1 FROM drone.mission_event e WHERE e.event_type='ANALYSIS_FAILED' AND e.payload->>'analysis_run_id'=j.id) AS failed,
              EXISTS(SELECT 1 FROM drone.mission_event e WHERE e.event_type='ANALYSIS_ATTEMPT_STARTED' AND e.payload->>'analysis_run_id'=j.id
                AND (e.payload->>'expires_at')::timestamptz>clock_timestamp()) AS claimed
            FROM jobs j)
            SELECT count(*) FILTER(WHERE NOT completed AND NOT failed AND NOT claimed) AS queued,
              count(*) FILTER(WHERE NOT completed AND NOT failed AND claimed) AS running,
              count(*) FILTER(WHERE completed) AS completed,count(*) FILTER(WHERE failed) AS failed FROM states""",args)
        predicate="f.mission_id=%s AND f.stream_id=%s AND f.identity_scope=%s AND o.association_evidence->>'analysis_run_id'=f.analysis_times->>'selected_run_id'"
        total=one(c,'SELECT count(*) AS n FROM drone.detection_observation o JOIN drone.video_frame f USING(frame_id) WHERE '+predicate,args)['n']
        results=c.execute("""SELECT o.observation_id,o.candidate_id,o.frame_id,
            f.time_evidence->>'input_asset_id' AS asset_id,f.capture_at,f.width,f.height,
            o.bbox,o.confidence,o.track_id,o.association_evidence->'appearance' AS appearance,
            o.association_evidence->'reported_state'->'posture' AS posture,o.geo_result->>'status' AS geo_status,
            o.geo_result->'sim_estimate' AS sim_estimate
            FROM drone.detection_observation o JOIN drone.video_frame f USING(frame_id) WHERE """+predicate+
            ' ORDER BY f.capture_at DESC,o.detection_index LIMIT %s',(*args,limit)).fetchall()
        return output({'run_id':rid,'mission_id':cfg['mission_id'],'world':row['world'],
            'run_state':row['state'],'analysis_policy':cfg['analysis_policy'],'realtime_vision_enabled':cfg['realtime_vision_enabled'],
            'model_config_id':cfg['model_config_id'],'coordinate_config_id':cfg.get('coordinate_config_id'),
            'capture':dict(capture,latest_frame=latest),'analysis':counts,
            'results':results,'results_total':total,'results_limit':limit})

@router.post('/api/v1/simulations/runs/{rid}/postflight/analyze',status_code=202)
def dispatch(rid:UUID,body:Dispatch,request:Request):
    from drone_backend.analysis import admit
    with transaction() as c:
        row,cfg=recording(c,request,rid,'edit')
        fail('LOCAL_GPU_ANALYSIS_DISABLED',409)
        if row['state']!='COMPLETED':fail('POSTFLIGHT_NOT_READY',409)
        frames=c.execute("""SELECT frame_id,frame_seq,time_evidence->>'input_asset_id' AS asset_id
            FROM drone.video_frame WHERE mission_id=%s AND stream_id=%s AND identity_scope=%s
            AND frame_seq>%s ORDER BY frame_seq LIMIT %s""",(*binding(row,cfg),body.after,body.limit+1)).fetchall()
    jobs=[]
    for f in frames[:body.limit]:
        job_id=uuid5(NAMESPACE_URL,f"local-postflight/{rid}/{f['frame_id']}/{cfg['model_config_id']}/{cfg.get('coordinate_config_id')}")
        job=admit(Analysis(analysis_run_id=job_id,frame_id=f['frame_id'],input_asset_id=f['asset_id'],
            model_config_id=cfg['model_config_id'],coordinate_config_id=cfg.get('coordinate_config_id'),analysis_mode='HISTORICAL'),request)
        jobs.append(job['analysis_run_id'])
    return {'run_id':str(rid),'dispatched':len(jobs),'analysis_run_ids':jobs,
        'next_after':int(frames[min(len(frames),body.limit)-1]['frame_seq']) if frames else body.after,
        'has_more':len(frames)>body.limit,'analysis_policy':'POSTFLIGHT','realtime_vision_enabled':False}
