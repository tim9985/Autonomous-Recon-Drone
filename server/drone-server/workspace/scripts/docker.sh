#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
export DOCKER_CONFIG="$ROOT/runtime/client"
exec sudo "$ROOT/runtime/docker/docker" --config "$DOCKER_CONFIG" --host "unix://$ROOT/runtime/docker.sock" "$@"
