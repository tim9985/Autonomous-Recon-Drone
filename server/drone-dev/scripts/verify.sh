#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p "$ROOT/evidence"
"$ROOT/scripts/stack.sh" --profile verify run --rm verifier > "$ROOT/evidence/acceptance.json"
python3 -c 'import json,sys; r=json.load(open(sys.argv[1])); assert r["passed"] >= 25; print("PASS:",r["passed"],"acceptance checks")' "$ROOT/evidence/acceptance.json"
sudo python3 "$ROOT/scripts/audit.py" > "$ROOT/evidence/deployment-audit-output.json"

