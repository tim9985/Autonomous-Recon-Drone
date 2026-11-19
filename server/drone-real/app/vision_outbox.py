"""Transport only. The vision team appends JSONL; no model is loaded by this process."""
import hashlib,json,os,time
from pathlib import Path
from app.common import client,text
ROOT=Path('/scratch')
def send_pending(api,root=ROOT):
    queue=root/'outbox.jsonl';checkpoint=root/'ack.json'
    if not queue.exists():return 0
    state=json.loads(checkpoint.read_text()) if checkpoint.exists() else {'offset':0}
    if queue.stat().st_size<state['offset']:raise ValueError('Outbox was truncated; preserve acknowledged history')
    count=0
    with queue.open('rb') as f:
        if state['offset']:
            f.seek(state['offset']-state['last_length'])
            if hashlib.sha256(f.read(state['last_length'])).hexdigest()!=state['last_sha256']:
                raise ValueError('Acknowledged outbox boundary changed; refusing to skip records')
        f.seek(state['offset'])
        while True:
            line=f.readline(65538)
            if not line:return count
            if len(line)>65536:raise ValueError('Outbox record exceeds API limit')
            if not line.endswith(b'\n'):return count
            row=json.loads(line)
            path={'result':'/internal/v1/vision/results','reobservation':'/internal/v1/vision/reobservations'}[row['type']]
            response=api.post(path,json=row['body'],headers={'Authorization':'Bearer '+text('token')})
            response.raise_for_status()
            temp=checkpoint.with_suffix('.tmp')
            with temp.open('w') as out:
                json.dump({'offset':f.tell(),'last_length':len(line),'last_sha256':hashlib.sha256(line).hexdigest()},out);out.flush();os.fsync(out.fileno())
            os.replace(temp,checkpoint);count+=1

if __name__=='__main__':
    api=client('/run/backend-socket/service.sock','backend.internal')
    print(json.dumps({'state':'waiting_for_vision_outbox','model_loaded':False,'flight_enabled':False}),flush=True)
    while True:
        try:send_pending(api)
        except Exception as exc:print(json.dumps({'delivery':'retry_pending','error_type':type(exc).__name__}),flush=True)
        time.sleep(2)
