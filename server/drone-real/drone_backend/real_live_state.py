"""Authenticated rolling FC status for REAL observation without mission writes."""
import hashlib
import json
from uuid import UUID, uuid4

from fastapi import APIRouter, Request
from pydantic import AwareDatetime, Field, model_validator

from .contracts import DTO
from .core import STORAGE, device, fail, now, transaction

router = APIRouter()
FRESH_SECONDS = 8


class Position(DTO):
    lat: float = Field(ge=-90, le=90, allow_inf_nan=False)
    lon: float = Field(ge=-180, le=180, allow_inf_nan=False)
    relative_altitude_m: float | None = Field(default=None, ge=-500, le=10000, allow_inf_nan=False)


class LiveState(DTO):
    sample_id: UUID
    producer_session_id: UUID
    observed_at: AwareDatetime
    armed: bool
    custom_mode: int = Field(ge=0, le=4294967295)
    battery_voltage_v: float | None = Field(default=None, ge=0, le=100, allow_inf_nan=False)
    battery_remaining_percent: int | None = Field(default=None, ge=0, le=100)
    gps_fix_type: int | None = Field(default=None, ge=0, le=8)
    satellites_visible: int | None = Field(default=None, ge=0, le=254)
    position: Position | None = None

    @model_validator(mode='after')
    def position_requires_fix(self):
        if self.position and not (self.gps_fix_type is not None and self.gps_fix_type >= 3
                                  and self.satellites_visible is not None and self.satellites_visible > 0):
            raise ValueError('Position requires a fresh 3D GPS fix')
        return self


def file_for(drone_id):
    return STORAGE/'real-live-state'/(hashlib.sha256(drone_id.encode()).hexdigest()+'.json')


def load_for(drone):
    try:
        row = json.loads(file_for(drone['drone_id']).read_text(encoding='utf-8'))
    except FileNotFoundError:
        return None
    return row if row['producer_session_id'] == drone['gateway_state'].get('session_id') else None


def read_live(drone, received_now=None):
    from datetime import datetime

    when = received_now or now()
    row = load_for(drone)
    if not row:
        return {'state':'WAITING','sample':None,'stale_after_seconds':FRESH_SECONDS}
    age = max((when-datetime.fromisoformat(row[key])).total_seconds()
              for key in ('received_at','observed_at'))
    return {'state':'LIVE' if -2 <= age < FRESH_SECONDS else 'STALE',
            'sample':row,'stale_after_seconds':FRESH_SECONDS,'age_seconds':max(0,age)}


@router.post('/device/v1/live-state')
def write_live(body: LiveState, request: Request):
    from datetime import datetime

    with transaction(events=True) as connection:
        _, drone = device(request, connection)
        if drone['gateway_state'].get('session_id') != str(body.producer_session_id):
            fail('OLD_DEVICE_SESSION')
        received = now()
        age = (received-body.observed_at).total_seconds()
        if not -2 <= age < FRESH_SECONDS:
            fail('STATE_TIMESTAMP_OUT_OF_WINDOW',422)
        old = load_for(drone)
        if old and body.observed_at <= datetime.fromisoformat(old['observed_at']):
            fail('STATE_OUT_OF_ORDER')
        row = body.model_dump(mode='json') | {'received_at':received.isoformat(),'source':'REAL_FC_PASSIVE'}
        path = file_for(drone['drone_id'])
        path.parent.mkdir(mode=0o700,exist_ok=True)
        temporary = path.with_name('.'+uuid4().hex+'.tmp')
        try:
            temporary.write_text(json.dumps(row,allow_nan=False,separators=(',',':')),encoding='utf-8')
            temporary.chmod(0o600)
            temporary.replace(path)
        finally:
            temporary.unlink(missing_ok=True)
        return {'stored':True,'sample_id':str(body.sample_id),'flight_enabled':False}
