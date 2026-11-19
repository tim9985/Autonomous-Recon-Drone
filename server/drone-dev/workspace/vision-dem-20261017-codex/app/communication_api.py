"""Restricted communication history and validated, attributable client-reported attempts."""
from datetime import datetime,timedelta,timezone
from typing import Literal
from uuid import UUID,uuid5,NAMESPACE_URL
from fastapi import APIRouter,Request,Query,HTTPException
from pydantic import Field
from drone_backend.contracts import DTO,Time
from drone_backend.core import transaction,user,authorize,workload,output,fail
from app.communication import spool

router=APIRouter()

def monitor(request,c):
    actor=user(request,c);authorize(actor,'sim-pi-01','monitor');return actor

def interval(since):
    current=datetime.now(timezone.utc)
    value=since or current-timedelta(hours=1)
    if value.tzinfo is None or not current-timedelta(days=7)<=value<=current:fail('INVALID_TIME_RANGE',422)
    return value

@router.get('/api/v1/communications/logs')
def logs(request:Request,since:datetime|None=None,request_id:UUID|None=None,run_id:UUID|None=None,
         principal_id:str|None=Query(default=None,max_length=255),service:Literal['backend','gateway','web','net_sitl']|None=None,
         failures_only:bool=False,min_ms:float=Query(default=0,ge=0,le=86400000),before:UUID|None=None,
         limit:int=Query(default=100,ge=1,le=200)):
    with transaction() as c:
        monitor(request,c);start=interval(since)
        rows=c.execute('''SELECT * FROM observability.communication_log l WHERE event_at>=%s
          AND (%s::uuid IS NULL OR request_id=%s) AND (%s::uuid IS NULL OR run_id=%s)
          AND (%s::text IS NULL OR principal_id=%s) AND (%s::text IS NULL OR service=%s)
          AND (NOT %s OR status>=400 OR error_code IS NOT NULL) AND duration_ms>=%s
          AND (%s::uuid IS NULL OR (stored_at,event_id)<(SELECT stored_at,event_id FROM observability.communication_log WHERE event_id=%s))
          ORDER BY stored_at DESC,event_id DESC LIMIT %s''',
          (start,request_id,request_id,run_id,run_id,principal_id,principal_id,service,service,failures_only,min_ms,before,before,limit)).fetchall()
        return {'logs':output(rows),'next_cursor':str(rows[-1]['event_id']) if rows else None,'since':start.isoformat()}

@router.get('/api/v1/communications/summary')
def summary(request:Request,since:datetime|None=None):
    with transaction() as c:
        monitor(request,c);start=interval(since)
        groups=c.execute('''SELECT service,route,kind,count(*) AS requests,
          count(*) FILTER (WHERE status>=400 OR error_code IS NOT NULL) AS failures,
          percentile_cont(0.5) WITHIN GROUP(ORDER BY duration_ms) AS p50_ms,
          percentile_cont(0.95) WITHIN GROUP(ORDER BY duration_ms) AS p95_ms,max(duration_ms) AS max_ms
          FROM observability.communication_log WHERE event_at>=%s GROUP BY service,route,kind ORDER BY max_ms DESC LIMIT 100''',(start,)).fetchall()
        peers=c.execute('''SELECT principal_id,max(stored_at) AS last_stored_at,max(event_at) AS last_event_at,
          count(*) AS events FROM observability.communication_log WHERE event_at>=%s AND principal_id IS NOT NULL
          GROUP BY principal_id ORDER BY last_stored_at DESC''',(start,)).fetchall()
        return {'since':start.isoformat(),'groups':output(groups),'peers':output(peers),'backend_spool':spool().health(),
                'coverage':'HTTP/WS observed by this sandbox; client attempts are client-reported; pre-TLS and SSH failures require transport logs'}

class ClientEvent(DTO):
    event_id:UUID
    event_at:Time
    request_id:UUID
    operation_id:UUID|None=None
    run_id:UUID|None=None
    route:Literal['/device/v1/simulations/runs','/device/v1/simulations/runs/{rid}',
      '/device/v1/simulations/runs/{rid}/claim','/device/v1/simulations/runs/{rid}/commands','/device/v1/simulations/runs/{rid}/samples']
    method:Literal['GET','POST']
    status:int|None=Field(default=None,ge=100,le=599)
    duration_ms:float=Field(ge=0,le=86400000)
    bytes_in:int=Field(ge=0,le=1073741824)
    bytes_out:int=Field(ge=0,le=1073741824)
    error_code:Literal['NETWORK_ERROR','HTTP_ERROR','CLIENT_ERROR']|None=None

class ClientBatch(DTO):
    events:list[ClientEvent]=Field(min_length=1,max_length=50)

@router.post('/device/v1/communications/client-events',status_code=202)
def ingest(body:ClientBatch,request:Request):
    with transaction() as c:
        from app.simulation_api import simulator
        principal=simulator(request,c)
        for event in body.events:
            row=event.model_dump(mode='json')
            if event.run_id and not c.execute('SELECT 1 FROM simulation.run WHERE run_id=%s AND worker_id=%s',(event.run_id,principal['id'])).fetchone():
                row['run_id']=None
            row.update(event_id=str(uuid5(NAMESPACE_URL,principal['id']+'/'+str(event.event_id))),
              principal_id=principal['id'],actor_user_id=None,source='CLIENT_REPORTED',service='net_sitl',kind='CLIENT_HTTP',timings={})
            try:spool().emit(row)
            except ValueError:fail('LOG_ID_CONFLICT',409)
            except OSError:fail('LOG_SPOOL_UNAVAILABLE',503)
    return {'accepted':len(body.events),'durable_on_server':True}
