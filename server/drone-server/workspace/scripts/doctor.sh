#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"
scripts/stack.sh config --quiet
scripts/stack.sh ps
curl -fsS http://127.0.0.1:18400/health/ready
echo
STATUS=$(curl -fsS http://127.0.0.1:18400/health/components)
printf '%s\n' "$STATUS"
printf '%s' "$STATUS" | python3 -c 'import json,sys; assert json.load(sys.stdin)["status"] == "ok", "One or more services are unavailable"'
df -hT data
nvidia-smi --query-gpu=name,driver_version,memory.used,memory.total --format=csv,noheader
