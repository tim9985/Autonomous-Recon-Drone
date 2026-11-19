"""REAL storage and explicitly authorized field-agent control."""
from uuid import UUID
from fastapi import FastAPI,Request
from fastapi.responses import FileResponse
from . import main,media,responses as out,real_contracts as dto
from .core import *
from .openapi import schema
from app.body_limit import BodyLimit

app=FastAPI(title='Drone REAL data service',version='0.2.0',docs_url=None,redoc_url=None,lifespan=main.lifespan)
app.exception_handlers.update(main.app.exception_handlers)
for m in main.app.user_middleware:app.add_middleware(m.cls,**m.kwargs)
app.add_middleware(BodyLimit)
# Reuse reviewed handlers, but never inherit SIM mutators or command dispatch by default.
shared={'login','logout','me','missions','get_mission','snapshot','events','candidates','judgement','reobserve','alerts','acknowledge','ws'}
app.router.routes.extend(r for r in main.app.routes if getattr(r,'name',None) in shared)
app.include_router(media.router)
from .vision_runtime import router as vision_runtime_router,loaded
app.include_router(vision_runtime_router)
from .real_bench import router as real_bench_router
app.include_router(real_bench_router)
from .real_live_state import router as live_state_router, read_live
app.include_router(live_state_router)
app.add_api_route('/internal/v1/vision/media-bundles',media.reserve,methods=['POST'],status_code=201,response_model=out.MediaAsset)
app.add_api_route('/internal/v1/vision/media-assets/{aid}/content',media.upload,methods=['PUT'],response_model=out.Stored)
app.add_api_route('/internal/v1/vision/media-bundles/{bid}',media.bundle_status,methods=['GET'],response_model=out.MediaAsset)
app.add_api_route('/internal/v1/vision/media-bundles/{bid}/finalize',media.finalize,methods=['POST'],response_model=out.Persisted)
app.add_api_route('/internal/v1/vision/media-bundles/{bid}/cancel',media.cancel,methods=['POST'],response_model=out.MediaAsset)

def store(c,action,value):
    return output(one(c,'SELECT drone.real_store(%s,%s) AS value',(action,Jsonb(json.loads(canonical(value)))))['value'])

def real_mission(c,mid):
    m=mission(c,mid)
    if m['test_conditions'].get('environment')!='REAL':fail('ENVIRONMENT_MISMATCH',409)
    return m

def worker_mission(request,c,mid):
    p=workload(request,'vision');m=real_mission(c,mid)
    if m['drone_id'] not in p.get('drone_ids',[]):fail('FORBIDDEN',403)
    return p,m

def device_mission(request,c,mid,sid):
    p,d=device(request,c);m=real_mission(c,mid)
    if m['drone_id']!=d['drone_id']:fail('FORBIDDEN',403)
    if d['gateway_state'].get('session_id')!=str(sid):fail('OLD_DEVICE_SESSION')
    return p,d,m

def receipt(c,p,kind,body):
    data=body.model_dump(mode='json');h=digest(data)
    row=one(c,'SELECT * FROM drone.ingest_receipt WHERE message_id=%s',(body.message_id,))
    if row:
        if row['producer_id']!=p['id'] or row['kind']!=kind or row['content_hash']!=h:fail('ID_CONFLICT')
        return True
    store(c,'receipt',dict(message_id=str(body.message_id),producer_id=p['id'],producer_session_id=str(body.producer_session_id),
        sequence=body.sequence,kind=kind,mission_id=str(body.mission_id),content_hash=h,body=data))
    return False

@app.get('/health/live',response_model=out.Alive)
def live():return {'alive':True}

@app.get('/api/v1/readiness')
def readiness(request:Request):
    with transaction() as c:
        actor=user(request,c)
        from .real_control import store as control_store
        states=[control_store().status(p['drone_id'])['fc'] for p in actor['permissions']]
        connected=any(s.get('connected',False) for s in states)
        available=any(all(s.get(k) for k in ('connected','gps_ok','battery_ok','failsafe_ok')) and not s.get('rc_override') for s in states)
        return {'environment':'REAL','database':'connected','storage_ready':True,'physical_validation_ready':False,
                'flight_enabled':available,'control_implemented':True,'mission_readiness_required':True,
                'model_loaded':loaded(c),'real_device_enabled':connected}

@app.get('/api/v1/drones',response_model=list[out.Drone])
def drones(request:Request):return main.drones(request)

@app.get('/api/v1/drones/{did}')
def drone_status(did:str,request:Request):
    with transaction() as c:
        actor=user(request,c);authorize(actor,did)
        row=one(c,'SELECT * FROM drone.drone WHERE drone_id=%s',(did,))
        if not row:fail('RESOURCE_NOT_FOUND',404)
        sample=one(c,"SELECT * FROM drone.telemetry_sample WHERE drone_id=%s AND sample_kind='REAL_STATE' ORDER BY received_at DESC, sequence DESC, sample_id DESC LIMIT 1",(did,))
        from .real_control import store as control_store
        control=control_store().status(did);live=read_live(row);fc=control['fc']
        if control['gateway_session_id']:
            from datetime import datetime,timezone
            received=control['status_received_at']
            stamp=datetime.fromtimestamp(received,timezone.utc).isoformat() if received else None
            live={'state':'LIVE' if fc.get('connected') else 'STALE','stale_after_seconds':4,
                  'sample':{'armed':fc.get('armed'),'custom_mode':fc.get('mode'),'position':fc.get('position'),
                    'battery_voltage_v':fc.get('battery_voltage_v'),'gps_fix_type':fc.get('gps_fix_type'),
                    'satellites_visible':fc.get('satellites_visible'),'observed_at':stamp,'received_at':stamp,'source':'REAL_FC_CONTROL'}}
        return {'drone':output(row),'latest_telemetry':output(sample),'live_telemetry':live,
                'control':control,'flight_enabled':bool(fc.get('connected') and fc.get('failsafe_ok')),'environment':'REAL','validation':'PHYSICAL_FLIGHT_NOT_VERIFIED'}

@app.post('/api/v1/missions',status_code=201,response_model=out.Mission)
def create_mission(body:dto.Mission,request:Request):
    with transaction(events=True) as c:
        u=user(request,c,'edit');authorize(u,body.drone_id)
        old=one(c,'SELECT * FROM drone.mission WHERE mission_id=%s',(body.mission_id,))
        if old:
            if old['creator_user_id']!=u['user_id'] or old['drone_id']!=body.drone_id:fail('ID_CONFLICT')
            return output(old)
        value=store(c,'mission',body.model_dump(mode='json')|{'creator_user_id':str(u['user_id'])})
        event(c,'MISSION_CREATED',body.mission_id,body.drone_id,u['user_id'],{'environment':'REAL'})
        return value

@app.post('/api/v1/missions/{mid}/start',status_code=202)
@app.post('/api/v1/missions/{mid}/resume',status_code=202)
def start(mid:UUID,request:Request):
    with transaction() as c:owned_mission(request,c,mid,'control');fail('EXPLICIT_EXECUTION_PLAN_REQUIRED',409)

@app.get('/device/v1/commands')
def pending(request:Request):
    # Legacy evidence clients must never claim an executable control-agent job.
    with transaction() as c:device(request,c)
    return []

@app.post('/device/v1/sessions',response_model=out.Drone)
def session(body:dto.Session,request:Request):
    with transaction(events=True) as c:
        p,d=device(request,c)
        if d['gateway_state'].get('session_id')==str(body.session_id):
            if d['control_epoch']!=int(body.control_epoch):fail('ID_CONFLICT')
            return output(d)
        result=store(c,'session',body.model_dump(mode='json')|{'drone_id':d['drone_id']})
        event(c,'DEVICE_CONNECTED',drone_id=d['drone_id'],payload={'environment':'REAL','session_id':str(body.session_id)})
        return result

@app.post('/device/v1/telemetry',response_model=out.Stored)
def telemetry(body:dto.Telemetry,request:Request):
    with transaction(events=True) as c:
        p,d,m=device_mission(request,c,body.mission_id,body.producer_session_id)
        if body.drone_id!=d['drone_id']:fail('FORBIDDEN',403)
        h=digest(body.model_dump(mode='json'))
        old=one(c,'SELECT * FROM drone.telemetry_sample WHERE sample_id=%s',(body.sample_id,))
        if old:
            if old['time_evidence'].get('input_hash')!=h:fail('ID_CONFLICT')
            return {'stored':True,'duplicate':True,'sample_id':str(body.sample_id)}
        add(c,'telemetry_sample',{'sample_id':str(body.sample_id),'mission_id':str(body.mission_id),'drone_id':d['drone_id'],
            'producer_id':p['id'],'producer_session_id':str(body.producer_session_id),'sample_kind':'REAL_STATE','sequence':int(body.sequence),
            'clock_domain':body.clock_domain,'source_time_utc':body.source_time_utc,'pose':body.pose,'flight_state':body.flight_state,
            'time_evidence':{'environment':'REAL','input_hash':h,'reported':body.time_evidence},'validity':{'physical_validation':'NOT_VERIFIED'}})
        event(c,'TELEMETRY_RECEIVED',body.mission_id,d['drone_id'],payload={'sample_id':str(body.sample_id),'environment':'REAL'})
        return {'stored':True,'duplicate':False,'sample_id':str(body.sample_id)}

@app.post('/device/v1/frames',status_code=201,response_model=out.VideoFrame)
def frame(body:dto.Frame,request:Request):
    with transaction(events=True) as c:
        p,d,m=device_mission(request,c,body.mission_id,body.producer_session_id)
        a=media.asset(c,body.input_asset_id)
        if a['mission_id']!=body.mission_id or a['state']!='STORED' or a['asset_type']!='FRAME':fail('INPUT_ASSET_NOT_READY')
        media.verify_file(a);h=digest(body.model_dump(mode='json'))
        old=one(c,'SELECT * FROM drone.video_frame WHERE frame_id=%s',(body.frame_id,))
        if old:
            if old['time_evidence'].get('input_hash')!=h:fail('ID_CONFLICT')
            return output(old)
        value=body.model_dump(mode='json')
        for k in ('source','input_asset_id','producer_session_id','time_source'):value.pop(k)
        value.update(drone_id=d['drone_id'],frame_seq=int(body.frame_seq),identity_scope=str(body.producer_session_id),capture_time_verified=False,
            time_evidence={'environment':'REAL','input_hash':h,'input_asset_id':str(body.input_asset_id),'time_source':body.time_source,'reported':body.time_evidence},
            source_quality_status='UNVERIFIED_REAL',metadata_state='RECEIVED',pose_status='PENDING',pose_reason='PHYSICAL_VALIDATION_REQUIRED' if body.pose else 'POSE_MISSING',
            coverage={},analysis_state='UNASSIGNED',analysis_times={},task_quality_status='REAL_STRUCTURAL_ONLY')
        value=add(c,'video_frame',value)
        event(c,'FRAME_RECEIVED',body.mission_id,d['drone_id'],payload={'frame_id':str(body.frame_id),'environment':'REAL'})
        return value

@app.get('/api/v1/configs',response_model=list[out.Config])
def configs(request:Request):return main.planning.configs(request)

@app.post('/api/v1/configs/models',status_code=201)
def model(body:dto.Model,request:Request):
    with transaction(events=True) as c:
        u=user(request,c,'configure')
        if str(u['user_id']) not in settings().get('configuration_admins',[]):fail('FORBIDDEN',403)
        raw=body.model_dump(mode='json',exclude={'engine_sha256','posture_sha256'}-body.model_fields_set);h=digest(raw)
        old=one(c,'SELECT * FROM drone.config_version WHERE config_id=%s',(body.config_id,))
        if old:
            if old['content_hash']!=h:fail('ID_CONFLICT')
            return output(old)
        return store(c,'model',{'config_id':str(body.config_id),'version':body.version,'content_hash':h,'payload':raw})

@app.get('/internal/v1/frames',response_model=list[out.FrameInput])
def frames(request:Request):
    p=workload(request,'vision')
    with transaction() as c:
        from .vision_runtime import appearance_query
        rows=output(c.execute("SELECT frame_id,mission_id,capture_at,width,height,format,time_evidence,pose,pose_status,pose_reason FROM drone.video_frame WHERE drone_id=ANY(%s) AND analysis_state='UNASSIGNED' ORDER BY capture_at NULLS LAST,received_at LIMIT 20",(p.get('drone_ids',[]),)).fetchall())
        queries={mid:appearance_query(c,mid) for mid in {r['mission_id'] for r in rows}}
        for row in rows:row['appearance_query']=queries[row['mission_id']]
        return rows

@app.get('/internal/v1/frames/{fid}/input')
def input_file(fid:UUID,request:Request):
    with transaction() as c:
        f=one(c,'SELECT * FROM drone.video_frame WHERE frame_id=%s',(fid,))
        if not f:fail('RESOURCE_NOT_FOUND',404)
        worker_mission(request,c,f['mission_id'])
        a=media.asset(c,f['time_evidence']['input_asset_id']);path=media.verify_file(a)
    return FileResponse(path,media_type='application/octet-stream',headers={'X-Content-SHA256':a['content_hash']})

@app.post('/internal/v1/vision/results',response_model=dto.Receipt)
def vision_result(body:dto.VisionResult,request:Request):
    with transaction(events=True) as c:
        p,m=worker_mission(request,c,body.mission_id)
        if receipt(c,p,'VISION_RESULT',body):return {'message_id':body.message_id,'duplicate':True}
        f=locked_row(c,'video_frame',body.frame_id)
        if not f or f['mission_id']!=body.mission_id:fail('FRAME_MISSION_MISMATCH',422)
        if f['analysis_state']!='UNASSIGNED':fail('FRAME_ALREADY_ANALYZED')
        model=one(c,"SELECT * FROM drone.config_version WHERE config_id=%s AND kind='MODEL'",(body.model_config_id,))
        if not model or model['payload'].get('environment')!='REAL':fail('MODEL_PROVENANCE_REQUIRED',422)
        job={'analysis_run_id':str(body.message_id),'frame_id':str(body.frame_id),'analysis_revision':1,'model_config_id':str(body.model_config_id),
             'job_hash':digest(body.model_dump(mode='json')),'environment':'REAL','worker_id':p['id']}
        event(c,'ANALYSIS_STARTED',body.mission_id,m['drone_id'],payload=job)
        for o in body.observations:
            if o.bbox.x2>f['width'] or o.bbox.y2>f['height']:fail('INVALID_BBOX',422)
            for aid,kind in ((o.snapshot_asset_id,'FRAME'),(o.clip_asset_id,'VIDEO')):
                if aid:
                    a=media.asset(c,aid)
                    if a['mission_id']!=body.mission_id or a['state']!='STORED' or a['asset_type']!=kind:fail('INPUT_ASSET_NOT_READY')
                    media.verify_file(a)
            cand=locked_row(c,'person_candidate',o.candidate_id)
            if cand:
                if cand['mission_id']!=body.mission_id or (cand['tracking'] or {}).get('worker_id')!=p['id']:fail('FORBIDDEN',403)
                if int(o.worker_revision)<=int((cand['tracking'] or {}).get('worker_revision','0')):fail('OLD_WORKER_REVISION')
            else:add(c,'person_candidate',{'candidate_id':str(o.candidate_id),'mission_id':str(body.mission_id),'first_frame_id':str(body.frame_id),
                'first_seen':f['capture_at'],'association_state':'OBSERVED_UNVERIFIED','geo_status':'PENDING','geo_reason':'PHYSICAL_VALIDATION_REQUIRED'})
            g={'status':'PENDING','reason':'PHYSICAL_VALIDATION_REQUIRED' if f.get('pose') else 'POSE_MISSING','worker_claim':o.geo.model_dump(mode='json')}
            obs=add(c,'detection_observation',{'observation_id':str(o.observation_id),'candidate_id':str(o.candidate_id),'frame_id':str(body.frame_id),
                'analysis_mode':'LIVE_DETECT','detection_index':o.detection_index,'track_id':o.track_id,
                'bbox':o.bbox.model_dump()|{'convention':'PIXEL_XYXY','source_width':f['width'],'source_height':f['height']},
                'confidence':o.confidence,'class_name':'person','observation_kind':o.kind,'model_config_id':str(body.model_config_id),
                'association_evidence':job,'geo_result':g,'historical':False})
            store(c,'candidate',{'candidate_id':str(o.candidate_id),'observation_id':str(o.observation_id),'observed_at':f['capture_at'],
                'appearance':o.appearance,'tracking':{'worker_id':p['id'],'worker_revision':o.worker_revision,'auto_confirmed':o.auto_confirmed,
                'reported_state':o.state,'geo_claim':o.geo.model_dump(mode='json'),'physical_validation':'NOT_VERIFIED',
                'media':{'snapshot_asset_id':str(o.snapshot_asset_id) if o.snapshot_asset_id else None,'clip_asset_id':str(o.clip_asset_id) if o.clip_asset_id else None}}})
        event(c,'ANALYSIS_COMPLETED' if body.analysis_state=='DONE' else 'ANALYSIS_FAILED',body.mission_id,m['drone_id'],
            payload=job|{'result_hash':digest(body.model_dump(mode='json')),'detection_count':len(body.observations),'reported_state':body.analysis_state,'reason':body.reason})
        store(c,'frame',{'frame_id':str(body.frame_id),'state':'COMPLETED' if body.analysis_state=='DONE' else body.analysis_state,
            'reason':body.reason,'model_config_id':str(body.model_config_id),'pipeline_version':model['payload']['pipeline_version'],
            'selection':{'selected_run_id':str(body.message_id),'selected_analysis_revision':1}})
        return {'message_id':body.message_id}

@app.post('/internal/v1/vision/reobservations',status_code=201,response_model=out.ReobservationRequest)
def suggest(body:dto.Reobserve,request:Request):
    with transaction(events=True) as c:
        cand=one(c,'SELECT * FROM drone.person_candidate WHERE candidate_id=%s',(body.candidate_id,))
        if not cand:fail('RESOURCE_NOT_FOUND',404)
        p,m=worker_mission(request,c,cand['mission_id'])
        value={'request_id':str(body.request_id),'mission_id':str(m['mission_id']),'candidate_id':str(body.candidate_id),
            'requester_kind':'SYSTEM','status':'PENDING','hypothesis':body.hypothesis|{'reason':body.reason,'worker_id':p['id']},'desired_view':body.desired_view,'limits':{},'usage':{}}
        previous=one(c,'SELECT * FROM drone.reobservation_request WHERE request_id=%s',(body.request_id,))
        if previous:
            if any(canonical(previous[k])!=canonical(v) for k,v in value.items()):fail('ID_CONFLICT')
            return output(previous)
        result=add(c,'reobservation_request',value)
        event(c,'REOBSERVATION_REQUESTED',m['mission_id'],m['drone_id'],payload={'request_id':str(body.request_id),'worker_id':p['id'],'dispatch_enabled':False})
        return result

@app.post('/device/v1/command-observations',response_model=dto.Receipt)
def command_observation(body:dto.CommandObservation,request:Request):
    with transaction(events=True) as c:
        p,d,m=device_mission(request,c,body.mission_id,body.producer_session_id)
        duplicate=receipt(c,p,'COMMAND_OBSERVATION',body)
        if not duplicate:event(c,'COMMAND_EVIDENCE_RECORDED',body.mission_id,d['drone_id'],payload=body.model_dump(mode='json')|{'reconciled':False,'environment':'REAL'})
        return {'message_id':body.message_id,'duplicate':duplicate}

@app.get('/api/v1/missions/{mid}/command-observations')
def command_observations(mid:UUID,request:Request):
    with transaction() as c:
        owned_mission(request,c,mid)
        return output(c.execute("SELECT message_id,body,received_at FROM drone.ingest_receipt WHERE mission_id=%s AND kind='COMMAND_OBSERVATION' ORDER BY received_at DESC LIMIT 100",(mid,)).fetchall())

@app.get('/api/v1/candidates/{cid}/observations',response_model=list[dto.ObservationRecord])
def observations(cid:UUID,request:Request):
    with transaction() as c:
        candidate=one(c,'SELECT mission_id FROM drone.person_candidate WHERE candidate_id=%s',(cid,))
        if not candidate:fail('RESOURCE_NOT_FOUND',404)
        owned_mission(request,c,candidate['mission_id'])
        return output(c.execute('SELECT * FROM drone.detection_observation WHERE candidate_id=%s ORDER BY frame_id,detection_index LIMIT 1000',(cid,)).fetchall())

@app.get('/api/v1/missions/{mid}/reobservations',response_model=list[out.ReobservationRequest])
def reobservations(mid:UUID,request:Request):
    with transaction() as c:
        owned_mission(request,c,mid)
        return output(c.execute('SELECT * FROM drone.reobservation_request WHERE mission_id=%s ORDER BY requested_at DESC LIMIT 1000',(mid,)).fetchall())

@app.get('/api/v1/missions/{mid}/telemetry',response_model=list[out.TelemetrySample])
def telemetry_history(mid:UUID,request:Request):
    with transaction() as c:
        owned_mission(request,c,mid)
        return output(c.execute('SELECT * FROM drone.telemetry_sample WHERE mission_id=%s ORDER BY received_at DESC LIMIT 1000',(mid,)).fetchall())

def openapi():
    value=schema(app)
    value['components']['securitySchemes']['OperatorSession']['name']=COOKIE
    for methods in value['paths'].values():
        for op in methods.values():
            if isinstance(op,dict):
                for s in op.get('servers',[]):
                    if s['url']=='https://localhost:18443':s['url']='https://localhost:19443'
    value['x-websocket']['url']='wss://localhost:19443/api/v1/ws'
    return value
app.openapi=openapi

from .real_mission_prepare import router as mission_prepare_router
app.include_router(mission_prepare_router)
from .real_control import router as control_router
app.include_router(control_router)
