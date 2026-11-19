#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# 서버 이전 — root 권한이 있어야 읽히는 자료 모으기 (2026-11-19)
#
#   sudo bash /home/se/migration_20261119/collect_root.sh              # 기본 (DB · 데이터 · 이미지 · 비밀 묶음)
#   sudo bash /home/se/migration_20261119/collect_root.sh --no-images  # Docker 이미지 빼고 (가장 큼 · 10 GB 안팎)
#   sudo bash /home/se/migration_20261119/collect_root.sh --no-secrets # 비밀 묶음 빼고
#   sudo bash /home/se/migration_20261119/collect_root.sh --with-backups  # 서버 안 복구 사본까지 (큼)
#
# 하는 일 — 모두 읽기만 한다. 서비스 중지 · 재시작 · 설정 변경 · 삭제 없음.
#   1) 실행 중인 컨테이너 · 이미지 목록
#   2) DB 3개 pg_dump (drone · drone_dev · drone_real) + 역할 (globals, 비밀 묶음 안)
#   3) root 전용 데이터 tar — 업무 미디어 · 비전 결과 · REAL 녹화 (실비행) · 배포 묶음
#   4) Docker 이미지 save (zstd) — 새 컴퓨터에서 docker load 로 같은 이미지
#   5) 비밀 묶음 — secrets/ · certs/ · 지상 제어 키 → openssl AES-256 암호화 (비밀번호를 묻는다)
#   6) 결과를 se 소유로 바꾸고 SHA-256 목록
# 결과: /home/se/migration_20261119/transfer/00_root/
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

WITH_IMAGES=1; WITH_SECRETS=1; WITH_BACKUPS=0
for a in "$@"; do
  case "$a" in
    --no-images) WITH_IMAGES=0 ;;
    --no-secrets) WITH_SECRETS=0 ;;
    --with-backups) WITH_BACKUPS=1 ;;
    *) echo "모르는 옵션: $a"; exit 1 ;;
  esac
done
[ "$(id -u)" -eq 0 ] || { echo "sudo 로 실행하세요: sudo bash $0"; exit 1; }

SB=/home/se/sandboxes
MIG=/home/se/migration_20261119
OUT=$MIG/transfer/00_root
ENGINE=$SB/drone-server/runtime
ZSTD=/home/se/miniconda3/bin/zstd
DK() { "$ENGINE/docker/docker" --config "$ENGINE/client" --host "unix://$ENGINE/docker.sock" "$@"; }
LOW() { nice -n 19 ionice -c3 "$@"; }
log() { echo "[$(TZ=Asia/Seoul date '+%F %T')] $*" | tee -a "$OUT/collect.log"; }

mkdir -p "$OUT"/{db,data,images,meta}
: > "$OUT/collect.log"
log "시작 — images=$WITH_IMAGES secrets=$WITH_SECRETS backups=$WITH_BACKUPS"
df -h "$MIG" | tee -a "$OUT/collect.log"

# ── 1) 컨테이너 · 이미지 목록 ───────────────────────────────────────────────
log "1/6 컨테이너 · 이미지 목록"
DK ps -a --format '{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Label "com.docker.compose.project"}}\t{{.Label "com.docker.compose.service"}}' > "$OUT/meta/containers.tsv"
DK images --digests --format '{{.Repository}}:{{.Tag}}\t{{.Digest}}\t{{.ID}}\t{{.Size}}\t{{.CreatedAt}}' > "$OUT/meta/images.tsv"
# 컨테이너 마운트 · 명령 · 사용자 (환경 변수는 빼고 — 비밀이 섞일 수 있음)
for c in $(DK ps -a --format '{{.Names}}'); do
  DK inspect --format '{{.Name}}|{{.Config.Image}}|{{.Image}}|user={{.Config.User}}|cmd={{json .Config.Cmd}}|net={{.HostConfig.NetworkMode}}|mounts={{range .Mounts}}{{.Source}}->{{.Destination}}({{if .RW}}rw{{else}}ro{{end}}) {{end}}' "$c"
done > "$OUT/meta/container-mounts.txt"
cat "$OUT/meta/containers.tsv" | tee -a "$OUT/collect.log"

# ── 2) DB dump ─────────────────────────────────────────────────────────────
cid() { DK ps -q --filter "label=com.docker.compose.project=$1" --filter "label=com.docker.compose.service=$2" | head -n1; }
dump_db() { # project · 이름 · 접속 인자 · 비밀번호 파일(컨테이너 안)
  local proj=$1 name=$2 conn=$3 pwfile=$4 c
  c=$(cid "$proj" database)
  if [ -z "$c" ]; then log "  ⚠ $name DB 컨테이너 없음 ($proj) — 건너뜀"; return; fi
  log "  $name ← $proj"
  if ! DK exec "$c" sh -c "PGPASSWORD=\"\$(cat $pwfile)\" pg_dump $conn -Fc" > "$OUT/db/$name.dump"; then
    log "  ⚠ $name pg_dump 실패 — 로그 위 오류 확인"; FAILED+=("db:$name"); return 0
  fi
  DK exec "$c" sh -c "PGPASSWORD=\"\$(cat $pwfile)\" pg_dump $conn --schema-only" > "$OUT/db/$name.schema.sql" || log "  ⚠ $name schema-only 실패"
  DK exec "$c" sh -c "PGPASSWORD=\"\$(cat $pwfile)\" pg_dumpall ${conn% -d *} --globals-only" > "$OUT/meta/.$name.globals.sql" || log "  ⚠ $name globals 실패"
  DK exec "$c" sh -c "PGPASSWORD=\"\$(cat $pwfile)\" psql $conn -At -c \"select version(); select extname||' '||extversion from pg_extension order by 1;\"" > "$OUT/db/$name.versions.txt" || true
  DK exec -i "$c" pg_restore --list < "$OUT/db/$name.dump" > "$OUT/db/$name.toc.txt" || { log "  ⚠ $name 덤프 목차 읽기 실패"; FAILED+=("toc:$name"); }
  log "    $(du -h "$OUT/db/$name.dump" | cut -f1) · 목차 $(wc -l < "$OUT/db/$name.toc.txt" 2>/dev/null || echo 0) 줄"
}
FAILED=()
log "2/6 DB dump"
dump_db drone-sandbox-20261003 drone       "-h 127.0.0.1 -p 18432 -U drone -d drone"              /run/secrets/db-password
dump_db drone-services-20261005 drone_dev  "-h /var/run/postgresql -U drone_owner -d drone_dev"   /run/identity/db-owner-password
dump_db drone-real-20261006   drone_real   "-h /var/run/postgresql -U drone_owner -d drone_real"  /run/identity/db-owner-password

# ── 3) root 전용 데이터 ─────────────────────────────────────────────────────
log "3/6 root 전용 데이터 (DB 원본 파일 · 소켓 · 엔진 저장소는 뺀다)"
tarit() { # 결과 이름 · 기준 폴더 · 대상...
  local name=$1 base=$2; shift 2
  local have=()
  for t in "$@"; do if [ -e "$base/$t" ]; then have+=("$t"); fi; done
  [ ${#have[@]} -gt 0 ] || { log "  (없음) $name"; return; }
  local rc=0; LOW tar --numeric-owner --warning=no-file-changed -C "$base" -cf "$OUT/data/$name.tar" "${have[@]}" || rc=$?
  [ $rc -le 1 ] || { log "  ⚠ $name tar 오류 $rc"; FAILED+=("tar:$name"); }
  log "  $name.tar $(du -h "$OUT/data/$name.tar" | cut -f1) ← ${have[*]}"
}
# sandbox 3개 = 서버에 있는 그대로 (root 전용 파일 포함) — DB 원본 파일 · 소켓 · 비밀 · 엔진 저장소 · 복구 사본만 뺀다
tar_sandbox() { # 이름 · 추가 제외...
  local e=$1; shift
  local ex=(--exclude=./data/postgres --exclude=./sockets --exclude=./secrets --exclude=./certs --exclude=./backups --exclude=./archives
            --exclude='./deployment/releases/*/private' --exclude='./evidence/private*')
  for x in "$@"; do ex+=(--exclude="$x"); done
  local rc=0; LOW tar --numeric-owner --warning=no-file-changed "${ex[@]}" -C "$SB/$e" -cf "$OUT/data/sandbox_$e.tar" . || rc=$?
  [ $rc -le 1 ] || { log "  ⚠ sandbox_$e tar 오류 $rc"; FAILED+=("tar:sandbox_$e"); }
  log "  sandbox_$e.tar $(du -h "$OUT/data/sandbox_$e.tar" | cut -f1)"
}
tar_sandbox drone-real
tar_sandbox drone-dev
tar_sandbox drone-server ./runtime/docker-data ./runtime/docker-exec ./runtime/docker.sock ./runtime/runtime
tarit stage_worker14_20261115  /var/tmp  drone-vision-20261115.tPPsLw
tarit home_server_stages       /home/se  real-control-stage-20261117 school-fc-stage-20261029T123254Z-ac81a32f school-fc-stage-20261029T131315Z-fe3289ba codex-gateway-verification-20261111 fix_gpu_backup-20261009-1120 deploy_vision.sh deploy_vision.log fix_gpu.sh fix_gpu.log
if [ "$WITH_BACKUPS" -eq 1 ]; then
  tarit dev_archives     $SB/drone-dev     archives
  tarit dev_backups      $SB/drone-dev     backups
  tarit real_backups     $SB/drone-real    backups
  tarit server_backups   $SB/drone-server  backups
  tarit dev_backups_old  $SB               drone-dev-backups
fi
cp -a /etc/systemd/system/drone-*.service "$OUT/meta/" 2>/dev/null || true

# ── 4) Docker 이미지 ───────────────────────────────────────────────────────
if [ "$WITH_IMAGES" -eq 1 ]; then
  log "4/6 Docker 이미지 save (zstd · 수십 분)"
  : > "$OUT/images/images-manifest.tsv"
  refs=()
  for img in $(DK ps -a --format '{{.Image}}' | sort -u) drone-real-vision:20261007 drone-regional-base:20261022; do
    id=$(DK image inspect -f '{{.Id}}' "$img" 2>/dev/null) || continue
    tags=$(DK image inspect -f '{{join .RepoTags ","}}' "$img")
    digs=$(DK image inspect -f '{{join .RepoDigests ","}}' "$img")
    printf '%s\t%s\t%s\t%s\n' "$id" "$img" "$tags" "$digs" >> "$OUT/images/images-manifest.tsv"
    if [ -n "$tags" ]; then IFS=, read -ra t <<< "$tags"; refs+=("${t[@]}"); else refs+=("$id"); fi
  done
  mapfile -t refs < <(printf '%s\n' "${refs[@]}" | sort -u)
  log "  ${#refs[@]}개: ${refs[*]}"
  if DK save "${refs[@]}" | LOW "$ZSTD" -T8 -6 -q -f -o "$OUT/images/images.tar.zst"; then
    log "  images.tar.zst $(du -h "$OUT/images/images.tar.zst" | cut -f1)"
  else
    log "  ⚠ 이미지 save 실패"; FAILED+=("images")
  fi
else
  log "4/6 Docker 이미지 — 건너뜀 (--no-images)"
fi

# ── 5) 비밀 묶음 (암호화) ───────────────────────────────────────────────────
if [ "$WITH_SECRETS" -eq 1 ]; then
  log "5/6 비밀 묶음 — 암호화 비밀번호를 두 번 입력하세요 (잊으면 못 엽니다 · 채팅에 적지 마세요)"
  SEC=$(mktemp -d); chmod 700 "$SEC"
  for e in drone-server drone-dev drone-real; do
    for s in secrets certs; do if [ -e "$SB/$e/$s" ]; then tar --numeric-owner -C "$SB/$e" -cf "$SEC/$e-$s.tar" "$s"; fi; done
  done
  tar -C /home/se -cf "$SEC/ground-control-keys.tar" drone-ground-control/control_key drone-ground-control/control_key.pub drone-ground-control/gateway_known_hosts 2>/dev/null || true
  (cd "$SB/drone-dev" && ls -d deployment/releases/*/private evidence/private* 2>/dev/null | tar --numeric-owner -cf "$SEC/drone-dev-private-dirs.tar" -T -) || true
  for g in "$OUT"/meta/.*.globals.sql; do if [ -e "$g" ]; then mv "$g" "$SEC/$(basename "$g" | sed 's/^\.//')"; fi; done
  tar -C "$SEC" -czf - . | /usr/bin/openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -out "$OUT/secrets.tar.gz.enc"
  rm -rf "$SEC"
  log "  secrets.tar.gz.enc $(du -h "$OUT/secrets.tar.gz.enc" | cut -f1) · 풀기: openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in secrets.tar.gz.enc | tar -xz"
else
  rm -f "$OUT"/meta/.*.globals.sql
  log "5/6 비밀 묶음 — 건너뜀 (--no-secrets) · DB 역할(globals) 파일도 지움"
fi

# ── 6) 소유자 · 해시 ───────────────────────────────────────────────────────
log "6/6 소유자 se · SHA-256"
chown -R se:se "$OUT"; chmod -R go-rwx "$OUT"
(cd "$OUT" && find . -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS)
du -sh "$OUT"/* | tee -a "$OUT/collect.log"
if [ ${#FAILED[@]} -gt 0 ]; then log "⚠ 실패한 항목: ${FAILED[*]} — 위 로그를 Claude 에게 보여 주세요"; else log "모든 항목 성공"; fi
log "끝 — 결과 $OUT"
