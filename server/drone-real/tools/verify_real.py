"""Run REAL intake checks in an isolated temporary database and storage volume."""
import hashlib,json,os,pathlib,shutil,subprocess,sys,tempfile,uuid
ROOT=pathlib.Path('/home/se/sandboxes/drone-real')
sys.path.insert(0,str(ROOT/'db'));import apply as migrations
migrations.ROOT=ROOT;migrations.CONTAINER='drone-real-20261006-database-1'
from apply import DOCKER
def fingerprint():
    return {str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest()
            for folder in ('drone_backend','app','db/migrations','tests') for p in sorted((ROOT/folder).glob('*')) if p.suffix in ('.py','.sql')}
before=fingerprint()
DB='real_verify_'+uuid.uuid4().hex
psql=lambda sql,db=DB:migrations.psql(sql,db)
created=False
with tempfile.TemporaryDirectory(prefix='verify-',dir=ROOT) as scratch:
    area=pathlib.Path(scratch);os.chmod(area,0o755)
    identity=area/'identity';shutil.copytree(ROOT/'secrets/backend',identity);os.chown(identity,2201,2201);os.chmod(identity,0o700)
    cfg=json.loads((identity/'business.json').read_text())
    for f in identity.iterdir():os.chown(f,2201,2201);os.chmod(f,0o400)
    data=area/'data';data.mkdir();os.chown(data,2201,2201)
    name='real-check-'+uuid.uuid4().hex
    try:
        psql(f'CREATE DATABASE {DB} OWNER drone_owner;','postgres');created=True
        psql('CREATE EXTENSION postgis;')
        migrations.apply(DB)
        salt='12'*24;password='<REDACTED>'
        encoded='pbkdf2_sha256$1000000$'+salt+'$'+hashlib.pbkdf2_hmac('sha256',password.encode(),bytes.fromhex(salt),1000000).hex()
        uid=cfg['configuration_admins'][0]
        psql(f"INSERT INTO drone.user_account(user_id,login_id,credential_hash,permissions,status) VALUES ('{uid}','real-operator','{encoded}','[{{\"drone_id\":\"real-drone-01\",\"scopes\":[\"read\",\"edit\",\"control\"]}}]','ACTIVE'); INSERT INTO drone.drone(drone_id,name,gateway_id,gateway_state,link_state) VALUES ('real-drone-01','fixture','real-gateway-01','{{\"environment\":\"REAL\"}}','{{}}');")
        command=DOCKER+['run','--rm','--name',name,'--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges',
            '--user','2201:2201','--group-add','999','--cpus','1','--memory','512m','--pids-limit','96','--tmpfs','/tmp:rw,noexec,nosuid,size=64m',
            '-e','PYTHONDONTWRITEBYTECODE=1','-e','DRONE_DB_NAME='+DB,'-e','DRONE_COOKIE=drone_real_session',
            '-v',str(ROOT/'drone_backend')+':/workspace/drone_backend:ro','-v',str(ROOT/'app')+':/workspace/app:ro',
            '-v',str(ROOT/'tests')+':/workspace/backend_tests:ro','-v',str(ROOT/'sockets/database')+':/run/db-socket:ro',
            '-v',str(identity)+':/run/identity:ro','-v',str(data)+':/data','-w','/workspace',
            'sha256:27ee4624dfcf7dc99934cf94e3db6e40f86a9bda0d414137ab20540a0a3dda4d','python','-m','backend_tests.real_storage']
        result=subprocess.run(command,capture_output=True,text=True)
        print(result.stdout);print(result.stderr[-10000:],file=sys.stderr)
        if result.returncode:raise RuntimeError('REAL intake checks failed')
        evidence=json.loads(result.stdout.strip().splitlines()[-1])
    finally:
        subprocess.run(DOCKER+['rm','-f',name],capture_output=True)
        if created:psql(f'DROP DATABASE {DB} WITH (FORCE);','postgres')
(ROOT/'evidence').mkdir(exist_ok=True)
evidence.update(temporary_database_removed=True,temporary_storage_removed=True,production_fixtures_inserted=False)
assert before==fingerprint(),'Source changed during verification'
evidence['source_sha256']=before
(ROOT/'evidence/real-storage-check.json').write_text(json.dumps(evidence,indent=2))
print(json.dumps({k:v for k,v in evidence.items() if k!='source_sha256'}))
