"""REAL path verification only. Tasks never authorize flight or transmit to an FC."""
from datetime import timedelta
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Request
from pydantic import Field
from psycopg.types.json import Jsonb

from .contracts import DTO
from .core import authorize, device, fail, now, one, output, owned_mission, transaction, user

router = APIRouter()
Mode = Literal['MOCK', 'FC_OBSERVE']
FRESH = timedelta(seconds=20)
TTL = timedelta(seconds=30)


class Waypoint(DTO):
    latitude: float = Field(ge=-90, le=90, allow_inf_nan=False)
    longitude: float = Field(ge=-180, le=180, allow_inf_nan=False)
    relative_altitude_m: float = Field(gt=0, le=120, allow_inf_nan=False)


class BenchRequest(DTO):
    job_id: UUID
    waypoint: Waypoint


class Poll(DTO):
    session_id: UUID
    mode: Mode


class Report(Poll):
    result: Literal['MOCK_RECEIVED', 'FC_HEARTBEAT_OBSERVED', 'FC_HEARTBEAT_MISSING']
    system_id: int | None = Field(default=None, ge=1, le=255)


def same_session(drone, sid):
    if drone['gateway_state'].get('session_id') != str(sid):
        fail('OLD_DEVICE_SESSION')


def fresh(c, drone):
    gateway = one(c, 'SELECT * FROM drone.real_bench_gateway WHERE drone_id=%s', (drone['drone_id'],))
    return gateway if gateway and str(gateway['session_id']) == drone['gateway_state'].get('session_id') and now() - gateway['seen_at'] <= FRESH else None


def view(job):
    state = 'REPORTED' if job['result'] is not None else 'EXPIRED' if job['expires_at'] <= now() else 'WAITING'
    return output({k: job[k] for k in ('job_id','mission_id','drone_id','mode','waypoint','expires_at','result','reported_at')} | {'state': state, 'flight_enabled': False})


@router.get('/api/v1/drones/{did}/bench')
def bench_status(did: str, request: Request):
    with transaction() as c:
        actor = user(request, c); authorize(actor, did)
        drone = one(c, 'SELECT * FROM drone.drone WHERE drone_id=%s', (did,))
        if not drone:
            fail('RESOURCE_NOT_FOUND', 404)
        gateway = fresh(c, drone)
        return {'connected': bool(gateway), 'mode': gateway['mode'] if gateway else None, 'flight_enabled': False}


@router.post('/api/v1/missions/{mid}/bench', status_code=202)
def submit(mid: UUID, body: BenchRequest, request: Request):
    with transaction(events=True) as c:
        actor, mission = owned_mission(request, c, mid, 'control')
        if mission['test_conditions'].get('environment') != 'REAL':
            fail('ENVIRONMENT_MISMATCH')
        did = mission['drone_id']
        waypoint = body.waypoint.model_dump(mode='json')
        old = one(c, 'SELECT * FROM drone.real_bench_job WHERE job_id=%s', (body.job_id,))
        if old:
            if (old['mission_id'],old['requested_by'],old['waypoint']) != (mid,actor['user_id'],waypoint):
                fail('ID_CONFLICT')
            return view(old)
        drone = one(c, 'SELECT * FROM drone.drone WHERE drone_id=%s', (did,))
        gateway = fresh(c, drone)
        if not gateway:
            fail('BENCH_GATEWAY_OFFLINE')
        busy = one(c, 'SELECT job_id FROM drone.real_bench_job WHERE drone_id=%s AND session_id=%s AND result IS NULL AND expires_at>now()', (did,gateway['session_id']))
        if busy:
            fail('BENCH_JOB_PENDING')
        row = one(c, '''INSERT INTO drone.real_bench_job(job_id,mission_id,drone_id,session_id,requested_by,mode,waypoint,expires_at)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *''',
                  (body.job_id,mid,did,gateway['session_id'],actor['user_id'],gateway['mode'],Jsonb(waypoint),now()+TTL))
        return view(row)


@router.get('/api/v1/missions/{mid}/bench/{jid}')
def status(mid: UUID, jid: UUID, request: Request):
    with transaction() as c:
        owned_mission(request,c,mid)
        row = one(c,'SELECT * FROM drone.real_bench_job WHERE job_id=%s AND mission_id=%s',(jid,mid))
        if not row:
            fail('RESOURCE_NOT_FOUND',404)
        return view(row)


@router.post('/device/v1/bench/poll')
def poll(body: Poll, request: Request):
    with transaction(events=True) as c:
        _, drone = device(request,c)
        same_session(drone,body.session_id)
        did=drone['drone_id']
        c.execute('''INSERT INTO drone.real_bench_gateway(drone_id,session_id,mode,seen_at) VALUES (%s,%s,%s,now())
                     ON CONFLICT (drone_id) DO UPDATE SET session_id=excluded.session_id,mode=excluded.mode,seen_at=excluded.seen_at''',
                  (did,body.session_id,body.mode))
        row = one(c, '''SELECT * FROM drone.real_bench_job WHERE drone_id=%s AND session_id=%s AND mode=%s
                        AND result IS NULL AND expires_at>now() ORDER BY expires_at LIMIT 1''',(did,body.session_id,body.mode))
        return {'job':view(row) if row else None,'flight_enabled':False}


@router.post('/device/v1/bench/{jid}/result')
def report(jid: UUID, body: Report, request: Request):
    with transaction(events=True) as c:
        _, drone = device(request,c)
        same_session(drone,body.session_id)
        row = one(c,'SELECT * FROM drone.real_bench_job WHERE job_id=%s AND drone_id=%s',(jid,drone['drone_id']))
        if not row:
            fail('RESOURCE_NOT_FOUND',404)
        if row['session_id'] != body.session_id or row['mode'] != body.mode:
            fail('BENCH_JOB_CONTEXT_CHANGED')
        mock = body.result == 'MOCK_RECEIVED'
        observed = body.result == 'FC_HEARTBEAT_OBSERVED'
        if mock != (body.mode == 'MOCK') or observed != (body.system_id is not None):
            fail('INVALID_BENCH_RESULT',422)
        value = {'code':body.result,'system_id':body.system_id,'mavlink_sent':False}
        if row['result'] is not None:
            if row['result'] != value:
                fail('ID_CONFLICT')
            return view(row)
        if row['expires_at'] <= now():
            fail('BENCH_JOB_EXPIRED')
        row = one(c,'UPDATE drone.real_bench_job SET result=%s,reported_at=now() WHERE job_id=%s RETURNING *',(Jsonb(value),jid))
        return view(row)
