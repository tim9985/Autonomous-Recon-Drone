"""Verify deployed REAL isolation and actual TLS/WSS without inserting flight/vision fixtures."""
import datetime,http.client,json,os,pathlib,shutil,socket,ssl,subprocess,sys,tempfile,urllib.request
ROOT=pathlib.Path('/home/se/sandboxes/drone-real')
sys.path.insert(0,str(ROOT/'db'));import apply as migrations
migrations.ROOT=ROOT;migrations.CONTAINER='drone-real-20261006-database-1'
from apply import DOCKER
services={}
for role,uid in [('database','999:999'),('backend','2201:2201'),('gateway','2204:2204'),('vision','2202:2202')]:
    item=json.loads(subprocess.check_output(DOCKER+['inspect','drone-real-20261006-'+role+'-1']))[0]
    assert item['State']['Running'] and item['Config']['User']==uid,role
    assert item['HostConfig']['NetworkMode']=='none' and not item['HostConfig']['PortBindings']
    assert item['HostConfig']['ReadonlyRootfs'] and 'ALL' in item['HostConfig']['CapDrop']
    mounts=[m for m in item['Mounts'] if m['Type']=='bind']
    assert all(m['Source'].startswith(str(ROOT)+'/') for m in mounts)
    if role in ('vision','gateway'):
        assert not any(m['Destination'] in ('/run/db-socket','/data','/var/lib/postgresql/data') for m in mounts)
    services[role]={'running':True,'uid':uid,'network':'none','published_ports':[],'read_only_root':True,'started_at':item['State']['StartedAt']}
assert subprocess.check_output(['systemctl','is-active','drone-real-relay.service'],text=True).strip()=='active'
context=ssl.create_default_context(cafile=str(ROOT/'secrets/ca.crt'))
try:
    urllib.request.urlopen('https://localhost:19443/api/v1/readiness',context=context,timeout=8)
    raise AssertionError('Anonymous loopback request was accepted')
except urllib.error.HTTPError as exc:assert exc.code==401
context.load_cert_chain(ROOT/'secrets/device/client.crt',ROOT/'secrets/device/client.key')
connection=http.client.HTTPConnection('backend.internal',19444,timeout=8)
connection.sock=context.wrap_socket(socket.create_connection(('127.0.0.1',19444),timeout=8),server_hostname='backend.internal')
connection.request('GET','/device/v1/commands',headers={'Authorization':'Bearer '+(ROOT/'secrets/device/token').read_text().strip()})
assert connection.getresponse().status==503
connection.close()
with tempfile.TemporaryDirectory(prefix='live-audit-',dir=ROOT) as tmp:
    area=pathlib.Path(tmp);os.chmod(area,0o755)
    identity=area/'identity';identity.mkdir();os.chown(identity,2201,2201);os.chmod(identity,0o700)
    for role in ('gateway','device','vision'):
        folder=identity/role;folder.mkdir();os.chown(folder,2201,2201);os.chmod(folder,0o700)
        for name in ('ca.crt','client.crt','client.key','token'):
            target=folder/name;shutil.copyfile(ROOT/'secrets'/role/name,target);os.chown(target,2201,2201);os.chmod(target,0o400)
    path=identity/'operator-login.json';shutil.copyfile(ROOT/'secrets/operator-login.json',path);os.chown(path,2201,2201);os.chmod(path,0o400)
    command=DOCKER+['run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges',
        '--user','2201:2201','--group-add','2500','--group-add','1001','--cpus','1','--memory','512m','--pids-limit','64',
        '-e','PYTHONDONTWRITEBYTECODE=1','--tmpfs','/tmp:rw,noexec,nosuid,size=64m',
        '-v',str(identity)+':/run/identity:ro','-v',str(ROOT/'tests')+':/workspace/backend_tests:ro',
        '-v',str(ROOT/'sockets/backend')+':/run/backend-socket:ro','-v',str(ROOT/'sockets/gateway')+':/run/gateway-socket:ro',
        '-w','/workspace','sha256:27ee4624dfcf7dc99934cf94e3db6e40f86a9bda0d414137ab20540a0a3dda4d','python','-m','backend_tests.real_live']
    live=json.loads(subprocess.check_output(command,text=True).strip().splitlines()[-1])
db=migrations.psql("SELECT json_build_object('database',current_database(),'tables',(SELECT count(*) FROM information_schema.tables WHERE table_schema='drone' AND table_type='BASE TABLE'),'missions',(SELECT count(*) FROM drone.mission),'telemetry',(SELECT count(*) FROM drone.telemetry_sample),'candidates',(SELECT count(*) FROM drone.person_candidate),'receipts',(SELECT count(*) FROM drone.ingest_receipt),'commands',(SELECT count(*) FROM drone.flight_command),'migrations',(SELECT count(*) FROM drone.schema_migration));",'drone_real')
database=json.loads(db)
assert all(database[n]==0 for n in ('missions','telemetry','candidates','receipts','commands'))
assert database['migrations']==9
old={}
for role in ('database','backend','vision','web','gateway'):
    item=json.loads(subprocess.check_output(DOCKER+['inspect','drone-services-20261005-'+role+'-1']))[0]
    assert item['State']['Running'];old[role]={'running':True,'started_at':item['State']['StartedAt']}
result={'verified_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'services':services,'database':database,
        'actual_tls_wss':live,'loopback_tls_ports':[19443,19444],'existing_development_services':old,'model_loaded':False,'flight_enabled':False,
        'public_internet':'NOT_CONFIGURED','actual_device':'NOT_RUN','actual_model_inference':'NOT_RUN'}
(ROOT/'evidence/real-deployment-audit.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result))
