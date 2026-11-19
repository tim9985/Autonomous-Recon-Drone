#!/usr/bin/env bash
set -euo pipefail
umask 077
ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"
OUT="$ROOT/data/backups/$(date -u +%Y%m%dT%H%M%SZ)-$$"
mkdir -p "$OUT"
scripts/stack.sh exec -T --interactive=false database pg_dump -U drone -p 18432 -d drone -Fc > "$OUT/database.dump.partial"
mv "$OUT/database.dump.partial" "$OUT/database.dump"
tar -cf "$OUT/config.tar" Dockerfile compose.yml compose.gpu.yml requirements.lock app config scripts db
(cd "$OUT" && sha256sum database.dump config.tar > SHA256SUMS)
echo "$OUT"
