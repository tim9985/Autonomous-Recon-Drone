#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"
BACKUP=$(realpath "${1:?Provide the backup directory}")
case "$BACKUP" in "$ROOT"/data/backups/*) ;; *) echo 'Backup must be inside this sandbox.' >&2; exit 1;; esac
(cd "$BACKUP" && sha256sum -c SHA256SUMS)
PROBE="restore_probe_$(date -u +%Y%m%d%H%M%S)_$$"
scripts/stack.sh exec -T --interactive=false database createdb -U drone -p 18432 "$PROBE"
cleanup() { scripts/stack.sh exec -T --interactive=false database dropdb -U drone -p 18432 "$PROBE"; }
trap cleanup EXIT
scripts/stack.sh exec -T database pg_restore -U drone -p 18432 --exit-on-error --no-owner -d "$PROBE" < "$BACKUP/database.dump"
VALUE=$(scripts/stack.sh exec -T --interactive=false database psql -U drone -p 18432 -d "$PROBE" -tAc "SELECT value FROM drone.environment_info WHERE key='environment'")
test "$VALUE" = sandbox
echo 'Restoration into a temporary database passed; existing drone database was not overwritten.'
