"""물리 자세 모델 — 실기체 오차 (짐벌 각 · 고도 · 박스 흔들림) 를 넣어도 버티나 (UE · 표본 6,000)"""
import csv, json, math, sys
from collections import defaultdict
import numpy as np
sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))
from phys_posture_probe import *

root = ROOT / "data/pose_cls/ue_level01"
rows = list(csv.DictReader(open(root / "crops.csv")))
by = defaultdict(list)
for r in rows:
    by[r["file"].split("/")[1][:13]].append(r)
js = json.loads((ROOT / "runs_person/_pack_v12w_real/posture.json").read_text()); b0 = LR(js["score"])
items = []
for stem, rs in by.items():
    lab = [l.split() for l in (root / "labels" / f"{stem}.txt").read_text().strip().splitlines()]
    for r, l in zip(rs, lab):
        if int(r["cut"]) or r["pose"] == "sitting":
            continue
        cx, cy, bw, bh = float(l[1]) * W, float(l[2]) * H, float(l[3]) * W, float(l[4]) * H
        items.append((r, cx, cy, bw, bh))
rng = np.random.default_rng(1)
items = [items[i] for i in rng.choice(len(items), 6000, replace=False)]
for name, sp, sa, sb in (("오차 없음", 0, 0, 0), ("짐벌 ±2° · 고도 ±1.5 m", 2, 1.5, 0), ("박스 ±12 %", 0, 0, 0.12),
                         ("짐벌 ±2° · 고도 ±1.5 m · 박스 ±12 %", 2, 1.5, 0.12), ("짐벌 ±4° · 고도 ±3 m · 박스 ±20 %", 4, 3, 0.20),
                         ("짐벌 치우침 +5° (고정)", -5, 0, 0.12), ("고도 치우침 ×1.25 (고정)", 0, -1.25, 0.12)):
    y, s_ph, s_b0, hw = [], [], [], []
    for r, cx, cy, bw, bh in items:
        w = bw * math.exp(rng.normal(0, sb)) if sb else bw; h = bh * math.exp(rng.normal(0, sb)) if sb else bh
        yb = cy + bh / 2 + (rng.normal(0, 0.05 * bh) if sb else 0)
        box = (cx - w / 2, yb - h, cx + w / 2, yb)
        mt = float(r["mount"]) + (rng.normal(0, sp) if sp > 0 else -sp)
        al = float(r["alt"]) * (-sa) if sa < 0 else float(r["alt"]) + (rng.normal(0, sa) if sa else 0)
        ps = phys_scores(box, mt, max(al, 3))
        if ps is None:
            continue
        y.append(r["pose"] == "lying"); s_ph.append(ps["lying"] - ps["standing"]); s_b0.append(b0.proba([[w, h]])[0][0]); hw.append(h >= w)
    y, s_ph, s_b0, hw = map(np.array, (y, s_ph, s_b0, hw))
    print(f"{name:<40} 전체 B0 {auc(y, s_b0):.3f} · 물리 {auc(y, s_ph):.3f} | 세로≥가로 B0 {auc(y[hw], s_b0[hw]):.3f} · 물리 {auc(y[hw], s_ph[hw]):.3f}")
