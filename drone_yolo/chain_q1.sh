#!/bin/bash
# chain_q1.sh — 11-12 ① 도로 기준 재측정 (v12 swa) ② N1 반복 (v16n_f92) ③ 회전 끄기 (v12dg0_f91) · 판정 = _학습 큐 「11-12 Q1」
cd /home/se/JupyterLAB/Capstone/drone_yolo
P=/home/se/miniconda3/envs/drone/bin/python; Q=logs/QUEUE.md; R=metrics/AUTO_RESULT_q1.md; IGN=data/test_v2/ignore_v1.json
log(){ echo "[$(TZ=Asia/Seoul date '+%F %T') KST] $*" | tee -a $Q $R; }
ap(){ awk -F, 'NR==2{print $3}' "$1" 2>/dev/null; }
road(){ $P eval_test_v2.py --weights runs_person/$1/weights/best.pt --data data/test_auair --tag test_auair --boot 0 >> logs/q1_$1.log 2>&1; awk -F, 'NR==2{print $6}' metrics/test_auair_$1.csv; }
ev(){ local m=$1 base=$2
  $P eval_test_v2.py --weights runs_person/$m/weights/best.pt --data data/test_obl --mode single --tag test_obl >> logs/q1_$m.log 2>&1
  $P eval_test_v2.py --weights runs_person/$m/weights/best.pt --merge edge --ignore $IGN >> logs/q1_$m.log 2>&1
  $P eval_test_v2.py --weights runs_person/$m/weights/best.pt --data data/test_kr --tag test_kr --merge edge >> logs/q1_$m.log 2>&1
  log "   $m obl $(ap metrics/test_obl_$m.csv) · v2 $(ap metrics/test_v2_edge_ign_$m.csv) · kr $(ap metrics/test_kr_edge_$m.csv) · 도로 $(road $m)"
  $P lying_bench.py $m 2>&1 | grep -v -i warn | tail -1 | tee -a $Q $R
  for t in test_obl test_v2_edge_ign test_kr_edge; do $P compare_means.py --tag $t $base $m 2>&1 | tail -1 | tee -a $Q $R; done; }
tr(){ local name=$1 data=$2; shift 2
  A="--stage 1 --hyp configs/hyp/v6_oblique.yaml --weights yolo11m.pt --data $data --name $name --epochs 30 $*"
  if $P train_person.py $A --smoke >> logs/q1_${name}_smoke.log 2>&1 && $P train_person.py $A --set save_period=1 >> logs/q1_${name}_train.log 2>&1; then
    $P swa_ckpt.py $name >> $Q 2>&1 && ev ${name}_swa v12_f91_swa,v12_f92_swa,v12_f93_swa
    $P swa_wide.py $name 15 >> $Q 2>&1 && ev ${name}_swa15 v12_f91_swa15,v12_f92_swa15,v12_f93_swa15
  else log "   ❌ $name 학습 실패 — logs/q1_${name}_*.log"; fi; }
log "chain_q1 시작"
log "① 도로 기준 재측정 (H0 와 같은 방식)"
for m in v12_f91_swa v12_f92_swa v12_f93_swa; do log "   $m 도로 $(road $m)"; done
log "② N1 반복 — v16n_f92"; tr v16n_f92 configs/data_v16n_f92.yaml
log "③ 회전 끄기 — v12dg0_f91 (degrees 0)"; tr v12dg0_f91 configs/data_v12_f91.yaml --set degrees=0
log "chain_q1 완료 — 판정은 _학습 큐 「11-12 Q1」"
