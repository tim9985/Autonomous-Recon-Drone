"""lying_rot_indomain.py — 90° 돌려 보기의 누움 이득을 「같은 Okutama 장면 안 헛탐지 수」 로 맞춰 다시 (11-15 · 진단) — lying_rot_probe.py 캐시 (test_obl) 사용
   헛탐지 = 중심 일치로 어느 정답 사람과도 안 맞는 탐지 · T @0.20 과 같은 수가 되는 문턱에서 누운 사람 (Okutama Lying 라벨) 뜸 재현율 · 영상 블록 부트스트랩"""
import pickle, sys
from collections import defaultdict
from pathlib import Path
import cv2, numpy as np
from okutama_motion import LAB, S as S4K
from lying_rescue_check import hit
BASE = Path(__file__).resolve().parent
model = sys.argv[1] if len(sys.argv) > 1 else "v12_f91_swa15"
L = pickle.load(open(BASE / "runs_person" / "dumps" / f"rot_{model}.pkl", "rb"))["sets"]["test_obl"]


def merge(d, keys):
    b = np.concatenate([d[k][0] for k in keys]); s = np.concatenate([d[k][1] for k in keys])
    k = cv2.dnn.NMSBoxes([[float(x1), float(y1), float(x2 - x1), float(y2 - y1)] for x1, y1, x2, y2 in b], s.tolist(), 0.01, 0.6) if len(b) else []
    k = np.array(k).ravel().astype(int) if len(k) else np.zeros(0, int); return b[k], s[k]


ly, cache = {}, {}
for stem, gts, d in L:
    _, vid, fr = stem.split("_"); fr = int(fr)
    if vid not in cache:
        rows = defaultdict(list)
        for ln in open(f"{LAB}/{vid}.txt"):
            p = ln.split()
            if len(p) >= 10 and not int(p[6]) and '"Lying"' in ln:
                rows[int(p[5])].append(tuple(float(v) * S4K for v in p[1:5]))
        cache[vid] = rows
    ly[stem] = cache[vid].get(fr, [])


def fp_scores(keys):
    out, dets = [], {}
    for stem, gt, d in L:
        b, s = merge(d, keys); dets[stem] = (b, s); used = np.zeros(len(gt), bool)
        for j in np.argsort(-s):
            cx, cy = (b[j, 0] + b[j, 2]) / 2, (b[j, 1] + b[j, 3]) / 2; ok = False
            if len(gt):
                gx, gy = (gt[:, 0] + gt[:, 2]) / 2, (gt[:, 1] + gt[:, 3]) / 2
                h = (((gt[:, 0] <= cx) & (cx <= gt[:, 2]) & (gt[:, 1] <= cy) & (cy <= gt[:, 3])) | ((b[j, 0] <= gx) & (gx <= b[j, 2]) & (b[j, 1] <= gy) & (gy <= b[j, 3]))) & ~used
                if h.any():
                    c = np.flatnonzero(h); used[c[np.argmin((gx[c] - cx) ** 2 + (gy[c] - cy) ** 2)]] = True; ok = True
            if not ok:
                out.append(s[j])
    return np.sort(np.array(out))[::-1], dets


M = {"T": ("T",), "T+R1": ("T", "R1"), "T+R3": ("T", "R3"), "T+R1+R3": ("T", "R1", "R3")}
hits = defaultdict(lambda: defaultdict(list)); base = None; thr = {}
for name, keys in M.items():
    fp, dets = fp_scores(keys)
    if base is None:
        base = int((fp >= 0.20).sum())
    thr[name] = float(fp[base - 1])
    for s, G in ly.items():
        for g in G:
            hits[s.split("_")[1]][name].append(hit(*dets[s], g, thr[name]))
vids = sorted(hits); rng = np.random.default_rng(0)
tot = {n: np.concatenate([hits[v][n] for v in vids]).mean() for n in M}
print(f"[{model}] test_obl 누움 {sum(len(hits[v]['T']) for v in vids)} · 영상 {len(vids)} · 장면 안 헛탐지 {base} 개 ({base / len(L):.2f} 건/장) 로 맞춘 문턱 {{{', '.join(f'{k}: {v:.2f}' for k, v in thr.items())}}}")
for n in M:
    if n == "T":
        print(f"   T 누움 뜸 재현율 {tot[n]:.3f}"); continue
    d = []
    for _ in range(2000):
        pk = rng.integers(0, len(vids), len(vids))
        a = np.concatenate([hits[vids[i]][n] for i in pk]).mean() - np.concatenate([hits[vids[i]]["T"] for i in pk]).mean(); d.append(a)
    lo, hi = np.percentile(d, [2.5, 97.5])
    print(f"   {n:<9} {tot[n]:.3f} ({(tot[n] - tot['T']) * 100:+.1f} %p · 95 % {lo * 100:+.1f} ~ {hi * 100:+.1f})")
