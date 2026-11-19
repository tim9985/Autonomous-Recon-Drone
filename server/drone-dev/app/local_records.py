"""Owner-scoped summaries and recoverable deletion; raw evidence is never removed."""
from datetime import datetime
import math
import time
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Request
from pydantic import Field
from drone_backend.contracts import DTO
from drone_backend.core import fail
from .local_patrol_api import CONTROL, RUNS, TERMINAL, actor, locked, load, save

router = APIRouter(prefix='/api/v1/local-search/records')
Kind = Literal['mission', 'real-mission', 'case']
FOLDERS = {'mission': 'missions', 'real-mission': 'real-map-missions', 'case': 'search-cases'}



def record(kind, rid, who):
    path = CONTROL/FOLDERS[kind]/f'{UUID(str(rid))}.json'
    value = load(path, {})
    if not value or value.get('owner') != who:
        fail('RESOURCE_NOT_FOUND', 404)
    return value


def identity(kind, value):
    return value['case_id' if kind == 'case' else 'mission_id']


def matches_request(kind, value, req, who):
    if not req or req.get('requested_by') != who or kind == 'real-mission':
        return False
    rid = identity(kind, value)
    context = req.get('search_context') or {}
    if kind == 'case':
        return context.get('case_id') == rid or bool(req.get('job_id') and req['job_id'] == value.get('coverage_job_id'))
    plans = set(value.get('plan_ids', [])) | {value.get('plan_id')}
    return context.get('mission_id') == rid or (not context.get('mission_id') and req.get('plan_id') in plans-{None})


def jobs_for(kind, value, who):
    if kind == 'real-mission':
        return []
    rows = []
    for path in (CONTROL/'requests').glob('*.json'):
        req = load(path, {})
        if matches_request(kind, value, req, who):
            state = load(CONTROL/'states'/path.name, {})
            if state and state.get('job_id') == req.get('job_id') and state.get('run_id') == req.get('run_id'):
                rows.append(state)
    return sorted(rows, key=lambda r: r.get('created_at', 0), reverse=True)


def is_busy(kind, value, who):
    active = load(CONTROL/'active.json', {}).get('job_id')
    if active and matches_request(kind,value,load(CONTROL/'requests'/f'{active}.json',{}),who) and load(CONTROL/'states'/f'{active}.json',{}).get('state') not in TERMINAL:
        return True
    ids = set(value.get('plan_ids', [])) | {value.get('plan_id')}
    cid = load(CONTROL/'connection-active.json', {}).get('connection_id')
    connection = load(CONTROL/'connection-states'/f'{cid}.json', {}) if cid else {}
    if kind == 'mission' and connection.get('plan_id') in ids-{None} and connection.get('state') in ('QUEUED', 'CONNECTING', 'READY'):
        return True
    folder = 'real-map-plans' if kind == 'real-mission' else 'plans'
    for pid in filter(None,ids):
        plan=load(CONTROL/folder/f'{pid}.json', {})
        if plan.get('state') in ('QUEUED','RUNNING'):
            return True
        if kind=='mission' and plan.get('state')=='READY' and any(
                load(CONTROL/folder/f"{child['plan_id']}.json",{}).get('state') in ('QUEUED','RUNNING') for child in plan.get('tasks',[]) if child.get('plan_id')):
            return True
    return False


def listing(kind, value, who):
    return dict(kind=kind, id=identity(kind, value), title=value['title'], revision=value['revision'],
                created_at=value.get('created_at'), deleted_at=value.get('deleted_at'), updated_at=value.get('updated_at'),
                status=value.get('status'), busy=is_busy(kind, value, who),
                case_id=value.get('case_id') if kind != 'case' else None)


@router.get('')
def records(request: Request):
    who = actor(request)
    rows = [listing(kind, v, who) for kind, folder in FOLDERS.items()
            for p in (CONTROL/folder).glob('*.json') if (v := load(p, {})) and v.get('owner') == who]
    return dict(records=sorted(rows, key=lambda r: r.get('updated_at') or 0, reverse=True))


class Change(DTO):
    revision: int = Field(ge=1)


@router.post('/{kind}/{rid}/delete')
def delete_record(kind: Kind, rid: UUID, body: Change, request: Request):
    who = actor(request, 'edit')
    with locked():
        value = record(kind, rid, who)
        if value['revision'] != body.revision:
            fail('RECORD_CHANGED', 409)
        if value.get('deleted_at'):
            return listing(kind, value, who)
        if is_busy(kind, value, who):
            fail('RECORD_IN_USE', 409)
        linked = []
        if kind == 'case':
            linked = [v for p in (CONTROL/'missions').glob('*.json')
                      if (v := load(p, {})) and v.get('owner') == who and v.get('case_id') == str(rid)]
            if any(is_busy('mission', v, who) for v in linked):
                fail('RECORD_IN_USE', 409)
        stamp = time.time()
        detached=[]
        for mission in linked:
            mission.update(case_id=None, revision=mission['revision']+1,
                           route_revision=mission['route_revision']+1, plan_id=None, updated_at=stamp)
            save(CONTROL/'missions'/f"{mission['mission_id']}.json", mission)
            detached.append(dict(id=mission['mission_id'],route_revision=mission['route_revision']))
        if kind=='case':
            value['detached_missions']=detached
        value.update(deleted_at=stamp, deleted_by=who, revision=value['revision']+1, updated_at=stamp)
        value.setdefault('audit', []).append(dict(event='MOVED_TO_TRASH', at=stamp, by=who))
        save(CONTROL/FOLDERS[kind]/f'{rid}.json', value)
        return dict(listing(kind, value, who), detached_missions=len(linked))


@router.post('/{kind}/{rid}/restore')
def restore_record(kind: Kind, rid: UUID, body: Change, request: Request):
    who = actor(request, 'edit')
    with locked():
        value = record(kind, rid, who)
        if value['revision'] != body.revision:
            fail('RECORD_CHANGED', 409)
        reconnected=0
        if value.get('deleted_at'):
            value.pop('deleted_at', None)
            value.pop('deleted_by', None)
            for item in value.pop('detached_missions',[]) if kind=='case' else []:
                path=CONTROL/'missions'/f"{UUID(item['id'])}.json"
                mission=load(path,{})
                if (mission.get('owner')!=who or mission.get('case_id') or
                    mission.get('route_revision')!=item['route_revision'] or is_busy('mission',mission,who)):
                    continue
                mission.update(case_id=str(rid),plan_id=None,revision=mission['revision']+1,
                               route_revision=mission['route_revision']+1,updated_at=time.time())
                save(path,mission);reconnected+=1
            value.update(revision=value['revision']+1, updated_at=time.time())
            value.setdefault('audit', []).append(dict(event='RESTORED', at=value['updated_at'], by=who))
            save(CONTROL/FOLDERS[kind]/f'{rid}.json', value)
        return dict(listing(kind, value, who),reconnected_missions=reconnected)


def epoch(value):
    if isinstance(value, (int, float)):
        return float(value) if math.isfinite(value) else None
    try:
        return datetime.fromisoformat(value.replace('Z', '+00:00')).timestamp()
    except (TypeError, ValueError, AttributeError):
        return None


def compact_detection(row):
    estimate = row.get('sim_estimate') or {}
    point = estimate.get('position') or estimate.get('geographic') or estimate
    if isinstance(point, dict):
        point = [point.get('longitude', point.get('lon')), point.get('latitude', point.get('lat'))]
    if not (estimate.get('status') == 'ESTIMATED' and estimate.get('validation') == 'SIM_GEOMETRY_ONLY' and
            isinstance(point, (list, tuple)) and len(point) >= 2 and
            all(isinstance(v, (int, float)) and math.isfinite(v) for v in point[:2]) and
            -180 <= point[0] <= 180 and -90 <= point[1] <= 90):
        point = None
    return {k: row.get(k) for k in ('observation_id', 'candidate_id', 'track_id', 'capture_at', 'asset_id',
            'bbox', 'width', 'height', 'confidence', 'appearance', 'posture', 'geo_status')} | {
            'at': epoch(row.get('capture_at')), 'point': point[:2] if point else None}


def summary_data(kind, value, who, request, job_id=None):
    from .local_coverage import coverage
    from .local_mission_api import REGISTRY
    jobs = jobs_for(kind, value, who)
    job = next((j for j in jobs if j['job_id'] == str(job_id)), None) if job_id else next(iter(jobs), None)
    if job_id and not job:
        fail('RESOURCE_NOT_FOUND', 404)
    runs = [{k: j.get(k) for k in ('job_id', 'run_id', 'state', 'created_at', 'started_at', 'finished_at')} for j in jobs]
    pid = job.get('plan_id') if job else value.get('plan_id')
    plan = load(CONTROL/('real-map-plans' if kind == 'real-mission' else 'plans')/f'{pid}.json', {}) if pid else {}
    # Preserve the historic plan's geometry; do not silently substitute a new map revision.
    regions = []
    routes = []
    if kind == 'real-mission':
        routes = plan.get('route', {}).get('features', [])
    elif plan:
        tasks = plan.get('tasks', []) if plan.get('kind') == 'GLOBAL' else [plan]
        for task in tasks:
            child = load(CONTROL/'plans'/f"{task.get('plan_id')}.json", {})
            geometry = child.get('geometry')
            if geometry:
                regions.append(dict(type='Feature', geometry=geometry, properties=dict(
                    id=task.get('region_id'), name=task.get('name', child.get('name', '수색 구역')))))
            path = child.get('display_route', child.get('route', []))
            if len(path) >= 2:
                routes.append(dict(type='Feature', geometry=dict(type='LineString', coordinates=path), properties=dict(kind='search')))
    elif kind == 'mission':
        ids = set(value.get('region_ids', []))
        for package in load(REGISTRY,[]):
            if package.get('environment')=='SIM' and package.get('gridVersion')==value.get('zone_version'):
                for entry in package.get('semanticRegions',[]):
                    if entry['id'] in ids and entry['id'] in package.get('regions',{}):
                        regions.append(dict(type='Feature',geometry=package['regions'][entry['id']],properties=dict(id=entry['id'],name=entry['name'])))
                        ids.remove(entry['id'])
    if kind=='mission':
        order=plan.get('selection',{}).get('priority_order') or plan.get('order') or value.get('priority_order') or []
        if all(isinstance(z,str) for z in order):
            index={z:i for i,z in enumerate(order)}
            regions.sort(key=lambda f:index.get(f['properties']['id'],len(index)))
    job_view = {k: job.get(k) for k in ('job_id', 'run_id', 'state', 'created_at', 'started_at', 'finished_at',
                'region_timing', 'recorded_frames', 'returned_home', 'landed_disarmed', 'error')} if job else None
    result = dict(record=listing(kind, value, who), mode='REAL' if kind == 'real-mission' else 'SIM', runs=runs,
                  job=job_view, regions=dict(type='FeatureCollection', features=regions),
                  route=dict(type='FeatureCollection', features=routes), region_refs=value.get('regions', []),
                  release_id=value.get('release_id'), launch=value.get('launch'),
                  coverage=dict(features=[], regions=[], target_area_m2=0, state='NO_OBSERVATIONS'),
                  track=[], detections=[], detection_total=0, detection_state='NO_RUN', notices=[], actual=False)
    if not job:
        result['notices'].append('실행 기록이 없습니다. 저장된 구역과 예상 경로입니다.')
        return result
    result['actual'] = True
    try:
        result['coverage'] = coverage(job, CONTROL, RUNS)
    except (OSError, ValueError, KeyError, TypeError):
        result['notices'].append('관측 원장을 확인하지 못했습니다. 관측률은 추정하지 않습니다.')
    cov = result['coverage']
    cov['complete_scope'] = bool(cov.get('regions')) and all(r.get('target_area_m2', 0) > 0 for r in cov['regions'])
    if any(r.get('state')=='RETAINED' for r in cov.get('regions',[])):
        result['notices'].append('일부 구역은 마지막으로 확인한 관측 기록을 표시합니다.')
    if not cov['complete_scope']:
        result['notices'].append('일부 구역의 관측 기록이 없어 전체 관측률을 표시하지 않습니다.')
    track = load(CONTROL/'tracks'/f"{job['job_id']}.json", {})
    if track.get('run_id') == job.get('run_id'):
        for sample in track.get('samples', []):
            p = sample.get('data', {}).get('geographic', {})
            at = epoch(sample.get('captured_at'))
            if at is not None and all(isinstance(p.get(k), (int, float)) and math.isfinite(p[k]) for k in ('longitude', 'latitude')):
                result['track'].append(dict(at=at, point=[p['longitude'], p['latitude']], phase=sample.get('data', {}).get('phase')))
    result['detection_state']='NO_RECORDING'
    if job.get('registered'):
        from .postflight_api import status
        try:
            detections = status(UUID(job['run_id']), request, limit=5000)
            result['detections'] = [compact_detection(row) for row in detections['results']]
            result['detection_total'] = detections['results_total']
            result['detection_state']='AVAILABLE'
            if len(result['detections']) < result['detection_total']:
                result['notices'].append('탐지 기록은 최근 5,000건까지 표시합니다.')
        except Exception as exc:
            from fastapi import HTTPException
            if isinstance(exc, HTTPException) and exc.status_code in (401, 403):
                raise
            result['detection_state']='UNAVAILABLE'
            result['notices'].append('이번 실행의 탐지 결과를 확인하지 못했습니다.')
    return result


@router.get('/{kind}/{rid}/summary')
def summary(kind: Kind, rid: UUID, request: Request, job_id: UUID | None = None):
    who = actor(request)
    return summary_data(kind, record(kind, rid, who), who, request, job_id)
