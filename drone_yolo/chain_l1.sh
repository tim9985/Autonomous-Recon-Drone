#!/bin/bash
# chain_l1.sh — 11-11 L1 「처음부터 낮은 학습률 lr0 0.005」 (판정 = _학습 큐 「11-11 L1」) · chain_n1 (PID 1516896) 끝나면 시작
cd /home/se/JupyterLAB/Capstone/drone_yolo
P=/home/se/miniconda3/envs/drone/bin/python; Q=logs/QUEUE.md; R=metrics/AUTO_RESULT_l1.md; IGN=data/test_v2/ignore_v1.json
log(){ echo "[$(TZ=Asia/Seoul date '+%F %T') KST] $*" | tee -a $Q $R; }
ap(){ awk -F, 'NR==2{print $3}' "$1" 2>/dev/null; }
ev(){ local m=$1
  $P eval_test_v2.py --weights runs_person/$m/weights/best.pt --data data/test_obl --mode single --tag test_obl >> logs/l1_$m.log 2>&1
  $P eval_test_v2.py --weights runs_person/$m/weights/best.pt --merge edge --ignore $IGN >> logs/l1_$m.log 2>&1
  $P eval_test_v2.py --weights runs_person/$m/weights/best.pt --data data/test_kr --tag test_kr --merge edge >> logs/l1_$m.log 2>&1
  $P eval_test_v2.py --weights runs_person/$m/weights/best.pt --data data/test_auair --tag test_auair --boot 0 >> logs/l1_$m.log 2>&1
  log "   $m AP50 obl $(ap metrics/test_obl_$m.csv) · v2 edge+무시 $(ap metrics/test_v2_edge_ign_$m.csv) · kr edge $(ap metrics/test_kr_edge_$m.csv) · 도로 오탐 $(awk -F, 'NR==2{print $6}' metrics/test_auair_$m.csv) 건/장  (v12 3회 평균 obl 0.624 · v2 0.637 · kr 1.000 · 도로 0.52)"
  $P lying_bench.py $m 2>&1 | grep -v -i warn | tail -1 | tee -a $Q $R
  for t in test_obl test_v2_edge_ign test_kr_edge; do $P compare_means.py --tag $t v12_f91_swa,v12_f92_swa,v12_f93_swa $m 2>&1 | tail -1 | tee -a $Q $R; done; }
tr(){ local name=$1; shift
  A="--stage 1 --hyp configs/hyp/v6_oblique.yaml --weights yolo11m.pt --data configs/data_v12_f91.yaml --name $name --epochs 30 $*"
  if $P train_person.py $A --smoke >> logs/l1_${name}_smoke.log 2>&1 && $P train_person.py $A --set save_period=1 >> logs/l1_${name}_train.log 2>&1; then
    $P swa_ckpt.py $name >> $Q 2>&1 && ev ${name}_swa
  else log "   ❌ $name 학습 실패 — logs/l1_${name}_*.log"; fi; }
while kill -0 1516896 2>/dev/null; do sleep 60; done
log "chain_l1 시작 — L1 (v12_f91 · lr0 0.005)"
log "L1 — v12lr5_f91"; tr v12lr5_f91 --set lr0=0.005
log "chain_l1 완료 — 걸러내기 규칙은 _학습 큐 「11-11 L1」"
