"""Install field software only. Does not arm, change FC parameters, or start flight."""
import argparse
import json
import os
from pathlib import Path
import pwd
import shutil
import subprocess

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--connection',required=True,help='Actual FC serial path or deliberately configured MAVLink endpoint')
    p.add_argument('--identity-dir',type=Path,required=True,help='Existing device mTLS identity containing ca.crt,client.crt,client.key,token')
    p.add_argument('--battery-min',type=float,required=True)
    p.add_argument('--battery-max',type=float,required=True)
    p.add_argument('--user',default='gateway')
    p.add_argument('--server-host',default='127.0.0.1')
    p.add_argument('--server-port',type=int,default=19444)
    p.add_argument('--baud',type=int,default=57600)
    p.add_argument('--target-system',type=int,default=1)
    p.add_argument('--target-component',type=int,default=1)
    p.add_argument('--gcs-system',type=int,default=255)
    a=p.parse_args()
    if os.geteuid()!=0:p.error('Run installer with sudo')
    if not 0<a.battery_min<a.battery_max<100:p.error('Specify validated pack voltage limits')
    account=pwd.getpwnam(a.user)
    a.identity_dir=a.identity_dir.resolve()
    for name in ('ca.crt','client.crt','client.key','token'):
        if not (a.identity_dir/name).is_file():p.error('Missing identity file: '+name)
    root=Path('/opt/drone-real-agent');root.mkdir(mode=0o755,exist_ok=True)
    here=Path(__file__).resolve().parent
    for name in ('real_agent.py','mavlink_executor.py'):shutil.copy2(here/name,root/name)
    subprocess.run(['python3','-m','venv',str(root/'venv')],check=True)
    subprocess.run([str(root/'venv/bin/python'),'-m','pip','install','pymavlink==2.4.50'],check=True)
    state=Path('/var/lib/drone-real-agent');state.mkdir(mode=0o700,exist_ok=True);os.chown(state,account.pw_uid,account.pw_gid)
    folder=Path('/etc/drone-gateway');folder.mkdir(mode=0o750,exist_ok=True)
    os.chown(folder,0,account.pw_gid);folder.chmod(0o750)
    config={'connection':a.connection,'baud':a.baud,'target_system':a.target_system,'target_component':a.target_component,
        'gcs_system_id':a.gcs_system,'battery_min_voltage':a.battery_min,'battery_max_voltage':a.battery_max,
        'server_host':a.server_host,'server_port':a.server_port,'tls_server_name':'backend.internal',
        'journal_file':str(state/'commands.sqlite3'),'serial_lock_file':str(state/'fc.lock')}
    config.update({k:str(a.identity_dir/v) for k,v in [('ca_file','ca.crt'),('cert_file','client.crt'),('key_file','client.key'),('token_file','token')]})
    path=folder/'real-control.json';path.write_text(json.dumps(config,indent=2));path.chmod(0o640);os.chown(path,0,account.pw_gid)
    service=f'''[Unit]
Description=REAL authenticated drone control agent
After=network-online.target
Wants=network-online.target
[Service]
User={a.user}
Group={account.pw_gid}
SupplementaryGroups=dialout
ExecStart={root}/venv/bin/python {root}/real_agent.py --config {path}
WorkingDirectory={root}
Environment=MAVLINK20=1
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths={state}
UMask=0077
[Install]
WantedBy=multi-user.target
'''
    Path('/etc/systemd/system/drone-real-control.service').write_text(service)
    subprocess.run(['systemctl','daemon-reload'],check=True)
    print('Installed. Service has NOT been started. Stop competing FC readers, verify tunnel/identity and FC parameters, then explicitly start drone-real-control.service.')

if __name__=='__main__':main()
