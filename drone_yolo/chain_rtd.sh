#!/bin/bash
# chain_rtd.sh — 11-15 RT 「v12 목록 그대로 RT-DETR-L」 (합침 이득의 원인 가르기 · 판정 = _학습 큐 「11-15 RT」)
cd /home/se/JupyterLAB/Capstone/drone_yolo
P=/home/se/miniconda3/envs/drone/bin/python; Q=logs/QUEUE.md; R=metrics/AUTO_RESULT_rtd.md; IGN=data/test_v2/ignore_v1.json
log(){ echo "[$(TZ=Asia/Seoul date '+%F %T') KST] $*" | tee -a $Q $R; }
ap(){ awk -F, 'NR==2{print $3}' "$1" 2>/dev/null; }
ev(){ local m=$1
  $P eval_test_v2.py --weights runs_person/$m/weights/best.pt --data data/test_obl --mode single --tag test_obl >> logs/rtd_$m.log 2>&1
  $P eval_test_v2.py --weights runs_person/$m/weights/best.pt --merge edge --ignore $IGN >> logs/rtd_$m.log 2>&1
  $P eval_test_v2.py --weights runs_person/$m/weights/best.pt --data data/test_kr --tag test_kr --merge edge >> logs/rtd_$m.log 2>&1
  $P eval_test_v2.py --weights runs_person/$m/weights/best.pt --data data/test_auair --tag test_auair --boot 0 >> logs/rtd_$m.log 2>&1
  log "   $m AP50 obl $(ap metrics/test_obl_$m.csv) · v2 edge+무시 $(ap metrics/test_v2_edge_ign_$m.csv) · kr edge $(ap metrics/test_kr_edge_$m.csv) · 도로 오탐 $(awk -F, 'NR==2{print $6}' metrics/test_auair_$m.csv) 건/장"
  for t in test_obl test_v2_edge_ign test_kr_edge; do $P compare_means.py --tag $t v12_f91_swa15,v12_f92_swa15,v12_f93_swa15 $m 2>&1 | tail -1 | tee -a $Q $R; done; }
N=rtd_v12_f91
A="--stage 1 --hyp configs/hyp/v6_oblique.yaml --weights rtdetr-l.pt --data configs/data_v12_f91.yaml --name $N --epochs 30 --optimizer AdamW --lr0 0.0001 --batch 4"
log "chain_rtd 시작 — RT-DETR-L · v12_f91 목록 · AdamW 1e-4 · batch 4 · 30 에폭 (≈ 45분/에폭)"
if $P train_person.py $A --set save_period=1 >> logs/rtd_${N}_train.log 2>&1; then
  log "   $N 학습 끝"; ev $N
  $P swa_wide.py $N 15 >> $Q 2>&1 && ev ${N}_swa15
else log "   ❌ $N 학습 실패 — logs/rtd_${N}_train.log"; fi
log "chain_rtd 완료 — 합침 이득 (diag_headroom 방식) 은 따로 · 판정 _학습 큐 「11-15 RT」"
