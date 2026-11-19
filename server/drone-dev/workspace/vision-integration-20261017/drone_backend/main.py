from app.body_limit import is_map_draft, is_analysis_completion, is_frame_content, analysis_body_limit
from . import responses as out
import asyncio
import hashlib
import hmac
import json
import os
import secrets
import time
import logging
from contextlib import asynccontextmanager
from threading import BoundedSemaphore
from starlette.concurrency import run_in_threadpool
from datetime import timedelta
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import FastAPI, HTTPException, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
import psycopg

from . import contracts as dto
from .core import *

async def storage_maintenance():
    while True:
        try:await run_in_threadpool(media.collect_expired)
        except HTTPException as exc:
            if exc.detail!='MEDIA_BUSY':logging.warning('Storage cleanup pending: %s',exc.detail)
        except (psycopg.Error,OSError):logging.warning('Storage cleanup will retry')
        await asyncio.sleep(60)

@asynccontextmanager
async def lifespan(application):
    task=asyncio.create_task(storage_maintenance())
    try:yield
    finally:
        task.cancel()
        await asyncio.gather(task,return_exceptions=True)

app=FastAPI(title='Drone business backend',version='0.1.1',docs_url=None,redoc_url=None,lifespan=lifespan)
login_slots=BoundedSemaphore(2)
dummy_credential=password_hash(secrets.token_urlsafe(32))

@app.exception_handler(HTTPException)
async def http_error(request,exc):
    return JSONResponse({'error':{'code':exc.detail,'request_id':request.headers.get('x-request-id') or str(uuid4())}},status_code=exc.status_code,headers=exc.headers)

@app.exception_handler(RequestValidationError)
async def invalid(request,exc):
    # Validation errors may include passwords or uploaded payloads; do not echo input.
    return JSONResponse({'error':{'code':'INVALID_CONTRACT','fields':[list(e['loc']) for e in exc.errors()]}},status_code=422)

@app.exception_handler(psycopg.Error)
async def database_error(request,exc):
    code=exc.sqlstate or ''
    status=409 if code in ('23505','23514','23503') else 422 if code.startswith('22') else 503
    return JSONResponse({'error':{'code':'DATABASE_CONFLICT' if status==409 else 'INVALID_CONTRACT' if status==422 else 'DATABASE_UNAVAILABLE'}},status_code=status)

@app.middleware('http')
async def limits(request,call_next):
    maximum=8388608 if is_frame_content(request.method,request.url.path) else settings().get('max_upload_bytes',67108864) if request.method=='PUT' and request.url.path.endswith('/content') else analysis_body_limit(request.url.path) if is_map_draft(request.method,request.url.path) or is_analysis_completion(request.method,request.url.path) else 65536
    try: length=int(request.headers.get('content-length','0'))
    except ValueError: return JSONResponse({'error':{'code':'INVALID_CONTRACT'}},status_code=422)
    if length<0 or length>maximum: return JSONResponse({'error':{'code':'BODY_TOO_LARGE'}},status_code=413)
    response=await call_next(request)
    response.headers['Cache-Control']='no-store'
    response.headers['X-Content-Type-Options']='nosniff'
    return response

@app.get('/health/live',response_model=out.Alive)
def live(): return {'alive':True}

@app.get('/api/v1/readiness',response_model=out.Readiness)
def readiness(request:Request):
    with transaction() as c:
        user(request,c)
        from .vision_runtime import loaded
        return {'business_api_ready':True,'environment':'SIM','model_loaded':loaded(c),'flight_enabled':False,
                'real_device_enabled':False,'schema_migrations':one(c,"SELECT count(*) AS n FROM drone.backend_schema_versions()")['n']}

@app.post('/api/v1/auth/login',response_model=out.LoginReply)
def login(body:dto.Login,request:Request,response:Response):
    workload(request,'operator')
    if request.headers.get('origin') not in settings()['origins']: fail('ORIGIN_REJECTED',403)
    key=body.login_id.strip().lower()
    if not login_slots.acquire(blocking=False): fail('RATE_LIMITED',429)
    try:
        with transaction() as c:
            account=one(c,'SELECT * FROM drone.user_account WHERE login_id=%s',(key,))
            encoded=account['credential_hash'] if account else dummy_credential
            valid=password_ok(body.password,encoded)
            if not valid or not account or account['status']!='ACTIVE':
                fail('UNAUTHENTICATED',401)
            c.execute('SELECT pg_advisory_xact_lock(20261005,1)')
            token=secrets.token_urlsafe(32)
            expiry=now()+timedelta(seconds=settings()['session_seconds'])
            session=mutate(c,'session_create',{'session_id':str(uuid4()),'user_id':str(account['user_id']),
                'token_digest':hashlib.sha256(token.encode()).hexdigest(),'issued_at':now(),'expires_at':expiry})
            event(c,'SESSION_CREATED',actor=account['user_id'],payload={'session_id':session['session_id']})
    finally: login_slots.release()
    response.set_cookie(COOKIE,token,secure=True,httponly=True,samesite='strict',max_age=settings()['session_seconds'],path='/')
    return {'session_id':session['session_id'],'expires_at':expiry,'csrf_token':hmac.new(token.encode(),b'csrf',hashlib.sha256).hexdigest(),
            'permissions':account['permissions']}

@app.get('/api/v1/auth/me',response_model=out.Me)
def me(request:Request):
    with transaction() as c:
        return output(user(request,c))|{'csrf_token':hmac.new(request.cookies[COOKIE].encode(),b'csrf',hashlib.sha256).hexdigest()}

@app.post('/api/v1/auth/logout',response_model=out.Revoked)
def logout(request:Request,response:Response):
    with transaction(events=True) as c:
        u=user(request,c)
        controlled=c.execute('SELECT drone_id FROM drone.drone WHERE control_session_id=%s',(u['session_id'],)).fetchall()
        mutate(c,'session_revoke',{'session_id':u['session_id'],'user_id':u['user_id']})
        for row in controlled: event(c,'CONTROL_RELEASED',drone_id=row['drone_id'],actor=u['user_id'],payload={'reason':'SESSION_REVOKED'})
        event(c,'SESSION_REVOKED',actor=u['user_id'],payload={'session_id':str(u['session_id'])})
    response.delete_cookie(COOKIE,path='/')
    return {'revoked':True}

@app.get('/api/v1/drones',response_model=list[out.Drone])
def drones(request:Request):
    with transaction() as c:
        u=user(request,c)
        ids=[p['drone_id'] for p in u['permissions'] if 'read' in p.get('scopes',[])]
        return output(c.execute('SELECT * FROM drone.drone WHERE drone_id=ANY(%s) ORDER BY drone_id',(ids,)).fetchall())

@app.get('/api/v1/drones/{did}',response_model=out.DroneStatus)
def drone(did:str,request:Request):
    with transaction() as c:
        u=user(request,c); authorize(u,did)
        row=one(c,'SELECT * FROM drone.drone WHERE drone_id=%s',(did,))
        if not row: fail('RESOURCE_NOT_FOUND',404)
        sample=one(c,'SELECT * FROM drone.telemetry_sample WHERE drone_id=%s ORDER BY source_time_utc DESC LIMIT 1',(did,))
        return {'drone':output(row),'latest_telemetry':output(sample),'flight_enabled':False}

def control(did,body,request,release=False):
    with transaction(events=True) as c:
        u=user(request,c,'control');authorize(u,did)
        d=locked_row(c,'drone',did)
        if not d: fail('RESOURCE_NOT_FOUND',404)
        if d['control_revision']!=int(body.expected_control_revision): fail('REVISION_CONFLICT')
        if d['control_session_id'] and d['control_session_id']!=u['session_id'] and d['control_expires_at']>now(): fail('CONTROL_CONFLICT')
        if release and d['control_session_id']!=u['session_id']: fail('FORBIDDEN',403)
        value=mutate(c,'control',{'drone_id':did,'session_id':u['session_id'],'user_id':u['user_id'],
             'expected_revision':d['control_revision'],'release':release,'expires_at':now()+timedelta(seconds=settings()['control_seconds'])})
        event(c,'CONTROL_RELEASED' if release else 'CONTROL_ACQUIRED',drone_id=did,actor=u['user_id'],payload={'revision':value['control_revision']})
        return output(value)

@app.post('/api/v1/drones/{did}/control/acquire',response_model=out.Drone)
def acquire(did:str,body:dto.Control,request:Request): return control(did,body,request)
@app.post('/api/v1/drones/{did}/control/release',response_model=out.Drone)
def release(did:str,body:dto.Control,request:Request): return control(did,body,request,True)

@app.post('/api/v1/missions',status_code=201,response_model=out.Mission)
def create_mission(body:dto.CreateMission,request:Request):
    with transaction(events=True) as c:
        u=user(request,c,'edit');authorize(u,body.drone_id)
        previous=one(c,'SELECT * FROM drone.mission WHERE mission_id=%s',(body.mission_id,))
        if previous:
            if previous['drone_id']!=body.drone_id or previous['creator_user_id']!=u['user_id']: fail('ID_CONFLICT')
            return output(previous)
        row=add(c,'mission',{'mission_id':str(body.mission_id),'drone_id':body.drone_id,'creator_user_id':str(u['user_id']),
            'state':'DRAFT','state_evidence':{},'readiness':{},'test_conditions':{'environment':'SIM'},'grant_status':'DENIED'})
        event(c,'MISSION_CREATED',body.mission_id,body.drone_id,u['user_id'])
        return row

@app.get('/api/v1/missions',response_model=list[out.Mission])
def missions(request:Request,limit:int=50):
    if not 1<=limit<=100: fail('INVALID_LIMIT',422)
    with transaction() as c:
        u=user(request,c);ids=[p['drone_id'] for p in u['permissions'] if 'read' in p.get('scopes',[])]
        return output(c.execute('SELECT * FROM drone.mission WHERE drone_id=ANY(%s) ORDER BY mission_id LIMIT %s',(ids,limit)).fetchall())

@app.get('/api/v1/missions/{mid}',response_model=out.MissionStatus)
def get_mission(mid:UUID,request:Request):
    with transaction() as c:
        u,m=owned_mission(request,c,mid)
        revisions=c.execute("SELECT to_jsonb(r)-'area_geom'-'priority_geom'||jsonb_build_object('area_geom',ST_AsGeoJSON(area_geom)::jsonb) AS value FROM drone.mission_revision r WHERE mission_id=%s ORDER BY revision",(mid,)).fetchall()
        return {'mission':output(m),'revisions':[r['value'] for r in revisions]}

@app.post('/api/v1/missions/{mid}/revisions',status_code=201,response_model=out.MissionRevision)
def revision(mid:UUID,body:dto.Revision,request:Request):
    with transaction(events=True) as c:
        u,m=owned_mission(request,c,mid,'edit',True)
        if (m['draft_revision'] or 0)!=body.expected_draft_revision: fail('REVISION_CONFLICT')
        r=body.model_dump(mode='json');r.pop('expected_draft_revision')
        r.update(mission_id=str(mid),revision=body.expected_draft_revision+1,priority_sources=[],planner_modes={'environment':'SIM'})
        row=add(c,'mission_revision',r)
        mutate(c,'mission_state',{'mission_id':str(mid),'draft_revision':r['revision'],'mode':'draft'})
        event(c,'MISSION_EDITED',mid,m['drone_id'],u['user_id'],{'revision':r['revision']})
        return row

@app.post('/api/v1/missions/{mid}/approve',response_model=out.Mission)
def approve(mid:UUID,body:dto.Approval,request:Request):
    with transaction(events=True) as c:
        u,m=owned_mission(request,c,mid,'control',True)
        if m['draft_revision']!=body.expected_draft_revision: fail('REVISION_CONFLICT')
        r=one(c,'SELECT * FROM drone.mission_revision WHERE mission_id=%s AND revision=%s',(mid,body.expected_draft_revision))
        if not r or not r['area_geom']: fail('NOT_READY',503)
        ids=[r[n+'_config_id'] for n in ('spatial','coordinate','policy','model')]
        if one(c,"SELECT count(*) AS n FROM drone.config_version WHERE config_id=ANY(%s) AND status='APPROVED'",(ids,))['n']!=4: fail('NOT_READY',503)
        row=mutate(c,'mission_state',{'mission_id':str(mid),'mode':'approve','revision':body.expected_draft_revision,'actor':str(u['user_id'])})
        event(c,'MISSION_APPROVED',mid,m['drone_id'],u['user_id'],{'revision':body.expected_draft_revision,'environment':'SIM'})
        return row

@app.post('/api/v1/missions/{mid}/start',status_code=202)
@app.post('/api/v1/missions/{mid}/resume',status_code=202)
def start(mid:UUID,request:Request):
    with transaction(events=True) as c:
        u,m=owned_mission(request,c,mid,'control',True)
        # Model training/REAL flight are not readiness signals. Explicitly gated.
        fail('MODEL_AND_REAL_FLIGHT_NOT_READY',503)

def snapshot_data(c,mid,m):
    return {'mission':output(m),'drone':output(one(c,'SELECT * FROM drone.drone WHERE drone_id=%s',(m['drone_id'],))),
       'candidates':output([r['value'] for r in c.execute("SELECT to_jsonb(p)-'latest_position'||jsonb_build_object('latest_position',ST_AsGeoJSON(latest_position)::jsonb)||CASE WHEN o.observation_kind='SIM_DETECTION' THEN jsonb_build_object('appearance',o.association_evidence->'appearance','tracking',jsonb_build_object('track_id',o.track_id,'reported_state',o.association_evidence->'reported_state','worker_id',o.association_evidence->'worker_id','physical_validation','NOT_VERIFIED','geo_claim',o.geo_result->'worker_claim')) ELSE '{}'::jsonb END AS value FROM drone.person_candidate p LEFT JOIN drone.detection_observation o ON o.observation_id=p.latest_observation_id WHERE p.mission_id=%s ORDER BY p.candidate_id",(mid,))]),
       'commands':output(c.execute('SELECT * FROM drone.flight_command WHERE mission_id=%s ORDER BY issued_at DESC LIMIT 100',(mid,)).fetchall()),
       'alerts':output(c.execute('SELECT * FROM drone.alert WHERE mission_id=%s ORDER BY raised_at DESC LIMIT 100',(mid,)).fetchall()),
       'event_cursor':str(one(c,'SELECT coalesce(max(event_seq),0) AS n FROM drone.mission_event')['n'])}

@app.get('/api/v1/missions/{mid}/snapshot',response_model=out.Snapshot)
def snapshot(mid:UUID,request:Request):
    with transaction(snapshot=True) as c:
        u,m=owned_mission(request,c,mid)
        return snapshot_data(c,mid,m)

def replay(c,mid,cursor,limit):
    rows=c.execute("SELECT * FROM drone.mission_event WHERE (mission_id=%s OR (mission_id IS NULL AND drone_id=(SELECT drone_id FROM drone.mission WHERE mission_id=%s) AND event_type IN ('CONTROL_ACQUIRED','CONTROL_RELEASED','DEVICE_CONNECTED','SAFETY_REPORTED'))) AND event_seq>%s ORDER BY event_seq LIMIT %s",(mid,mid,cursor,limit+1)).fetchall()
    items=rows[:limit]
    return {'events':output(items),'next_cursor':str(items[-1]['event_seq'] if items else cursor),'has_more':len(rows)>limit}

@app.get('/api/v1/missions/{mid}/events',response_model=out.Replay)
def events(mid:UUID,request:Request,after_cursor:dto.Counter='0',limit:int=50):
    if not 1<=limit<=100: fail('INVALID_LIMIT',422)
    with transaction() as c:
        owned_mission(request,c,mid)
        return replay(c,mid,int(after_cursor),limit)

@app.get('/api/v1/missions/{mid}/candidates',response_model=list[out.PersonCandidate])
def candidates(mid:UUID,request:Request):
    with transaction() as c:
        u,m=owned_mission(request,c,mid)
        return snapshot_data(c,mid,m)['candidates']

@app.get('/api/v1/missions/{mid}/observation-cells',response_model=list[out.ObservationCell])
def cells(mid:UUID,request:Request):
    with transaction() as c:
        owned_mission(request,c,mid)
        values=[r['value'] for r in c.execute("SELECT to_jsonb(x)-'cell_geom'-'valid_union_geom'||jsonb_build_object('cell_geom',ST_AsGeoJSON(cell_geom)::jsonb,'valid_union_geom',ST_AsGeoJSON(valid_union_geom)::jsonb) AS value FROM drone.observation_cell x WHERE mission_id=%s ORDER BY cell_id LIMIT 1000",(mid,))]
        for v in values:
            if not v['belief_detail'].get('calibrated'):v['belief']=None
        return output(values)

@app.post('/api/v1/candidates/{cid}/judgements',response_model=out.PersonCandidate|out.Duplicate)
def judgement(cid:UUID,body:dto.Judgement,request:Request):
    with transaction(events=True) as c:
        row=one(c,'SELECT * FROM drone.person_candidate WHERE candidate_id=%s',(cid,))
        if not row: fail('RESOURCE_NOT_FOUND',404)
        u,m=owned_mission(request,c,row['mission_id'],'edit')
        payload={'candidate_id':str(cid),'value':body.value,'reason':body.reason,'actor':str(u['user_id'])}
        previous=one(c,'SELECT payload FROM drone.mission_event WHERE event_id=%s',(body.request_id,))
        if previous:
            if previous['payload']!=payload: fail('ID_CONFLICT')
            return {'duplicate':True}
        value=mutate(c,'candidate_judgement',{'candidate_id':str(cid),'expected':int(body.expected_row_version),'judgement':payload})
        event(c,'CANDIDATE_JUDGED',m['mission_id'],m['drone_id'],u['user_id'],payload,eid=body.request_id)
        return output(value)

@app.post('/api/v1/candidates/{cid}/reobservations',response_model=out.ReobservationRequest)
def reobserve(cid:UUID,body:dto.Reobservation,request:Request):
    with transaction(events=True) as c:
        row=one(c,'SELECT * FROM drone.person_candidate WHERE candidate_id=%s',(cid,))
        if not row: fail('RESOURCE_NOT_FOUND',404)
        u,m=owned_mission(request,c,row['mission_id'],'edit')
        value={'request_id':str(body.request_id),'candidate_id':str(cid),'mission_id':str(row['mission_id']),
               'requester_kind':'USER','requested_by':str(u['user_id']),'status':'PENDING','hypothesis':body.hypothesis,
               'desired_view':body.desired_view,'limits':{},'usage':{}}
        previous=one(c,'SELECT * FROM drone.reobservation_request WHERE request_id=%s',(body.request_id,))
        if previous:
            if any(canonical(previous[k])!=canonical(v) for k,v in value.items()): fail('ID_CONFLICT')
            return output(previous)
        result=add(c,'reobservation_request',value)
        event(c,'REOBSERVATION_REQUESTED',row['mission_id'],m['drone_id'],u['user_id'],{'request_id':str(body.request_id)})
        return result

@app.get('/api/v1/missions/{mid}/alerts',response_model=list[out.Alert])
def alerts(mid:UUID,request:Request):
    with transaction() as c:
        owned_mission(request,c,mid)
        return output(c.execute('SELECT * FROM drone.alert WHERE mission_id=%s ORDER BY raised_at DESC LIMIT 100',(mid,)).fetchall())

@app.post('/api/v1/alerts/{aid}/acknowledge',response_model=out.Alert)
def acknowledge(aid:UUID,request:Request):
    with transaction(events=True) as c:
        a=one(c,'SELECT * FROM drone.alert WHERE alert_id=%s',(aid,))
        if not a or not a['mission_id']: fail('RESOURCE_NOT_FOUND',404)
        u,m=owned_mission(request,c,a['mission_id'],'edit')
        result=mutate(c,'alert_ack',{'alert_id':str(aid),'user_id':str(u['user_id'])})
        if a['acknowledged_at'] is None: event(c,'ALERT_ACKNOWLEDGED',a['mission_id'],m['drone_id'],u['user_id'],{'alert_id':str(aid)})
        return result

def ws_auth(connection):
    with transaction() as c: user(connection,c)

def ws_page(connection,mid,cursor):
    with transaction() as c:
        owned_mission(connection,c,mid)
        return replay(c,mid,cursor,50)

@app.websocket('/api/v1/ws')
async def ws(websocket:WebSocket):
    try:
        if websocket.headers.get('origin') not in settings()['origins']: fail('ORIGIN_REJECTED',403)
        await run_in_threadpool(ws_auth,websocket)
        await websocket.accept()
        msg=await asyncio.wait_for(websocket.receive_json(),10)
        if (not isinstance(msg,dict) or set(msg)!={'mission_id','after_cursor'}
            or not all(isinstance(v,str) for v in msg.values())): fail('INVALID_CONTRACT',422)
        mid=UUID(msg['mission_id']);cursor=int(dto.integer_string(msg['after_cursor']))
        while True:
            page=await run_in_threadpool(ws_page,websocket,mid,cursor)
            if page['events']:
                await websocket.send_json(page)
                cursor=int(page['next_cursor'])
            else: await websocket.send_json({'type':'heartbeat','cursor':str(cursor)})
            await asyncio.sleep(1)
    except WebSocketDisconnect: pass
    except (HTTPException,ValueError,KeyError,TimeoutError,psycopg.Error):
        await websocket.close(code=1008)

from . import device_api, media, analysis, planning
app.include_router(device_api.router)
app.include_router(media.router)
app.include_router(analysis.router)
from .vision_runtime import router as vision_runtime_router
app.include_router(vision_runtime_router)
app.include_router(planning.router)

from .openapi import schema
app.openapi=lambda: schema(app)

from school.backend import router as school_router
app.include_router(school_router)
app.version='0.1.2-school.2'

from school.observability import SimTiming
app.add_middleware(SimTiming)
