#!/bin/bash
# aihub182_dl_places.sh — 장소 다양성 확보용 AI-Hub 182 다운로드 (2026-09-23)
#
# 왜: 장소 분리 평가에서 본 장소 0.856 vs 처음 본 장소 0.223 — 병목은 **장소 일반화**다.
#     현재 학습 데이터는 미국 워싱턴주 한두 생태권(NOMAD 61 %)뿐이다.
# 순서: 라벨 전수로 zip 별 지명을 미리 구해 **GB 당 새 지명이 많은 순**으로 받는다.
#       전체 28곳 중 앞 15개(303 GB)로 26곳이 새로 추가되고, 그 뒤는 새 지명 0 → 받지 않는다.
# 키: ~/.config/aihub/api_key (스크립트에 넣지 않는다)
set -u
ROOT=/home/se/JupyterLAB/Capstone/data/raw/AIHub182
JOBS="조난자_시흥_화성01:47897 조난자_시흥_의왕_화성02:47896 조난자_남양_시흥01:48002 조난자_화성03:47908 조난자_화성22:47844 조난자_화성12:47917 조난자_송산_화성01:47960 조난자_화성16:47838 조난자_안산01:47900 조난자_화성27:47868 조난자_화성11:47916 조난자_화성20:47842 조난자_화성05:47910 조난자_시흥_의왕01:47863 조난자_화성19:47841 "
log(){ echo "[$(TZ=Asia/Seoul date '+%F %T') KST] $*"; }
for j in $JOBS; do
  name=${j%%:*}; key=${j##*:}; d=$ROOT/$name
  if [ -d "$d" ] && [ -n "$(find "$d" -name '*.jpg' 2>/dev/null | head -1)" ] && [ -z "$(find "$d" -name '*.zip' 2>/dev/null)" ]; then
    log "$name 이미 있음 — 건너뜀"; continue; fi
  mkdir -p "$d" && cd "$d" || exit 1
  log "$name (filekey $key) 받기 시작"
  AIHUB_APIKEY=$(cat ~/.config/aihub/api_key) ~/bin/aihubshell -mode d -datasetkey 182 -filekey "$key" || { log "$name 실패 — 다음"; continue; }
  log "$name 압축 풀기"
  find . -name '*.zip' | while read -r z; do unzip -oq "$z" -d "$(dirname "$z")/$(basename "${z%.zip}")" 2>/dev/null && rm -f "$z"; done
  log "$name 완료 · 이미지 $(find . -name '*.jpg' | wc -l)장 · $(du -sh . | cut -f1)"
done
log "전체 완료 · $(du -sh $ROOT | cut -f1)"; touch $ROOT/.dl_places_done
