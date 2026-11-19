#!/bin/bash
# chain_n1.sh — 11-11 N1 「새 출처 창 더하기」 (볼트 27 · 판정 = _학습 큐 「11-11 N1」)
#   v16n_f91 = train_v12_f91 + TinyPerson · RGBTDronePerson (가시광) · VisDrone MOT 검증 창 2,099 (make_v16_n.py)
cd /home/se/JupyterLAB/Capstone/drone_yolo
P=/home/se/miniconda3/envs/drone/bin/python; Q=logs/QUEUE.md; R=metrics/AUTO_RESULT_n1.md; IGN=data/test_v2/ignore_v1.json
log(){ echo "[$(TZ=Asia/Seoul date '+%F %T') KST] $*" | tee -a $Q $R; }
ap(){ awk -F, 'NR==2{print $3}' "$1" 2>/dev/null; }
ev(){ local m=$1
  $P eval_test_v2.py --weights runs_person/$m/weights/best.pt --data data/test_obl --mode single --tag test_obl >> logs/n1_$m.log 2>&1
  $P eval_test_v2.py --weights runs_person/$m/weights/best.pt --merge edge --ignore $IGN >> logs/n1_$m.log 2>&1
  $P eval_test_v2.py --weights runs_person/$m/weights/best.pt --data data/test_kr --tag test_kr --merge edge >> logs/n1_$m.log 2>&1
  $P eval_test_v2.py --weights runs_person/$m/weights/best.pt --data data/test_auair --tag test_auair --boot 0 >> logs/n1_$m.log 2>&1
  log "   $m AP50 obl $(ap metrics/test_obl_$m.csv) · v2 edge+무시 $(ap metrics/test_v2_edge_ign_$m.csv) · kr edge $(ap metrics/test_kr_edge_$m.csv) · 도로 오탐 $(awk -F, 'NR==2{print $6}' metrics/test_auair_$m.csv) 건/장  (v12 3회 평균 obl 0.624 · v2 0.637 · kr 1.000 · 도로 0.52)"
  $P lying_bench.py $m 2>&1 | grep -v -i warn | tail -1 | tee -a $Q $R
  for t in test_obl test_v2_edge_ign test_kr_edge; do $P compare_means.py --tag $t v12_f91_swa,v12_f92_swa,v12_f93_swa $m 2>&1 | tail -1 | tee -a $Q $R; done; }
tr(){ local name=$1; shift
  A="--stage 1 --hyp configs/hyp/v6_oblique.yaml --weights yolo11m.pt --data configs/data_v16n_f91.yaml --name $name --epochs 30 $*"
  if $P train_person.py $A --smoke >> logs/n1_${name}_smoke.log 2>&1 && $P train_person.py $A --set save_period=1 >> logs/n1_${name}_train.log 2>&1; then
    $P swa_ckpt.py $name >> $Q 2>&1 && ev ${name}_swa
  else log "   ❌ $name 학습 실패 — logs/n1_${name}_*.log"; fi; }
log "chain_n1 시작 — N1 (v12_f91 + 새 출처 2,099 창)"
log "N1 — v16n_f91"; tr v16n_f91
log "chain_n1 완료 — 걸러내기 규칙은 _학습 큐 「11-11 N1」"
