#!/usr/bin/env bash
# 전송 꾸러미 만들기 (se 권한 · root 불필요) — 2026-11-19
# 결과: /home/se/migration_20261119/transfer/NN_*.tar
# 낮은 우선순위로 돈다 (nice 19 · ionice idle) — 서비스 · worker 에 영향 없음
set -uo pipefail
C=/home/se/JupyterLAB/Capstone
Y=$C/drone_yolo
D=$C/data
SB=/home/se/sandboxes
T=/home/se/migration_20261119/transfer
LOG=/home/se/migration_20261119/logs/make_bundle.log
LOW() { nice -n 19 ionice -c3 "$@"; }
log() { echo "[$(TZ=Asia/Seoul date '+%F %T')] $*" | tee -a "$LOG"; }
mk() { # 이름 · 기준 폴더 · tar 옵션/대상...
  local name=$1 base=$2; shift 2
  if [ -s "$T/$name" ] && [ -e "$T/.$name.done" ]; then log "있음: $name"; return; fi
  log "만드는 중: $name"
  if LOW tar -C "$base" -cf "$T/$name.part" "$@" 2>>"$LOG"; then
    mv "$T/$name.part" "$T/$name"; touch "$T/.$name.done"
    log "  끝: $name $(du -h "$T/$name" | cut -f1)"
  else
    log "  ⚠ 경고 (일부 못 읽음): $name — 로그 확인"; mv "$T/$name.part" "$T/$name"; touch "$T/.$name.done"
  fi
}
mkdir -p "$T"
log "===== 시작"

# 01 — 배포 · 핵심 모델 (worker 를 바로 돌릴 수 있는 꾸러미 + 기준 가중치)
mk 01_models_deploy.tar "$Y" \
  runs_person/_pack_v12w_real runs_person/_pack_v12w_sim runs_person/_pack_v12 runs_person/_pack_color_siglip2 \
  runs_person/v12_f91_swa15 runs_person/v12_f91_swa \
  weights rtdetr-l.pt yolo11l.pt yolo26m.pt yolo11m.pt yolov8s.pt yolo11s.pt yolo11s-cls.pt

# 02 — 모든 학습 실행의 best.pt (217개)
( cd "$Y" && find runs_person -path '*/weights/best.pt' -print > /home/se/migration_20261119/logs/best_pt_list.txt )
mk 02_runs_best_pt.tar "$Y" -T /home/se/migration_20261119/logs/best_pt_list.txt

# 03 — 학습 실행 기록 (가중치 · 엔진 빼고: results.csv · args · eval npz · dumps) + 자세 · 상태 · 공정 비교 결과
mk 03_runs_meta.tar "$Y" --exclude='*.pt' --exclude='*.engine' --exclude='*.onnx' runs_person runs_state runs_fair runs_occ
mk 04_runs_posture.tar "$Y" runs_posture

# 05 — 평가셋 (인수 검증 test_v2 · 발표 수치 재현) — 연구용 데이터 파생물 · 공개 금지
mk 05_eval_sets.tar "$D" $(cd "$D" && ls -d test_* val_v12_set by_tilt digital_department_test pose_eval pose_feat pose_cls lying_bank ue_level01.tar.gz 2>/dev/null)

# 06 — UE 비행 녹화 · 학습 로그 · 학습 목록 · 큰 수치 원본 · UE 도구
mk 06_ue_flight_logs_lists.tar "$Y" ue_flight logs configs/lists metrics "10.17 UE" ue_tools docs

# 07 — 문서 · 발표 (git 밖 원본: hwpx · docx · pptx · 사진) — 발표 준비용
mk 07_docs_present.tar "$C" 발표자료 보고서 "드론 조립" obsidian README.md .gitignore

# 08 — 팀 공유 드라이브 미러 (전자서명 · 공문서 — 공유 주의)
mk 08_team_drive.tar "$C" 팀드라이브

# 09 — 서버 코드 읽을 수 있는 부분 (sudo 스크립트를 못 돌릴 때의 대비 · 비밀 · DB 원본 제외)
mk 09_server_readable.tar /home/se \
  --exclude='sandboxes/*/secrets' --exclude='sandboxes/*/certs' --exclude='sandboxes/*/sockets' \
  --exclude='sandboxes/*/data/postgres' --exclude='sandboxes/drone-server/runtime/docker-data' --exclude='sandboxes/drone-server/runtime/docker-exec' \
  --exclude='sandboxes/drone-server/runtime/*.sock' --exclude='sandboxes/drone-server/runtime/runtime' \
  --exclude='sandboxes/*/backups' --exclude='sandboxes/drone-dev-backups' --exclude='drone-ground-control/control_key' \
  --exclude='real-control-stage-20261117/venv' \
  --ignore-failed-read \
  sandboxes drone-ground-control real-control-stage-20261117 codex-gateway-verification-20261111 deploy_vision.sh fix_gpu.sh

log "===== SHA-256"
( cd "$T" && LOW sha256sum [0-9]*.tar > SHA256SUMS.part && mv SHA256SUMS.part SHA256SUMS )
du -sh "$T"/[0-9]* | tee -a "$LOG"
log "===== 끝"
