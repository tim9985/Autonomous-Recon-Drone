"""ens_rtd_lying.py — RT-DETR · v12 + RT-DETR 합침의 누운 사람 재현율을 「v12 @0.20 과 같은 도로 헛탐지」 문턱에서 (11-15 · 진단)
   재료 = lying_rot_probe.py 캐시 (runs_person/dumps/rot_<모델>.pkl 의 T = 타일 배포 방식) · 합침 = diag_headroom.wbf_n 과 같은 식 (점수 합 / 2)"""
import pickle, sys
from collections import defaultdict
from pathlib import Path
import numpy as np
from diag_headroom import wbf_n
from lying_rescue_check import hit
BASE = Path(__file__).resolve().parent
A = pickle.load(open(BASE / "runs_person/dumps/rot_v12_f91_swa15.pkl", "rb")); B = pickle.load(open(BASE / "runs_person/dumps/rot_rtd_v12_f91.pkl", "rb"))
assert len(A["lying"]) == len(B["lying"]) and len(A["neg"]) == len(B["neg"])


def cut(d, m=0.05):
    b, s = d; k = s >= m; return b[k], s[k]


def ens(a, b):
    r = wbf_n([{0: a}, {0: cut(b)}]); return r.get(0, (np.zeros((0, 4), np.float32), np.zeros(0, np.float32)))


M = {"v12 (배포)": lambda a, b: a["T"], "RT-DETR": lambda a, b: b["T"], "v12 + RT-DETR 합침": lambda a, b: ens(a["T"], b["T"])}
neg = {n: [f(a, b) for a, b in zip(A["neg"], B["neg"])] for n, f in M.items()}
sc = {n: np.sort(np.concatenate([d[1] for d in v]))[::-1] for n, v in neg.items()}
k = int((sc["v12 (배포)"] >= 0.20).sum()); thr = {n: float(s[k - 1]) for n, s in sc.items()}
print(f"도로 (AU-AIR 빈 {len(A['neg'])} 장) · v12 @0.20 헛 {k / len(A['neg']):.3f} 건/장 과 같아지는 문턱:", {n: round(v, 3) for n, v in thr.items()}, "· @0.20 헛 건/장:", {n: round(float((s >= 0.2).sum()) / len(A['neg']), 2) for n, s in sc.items()})
for n, f in M.items():
    acc = defaultdict(list)
    for (kind, G, da), (_, _, db) in zip(A["lying"], B["lying"]):
        b, s = f(da, db)
        for g in G:
            acc[kind].append(hit(b, s, g, thr[n]))
    print(f"  {n:<20} 같은 도로 헛탐지에서 누움 뜸 재현율 — " + " · ".join(f"{k_} {np.mean(v):.3f} (n {len(v)})" for k_, v in sorted(acc.items())))
