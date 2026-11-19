#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
export PATH="$ROOT/runtime/docker:$PATH"
exec "$ROOT/runtime/docker/dockerd" \
  --config-file "$ROOT/runtime/daemon.json" \
  --host "unix://$ROOT/runtime/docker.sock" \
  --data-root "$ROOT/runtime/docker-data" \
  --exec-root "$ROOT/runtime/docker-exec" \
  --pidfile "$ROOT/runtime/docker.pid" \
  --bridge none --iptables=false --ip6tables=false --ip-forward=false \
  --ip-masq=false --userland-proxy=false --storage-driver overlay2
