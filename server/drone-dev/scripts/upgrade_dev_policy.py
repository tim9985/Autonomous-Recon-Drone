"""Add the explicit SIM read allowlist without changing keys or user passwords."""
import json, pathlib
root=pathlib.Path('/home/se/sandboxes/drone-dev')
assert str(root)=='/home/se/sandboxes/drone-dev'
path=root/'secrets/backend/principals.json'
items=json.loads(path.read_text())
for item in items:
    if item['id']=='web-gateway':item['read_subjects']=['sim-pi-01','vision-01']
path.write_text(json.dumps(items))
print('Development read policy limited to two SIM subjects')
