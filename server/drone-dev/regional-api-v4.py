"""Authenticated async plan jobs; the numerical worker has no DB credentials."""
import hashlib
import json
import math
import os
from pathlib import Path
import time
import psycopg
from uuid import UUID, uuid5, NAMESPACE_URL
from typing import Literal
from fastapi import APIRouter, Request
from pydantic import Field
from drone_backend.contracts import DTO
from drone_backend.core import transaction, owned_mission, one, output, fail, digest, canonical, Jsonb, event

router = APIRouter()
ROOT = Path(os.getenv('REGIONAL_SEARCH_QUEUE', '/data/regional-search'))
REGISTRY = Path(os.getenv('REGIONAL_SEARCH_REGISTRY', '/data/regional-search/packages.json'))


def write_job(c, action, value):
    try:
        return one(c, 'SELECT drone.regional_search_write(%s,%s) AS value', (action, Jsonb(value)))['value']
    except psycopg.errors.RaiseException as exc:
        code = exc.diag.message_primary
        if code not in ('ID_CONFLICT','REVISION_CONFLICT','RESOURCE_NOT_FOUND','INVALID_RESULT'):
            raise
        fail(code, 404 if code == 'RESOURCE_NOT_FOUND' else 409)


class Prepare(DTO):
    job_id: UUID
    mission_revision: int = Field(ge=1)
    region_id: UUID
    entry_ned: tuple[float, float, float] | None = None
    entry_yaw_deg: float = Field(default=0, ge=-180, le=360)
    policy_profile: Literal['RESEARCH_FUSED_CANDIDATE_95_V1'] = 'RESEARCH_FUSED_CANDIDATE_95_V1'


def package_for(grid):
    if not REGISTRY.is_file():
        fail('REGIONAL_SEARCH_NOT_CONFIGURED', 503)
    entries = json.loads(REGISTRY.read_text())
    choices = [r for r in entries if r['gridVersion'] == grid and r['environment'] == 'SIM']
    if len(choices) != 1:
        fail('REGIONAL_SEARCH_INPUT_NOT_REGISTERED', 409)
    return choices[0]


def atomic(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    from uuid import uuid4
    tmp = path.with_suffix('.'+str(uuid4())+'.tmp')
    tmp.write_text(canonical(value), encoding='utf-8')
    tmp.replace(path)


def publish(job):
    if job['state'] not in ('QUEUED', 'RUNNING'):
        return
    target = ROOT/'requests'/(str(job['job_id'])+'.json')
    if not target.exists():
        atomic(target, dict(jobId=str(job['job_id']), requestHash=job['request_hash'], request=job['request']))


def reconcile(c, job):
    path = ROOT/'results'/(str(job['job_id'])+'.json')
    if job['result_hash'] is not None or not path.is_file():
        return job
    if path.stat().st_size > 32*1024*1024:
        fail('REGIONAL_RESULT_TOO_LARGE', 503)
    envelope = json.loads(path.read_text(encoding='utf-8'))
    result = envelope['result']
    if (envelope['requestHash'] != job['request_hash'] or result['packageId'] != job['package_id']
            or result.get('regionId') != job['request']['regionId']
            or not result.get('predictedOnly') or result.get('actualEvidenceWrites') != 0
            or result.get('realExecutable') is not False):
        fail('REGIONAL_RESULT_BINDING_MISMATCH', 409)
    content_hash = digest(result)
    if envelope['resultHash'] != content_hash:
        fail('REGIONAL_RESULT_HASH_MISMATCH', 409)
    pid = str(uuid5(NAMESPACE_URL, 'regional-search/'+str(job['job_id'])))
    updated = write_job(c, 'finish', dict(
        job_id=str(job['job_id']), request_hash=job['request_hash'], result_hash=content_hash,
        result=result, plan_id=pid))
    if updated.get('plan_id'):
        event(c, 'PLAN_REGISTERED', job['mission_id'], actor=job['creator_user_id'],
              payload={'plan_id':updated['plan_id'], 'job_id':str(job['job_id']), 'predicted_only':True})
    return updated


@router.post('/api/v1/missions/{mid}/regional-search', status_code=202)
def prepare(mid: UUID, body: Prepare, request: Request):
    with transaction(events=True) as c:
        actor, mission = owned_mission(request, c, mid, 'edit')
        if mission['test_conditions'].get('environment') != 'SIM':
            fail('REAL_FLIGHT_DISABLED', 409)
        region = one(c, 'SELECT * FROM drone.search_region WHERE region_id=%s AND mission_id=%s', (body.region_id, mid))
        if not region or region['mission_revision'] != body.mission_revision:
            fail('REGION_REVISION_MISMATCH', 409)
        package = package_for(region['grid_version'])
        revision = one(c, 'SELECT r.world_version,r.release_id FROM drone.mission_spatial_revision s JOIN drone.spatial_release r USING(release_id) WHERE s.mission_id=%s AND s.revision=%s', (mid,body.mission_revision))
        if not revision or revision['world_version'] != package['worldVersion'] or revision['release_id'] != package['sourceSpatialRelease']:
            fail('REGIONAL_SEARCH_INPUT_NOT_REGISTERED', 409)
        conditions = one(c, 'SELECT conditions FROM drone.mission_revision WHERE mission_id=%s AND revision=%s', (mid,body.mission_revision))['conditions']
        # The old manual UI has different defaults. Never silently use them as
        # if they were this verified regional profile. observation_seconds is
        # waypoint dwell; the one-second multi-frame gate is a separate policy.
        expected_conditions = package.get('missionConditions')
        if not expected_conditions or any(conditions.get(k) != v for k,v in expected_conditions.items()):
            fail('REGIONAL_SEARCH_CONDITIONS_MISMATCH', 409)
        source_id = region['source_features'].get('source_id')
        if not source_id:
            fail('REGISTERED_SEMANTIC_REGION_REQUIRED', 422)
        expected = package['regions'].get(source_id)
        if not expected:
            fail('REGIONAL_SEARCH_REGION_NOT_REGISTERED', 422)
        same = one(c, 'SELECT ST_Equals(region_geom,ST_SetSRID(ST_GeomFromGeoJSON(%s),4326)) AS same FROM drone.search_region WHERE region_id=%s', (canonical(expected),body.region_id))
        if not same['same']:
            fail('REGIONAL_SEARCH_REGION_CHANGED', 409)
        data = dict(packageId=package['packageId'], regionId=source_id, entryNed=body.entry_ned,
            entryYawDeg=body.entry_yaw_deg, policy=body.policy_profile)
        meaning = dict(mission_id=str(mid), mission_revision=body.mission_revision, region_id=str(body.region_id), request=data)
        row = write_job(c, 'create', dict(
            **meaning, job_id=str(body.job_id), creator_user_id=str(actor['user_id']),
            request_hash=digest(meaning), package_id=package['packageId']))
    publish(row)  # after DB commit: a GET can republish after an interrupted write
    return output(row)


@router.get('/api/v1/missions/{mid}/regional-search/{jid}')
def status(mid: UUID, jid: UUID, request: Request):
    with transaction(events=True) as c:
        owned_mission(request, c, mid)
        row = one(c, 'SELECT * FROM drone.regional_search_job WHERE job_id=%s AND mission_id=%s', (jid, mid))
        if not row:
            fail('RESOURCE_NOT_FOUND', 404)
        row = reconcile(c, row)
    publish(row)
    return output(row)


@router.get('/api/v1/missions/{mid}/regional-search/{jid}/readiness')
def readiness(mid: UUID, jid: UUID, request: Request):
    """Report the actual integration boundary without issuing a flight command."""
    from .sim_link import link_fresh
    with transaction(events=True) as c:
        _, mission = owned_mission(request, c, mid)
        job = one(c, 'SELECT * FROM drone.regional_search_job WHERE job_id=%s AND mission_id=%s', (jid,mid))
        if not job:
            fail('RESOURCE_NOT_FOUND', 404)
        job = reconcile(c, job)
        drone = one(c, 'SELECT gateway_state FROM drone.drone WHERE drone_id=%s', (mission['drone_id'],))
        reasons = []
        if job['state'] != 'READY':
            reasons.append('REGIONAL_PLAN_NOT_READY')
        if mission['draft_revision'] != job['mission_revision']:
            reasons.append('REVISION_CONFLICT')
        active = json.loads(REGISTRY.read_text())
        if not any(x['packageId']==job['package_id'] and x['environment']=='SIM' for x in active):
            reasons.append('REGIONAL_SEARCH_INPUT_CHANGED')
        if not link_fresh(drone['gateway_state']):
            reasons.append('SIM_LINK_NOT_FRESH')
        # Current deployed simulator only implements legacy CAPTURE/ROUTE.
        # Never silently down-convert independent yaw and curved phases.
        reasons.append('SIM_BODY_YAW_EXECUTOR_NOT_INTEGRATED')
        return dict(jobId=str(jid), planId=job['plan_id'], planningReady=job['state']=='READY',
                    executable=False, reasons=reasons, executionProfile='SIM_BODY_YAW_PHASES_V1',
                    actualCoverageConnected=False, realExecutable=False, commandsIssued=0)
