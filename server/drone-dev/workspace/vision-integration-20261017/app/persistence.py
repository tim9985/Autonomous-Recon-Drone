import json, ssl
import httpx
from pathlib import Path
from app.common import IDENTITY, text
previous=json.loads(Path('/run/previous-acceptance.json').read_text())
ctx=ssl.create_default_context(cafile=str(IDENTITY/'ca.crt'))
ctx.load_cert_chain(IDENTITY/'gateway-client.crt',IDENTITY/'gateway-client.key')
with httpx.Client(base_url='https://backend.internal',timeout=8,trust_env=False,
                 transport=httpx.HTTPTransport(uds='/run/backend-socket/service.sock',verify=ctx)) as api:
    r=api.get('/v1/probes',headers={'Authorization':'Bearer '+text('gateway-token')})
    r.raise_for_status()
    ids={record['msg_id'] for record in r.json()}
    assert previous['telemetry_msg_id'] in ids and previous['sim_result_msg_id'] in ids
print(json.dumps({'restart_persistence':'passed','flight_enabled':False}))
