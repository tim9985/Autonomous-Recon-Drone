#!/bin/bash
# chain_r90.sh — 11-15 R90 「v12 + 90° 단위 회전 증강」 (누운 사람을 추론 한 번에 잡기) · 판정 = _학습 큐 「11-15 R90」
#   근거: 배포 v12 를 그대로 두고 그림을 90° 돌려 한 번 더 추론해 합치면 (같은 도로 헛탐지) Okutama 누움 뜸 0.667 → 0.793~0.827 · test_obl AP50 +2.8 %p (lying_rot_probe.py)
#   바꾸는 것 하나: --rot90 0.3 (aug_ext.enable_rot90 · 학습 창을 30 % 확률로 ±90° · 박스 안 부풂) · 나머지 v12 와 같음
#   순서: f91 한 번 → 걸러내기 통과면 (사람이 보고) f92 — 이 스크립트는 f91 만 · f92 는 `bash chain_r90.sh f92`
cd /home/se/JupyterLAB/Capstone/drone_yolo
P=/home/se/miniconda3/envs/drone/bin/python; Q=logs/QUEUE.md; R=metrics/AUTO_RESULT_r90.md; IGN=data/test_v2/ignore_v1.json
F=${1:-f91}
log(){ echo "[$(TZ=Asia/Seoul date '+%F %T') KST] $*" | tee -a $Q $R; }
ap(){ awk -F, 'NR==2{print $3}' "$1" 2>/dev/null; }
road(){ $P eval_test_v2.py --weights runs_person/$1/weights/best.pt --data data/test_auair --tag test_auair --boot 0 >> logs/r90_$1.log 2>&1; awk -F, 'NR==2{print $6}' metrics/test_auair_$1.csv; }
ev(){ local m=$1 base=$2
  $P eval_test_v2.py --weights runs_person/$m/weights/best.pt --data data/test_obl --mode single --tag test_obl >> logs/r90_$m.log 2>&1
  $P eval_test_v2.py --weights runs_person/$m/weights/best.pt --merge edge --ignore $IGN >> logs/r90_$m.log 2>&1
  $P eval_test_v2.py --weights runs_person/$m/weights/best.pt --data data/test_kr --tag test_kr --merge edge >> logs/r90_$m.log 2>&1
  log "   $m obl $(ap metrics/test_obl_$m.csv) · v2 $(ap metrics/test_v2_edge_ign_$m.csv) · kr $(ap metrics/test_kr_edge_$m.csv) · 도로 $(road $m)"
  $P lying_bench.py $m 2>&1 | grep -v -i warn | tail -1 | tee -a $Q $R
  for t in test_obl test_v2_edge_ign test_kr_edge; do $P compare_means.py --tag $t $base $m 2>&1 | tail -1 | tee -a $Q $R; done; }
N=v12r90_$F
A="--stage 1 --hyp configs/hyp/v6_oblique.yaml --weights yolo11m.pt --data configs/data_v12_$F.yaml --name $N --epochs 30 --rot90 0.3"
log "chain_r90 시작 — $N (v12_$F 목록 · --rot90 0.3 · 나머지 v12 와 같음)"
if $P train_person.py $A --smoke >> logs/r90_${N}_smoke.log 2>&1 && $P train_person.py $A --set save_period=1 >> logs/r90_${N}_train.log 2>&1; then
  log "   $N 학습 끝"
  $P swa_wide.py $N 15 >> $Q 2>&1 && ev ${N}_swa15 v12_f91_swa15,v12_f92_swa15,v12_f93_swa15
else log "   ❌ $N 학습 실패 — logs/r90_${N}_*.log"; fi
log "chain_r90 완료 ($N) — 판정 _학습 큐 「11-15 R90」 · 걸러내기 통과면 bash chain_r90.sh f92"
