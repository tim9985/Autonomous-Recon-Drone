"""verifier_lodo 2판 — 깎기만 하는 규칙 (결과 본 뒤 정한 한 가지 · 진단): 긴 변 ≥ 40 px 박스만 · 점수 = 확신 × min(1, p/0.5) · 작은 박스는 그대로"""
import sys, json
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).parent))
from verify_head_lodo import *
Z = np.load(OUT); D = {s: {k: Z[f"{s}/{k}"] for k in ("img", "box", "conf", "f", "miou", "L")} for s in SETS}
rng = np.random.default_rng(0)
for hold in SETS:
    X, y = [], []
    for s in SETS:
        if s == hold:
            continue
        d = D[s]; lab = np.where(d["miou"] >= 0.5, 1, np.where(d["miou"] < 0.1, 0, -1)); ok = np.flatnonzero((lab >= 0) & (d["L"] >= 40))
        if len(ok) > 4000:
            ok = rng.choice(ok, 4000, replace=False)
        X.append(d["f"][ok].astype(np.float32)); y.append(lab[ok])
    X, y = np.concatenate(X), np.concatenate(y)
    clf = LogisticRegression(C=0.3, max_iter=2000, class_weight="balanced").fit(X, y)
    d = D[hold]; g = np.load(RUN / hold / "gt.npz"); p = clf.predict_proba(d["f"].astype(np.float32))[:, 1]
    big = d["L"] >= 40
    score = np.where(big, d["conf"] * np.minimum(1, p / 0.5), d["conf"])
    ap0, tp0 = ap_and_ops(g, d["img"], d["box"], d["conf"]); ap1, tp1 = ap_and_ops(g, d["img"], d["box"], score)
    nimg = len(g["names"]); n = max(len(g["gt"]), 1)
    op0, op1 = d["conf"] >= 0.20, score >= 0.20
    pos, neg = p[big & (d["miou"] >= 0.5)], p[big & (d["miou"] < 0.1)]
    au = float((pos[:, None] > neg[None, :]).mean()) if len(pos) and len(neg) else float("nan")
    a = lambda v: "  —  " if v is None else f"{v:.3f}"
    print(f"{hold:14s} AP50 {a(ap0)} → {a(ap1)} | 문턱 0.20: 재현율 {(tp0 & op0).sum() / n:.3f} → {(tp1 & op1).sum() / n:.3f} · 헛 {(~tp0 & op0).sum() / nimg:.2f} → {(~tp1 & op1).sum() / nimg:.2f} 건/장 | 40 px↑ 사람 vs 헛 AUROC {au:.3f} (n {len(pos)} / {len(neg)})", flush=True)
