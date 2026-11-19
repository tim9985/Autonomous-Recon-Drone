#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"
exec "$ROOT/scripts/docker.sh" compose --progress plain --project-directory "$ROOT" -f compose.yml -f compose.gpu.yml "$@"
