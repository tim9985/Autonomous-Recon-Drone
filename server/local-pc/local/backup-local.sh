#!/usr/bin/env bash
# Back up the local control web and REAL databases plus the gateway link state.
# Read-only for the running services. Output: ~/capstone-backups/<date-time>/ (mode 0700).
#   wsl -d Capstone-Pipeline -- bash local/backup-local.sh
# Restore notes are written next to the dumps (RESTORE.txt).
set -euo pipefail
umask 077
out="$HOME/capstone-backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$out"

dump() {  # container database file
    docker exec "$1" sh -c 'PGPASSWORD="$(cat /run/identity/db-owner-password)" exec pg_dump -U drone_owner -d "$0" -Fc' "$2" > "$out/$3"
    echo "$3 $(du -h "$out/$3" | cut -f1)"
}
dump capstone-school-web-database-1 drone_dev control-web.drone_dev.dump
dump drone-real-20261006-database-1 drone_real real.drone_real.dump

# Gateway registrations, missions, flight history and the pairing-key seeds (secret).
docker exec capstone-school-web-backend-1 sh -c 'cd /data && tar -cf - pc-workspaces .real-gateway-seeds 2>/dev/null' \
    > "$out/control-web.data.tar"
echo "control-web.data.tar $(du -h "$out/control-web.data.tar" | cut -f1)"

(cd "$out" && sha256sum ./*.dump ./*.tar > SHA256SUMS)
cat > "$out/RESTORE.txt" <<'EOF'
Restore (stop the API first, keep the original volumes until the restore is verified):
  docker exec -i capstone-school-web-database-1 sh -c 'PGPASSWORD="$(cat /run/identity/db-owner-password)" pg_restore -U drone_owner -d drone_dev --clean --if-exists' < control-web.drone_dev.dump
  docker exec -i drone-real-20261006-database-1 sh -c 'PGPASSWORD="$(cat /run/identity/db-owner-password)" pg_restore -U drone_owner -d drone_real --clean --if-exists' < real.drone_real.dump
  docker exec -i capstone-school-web-backend-1 sh -c 'cd /data && tar -xf -' < control-web.data.tar
The tar holds .real-gateway-seeds, from which gateway keys are derived: never share or commit it.
EOF
echo "backup: $out"
