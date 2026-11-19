"""Root-side deployment check. Outputs metadata only, never environment secrets."""
import datetime, json, pathlib, subprocess, urllib.request
ROOT=pathlib.Path('/home/se/sandboxes/drone-dev')
assert str(ROOT)=='/home/se/sandboxes/drone-dev'
DOCKER=['/home/se/sandboxes/drone-server/runtime/docker/docker','-H','unix:///home/se/sandboxes/drone-server/runtime/docker.sock']
services=('database','backend','vision','web','gateway')
result={}
for service in services:
    item=json.loads(subprocess.check_output(DOCKER+['inspect','drone-services-20261005-'+service+'-1']))[0]
    assert item['HostConfig']['NetworkMode']=='none',service
    assert not item['HostConfig']['PortBindings'],service
    assert item['State']['Running'],service
    mounts=[{'source':x['Source'],'destination':x['Destination'],'rw':x['RW']} for x in item['Mounts']]
    assert item['HostConfig']['ReadonlyRootfs'] and item['Config']['User']=={'database':'999:999','backend':'2101:2101','vision':'2102:2102','web':'2103:2103','gateway':'2104:2104'}[service],service
    assert 'ALL' in item['HostConfig']['CapDrop'],service
    assert all(x['source'].startswith(str(ROOT)+'/') for x in mounts),service
    destinations={x['destination'] for x in mounts}
    if service in ('vision','web','gateway'):
        assert '/run/db-socket' not in destinations and '/data' not in destinations,service
        assert all('DATABASE' not in entry and 'POSTGRES' not in entry for entry in item['Config']['Env']),service
    result[service]={'network':'none','published_ports':[],'user':item['Config']['User'],
                     'read_only_root':item['HostConfig']['ReadonlyRootfs'],'image_id':item['Image'],'mounts':mounts}
db_checks='''from app.backend import db
import psycopg
with db() as c:
 with c.cursor() as cur:
  cur.execute("SELECT current_user, current_database()")
  assert cur.fetchone()==('drone_api','drone_dev')
for sql in ('CREATE TABLE integration.forbidden(id int)','DELETE FROM integration.probe','CREATE ROLE forbidden_role LOGIN'):
 try:
  with db() as c:
   c.execute(sql)
  raise AssertionError('Forbidden SQL succeeded')
 except psycopg.errors.InsufficientPrivilege: pass
print('PASS: backend DB role; DDL, DELETE and role creation denied')
'''
result['db_permissions']=subprocess.check_output(DOCKER+['exec','drone-services-20261005-backend-1','python','-c',db_checks],text=True).strip()
for service in ('vision','web','gateway'):
    script="import pathlib,socket; assert not pathlib.Path('/run/db-socket/.s.PGSQL.5432').exists(); assert not pathlib.Path('/data/postgres').exists(); s=socket.socket(); s.settimeout(1); assert s.connect_ex(('127.0.0.1',18432))!=0; print('DB TCP/socket and raw storage inaccessible')"
    result[service]['denied_access']=subprocess.check_output(DOCKER+['exec','drone-services-20261005-'+service+'-1','python','-c',script],text=True).strip()
old=json.load(urllib.request.urlopen('http://127.0.0.1:18400/health/components',timeout=8))
assert old['status']=='ok' and old['flight_enabled'] is False
result['existing_sandbox_regression']={'status':old['status'],'flight_enabled':old['flight_enabled']}
result['verified_at_utc']=datetime.datetime.now(datetime.timezone.utc).isoformat()
folder=ROOT/'evidence';folder.mkdir(exist_ok=True)
(folder/'deployment-audit.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result,ensure_ascii=False))

