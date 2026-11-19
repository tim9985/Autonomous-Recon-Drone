import hashlib
import hmac
import json
import os
import secrets
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID, uuid4

import psycopg
from fastapi import HTTPException
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

IDENTITY = Path(os.getenv('DRONE_IDENTITY', '/run/identity'))
STORAGE = Path(os.getenv('DRONE_STORAGE', '/data'))
COOKIE = os.getenv('DRONE_COOKIE', 'drone_session')
BIGINTS = {'sequence','event_seq','control_epoch','control_revision','frame_seq','row_version','sample_time_raw'}

def now():
    return datetime.now(timezone.utc)

def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False, allow_nan=False, default=str)

def digest(value):
    return hashlib.sha256(canonical(value).encode()).hexdigest()

def settings():
    return json.loads((IDENTITY / 'business.json').read_text())

def output(value):
    if isinstance(value, dict):
        return {k: str(v) if k in BIGINTS and v is not None else output(v) for k,v in value.items()
                if k not in ('credential_hash','token_digest','storage_uri')}
    if isinstance(value, (list,tuple)): return [output(v) for v in value]
    if isinstance(value, UUID): return str(value)
    if isinstance(value, datetime): return value.isoformat()
    return value

def fail(code, status=409):
    raise HTTPException(status, code)

@contextmanager
def transaction(events=False, snapshot=False):
    c = settings()
    with psycopg.connect(host=c.get('db_host','/run/db-socket'), dbname=os.getenv('DRONE_DB_NAME',c.get('db_name','drone_dev')),
                         user='drone_api', password=(IDENTITY/'db-api-password').read_text().strip(),
                         connect_timeout=3, row_factory=dict_row) as conn:
        conn.execute("SET LOCAL statement_timeout='8s'")
        conn.execute("SET LOCAL lock_timeout='3s'")
        if snapshot: conn.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY')
        # ponytail: serialize dev event writers; partition locks when measured write throughput needs it.
        if events: conn.execute('SELECT pg_advisory_xact_lock(20261005,1)')
        yield conn

def one(conn, sql, args=()):
    return conn.execute(sql,args).fetchone()

def mission(conn, mid, lock=False):
    row=locked_row(conn,'mission',mid) if lock else one(conn,'SELECT * FROM drone.mission WHERE mission_id=%s',(mid,))
    if not row: fail('RESOURCE_NOT_FOUND',404)
    return row

def locked_row(conn,table,id_value):
    if table not in ('mission','drone','video_frame','person_candidate','flight_command'): raise ValueError('Unknown lock target')
    return one(conn,f'SELECT * FROM drone.backend_lock_{table}(%s)',(id_value,))

def add(conn, table, value):
    # Function/table names come only from this fixed application allowlist.
    allowed={'mission','mission_revision','telemetry_sample','video_frame','media_asset','flight_command',
             'reobservation_request','person_candidate','detection_observation','search_plan','search_region','observation_cell'}
    if table not in allowed: raise ValueError('Unknown business function')
    return output(one(conn, f'SELECT drone.backend_add_{table}(%s) AS value',(Jsonb(json.loads(canonical(value))),))['value'])

def event(conn, kind, mid=None, drone_id=None, actor=None, payload=None, eid=None):
    if eid:
        previous=one(conn,'SELECT * FROM drone.mission_event WHERE event_id=%s',(eid,))
        if previous:
            if (previous['event_type']!=kind or previous['payload']!=json.loads(canonical(payload or {}))
                or str(previous['mission_id'] or '')!=str(mid or '') or previous['drone_id']!=drone_id
                or str(previous['actor_user_id'] or '')!=str(actor or '')): fail('ID_CONFLICT')
            return output(previous)
    seq=one(conn,"SELECT coalesce(max(sequence),0)+1 AS n FROM drone.mission_event WHERE producer_id='business-backend'")['n']
    value={'event_id':str(eid or uuid4()),'mission_id':str(mid) if mid else None,'drone_id':drone_id,
           'event_type':kind,'code':kind,'actor_user_id':str(actor) if actor else None,'payload':payload or {},
           'refs':[],'producer_id':'business-backend','producer_session_id':'business-v1',
           'sequence':seq,'publish_state':'PENDING'}
    return output(one(conn,'SELECT drone.backend_event(%s) AS value',(Jsonb(json.loads(canonical(value))),))['value'])

def mutate(conn, function, value):
    allowed={'session_create','session_revoke','control','device_state','mission_state','asset_store','asset_cancel','asset_reclaim',
             'candidate_judgement','alert_ack','command_report','frame_selection','candidate_summary'}
    if function not in allowed: raise ValueError('Unknown business action')
    return output(one(conn,f'SELECT drone.backend_{function}(%s) AS value',(Jsonb(json.loads(canonical(value))),))['value'])

def workload(connection, role):
    token=connection.headers.get('authorization','')
    registry=json.loads((IDENTITY/'principals.json').read_text())
    p=next((p for p in registry if token.isascii() and
            hmac.compare_digest(token,'Bearer '+p['token']) and
            connection.scope.get('client_certificate_sha256') == p['certificate_sha256']),None)
    if not p: fail('UNAUTHENTICATED',401)
    if 'business.'+role not in p['scopes']: fail('FORBIDDEN',403)
    return p

def user(connection, conn, scope='read'):
    workload(connection,'operator')
    token=connection.cookies.get(COOKIE,'')
    row=one(conn,"SELECT s.*,u.permissions FROM drone.user_session s JOIN drone.user_account u USING(user_id) "
            "WHERE token_digest=%s AND revoked_at IS NULL AND expires_at>now() AND u.status='ACTIVE'",
            (hashlib.sha256(token.encode()).hexdigest(),)) if token else None
    if not row: fail('SESSION_EXPIRED',401)
    if getattr(connection,'method','GET') not in ('GET','HEAD','OPTIONS'):
        expected=hmac.new(token.encode(),b'csrf',hashlib.sha256).hexdigest()
        origin=connection.headers.get('origin')
        if origin not in settings()['origins'] or not hmac.compare_digest(connection.headers.get('x-csrf-token',''),expected):
            fail('CSRF_REJECTED',403)
    row['required_scope']=scope
    return row

def authorize(actor, drone_id, scope=None):
    required=scope or actor.get('required_scope','read')
    if not any(isinstance(p,dict) and p.get('drone_id')==drone_id and required in p.get('scopes',[])
               for p in actor['permissions']): fail('RESOURCE_NOT_FOUND',404)

def owned_mission(connection, conn, mid, scope='read', lock=False):
    actor=user(connection,conn,scope)
    m=mission(conn,mid,lock)
    authorize(actor,m['drone_id'],scope)
    return actor,m

def device(connection, conn, drone_id=None):
    p=workload(connection,'device')
    did=p.get('drone_id')
    if drone_id is not None and did!=drone_id: fail('FORBIDDEN',403)
    row=one(conn,'SELECT * FROM drone.drone WHERE drone_id=%s',(did,))
    if not row or row['gateway_id']!=p['id']: fail('FORBIDDEN',403)
    return p,row

def storage_file(uri):
    base=STORAGE.resolve()
    path=base/uri
    if path.is_absolute() and not path.resolve().is_relative_to(base): fail('INVALID_STORAGE',422)
    if any(p in ('..','.') for p in Path(uri).parts) or Path(uri).is_absolute(): fail('INVALID_STORAGE',422)
    # Reject symlink components, including a still-uncreated leaf's parents.
    current=base
    for part in Path(uri).parts:
        current=current/part
        if current.is_symlink(): fail('INVALID_STORAGE',422)
    return path

def password_hash(password, salt=None):
    salt=salt or secrets.token_hex(16)
    return 'pbkdf2_sha256$1000000$'+salt+'$'+hashlib.pbkdf2_hmac('sha256',password.encode(),bytes.fromhex(salt),1000000).hex()

def password_ok(password, encoded):
    try:
        algorithm,rounds,salt,value=encoded.split('$')
        if algorithm!='pbkdf2_sha256' or rounds!='1000000': return False
        return hmac.compare_digest(password_hash(password,salt),encoded)
    except (ValueError,TypeError): return False
