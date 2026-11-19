"""
make_color_sim.py — 색 유사도 후보 확장용 혼동 행렬 (worker 1.4 · 11-13 · 평가셋 U · PETA 안 씀)

  배포 색 판정 (SigLIP 2 제로샷 · 상의 · 잔디 · 남색 규칙) 을 UAV-Human **학습셋** (89명 · 운용 크기 40~140 px) 에 돌려
  P(예측 c | 정답 q) → 베이즈 (색 균등 사전) P(정답 q | 예측 c) = 「c 로 보였을 때 실제로 q 일 확률」
  학습셋에 없는 주황 · 남색 행은 문장 임베딩 코사인 (같은 눈금) 으로 채움
  출력 runs_person/_pack_v12w_{real,sim}/verify_v14/color_sim.json
실행  /home/se/venvs/state/bin/python make_color_sim.py
"""
import json
from pathlib import Path

import numpy as np

import color_lab as L

BASE = Path(__file__).resolve().parent
X, y, g = L.train_feats("upper")
lg = L.zs_logits(X, L.TMPL1)
G = L.CI["green"]; _, sc, b = L.siglip_text(L.TMPL1, False, L.SIGLIP)
gg = X @ L.grass_text(L.SIGLIP) * sc + b - lg[:, G]; lg[:, G] -= np.maximum(0, gg)
lg = L.navy_rule(lg, L.navy_delta("upper", L.SIGLIP))
pred = lg.argmax(1); K = len(L.COLORS)
C = np.zeros((K, K))
for t, p in zip(y, pred):
    C[t, p] += 1
seen = C.sum(1) > 0
Pc_q = C / np.maximum(C.sum(1, keepdims=True), 1)                     # P(예측 | 정답)
Td, _, _ = L.siglip_text(L.TMPL1, False, L.SIGLIP); T = np.stack([Td[c][0] for c in L.COLORS])
cos = T @ T.T; prior = np.exp((cos - 1) * 20); prior /= prior.sum(1, keepdims=True)
Pc_q[~seen] = prior[~seen]
post = Pc_q / np.maximum(Pc_q.sum(0, keepdims=True), 1e-9)            # P(정답 q | 예측 c) · 균등 사전
S = {q: {c: round(float(post[i, j]), 3) for j, c in enumerate(L.COLORS) if post[i, j] >= 0.05} for i, q in enumerate(L.COLORS)}
acc = float(np.mean([np.mean(pred[y == k] == k) for k in np.unique(y)]))
out = {"name": "color-sim-v14", "method": "P(정답 q | 예측 c) · UAV-Human 학습셋 혼동 (SigLIP 2 제로샷 배포판) · 주황 · 남색 = 문장 코사인", "train_n": int(len(y)),
       "train_balanced_acc": round(acc, 3), "colors": list(L.COLORS), "sim": S, "rows_from_text": [c for c, s in zip(L.COLORS, seen) if not s]}
for e in ("real", "sim"):
    d = BASE / "runs_person" / f"_pack_v12w_{e}" / "verify_v14"; d.mkdir(parents=True, exist_ok=True)
    (d / "color_sim.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
print(json.dumps(out, ensure_ascii=False)[:1500])
