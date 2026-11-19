"""Start verified REAL storage services and loopback TLS relays only."""
import hashlib,json,os,pathlib,shutil,subprocess
ROOT=pathlib.Path('/home/se/sandboxes/drone-real')
assert os.geteuid()==0
proof=json.loads((ROOT/'evidence/real-storage-check.json').read_text())
assert proof['passed']>=39 and proof['temporary_database_removed']
for rel,h in proof['source_sha256'].items():assert hashlib.sha256((ROOT/rel).read_bytes()).hexdigest()==h,rel
backup=ROOT/'backups/initial-real';backup.mkdir(mode=0o700,parents=True,exist_ok=False)
engine='/home/se/sandboxes/drone-server/runtime'
docker=[engine+'/docker/docker','-H','unix://'+engine+'/docker.sock']
with (backup/'before-live.dump').open('wb') as f:
    subprocess.run(docker+['exec','drone-real-20261006-database-1','sh','-c','export PGPASSWORD="$(cat /run/identity/db-owner-password)"; exec pg_dump -U drone_owner -d drone_real -Fc'],stdout=f,check=True)
for folder in ('app','drone_backend','db/migrations'):shutil.copytree(ROOT/folder,backup/folder)
subprocess.run([str(ROOT/'scripts/stack.sh'),'up','-d','backend','gateway','vision'],check=True)
unit='''[Unit]
Description=Drone REAL loopback TLS relays
After=network.target drone-sandbox-engine.service
[Service]
Type=simple
User=se
Group=se
SupplementaryGroups=drone-real-transport
ExecStart=/usr/bin/python3 /home/se/sandboxes/drone-real/tools/real_relay.py
Restart=on-failure
RestartSec=3
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=read-only
PrivateTmp=yes
CapabilityBoundingSet=
RestrictAddressFamilies=AF_INET AF_UNIX
MemoryMax=128M
CPUQuota=20%
TasksMax=64
[Install]
WantedBy=multi-user.target
'''
path=pathlib.Path('/etc/systemd/system/drone-real-relay.service')
assert not path.exists(),'Existing relay unit must not be silently replaced'
path.write_text(unit)
subprocess.run(['systemctl','daemon-reload'],check=True)
subprocess.run(['systemctl','enable','--now','drone-real-relay.service'],check=True)
schema=subprocess.check_output([str(ROOT/'scripts/stack.sh'),'exec','-T','backend','python','-c','import json;from drone_backend.real import app;print(json.dumps(app.openapi(),ensure_ascii=False))'],text=True)
(ROOT/'openapi-real.json').write_text(schema)
print(json.dumps({'started':'REAL storage services','operator_https':'https://localhost:19443','device_mtls_port':19444,'flight_enabled':False,'model_loaded':False}))
