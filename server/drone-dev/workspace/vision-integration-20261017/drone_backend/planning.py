from . import responses as out
"""SIM manual plan/region registration; no speculative autonomous planner or belief model."""
from uuid import UUID
from fastapi import APIRouter,Request
from . import contracts as dto
from .core import *

router=APIRouter()

@router.get('/api/v1/configs',response_model=list[out.Config])
def configs(request:Request):
    with transaction() as c:
        user(request,c)
        return output(c.execute('SELECT config_id,kind,version,status,payload,content_hash FROM drone.config_version ORDER BY kind,version LIMIT 100').fetchall())

def revision(c,mid,rev):
    row=one(c,'SELECT * FROM drone.mission_revision WHERE mission_id=%s AND revision=%s',(mid,rev))
    if not row: fail('RESOURCE_NOT_FOUND',404)
    return row

def geometry(c,g,area):
    result=one(c,"WITH shape AS (SELECT ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(%s),4326)) AS g) SELECT ST_AsGeoJSON(g)::jsonb AS geometry, ST_AsGeoJSON(ST_PointOnSurface(g))::jsonb AS center,ST_Area(g::geography) AS area,ST_CoveredBy(g,%s::geometry) AND ST_IsValid(g) AND NOT ST_IsEmpty(g) AS covered FROM shape",(canonical(g),area))
    if not result['covered'] or result['area']<=0: fail('INVALID_GEOMETRY',422)
    return result

@router.post('/api/v1/missions/{mid}/regions',status_code=201,response_model=out.SearchRegion)
def region(mid:UUID,body:dto.Region,request:Request):
    with transaction(events=True) as c:
        u,m=owned_mission(request,c,mid,'edit')
        r=revision(c,mid,body.mission_revision);g=geometry(c,body.geometry,r['area_geom'])
        data={'region_id':str(body.region_id),'mission_id':str(mid),'mission_revision':body.mission_revision,'grid_version':r['grid_version'],
          'region_type':'SIM_MANUAL','source_features':{'environment':'SIM','request_hash':digest(body.model_dump(mode='json'))},'region_geom':g['geometry'],'representative_point':g['center'],
          'total_area_m2':g['area'],'remaining_area_m2':g['area'],'state':'DRAFT'}
        previous=one(c,'SELECT * FROM drone.search_region WHERE region_id=%s',(body.region_id,))
        if previous:
            if previous['source_features'].get('request_hash')!=data['source_features']['request_hash'] or previous['mission_id']!=mid: fail('ID_CONFLICT')
            return output(previous)
        value=add(c,'search_region',data)
        event(c,'REGION_REGISTERED',mid,m['drone_id'],u['user_id'],{'region_id':str(body.region_id)})
        return value

@router.get('/api/v1/missions/{mid}/regions',response_model=list[out.SearchRegion])
def regions(mid:UUID,request:Request):
    with transaction() as c:
        owned_mission(request,c,mid)
        return output([r['value'] for r in c.execute("SELECT to_jsonb(r)-'region_geom'-'representative_point'||jsonb_build_object('region_geom',ST_AsGeoJSON(region_geom)::jsonb,'representative_point',ST_AsGeoJSON(representative_point)::jsonb) AS value FROM drone.search_region r WHERE mission_id=%s ORDER BY region_id LIMIT 1000",(mid,))])

@router.post('/api/v1/missions/{mid}/plans',status_code=201,response_model=out.SearchPlan)
def plan(mid:UUID,body:dto.Plan,request:Request):
    with transaction(events=True) as c:
        u,m=owned_mission(request,c,mid,'edit');r=revision(c,mid,body.mission_revision)
        rg=one(c,'SELECT * FROM drone.search_region WHERE region_id=%s',(body.region_id,))
        if not rg or rg['mission_id']!=mid or rg['mission_revision']!=body.mission_revision: fail('RESOURCE_NOT_FOUND',404)
        h=digest(body.model_dump(mode='json'))
        old=one(c,'SELECT * FROM drone.search_plan WHERE plan_id=%s',(body.plan_id,))
        if old:
            if old['mission_id']!=mid or old['input_versions'].get('request_hash')!=h: fail('ID_CONFLICT')
            return output(old)
        seq=one(c,'SELECT coalesce(max(plan_version),0)+1 AS n FROM drone.search_plan WHERE mission_id=%s',(mid,))['n']
        value=add(c,'search_plan',{'plan_id':str(body.plan_id),'mission_id':str(mid),'mission_revision':body.mission_revision,
           'plan_version':seq,'plan_kind':'SIM_MANUAL','region_id':str(body.region_id),'input_versions':{'environment':'SIM','request_hash':h},
           'objective_mode':'MANUAL_SIM','task':{},'route':body.route,'status':'DRAFT','summary':{},'decision_log':{'real_executable':False}})
        event(c,'PLAN_REGISTERED',mid,m['drone_id'],u['user_id'],{'plan_id':str(body.plan_id)})
        return value

@router.get('/api/v1/missions/{mid}/plans',response_model=list[out.SearchPlan])
def plans(mid:UUID,request:Request):
    with transaction() as c:
        owned_mission(request,c,mid)
        return output(c.execute('SELECT * FROM drone.search_plan WHERE mission_id=%s ORDER BY plan_version LIMIT 1000',(mid,)).fetchall())

@router.post('/api/v1/missions/{mid}/observation-cells',status_code=201,response_model=out.ObservationCell)
def register_cell(mid:UUID,body:dto.Cell,request:Request):
    with transaction(events=True) as c:
        u,m=owned_mission(request,c,mid,'edit');r=revision(c,mid,body.mission_revision)
        rg=one(c,'SELECT * FROM drone.search_region WHERE region_id=%s',(body.region_id,))
        if not rg or rg['mission_id']!=mid or rg['mission_revision']!=body.mission_revision: fail('RESOURCE_NOT_FOUND',404)
        g=geometry(c,body.geometry,rg['region_geom'])
        h=digest(body.model_dump(mode='json'))
        old=one(c,'SELECT * FROM drone.observation_cell WHERE mission_id=%s AND grid_version=%s AND cell_id=%s',(mid,r['grid_version'],body.cell_id))
        if old:
            if old['belief_detail'].get('request_hash')!=h: fail('ID_CONFLICT')
            return output(old)
        value=add(c,'observation_cell',{'mission_id':str(mid),'grid_version':r['grid_version'],'cell_id':body.cell_id,
          'region_id':str(body.region_id),'spatial_config_id':str(r['spatial_config_id']),'cell_geom':g['geometry'],
          'cell_area_m2':g['area'],'state':'UNOBSERVED','priority':0,'belief':0,
          'belief_detail':{'environment':'SIM','calibrated':False,'request_hash':h,'reason':'REAL_POSE_AND_OBSERVATION_POLICY_NOT_READY'}})
        event(c,'CELL_REGISTERED',mid,m['drone_id'],u['user_id'],{'cell_id':body.cell_id})
        return value
