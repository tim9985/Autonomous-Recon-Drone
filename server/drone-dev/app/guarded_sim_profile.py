"""Additive SIM admission policy; no schema migration or REAL activation."""
import json
from pathlib import Path
from drone_backend.core import one,fail

PROFILE='SCHOOL_FC_GUARDED_V1'
CONFIG=Path(__file__).with_name('school-fc-profile.json')


def profile(worker):
    if not CONFIG.exists():return None
    cfg=json.loads(CONFIG.read_text())
    if cfg.get('schema')!=1 or type(cfg.get('enabled')) is not bool:raise ValueError('Invalid school FC profile configuration')
    if not cfg['enabled'] or worker not in cfg['workers']:return None
    return {'execution_profile':PROFILE,'world':'Kumoh','scenarios':['ROUTE','CAPTURE'],
            'altitude_min_m':3,'altitude_max_m':25,'speed_min_m_s':.5,'speed_max_m_s':3,
            'vision_safety_required_when_configured':True,'camera_name':'0','real_enabled':False}


def bind_profile(worker,value):
    result=dict(value);requested=result.pop('execution_profile',None);p=profile(worker)
    if p is None:
        if requested is not None:fail('GUARDED_WORKER_NOT_CONFIGURED',422)
        return result
    if requested not in (None,PROFILE):fail('WORKER_PROFILE_MISMATCH',422)
    if result.get('environment')!='SIM' or result.get('world')!='Kumoh' or result.get('seed')!='0':
        fail('WORKER_CAPABILITY_MISMATCH',422)
    if any(not 3<=w['altitude_m']<=25 for w in result.get('waypoints',[])):
        fail('WORKER_CAPABILITY_ALTITUDE_MAX_25',422)
    if result.get('pipeline_config',{}).get('camera_name','0')!='0':fail('WORKER_CAMERA_UNSUPPORTED',422)
    result['execution_profile']=PROFILE
    return result


def serialize_sim(c):c.execute('SELECT pg_advisory_xact_lock(20261029,41451)')


def admit(c,worker,rid,value):
    serialize_sim(c)
    if one(c,'SELECT run_id FROM simulation.run WHERE run_id=%s',(rid,)):return
    guarded=value.get('execution_profile')==PROFILE
    existing=one(c,"SELECT run_id FROM simulation.run WHERE (state='RUNNING' OR (state='QUEUED' AND expires_at>clock_timestamp())) AND drone.school_flight_domain(worker_id)=drone.school_flight_domain(%s) AND (%s OR request->>'execution_profile'=%s OR worker_id=%s AND worker_id LIKE 'school-pc-%%') LIMIT 1",(worker,guarded,PROFILE,worker))
    if existing:fail('SIM_WORKER_BUSY_OR_RECOVERY_REQUIRED')
    if guarded:
        if one(c,"SELECT execution_id FROM drone.regional_execution WHERE drone.school_flight_domain(worker_id)=drone.school_flight_domain(%s) AND state IN ('QUEUED','RUNNING','STOP_REQUESTED','UNCONFIRMED') LIMIT 1",(worker,)):
            fail('REGIONAL_EXECUTOR_BUSY')
        if one(c,"SELECT drone_id FROM drone.drone WHERE drone_id='sim-pi-01' AND control_expires_at>clock_timestamp()"):
            fail('MANUAL_CONTROL_OWNED')
