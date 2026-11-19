"""Credential-free timings for the SIM critical path; never logs bodies or identities."""
from contextlib import contextmanager
from contextvars import ContextVar
from datetime import datetime,timezone
import json
import logging
import re
import time
from uuid import UUID,uuid4

TRACE=ContextVar('sim_request_trace',default=None)
LOG=logging.getLogger('uvicorn.error')

def route_kind(path):
    fixed={'/health/live':'health','/device/v1/sim-link':'device_state',
           '/device/v1/sim-link/connect':'device_connect','/device/v1/sim-link/heartbeat':'device_heartbeat',
           '/device/v1/sim-link/preview':'video_upload','/device/v1/commands':'command_poll'}
    if path in fixed:return fixed[path]
    if re.fullmatch(r'/api/v1/drones/[^/]+/sim-link',path):return 'browser_state'
    if re.fullmatch(r'/api/v1/drones/[^/]+/sim-link/control-heartbeat',path):return 'operator_heartbeat'
    if re.fullmatch(r'/api/v1/drones/[^/]+/sim-link/preview.jpg',path):return 'video_read'
    if re.fullmatch(r'/device/v1/commands/[^/]+/reports',path):return 'command_report'
    return None

@contextmanager
def measure(name):
    row=TRACE.get();start=time.perf_counter()
    try:yield
    finally:
        if row is not None:row['timings'][name]=row['timings'].get(name,0)+(time.perf_counter()-start)*1000

class SimTiming:
    def __init__(self,app):self.app=app
    async def __call__(self,scope,receive,send):
        if TRACE.get() is not None:return await self.app(scope,receive,send)
        kind=route_kind(scope.get('path','')) if scope['type']=='http' else None
        if kind is None:return await self.app(scope,receive,send)
        headers=dict(scope.get('headers',[]))
        try:request_id=str(UUID(headers.get(b'x-request-id',b'').decode('ascii')))
        except (ValueError,UnicodeError):request_id=str(uuid4())
        row={'request_id':request_id,'route':kind,'timings':{}}
        token=TRACE.set(row);start=time.perf_counter();status=None
        async def traced_send(message):
            nonlocal status
            if message['type']=='http.response.start':
                status=message['status'];row['timings']['app_headers']=(time.perf_counter()-start)*1000
                values=', '.join(f'{name};dur={value:.3f}' for name,value in row['timings'].items())
                message={**message,'headers':list(message.get('headers',[]))+[(b'x-request-id',request_id.encode()),(b'server-timing',values.encode())]}
            await send(message)
        try:await self.app(scope,receive,traced_send)
        finally:
            row.update(at=datetime.now(timezone.utc).isoformat(),status=status,total_ms=round((time.perf_counter()-start)*1000,3))
            row['timings']={k:round(v,3) for k,v in row['timings'].items()}
            LOG.info('SIM_TIMING %s',json.dumps(row,separators=(',',':')))
            TRACE.reset(token)
