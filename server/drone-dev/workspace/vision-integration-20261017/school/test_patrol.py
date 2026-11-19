"""Selected-area Unreal runs for the explicit SIM patrol capability, never REAL dispatch."""
from datetime import timedelta
from uuid import UUID, NAMESPACE_URL, uuid5

from fastapi import APIRouter, Request
from drone_backend.contracts import DTO
from drone_backend.core import transaction, user, authorize, one, output, fail, digest, now
from app.simulation_api import RunRequest, Stop, registered_workers, write
from .patrol_route import LAUNCH, WORLD_VERSION, plan, position

router = APIRouter()
WORKER = 'sim-worker-01'


class Patrol(DTO):
    run_id: UUID
    bounds: tuple[float, float, float, float]


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
    return {'environment': 'SIM', 'worker_id': WORKER, 'worker_registered': configured,
            'launch': list(LAUNCH), 'world_version': WORLD_VERSION, 'altitude_m': 15,
            'speed_m_s': 1.5, 'lane_spacing_m': 5, 'max_offset_m': 100,
            'real_flight_enabled': False}


@router.post('/api/v1/simulations/patrols', status_code=201)
def create(body: Patrol, request: Request):
    try:
        points = plan(body.bounds)
    except ValueError as exc:
        fail(str(exc), 422)
    validated = RunRequest(run_id=body.run_id, scenario='ROUTE', world='Kumoh',
                           worker_id=WORKER, waypoints=points, speed_m_s=1.5, ttl_s=1800,
                           simulator_version='NET_SITL/UE5.5.4/Cosys5.5-v3.3')
    value = validated.model_dump(mode='json')
    value['patrol'] = {'bounds': list(body.bounds), 'launch': list(LAUNCH),
                       'world_version': WORLD_VERSION, 'coverage_validated': False}
    with transaction() as c:
        account = actor(request, c, 'control')
        if WORKER not in {w['worker_id'] for w in registered_workers(c)}:
            fail('SIM_WORKER_NOT_CONFIGURED', 503)
        # Serialize duplicate/overlapping starts; a queued request is never a flight success.
        c.execute('SELECT pg_advisory_xact_lock(20261017, 1)')
        previous = one(c, 'SELECT * FROM simulation.run WHERE run_id=%s', (body.run_id,))
        if previous:
            if previous['request_hash'] != digest(value) or previous['creator_user_id'] != account['user_id']:
                fail('ID_CONFLICT')
            return output(previous)
        busy = one(c, "SELECT run_id FROM simulation.run WHERE worker_id=%s AND "
                   "(state='RUNNING' OR (state='QUEUED' AND expires_at>clock_timestamp())) LIMIT 1", (WORKER,))
        if busy:
            fail('SIM_WORKER_BUSY_OR_RECOVERY_REQUIRED')
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
        sample = one(c, "SELECT data,captured_at FROM simulation.sample WHERE run_id=%s AND kind='TELEMETRY' "
                     "ORDER BY cursor DESC LIMIT 1", (rid,))
        ending = one(c, "SELECT data FROM simulation.sample WHERE run_id=%s AND kind='RUN_STATUS' "
                     "ORDER BY cursor DESC LIMIT 1", (rid,))
        evidence = one(c, "SELECT data FROM simulation.sample WHERE run_id=%s AND kind='METRIC' AND data ? 'flight_result' "
                       "ORDER BY cursor DESC LIMIT 1", (rid,))
        error = one(c, "SELECT data FROM simulation.sample WHERE run_id=%s AND kind='PIPELINE_EVENT' AND data->>'stage'='ERROR' "
                    "ORDER BY cursor DESC LIMIT 1", (rid,))
        route = [position(p['north_m'], p['east_m']) for p in row['request']['waypoints']]
        return {'run': output(row), 'telemetry': sample['data'] if sample else None,
                'telemetry_at': output(sample['captured_at']) if sample else None,
                'flight_result': evidence['data']['flight_result'] if evidence else None,
                'failure_reason': error['data'].get('reason') if error else None,
                'ending': ending['data'] if ending else None, 'route': route,
                'real_flight_enabled': False}


@router.post('/api/v1/simulations/patrols/{rid}/stop', status_code=202)
def stop(rid: UUID, body: Stop, request: Request):
    with transaction() as c:
        own_run(c, rid, actor(request, c, 'control'))
        return write(c, 'stop', {'run_id': str(rid), 'command_id': str(body.command_id)})
