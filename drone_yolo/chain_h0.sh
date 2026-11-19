#!/bin/bash
# chain_h0.sh — 11-11 H0 학습 길이 · 평균 구간 진단 (학습 없음 · 판정 = _학습 큐 「11-11 H0」) · N1 학습과 나란히 (평가 한 번에 하나)
cd /home/se/JupyterLAB/Capstone/drone_yolo
P=/home/se/miniconda3/envs/drone/bin/python; Q=logs/QUEUE.md; R=metrics/AUTO_RESULT_h0.md; IGN=data/test_v2/ignore_v1.json
log(){ echo "[$(TZ=Asia/Seoul date '+%F %T') KST] $*" | tee -a $Q $R; }
ap(){ awk -F, 'NR==2{print $3}' "$1" 2>/dev/null; }
ev(){ local m=$1
  $P eval_test_v2.py --weights runs_person/$m/weights/best.pt --data data/test_obl --mode single --tag test_obl >> logs/h0_$m.log 2>&1
  $P eval_test_v2.py --weights runs_person/$m/weights/best.pt --merge edge --ignore $IGN >> logs/h0_$m.log 2>&1
  $P eval_test_v2.py --weights runs_person/$m/weights/best.pt --data data/test_kr --tag test_kr --merge edge >> logs/h0_$m.log 2>&1
  $P eval_test_v2.py --weights runs_person/$m/weights/best.pt --data data/test_auair --tag test_auair --boot 0 >> logs/h0_$m.log 2>&1
  log "   $m obl $(ap metrics/test_obl_$m.csv) · v2 $(ap metrics/test_v2_edge_ign_$m.csv) · kr $(ap metrics/test_kr_edge_$m.csv) · 도로 $(awk -F, 'NR==2{print $6}' metrics/test_auair_$m.csv)"; }
log "chain_h0 시작 — v12 3회 에폭 체크포인트 (학습 없음)"
$P probe_h0.py >> logs/h0_make.log 2>&1 || { log "❌ probe_h0.py 실패"; exit 1; }
for v in swa15 swa20 ep29 ep20 ep15 ep25 ep10; do for r in v12_f91 v12_f92 v12_f93; do ev ${r}_$v; done; done
for v in swa15 swa20 ep10 ep15 ep20 ep25; do
  for t in test_obl test_v2_edge_ign test_kr_edge; do
    if [ ${v:0:2} = ep ]; then B=v12_f91_ep29,v12_f92_ep29,v12_f93_ep29; else B=v12_f91_swa,v12_f92_swa,v12_f93_swa; fi
    $P compare_means.py --tag $t $B v12_f91_$v,v12_f92_$v,v12_f93_$v 2>&1 | tail -1 | tee -a $Q $R
  done; done
log "chain_h0 완료 — 판정은 _학습 큐 「11-11 H0」"
