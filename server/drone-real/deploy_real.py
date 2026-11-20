"""Fresh REAL storage deployment. Never modify the existing SIM stack or training folders."""
import datetime,hashlib,json,os,pathlib,secrets,shutil,subprocess,sys,time,uuid
ROOT=pathlib.Path('/home/se/sandboxes/drone-real')
OLD=pathlib.Path('/home/se/sandboxes/drone-dev')
ENGINE='/home/se/sandboxes/drone-server/runtime'
DOCKER=[ENGINE+'/docker/docker','-H','unix://'+ENGINE+'/docker.sock']
IMAGE='sha256:27ee4624dfcf7dc99934cf94e3db6e40f86a9bda0d414137ab20540a0a3dda4d'
PROJECT='drone-real-20261006'

def run(args,**kw):return subprocess.run(args,check=True,**kw)
def write(path,value,uid=0,gid=None,mode=0o644):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(value);os.chown(path,uid,uid if gid is None else gid);os.chmod(path,mode)
def openssl(*args):return subprocess.check_output(['openssl',*map(str,args)],stderr=subprocess.DEVNULL)

def provision(stage, *, identity_only=False):
    stage=pathlib.Path(stage).resolve()
    assert os.geteuid()==0 and stage.is_relative_to(OLD) and stage!=OLD
    if ROOT.exists():raise RuntimeError('Existing REAL root: inspect and resume explicitly, never overwrite')
    ROOT.mkdir(mode=0o755)
    for name in ('app','drone_backend','tests','db'):
        shutil.copytree(stage/name,ROOT/name,ignore=shutil.ignore_patterns('__pycache__'))
        for path in (ROOT/name).rglob('*'):os.chmod(path,0o755 if path.is_dir() or path.suffix=='.sh' else 0o644)
    shutil.copyfile(stage/'tools/deploy_real.py',ROOT/'deploy_real.py')
    private=ROOT/'secrets';private.mkdir(mode=0o700);os.chown(private,1001,1001)
    openssl('req','-x509','-newkey','rsa:3072','-nodes','-keyout',private/'ca.key','-out',private/'ca.crt','-days','90',
            '-subj','/CN=Drone REAL service CA','-addext','basicConstraints=critical,CA:TRUE','-addext','keyUsage=critical,keyCertSign,cRLSign')
    os.chmod(private/'ca.key',0o600)
    def cert(role,uid,kind):
        folder=private/role;folder.mkdir(exist_ok=True);os.chown(folder,uid,uid);os.chmod(folder,0o700)
        name='server' if kind=='serverAuth' else 'client'
        ext=folder/'extension.cnf';csr=folder/'request.csr'
        san='DNS:'+role+'.internal'+(',DNS:localhost,IP:127.0.0.1' if role=='gateway' else '')
        write(ext,'basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage='+kind+'\nsubjectAltName='+san+'\n')
        openssl('req','-new','-newkey','rsa:2048','-nodes','-keyout',folder/(name+'.key'),'-out',csr,'-subj','/CN='+role+'.internal')
        openssl('x509','-req','-in',csr,'-CA',private/'ca.crt','-CAkey',private/'ca.key','-CAcreateserial','-out',folder/(name+'.crt'),'-days','30','-sha256','-extfile',ext)
        csr.unlink();ext.unlink()
        for f in (folder/(name+'.key'),folder/(name+'.crt')):os.chown(f,uid,uid);os.chmod(f,0o400)
        write(folder/'ca.crt',(private/'ca.crt').read_text(),uid,mode=0o400)
        return hashlib.sha256(openssl('x509','-in',folder/(name+'.crt'),'-outform','DER')).hexdigest()
    for role,uid in [('backend',2201),('gateway',2204)]:cert(role,uid,'serverAuth')
    registry=[]
    for role,uid,pid,scope in [('gateway',2204,'real-web-gateway','operator'),('vision',2202,'real-vision-01','vision'),('device',2205,'real-gateway-01','device')]:
        fp=cert(role,uid,'clientAuth');token=secrets.token_urlsafe(40)
        write(private/role/'token',token,uid,mode=0o400)
        p={'id':pid,'token':token,'certificate_sha256':fp,'scopes':['business.'+scope]}
        if role=='device':p['drone_id']='real-drone-01'
        if role=='vision':p['drone_ids']=['real-drone-01']
        registry.append(p)
    write(private/'backend/principals.json',json.dumps(registry),2201,mode=0o400)
    operator_password=secrets.token_urlsafe(24);salt=secrets.token_hex(24)
    account={'username':'real-operator','salt':salt,'digest':hashlib.pbkdf2_hmac('sha256',operator_password.encode(),bytes.fromhex(salt),1000000).hex()}
    write(private/'gateway/operator.json',json.dumps(account),2204,mode=0o400)
    write(private/'operator-login.json',json.dumps({'username':'real-operator','password':operator_password}),1001,mode=0o600)
    uid=str(uuid.uuid5(uuid.NAMESPACE_URL,'drone-real/operator'))
    cfg={'environment':'REAL','db_name':'drone_real','origins':['https://localhost:19443','https://127.0.0.1:19443'],
        'session_seconds':3600,'max_upload_bytes':67108864,'max_storage_bytes':1073741824,'configuration_admins':[uid]}
    write(private/'backend/business.json',json.dumps(cfg),2201,mode=0o400)
    dbpass=secrets.token_urlsafe(48)
    write(private/'backend/db-api-password',dbpass,2201,mode=0o400)
    for name,value in [('db-api-password',dbpass),('db-owner-password',secrets.token_urlsafe(48))]:write(private/'database'/name,value,999,mode=0o400)
    os.chown(private/'database',999,999);os.chmod(private/'database',0o700)
    for rel,owner,gid,mode in [('data/postgres',999,999,0o700),('data/backend',2201,2201,0o700),('data/vision',2202,2202,0o700),('data/models',2202,2202,0o500),
        ('sockets/database',999,999,0o770),('sockets/backend',2201,2400,0o2770),('sockets/gateway',2204,1001,0o2770)]:
        p=ROOT/rel;p.mkdir(parents=True);os.chown(p,owner,gid);os.chmod(p,mode)
    if identity_only:return
    write(ROOT/'db/init-real.sh','''#!/bin/bash
set -euo pipefail
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 --set=api_password="$(cat /run/identity/db-api-password)" <<'SQL'
CREATE EXTENSION IF NOT EXISTS postgis;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON DATABASE drone_real FROM PUBLIC;
REVOKE CONNECT ON DATABASE postgres FROM PUBLIC;
CREATE ROLE drone_api LOGIN PASSWORD :'api_password' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
GRANT CONNECT ON DATABASE drone_real TO drone_api;
SQL
''',mode=0o755)
    write(ROOT/'app/real_launch.py', '''import ssl,sys,uvicorn
from app.common import IDENTITY
from app.tls_identity import IdentityProtocol,IdentityWebSocketProtocol
role=sys.argv[1]
assert role in ('backend','gateway')
uvicorn.run('drone_backend.real:app' if role=='backend' else 'app.gateway:app',uds='/run/'+role+'-socket/service.sock',
 http=IdentityProtocol,ws=IdentityWebSocketProtocol,ssl_keyfile=str(IDENTITY/'server.key'),ssl_certfile=str(IDENTITY/'server.crt'),
 ssl_ca_certs=str(IDENTITY/'ca.crt'),ssl_cert_reqs=ssl.CERT_NONE if role=='gateway' else ssl.CERT_REQUIRED,
 access_log=False,limit_concurrency=24,timeout_keep_alive=5)
''')
    common={'image':IMAGE,'pull_policy':'never','network_mode':'none','read_only':True,'restart':'unless-stopped','cap_drop':['ALL'],
        'security_opt':['no-new-privileges:true'],'group_add':['2400'],'cpus':1,'mem_limit':'512m','pids_limit':96,
        'tmpfs':['/tmp:rw,noexec,nosuid,size=64m'],'working_dir':'/workspace',
        'environment':{'PYTHONDONTWRITEBYTECODE':'1','PYTHONUNBUFFERED':'1','DRONE_COOKIE':'drone_real_session'},
        'logging':{'driver':'json-file','options':{'max-size':'5m','max-file':'3'}}}
    services={}
    services['database']={**common,'image':'postgis/postgis:16-3.5@sha256:94146ac37bc61e2322f88016056c5920729cb8c64c8542ed590af8fc2abdac07','user':'999:999','mem_limit':'1g',
        'environment':{'POSTGRES_DB':'drone_real','POSTGRES_USER':'drone_owner','POSTGRES_PASSWORD_FILE':'/run/identity/db-owner-password','POSTGRES_INITDB_ARGS':'--auth-local=scram-sha-256 --auth-host=scram-sha-256'},
        'command':['postgres','-c','listen_addresses=','-c','unix_socket_directories=/var/run/postgresql','-c','unix_socket_permissions=0770','-c','max_connections=20','-c','shared_buffers=128MB'],
        'volumes':['./data/postgres:/var/lib/postgresql/data','./sockets/database:/var/run/postgresql','./secrets/database:/run/identity:ro','./db/init-real.sh:/docker-entrypoint-initdb.d/01-init.sh:ro'],
        'healthcheck':{'test':['CMD','pg_isready','-U','drone_owner','-d','drone_real'],'interval':'10s','timeout':'3s','retries':15}}
    services['backend']={**common,'user':'2201:2201','group_add':['2400','999'],'command':['python','-m','app.real_launch','backend'],
        'volumes':['./app:/workspace/app:ro','./drone_backend:/workspace/drone_backend:ro','./sockets/backend:/run/backend-socket','./sockets/database:/run/db-socket:ro','./secrets/backend:/run/identity:ro','./data/backend:/data']}
    services['gateway']={**common,'user':'2204:2204','command':['python','-m','app.real_launch','gateway'],
        'volumes':['./app:/workspace/app:ro','./sockets/gateway:/run/gateway-socket','./sockets/backend:/run/backend-socket:ro','./secrets/gateway:/run/identity:ro']}
    services['vision']={**common,'user':'2202:2202','command':['python','-m','app.vision_outbox'],
        'volumes':['./app:/workspace/app:ro','./sockets/backend:/run/backend-socket:ro','./secrets/vision:/run/identity:ro','./data/vision:/scratch','./data/models:/models:ro']}
    write(ROOT/'compose.json',json.dumps({'name':PROJECT,'services':services},indent=2))
    write(ROOT/'scripts/stack.sh',f'#!/bin/bash\nset -euo pipefail\nexec sudo {ENGINE}/docker/docker --config {ENGINE}/client -H unix://{ENGINE}/docker.sock compose --project-directory {ROOT} -f {ROOT}/compose.json "$@"\n',mode=0o755)
    run([str(ROOT/'scripts/stack.sh'),'up','-d','database'])
    for _ in range(90):
        p=subprocess.run(DOCKER+['exec',PROJECT+'-database-1','sh','-c','test "$(cat /proc/1/comm)" = postgres && pg_isready -U drone_owner -d drone_real'],capture_output=True)
        if p.returncode==0:break
        time.sleep(1)
    else:raise RuntimeError('Database did not finish initialization')
    sys.path.insert(0,str(ROOT/'db'));import apply as migrations
    migrations.ROOT=ROOT;migrations.CONTAINER=PROJECT+'-database-1'
    migrations.apply('drone_real')
    encoded='pbkdf2_sha256$1000000$'+salt+'$'+account['digest']
    q=lambda x:"'"+x.replace("'","''")+"'"
    perms=json.dumps([{'drone_id':'real-drone-01','scopes':['read','edit','control']}])
    migrations.psql(f"INSERT INTO drone.user_account(user_id,login_id,credential_hash,permissions,status) VALUES ('{uid}','real-operator',{q(encoded)},{q(perms)},'ACTIVE'); INSERT INTO drone.drone(drone_id,name,gateway_id,gateway_state,link_state) VALUES ('real-drone-01','REAL intake device - hardware not connected','real-gateway-01','{{\"environment\":\"REAL\",\"flight_enabled\":false}}','{{}}');",'drone_real')
    print(json.dumps({'database_prepared':True,'runtime_started':False,'root':str(ROOT),'next':'isolated verification, then start services'}))
if __name__=='__main__':provision(sys.argv[1])
