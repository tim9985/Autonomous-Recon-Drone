import hashlib
import hmac
import json
from datetime import datetime, timezone
from typing import Literal
from uuid import UUID
import psycopg
from psycopg.types.json import Jsonb
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, Field
from app.common import config, text
from app.body_limit import BodyLimit

app = FastAPI(title='Isolated drone integration environment', version='0.1', docs_url=None, redoc_url=None)
app.add_middleware(BodyLimit)
principals = config('principals.json')
auth = HTTPBearer(auto_error=False)

def principal(request:Request,c: HTTPAuthorizationCredentials = Depends(auth)):
    if c and c.credentials.isascii():
        for p in principals:
            if hmac.compare_digest(c.credentials, p['token']):
                if request.scope.get('client_certificate_sha256') != p['certificate_sha256']:
                    raise HTTPException(401,'Workload certificate does not match token')
                request.scope.setdefault('state',{})['trace_principal']=p['id']
                return p
    raise HTTPException(401, 'Unknown service identity')

def require(scope):
    def check(p=Depends(principal)):
        if scope not in p['scopes']:
            raise HTTPException(403, 'Scope denied')
        return p
    return check

def db():
    return psycopg.connect(host='/run/db-socket', dbname='drone_dev', user='drone_api',
                          password=text('db-api-password'), connect_timeout=3)

class Payload(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)
    msg_id: UUID

class Telemetry(Payload):
    drone_id: Literal['sim-pi-01']
    source: Literal['SIM']
    sequence: int = Field(ge=0, le=9223372036854775807)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    captured_at: datetime

class Heartbeat(Payload):
    worker_id: Literal['vision-01']
    model_loaded: Literal[False]
    flight_enabled: Literal[False]
    state: Literal['waiting_for_validated_model']

class SimResult(Payload):
    worker_id: Literal['vision-01']
    source: Literal['SIM']
    analysis_run_id: UUID
    detection_count: Literal[0]
    model_loaded: Literal[False]

def save(p, kind, body):
    payload=body.model_dump(mode='json')
    digest=hashlib.sha256(json.dumps(payload,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute('INSERT INTO integration.probe(msg_id,subject,kind,content_hash,payload) VALUES (%s,%s,%s,%s,%s) ON CONFLICT (msg_id) DO NOTHING RETURNING msg_id',
                        (body.msg_id,p['id'],kind,digest,Jsonb(payload)))
            inserted=cur.fetchone() is not None
            if not inserted:
                cur.execute('SELECT subject,kind,content_hash FROM integration.probe WHERE msg_id=%s',(body.msg_id,))
                if cur.fetchone() != (p['id'],kind,digest):
                    raise HTTPException(409,'ID_CONFLICT')
    return {'stored':True,'duplicate':not inserted,'msg_id':str(body.msg_id),'source':'SIM' if kind!='VISION_HEARTBEAT' else 'WORKER_STATUS','flight_enabled':False}

@app.get('/v1/status')
def status(p=Depends(require('status.read'))):
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute('SELECT kind,count(*) FROM integration.probe WHERE subject=ANY(%s) GROUP BY kind',(p.get('read_subjects',[]),))
            counts=dict(cur.fetchall())
            cur.execute("SELECT stored_at FROM integration.probe WHERE kind='VISION_HEARTBEAT' AND subject='vision-01' ORDER BY stored_at DESC LIMIT 1")
            row=cur.fetchone()
            cur.execute("""SELECT count(DISTINCT c.table_name)=18 AND count(*)=298
                FROM information_schema.columns c
                JOIN information_schema.tables t USING (table_catalog,table_schema,table_name)
                WHERE c.table_schema='drone' AND t.table_type='BASE TABLE'""")
            business_schema_deployed=cur.fetchone()[0]
    age=(datetime.now(timezone.utc)-row[0]).total_seconds() if row else None
    return {'environment':'isolated-development','database':'connected','records':counts,
            'vision_available':age is not None and 0<=age<90,'vision_status_age_s':age,
            'model_loaded':False,'flight_enabled':False,'business_schema_deployed':business_schema_deployed,
            'business_api_ready':True,'business_mode':'SIM_ONLY','real_business_ready':False}

@app.get('/v1/probes')
def probes(p=Depends(require('probes.read'))):
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute('SELECT msg_id,kind,subject,payload,stored_at FROM integration.probe WHERE subject=ANY(%s) ORDER BY stored_at DESC LIMIT 20',(p.get('read_subjects',[]),))
            return [{'msg_id':str(a),'kind':b,'subject':c,'payload':d,'stored_at':e} for a,b,c,d,e in cur.fetchall()]

@app.post('/v1/device/telemetry')
def telemetry(body:Telemetry,p=Depends(require('device.telemetry'))):
    if body.drone_id != p.get('drone_id'):
        raise HTTPException(403,'Device ownership denied')
    if body.captured_at.tzinfo is None:
        raise HTTPException(422,'Timezone is required')
    return save(p,'TELEMETRY',body)

@app.post('/v1/vision/heartbeat')
def heartbeat(body:Heartbeat,p=Depends(require('vision.report'))):
    if body.worker_id != p['id']:
        raise HTTPException(403,'Worker ownership denied')
    return save(p,'VISION_HEARTBEAT',body)

@app.post('/v1/vision/sim-results')
def results(body:SimResult,p=Depends(require('vision.report'))):
    if body.worker_id != p['id']:
        raise HTTPException(403,'Worker ownership denied')
    return save(p,'SIM_VISION_RESULT',body)
