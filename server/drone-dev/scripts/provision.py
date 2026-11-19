"""Run once as root after upload. Secrets stay only in the target sandbox."""
import hashlib, json, os, pathlib, secrets, subprocess
ROOT=pathlib.Path('/home/se/sandboxes/drone-dev')
assert str(ROOT)=='/home/se/sandboxes/drone-dev'
assert os.geteuid()==0
private=ROOT/'secrets'
if (private/'provisioned').exists():
    raise SystemExit('Already provisioned; use explicit rotation, never regenerate identity silently')

def write(path,value,uid=1001,mode=0o400):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(value)
    os.chown(path,uid,uid); os.chmod(path,mode)

def openssl(*args):
    subprocess.run(['openssl',*map(str,args)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)

def cert(name,uid,usage,san):
    path=private/name; path.mkdir(parents=True,exist_ok=True)
    key=path/'server.key'; csr=path/'request.csr'; crt=path/'server.crt'; ext=path/'extensions.cnf'
    write(ext,'basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage='+usage+'\nsubjectAltName='+san+'\n')
    openssl('req','-new','-newkey','rsa:2048','-nodes','-keyout',key,'-out',csr,'-subj','/CN='+name+'.internal')
    openssl('x509','-req','-in',csr,'-CA',private/'ca.crt','-CAkey',private/'ca.key','-CAcreateserial','-out',crt,'-days','30','-sha256','-extfile',ext)
    for f in (key,crt):os.chown(f,uid,uid); os.chmod(f,0o400)
    csr.unlink();ext.unlink()
    write(path/'ca.crt',(private/'ca.crt').read_text(),uid)
    return hashlib.sha256(subprocess.check_output(['openssl','x509','-in',str(crt),'-outform','DER'])).hexdigest()

private.mkdir(mode=0o700,exist_ok=True)
os.chmod(private,0o700);os.chown(private,1001,1001)
openssl('req','-x509','-newkey','rsa:3072','-nodes','-keyout',private/'ca.key','-out',private/'ca.crt','-days','90','-sha256','-subj','/CN=Drone development CA 20261005','-addext','basicConstraints=critical,CA:TRUE','-addext','keyUsage=critical,keyCertSign,cRLSign')
for name in ('ca.key','ca.crt'):os.chmod(private/name,0o600);os.chown(private/name,1001,1001)
for name,uid in [('backend',2101),('web',2103),('gateway',2104)]:
    cert(name,uid,'serverAuth','DNS:'+name+'.internal'+(',DNS:localhost,IP:127.0.0.1' if name=='gateway' else ''))
principals=[]
for role,uid,pid,scopes in [('gateway',2104,'web-gateway',['status.read','probes.read']),('vision',2102,'vision-01',['vision.report']),('sim-device',2105,'sim-pi-01',['device.telemetry'])]:
    fp=cert(role+'-client',uid,'clientAuth','DNS:'+pid)
    folder=private/role;folder.mkdir(exist_ok=True)
    token=secrets.token_urlsafe(32)
    write(folder/'token',token,uid)
    for filename in ('client.key','client.crt'):
        source=private/(role+'-client')/filename.replace('client','server')
        write(folder/filename,source.read_text(),uid)
    write(folder/'ca.crt',(private/'ca.crt').read_text(),uid)
    record={'id':pid,'token':token,'certificate_sha256':fp,'scopes':scopes}
    if role=='gateway':record['read_subjects']=['sim-pi-01','vision-01']
    if role=='sim-device':record['drone_id']='sim-pi-01'
    principals.append(record)
write(private/'backend'/'principals.json',json.dumps(principals),2101)
api_password=secrets.token_urlsafe(32)
write(private/'backend'/'db-api-password',api_password,2101)
write(private/'database'/'db-api-password',api_password,999)
write(private/'database'/'db-owner-password',secrets.token_urlsafe(32),999)
password=secrets.token_urlsafe(24);salt=secrets.token_bytes(24)
account={'username':'dev-operator','salt':salt.hex(),'digest':hashlib.pbkdf2_hmac('sha256',password.encode(),salt,1_000_000).hex()}
write(private/'gateway'/'operator.json',json.dumps(account),2104)
write(private/'operator-login.json',json.dumps({'username':'dev-operator','password':password}),1001,0o600)
# Verifier is a stopped-by-default administrator test client, never a running workload.
verify=private/'verifier';verify.mkdir(exist_ok=True)
for src,dst in [(private/'sim-device'/'client.crt','client.crt'),(private/'sim-device'/'client.key','client.key'),(private/'ca.crt','ca.crt'),(private/'operator-login.json','operator-login.json')]:
    write(verify/dst,src.read_text(),2105)
for role in ('vision','sim-device','gateway'):
    for name in ('token','client.crt','client.key'):
        write(verify/(role+'-'+name),(private/role/name).read_text(),2105)
for name,uid,gid in [('database',999,999),('backend',2101,2400),('web',2103,2400),('gateway',2104,1001)]:
    directory=ROOT/'sockets'/name;directory.mkdir(parents=True,exist_ok=True)
    os.chown(directory,uid,gid);os.chmod(directory,0o770 if name=='database' else 0o2770)
for name,uid in [('postgres',999),('backend',2101),('vision',2102),('models',1001)]:
    directory=ROOT/'data'/name;directory.mkdir(parents=True,exist_ok=True)
    os.chown(directory,uid,uid);os.chmod(directory,0o755 if name=='models' else 0o700)
# Mount roots need traversal by the intended container identity, not by everyone on host.
for role,uid in [('backend',2101),('vision',2102),('web',2103),('gateway',2104),('database',999),('verifier',2105),('sim-device',2105)]:
    os.chown(private/role,uid,uid);os.chmod(private/role,0o700)
write(private/'provisioned','2026-10-05 development identity v1\n',1001,0o600)
for directory in ('app','web','db','scripts'):
    for path in (ROOT/directory).rglob('*'):
        os.chmod(path,0o755 if path.is_dir() or path.suffix=='.sh' else 0o644)
print('Provisioned private service identities; no credentials printed')

