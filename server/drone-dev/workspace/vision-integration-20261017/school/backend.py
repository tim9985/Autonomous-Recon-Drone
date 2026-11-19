"""Authenticated adapters; all writes remain transactional PostgreSQL functions."""
import re
import httpx
import psycopg
from uuid import UUID
from fastapi import APIRouter, Request, Query
from fastapi.responses import Response
from psycopg.types.json import Jsonb
from drone_backend.core import transaction,user,owned_mission,one,output,fail,digest,event
from drone_backend.main import snapshot_data
from .contracts import MapDraft
from . import responses as reply
from .transport import service_client
from .quick_login import quick_login
from drone_backend.responses import LoginReply

router=APIRouter()
from .sim_link import router as sim_router
router.include_router(sim_router)
router.add_api_route('/api/v1/auth/quick-login',quick_login,methods=['POST'],response_model=LoginReply,
    summary='Start a shared SIM session without credentials',
    description='School deployment only. SIM read/edit/control permission; requires trusted gateway identity and allowed Origin. Rate limited to 10 sessions per minute. Normal session expiry, CSRF, logout and disabled flight execution apply.')

@router.get('/api/v1/spatial-releases',response_model=list[reply.SpatialRelease])
def releases(request:Request):
    with transaction() as c:
        user(request,c)
        return output(c.execute('SELECT release_id,environment_id,world_version,grid_version,source_crs,content_hash,manifest FROM drone.spatial_release ORDER BY environment_id,registered_at').fetchall())

@router.get('/api/v1/mission-workspaces',response_model=reply.MissionPage)
def missions(request:Request,after:str='',limit:int=Query(50,ge=1,le=100)):
    if after:
        try: UUID(after)
        except ValueError: fail('INVALID_CURSOR',422)
    with transaction() as c:
        u=user(request,c); ids=[p['drone_id'] for p in u['permissions'] if 'read' in p.get('scopes',[])]
        rows=c.execute("SELECT m.mission_id,m.drone_id,m.state,m.draft_revision,m.active_revision,p.name,p.mission_type,p.updated_at FROM drone.mission m LEFT JOIN drone.mission_presentation p USING(mission_id) WHERE m.drone_id=ANY(%s) AND (%s='' OR m.mission_id::text>%s) ORDER BY m.mission_id LIMIT %s",(ids,after,after,limit+1)).fetchall()
        return {'items':output(rows[:limit]),'next_cursor':str(rows[limit-1]['mission_id']) if len(rows)>limit else None}

@router.get('/api/v1/missions/{mid}/workspace',response_model=reply.Workspace)
def workspace(mid:UUID,request:Request):
    with transaction(snapshot=True) as c:
        _,m=owned_mission(request,c,mid)
        revision=one(c,'SELECT s.*,r.conditions FROM drone.mission_spatial_revision s JOIN drone.mission_revision r USING(mission_id,revision) WHERE s.mission_id=%s AND s.revision=%s',(mid,m['draft_revision']))
        return {**snapshot_data(c,mid,m),'spatial_draft':output(revision),'presentation':output(one(c,'SELECT * FROM drone.mission_presentation WHERE mission_id=%s',(mid,)))}

@router.post('/api/v1/missions/{mid}/map-drafts',status_code=201,response_model=reply.SavedDraft)
def save_draft(mid:UUID,body:MapDraft,request:Request):
    if body.mission_type=='APPEARANCE_SEARCH' and body.conditions.appearance is None:fail('APPEARANCE_REQUIRED',422)
    data=body.model_dump(mode='json');data['mission_id']=str(mid);data['request_hash']=digest(data)
    try:
        with transaction(events=True) as c:
            c.execute("SET LOCAL statement_timeout='60s'")
            u,m=owned_mission(request,c,mid,'edit',True)
            result=one(c,'SELECT drone.school_save_draft(%s) AS value',(Jsonb(data),))['value']
            if not result['duplicate']:event(c,'MISSION_EDITED',mid,m['drone_id'],u['user_id'],{'revision':result['revision'],'release_id':body.release_id})
            return result
    except psycopg.errors.RaiseException as e:
        code=e.diag.message_primary
        if code not in {'ID_CONFLICT','REVISION_CONFLICT','MISSION_NOT_EDITABLE','INVALID_SELECTION','SPATIAL_RELEASE_NOT_FOUND','CONFIG_NOT_READY','RESOURCE_NOT_FOUND'}:raise
        fail(code,422 if code=='INVALID_SELECTION' else 404 if code.endswith('NOT_FOUND') else 409)

# Compatibility aliases keep existing map renderers; the old loopback-only
# handlers themselves are never mounted on the school server.
MAP_PREFIXES=('/api/map/','/api/city/','/api/environments')

def map_proxy(path,request):
    with transaction() as c:user(request,c)
    try:
        with service_client('map') as client:
            with client.stream('GET','/'+path,params=request.query_params) as r:
                if r.status_code>=400:
                    fail('SPATIAL_RESOURCE_NOT_FOUND' if r.status_code==404 else 'SPATIAL_QUERY_INVALID' if r.status_code==422 else 'MAP_UNAVAILABLE',r.status_code if r.status_code in (404,422) else 503)
                content=bytearray()
                for chunk in r.iter_bytes():
                    content.extend(chunk)
                    if len(content)>32*1024*1024:fail('MAP_RESPONSE_TOO_LARGE',503)
                headers={k:v for k,v in r.headers.items() if k in ('content-type','content-security-policy','x-frame-options','referrer-policy','x-map-provider')}
                headers.update({'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'})
                return Response(bytes(content),status_code=r.status_code,headers=headers)
    except httpx.HTTPError:fail('MAP_UNAVAILABLE',503)

def resource(rid,tail,request):
    if not re.fullmatch(r'[a-zA-Z0-9_-]{1,128}',rid):fail('RESOURCE_NOT_FOUND',404)
    return map_proxy('api/v1/spatial-releases/'+rid+'/'+tail,request)

@router.get('/api/v1/spatial-releases/{rid}/regions',response_model=reply.FeaturePage)
def regions(rid:str,request:Request,bounds:str|None=None,after:int=Query(0,ge=0),limit:int=Query(100,ge=1,le=200),geometry:bool=False):
    return resource(rid,'regions',request)

@router.get('/api/v1/spatial-releases/{rid}/cells',response_model=reply.FeaturePage)
def cells(rid:str,request:Request,bounds:str,after:int=Query(0,ge=0),limit:int=Query(200,ge=1,le=500)):
    return resource(rid,'cells',request)

@router.get('/api/v1/spatial-releases/{rid}/selection',response_model=reply.Selection)
def selection(rid:str,request:Request,bounds:str):return resource(rid,'selection',request)

@router.get('/api/v1/spatial-releases/{rid}/point',response_model=reply.PointResult)
def point(rid:str,request:Request,longitude:float=Query(ge=-180,le=180),latitude:float=Query(ge=-90,le=90)):
    return resource(rid,'point',request)

@router.get('/api/v1/spatial-releases/{rid}/tiles/{z}/{x}/{y}.png',response_class=Response,responses={200:{'content':{'image/png':{'schema':{'type':'string','format':'binary'}}}}})
def tile(rid:str,z:int,x:int,y:int,request:Request):return resource(rid,f'tiles/{z}/{x}/{y}.png',request)

@router.get('/api/v1/spatial-releases/{rid}',response_model=reply.SpatialRelease)
def spatial_release(rid:str,request:Request):
    with transaction() as c:
        user(request,c)
        row=one(c,'SELECT release_id,environment_id,world_version,grid_version,source_crs,content_hash,manifest FROM drone.spatial_release WHERE release_id=%s',(rid,))
        if not row:fail('RESOURCE_NOT_FOUND',404)
        return output(row)

@router.get('/api/map/{path:path}',include_in_schema=False)
def map_legacy(path:str,request:Request):return map_proxy('api/map/'+path,request)
@router.get('/api/city/{path:path}',include_in_schema=False)
def city_legacy(path:str,request:Request):return map_proxy('api/city/'+path,request)
@router.get('/api/environments',include_in_schema=False)
def environments(request:Request):return map_proxy('api/environments',request)
@router.get('/api/environments/{path:path}',include_in_schema=False)
def environment(path:str,request:Request):return map_proxy('api/environments/'+path,request)

from .test_patrol import router as test_patrol_router
router.include_router(test_patrol_router)
