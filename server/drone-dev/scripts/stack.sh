#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
ENGINE=/home/se/sandboxes/drone-server/runtime
exec sudo "$ENGINE/docker/docker" --config "$ENGINE/client" --host "unix://$ENGINE/docker.sock" compose --project-directory "$ROOT" -f "$ROOT/compose.yml" -f "$ROOT/compose.school.yml" -f /home/se/sandboxes/drone-dev/compose.vision.json -f "$ROOT/compose.regional-search.yml" -f "$ROOT/compose.pc-sim.json" "$@"

