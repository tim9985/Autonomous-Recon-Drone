import json
import time
from uuid import uuid4
from app.common import client, text

with client('/run/backend-socket/service.sock','backend.internal') as api:
    while True:
        try:
            response=api.post('/v1/vision/heartbeat',headers={'Authorization':'Bearer '+text('token')},json={
                'msg_id':str(uuid4()),'worker_id':'vision-01','model_loaded':False,
                'flight_enabled':False,'state':'waiting_for_validated_model'})
            response.raise_for_status()
            print(json.dumps({'state':'waiting_for_validated_model','heartbeat':'accepted','model_loaded':False}),flush=True)
        except Exception as exc:
            print(json.dumps({'heartbeat':'failed','error_type':type(exc).__name__,'model_loaded':False}),flush=True)
        time.sleep(30)

