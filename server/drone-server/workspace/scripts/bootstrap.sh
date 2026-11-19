#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"
umask 077
mkdir -p runtime/client/cli-plugins logs secrets data/missions workspace evidence
cp -r app config scripts workspace/
python3 - <<'PY'
import pathlib, secrets
root = pathlib.Path('.')
for name in ['db-password','jupyter-token']:
    path = root / 'secrets' / name
    if not path.exists():
        path.write_text(secrets.token_urlsafe(32))
        path.chmod(0o600)
db = (root/'secrets/db-password').read_text().strip()
(root/'.env').write_text('DATABASE_PASSWORD='+db+'\n')
(root/'.env').chmod(0o600)
(root/'runtime/daemon.json').write_text('{}\n')
PY
curl -fL --retry 3 https://download.docker.com/linux/static/stable/x86_64/docker-29.8.2.tgz -o runtime/docker.tgz
tar -xzf runtime/docker.tgz -C runtime
curl -fL --retry 3 https://github.com/docker/compose/releases/download/v2.40.3/docker-compose-linux-x86_64 -o runtime/client/cli-plugins/docker-compose
curl -fL --retry 3 https://github.com/docker/buildx/releases/download/v0.29.1/buildx-v0.29.1.linux-amd64 -o runtime/client/cli-plugins/docker-buildx
chmod +x scripts/*.sh runtime/client/cli-plugins/*
sha256sum runtime/docker.tgz runtime/client/cli-plugins/* > evidence/runtime-downloads.sha256
python3 - <<'PY'
import glob, json, os, pathlib
libs = []
for pattern in ['libcuda.so.*','libnvidia-ml.so.*','libnvidia-ptxjitcompiler.so.*','libnvidia-nvvm.so.*','libnvidia-gpucomp.so.*']:
    for path in glob.glob('/lib/x86_64-linux-gnu/'+pattern):
        libs.append(path+':/opt/nvidia/'+os.path.basename(path)+':ro')
libs.append('/usr/bin/nvidia-smi:/usr/local/bin/nvidia-smi:ro')
devices = [p+':'+p for p in ['/dev/nvidia0','/dev/nvidiactl','/dev/nvidia-uvm','/dev/nvidia-uvm-tools'] if os.path.exists(p)]
conf = {'services': {name: {'devices': devices, 'volumes': sorted(set(libs))} for name in ['jupyter','vision']}}
pathlib.Path('compose.gpu.yml').write_text(json.dumps(conf, indent=2)+'\n')
PY
cat > runtime/drone-sandbox-engine.service <<EOF
[Unit]
Description=Isolated drone sandbox Docker engine
After=network-online.target
Wants=network-online.target
[Service]
Type=simple
ExecStart=$ROOT/scripts/start-engine.sh
Restart=on-failure
RestartSec=5
TimeoutStartSec=0
LimitNOFILE=1048576
[Install]
WantedBy=multi-user.target
EOF
sudo systemctl link "$ROOT/runtime/drone-sandbox-engine.service"
sudo systemctl enable --now drone-sandbox-engine.service
for n in $(seq 1 30); do
  if scripts/docker.sh info > evidence/docker-info.txt 2>&1; then break; fi
  sleep 1
done
scripts/docker.sh version > evidence/docker-version.txt
echo 'Sandbox engine is ready.'
