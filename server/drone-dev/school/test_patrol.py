"""Selected-area Unreal runs for the explicit SIM patrol capability, never REAL dispatch."""
from datetime import timedelta
import json
from typing import Literal
from uuid import UUID, NAMESPACE_URL, uuid5

from fastapi import APIRouter, Request
from drone_backend.contracts import DTO
from drone_backend.core import transaction, user, authorize, one, output, fail, digest, now, add, event, STORAGE
from drone_backend.vision_runtime import loaded
from app.simulation_api import RunRequest, Stop, registered_workers, write
from .patrol_route import LAUNCH, WORLD_VERSION, BUILDING, building_bounds, road_block, plan, position

from app.guarded_sim_profile import bind_profile,profile,admit,serialize_sim

router = APIRouter()
WORKER = 'sim-worker-01'


class Patrol(DTO):
    run_id: UUID
    bounds: tuple[float, float, float, float]
    profile: Literal['LOCAL', 'CAMPUS_BUILDING', 'CAMPUS_ROAD_BLOCK'] = 'LOCAL'


def actor(request, connection, scope='read'):
    value = user(request, connection, scope)
    authorize(value, 'sim-pi-01', scope)
    if not any(p.get('drone_id') == 'sim-pi-01' and 'sim_patrol' in p.get('scopes', [])
               for p in value['permissions']):
        fail('TEST_SIM_ACCOUNT_REQUIRED', 403)
    return value


def own_run(connection, rid, account):
    row = one(connection, 'SELECT * FROM simulation.run WHERE run_id=%s', (rid,))
    if not row or row['creator_user_id'] != account['user_id'] or 'patrol' not in row['request']:
        fail('RESOURCE_NOT_FOUND', 404)
    return row


@router.get('/api/v1/simulations/patrol-config')
def config(request: Request):
    with transaction() as c:
        actor(request, c)
        configured = WORKER in {w['worker_id'] for w in registered_workers(c)}
    return {'environment': 'SIM', 'worker_id': WORKER, 'worker_registered': configured, 'capabilities':profile(WORKER),
            'launch': list(LAUNCH), 'world_version': WORLD_VERSION, 'altitude_m': 15,
            'speed_m_s': 1.5, 'lane_spacing_m': 5, 'max_offset_m': 100,
            'building': BUILDING | {'bounds': building_bounds()},
            'road_block': road_block(),
            'real_flight_enabled': False}


@router.post('/api/v1/simulations/patrols', status_code=201)
def create(body: Patrol, request: Request):
    with transaction(events=True) as c:
        account = actor(request, c, 'control')
        serialize_sim(c)
        try:
            points = plan(body.bounds, body.profile)
        except ValueError as exc:
            fail(str(exc), 422)
        validated = RunRequest(run_id=body.run_id, scenario='ROUTE', world='Kumoh',
                               worker_id=WORKER, waypoints=points, speed_m_s=1.5 if body.profile=='LOCAL' else 3, ttl_s=1800,
                               simulator_version='NET_SITL/UE5.5.4/Cosys5.5-v3.3')
        value = validated.model_dump(mode='json')
        value=bind_profile(WORKER,value)
        admit(c,WORKER,body.run_id,value)
        value['patrol'] = {'bounds': list(body.bounds), 'launch': list(LAUNCH),
                           'world_version': WORLD_VERSION, 'profile': body.profile, 'coverage_validated': False}
        if WORKER not in {w['worker_id'] for w in registered_workers(c)}:
            fail('SIM_WORKER_NOT_CONFIGURED', 503)
        # Serialize duplicate/overlapping starts; a queued request is never a flight success.
        c.execute('SELECT pg_advisory_xact_lock(20261017, 1)')
        previous = one(c, 'SELECT * FROM simulation.run WHERE run_id=%s', (body.run_id,))
        if previous:
            old = previous['request'].get('patrol', {})
            # Replays retain the originally selected model and route across deployments.
            if (previous['creator_user_id'] != account['user_id'] or old.get('bounds') != list(body.bounds)
                    or old.get('profile', 'LOCAL') != body.profile):
                fail('ID_CONFLICT')
            return output(previous)
        busy = one(c, "SELECT run_id FROM simulation.run WHERE worker_id=%s AND "
                   "(state='RUNNING' OR (state='QUEUED' AND expires_at>clock_timestamp())) LIMIT 1", (WORKER,))
        if busy:
            fail('SIM_WORKER_BUSY_OR_RECOVERY_REQUIRED')
        if not loaded(c):
            fail('MODEL_NOT_READY', 503)
        status = json.loads((STORAGE/'vision-status.json').read_text())
        model = one(c, "SELECT * FROM drone.config_version WHERE config_id=%s AND kind='MODEL' AND status='APPROVED'",
                    (status['model_config_id'],))
        if not model or model['payload'].get('environment')!='SIM' or not model['payload'].get('artifact_ready'):
            fail('MODEL_NOT_READY', 503)
        mid = uuid5(NAMESPACE_URL, 'unreal-patrol-mission/' + str(body.run_id))
        add(c, 'mission', {'mission_id':str(mid), 'drone_id':'sim-pi-01', 'creator_user_id':str(account['user_id']),
                          'state':'DRAFT', 'state_evidence':{}, 'readiness':{},
                          'test_conditions':{'environment':'SIM'}, 'grant_status':'DENIED'})
        event(c, 'MISSION_CREATED', mid, 'sim-pi-01', account['user_id'], {'source':'SIM_PATROL'})
        value['pipeline_config'] = {'mission_id':str(mid), 'model_config_id':str(model['config_id']),
                                    'camera_name':'0', 'interval_s':0.5, 'image_format':'JPEG'}
        return write(c, 'create', {'run_id': str(body.run_id), 'creator_user_id': str(account['user_id']),
                                  'worker_id': WORKER, 'request_hash': digest(value), 'request': value,
                                  'command_id': str(uuid5(NAMESPACE_URL, 'unreal-start/' + str(body.run_id))),
                                  'expires_at': (now() + timedelta(seconds=1800)).isoformat()})


@router.get('/api/v1/simulations/patrols')
def history(request: Request):
    with transaction() as c:
        account = actor(request, c)
        return output(c.execute("SELECT * FROM simulation.run WHERE creator_user_id=%s AND request ? 'patrol' "
                                "ORDER BY requested_at DESC LIMIT 20", (account['user_id'],)).fetchall())


@router.get('/api/v1/simulations/patrols/{rid}')
def state(rid: UUID, request: Request):
    with transaction() as c:
        account = actor(request, c)
        row = own_run(c, rid, account)
        # Keep each latest-row lookup bounded while sharing one database round trip.
        samples = {r['kind']: r for r in c.execute("""
            SELECT kinds.kind, latest.data, latest.captured_at
            FROM (VALUES ('TELEMETRY'), ('RUN_STATUS'), ('METRIC'), ('PIPELINE_EVENT')) AS kinds(kind)
            CROSS JOIN LATERAL (
                SELECT data,captured_at FROM simulation.sample
                WHERE run_id=%s AND kind=kinds.kind
                  AND (kinds.kind!='METRIC' OR data ? 'flight_result')
                  AND (kinds.kind!='PIPELINE_EVENT' OR data->>'stage'='ERROR')
                ORDER BY cursor DESC LIMIT 1
            ) AS latest
        """, (rid,)).fetchall()}
        sample, ending, evidence, error = (samples.get(kind) for kind in
                                          ('TELEMETRY', 'RUN_STATUS', 'METRIC', 'PIPELINE_EVENT'))
        route = [position(p['north_m'], p['east_m']) for p in row['request']['waypoints']]
        vision = vision_state(c, row)
        return {'run': output(row), 'telemetry': sample['data'] if sample else None,
                'telemetry_at': output(sample['captured_at']) if sample else None,
                'flight_result': evidence['data']['flight_result'] if evidence else None,
                'failure_reason': error['data'].get('reason') if error else None,
                'ending': ending['data'] if ending else None, 'route': route,
                'vision': vision, 'real_flight_enabled': False}


def vision_state(c, row):
    mid = row['request'].get('pipeline_config', {}).get('mission_id')
    if not mid:
        return None
    counts = one(c, "SELECT count(*) AS frames FROM drone.video_frame WHERE mission_id=%s", (mid,))
    events = c.execute("SELECT event_type,count(*) AS n FROM drone.mission_event WHERE mission_id=%s "
                       "AND event_type IN ('ANALYSIS_STARTED','ANALYSIS_COMPLETED','ANALYSIS_FAILED') GROUP BY event_type", (mid,)).fetchall()
    counts.update({r['event_type'].lower():r['n'] for r in events})
    candidates = c.execute("SELECT candidate_id,evidence_count,geo_status FROM drone.person_candidate "
                           "WHERE mission_id=%s ORDER BY evidence_count DESC,candidate_id LIMIT 20", (mid,)).fetchall()
    total = one(c, "SELECT count(*) AS candidates,coalesce(sum(evidence_count),0) AS observations "
                   "FROM drone.person_candidate WHERE mission_id=%s", (mid,))
    frame = one(c, "SELECT f.frame_id,f.width,f.height,f.capture_at FROM drone.video_frame f WHERE mission_id=%s "
                   "ORDER BY EXISTS(SELECT 1 FROM drone.detection_observation o WHERE o.frame_id=f.frame_id) DESC, "
                   "capture_at DESC LIMIT 1", (mid,))
    observations = c.execute("SELECT candidate_id,bbox,confidence,geo_result->>'status' AS geo_status "
                             "FROM drone.detection_observation WHERE frame_id=%s ORDER BY detection_index LIMIT 50",
                             (frame['frame_id'],)).fetchall() if frame else []
    return output({'mission_id':mid, **counts, **total, 'items':candidates, 'frame':frame, 'boxes':observations})


@router.get('/api/v1/simulations/patrols/{rid}/frames/{fid}/image')
def image(rid: UUID, fid: UUID, request: Request):
    from fastapi.responses import FileResponse
    from drone_backend.media import asset, verify_file
    with transaction() as c:
        row = own_run(c, rid, actor(request, c))
        mid = row['request'].get('pipeline_config', {}).get('mission_id')
        frame = one(c, 'SELECT time_evidence FROM drone.video_frame WHERE frame_id=%s AND mission_id=%s', (fid, mid))
        if not frame:
            fail('RESOURCE_NOT_FOUND', 404)
        item = asset(c, frame['time_evidence']['input_asset_id'])
        if item['state']!='STORED' or str(item['mission_id'])!=mid:
            fail('ASSET_NOT_READY')
        path = verify_file(item)
    return FileResponse(path, media_type='image/jpeg', headers={'Cache-Control':'private, no-store'})


@router.post('/api/v1/simulations/patrols/{rid}/stop', status_code=202)
def stop(rid: UUID, body: Stop, request: Request):
    with transaction() as c:
        own_run(c, rid, actor(request, c, 'control'))
        return write(c, 'stop', {'run_id': str(rid), 'command_id': str(body.command_id)})
