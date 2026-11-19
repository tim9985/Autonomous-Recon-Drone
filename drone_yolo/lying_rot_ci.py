"""lying_rot_ci.py — 90° 돌려 보기의 누운 사람 이득 · 영상 (비행) 단위 짝 부트스트랩 (11-15) — lying_rot_probe.py 캐시 사용"""
import pickle, sys, os
from collections import defaultdict
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lying_bench as LB
import cv2
from pathlib import Path
BASE = Path(__file__).resolve().parent


def merge(d, keys):
    b = np.concatenate([d[k][0] for k in keys]); s = np.concatenate([d[k][1] for k in keys])
    k = cv2.dnn.NMSBoxes([[float(x1), float(y1), float(x2 - x1), float(y2 - y1)] for x1, y1, x2, y2 in b], s.tolist(), 0.01, 0.6) if len(b) else []
    k = np.array(k).ravel().astype(int) if len(k) else np.zeros(0, int)
    return b[k], s[k]


from lying_rescue_check import hit
model = sys.argv[1] if len(sys.argv) > 1 else "v12_f91_swa15"
C = pickle.load(open(BASE / "runs_person" / "dumps" / f"rot_{model}.pkl", "rb"))
its = [it for it in LB.items() if os.path.exists(it[1])]
assert len(its) == len(C["lying"]), (len(its), len(C["lying"]))
METHODS = {"T": ("T",), "T+R1": ("T", "R1"), "T+R3": ("T", "R3"), "T+R1+R3": ("T", "R1", "R3")}
thr = {}
for name, keys in METHODS.items():
    sc = np.sort(np.concatenate([merge(d, keys)[1] for d in C["neg"]]))[::-1]
    if name == "T":
        k = int((sc >= 0.20).sum())
    thr[name] = float(sc[k - 1])
rows = defaultdict(list)                       # (종류, 영상) → [방식별 맞음]
for (kind, path, G0), (kind2, G, d) in zip(its, C["lying"]):
    vid = path.split("/")[-2] if kind.startswith("OK") else path.split("/")[-3] if kind == "UE" else "nm"
    outs = {n: merge(d, k) for n, k in METHODS.items()}
    for g in G:
        rows[(kind, vid)].append([hit(*outs[n], g, thr[n]) for n in METHODS])
rng = np.random.default_rng(0)
for kind in ("OK", "UE", "OK-벤치"):
    vids = [k for k in rows if k[0] == kind]; A = {v: np.array(rows[v], float) for v in vids}
    tot = np.concatenate([A[v] for v in vids]); base = tot.mean(0)
    print(f"[{model}] {kind}: 영상 {len(vids)} · 누운 사람 {len(tot)} · 같은 헛탐지 문턱 뜸 재현율 " + " · ".join(f"{n} {b:.3f}" for n, b in zip(METHODS, base)))
    for j, n in enumerate(METHODS):
        if not j:
            continue
        d = []
        for _ in range(2000):
            pk = rng.integers(0, len(vids), len(vids)); x = np.concatenate([A[vids[i]] for i in pk]); d.append(x[:, j].mean() - x[:, 0].mean())
        lo, hi = np.percentile(d, [2.5, 97.5])
        print(f"    {n} − T = {(base[j] - base[0]) * 100:+.1f} %p (95 % {lo * 100:+.1f} ~ {hi * 100:+.1f} · 영상 블록)")
    if kind == "OK":
        per = sorted(((v[1], A[v][:, 0].mean(), A[v][:, 2].mean(), A[v][:, 3].mean(), len(A[v])) for v in vids), key=lambda t: -t[4])
        print("    영상별 (T → T+R3 → T+R1+R3 · n):", " | ".join(f"{v} {a:.2f}→{b:.2f}→{c:.2f} ({n})" for v, a, b, c, n in per))
