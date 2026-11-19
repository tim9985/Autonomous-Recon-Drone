"""Briefly remove the SIM device scope, prove denial, always restore it."""
import json, pathlib, subprocess
ROOT=pathlib.Path('/home/se/sandboxes/drone-dev')
assert str(ROOT)=='/home/se/sandboxes/drone-dev'
policy=ROOT/'secrets/backend/principals.json'
original=policy.read_text()
stack=[str(ROOT/'scripts/stack.sh')]
def restart():
    subprocess.run(stack+['restart','backend'],check=True,stdout=subprocess.DEVNULL)
    subprocess.run(stack+['up','-d','--wait','backend'],check=True,stdout=subprocess.DEVNULL)
try:
    items=json.loads(original)
    for item in items:
        if item['id']=='sim-pi-01':item['scopes']=[]
    policy.write_text(json.dumps(items))
    restart()
    test="from app.common import client,text; c=client('/run/backend-socket/service.sock','backend.internal'); r=c.post('/v1/device/telemetry',headers={'Authorization':'Bearer '+text('token')},json={}); assert r.status_code==403; print('PASS: revoked device scope rejected')"
    cmd=stack+['--profile','verify','run','--rm','--volume',str(ROOT/'secrets/sim-device')+':/run/identity:ro','verifier','python','-c',test]
    # The override selects only the device identity for this particular check.
    subprocess.run(cmd,check=True)
finally:
    policy.write_text(original)
    restart()
print('PASS: original identity policy restored')
