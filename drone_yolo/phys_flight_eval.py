"""ue_flight_phys.pkl 분석 — ① 탐지 박스 자세 (B0 vs 물리 · 한 장 · 사람별 누적) ② 크기 타당성으로 헛탐지 거르기"""
import pickle, sys, numpy as np
from collections import defaultdict
sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))
from phys_posture_probe import auc
rows, ngt = pickle.load(open(sys.argv[1], "rb"))
P3 = {"lying": "lying", "sitting": "sitting", "crouching": "sitting", "standing": "standing", "walking": "standing", "crawling": "lying"}
tp = [r for r in rows if r["gt"]]; fp = [r for r in rows if not r["gt"]]
print(f"탐지 (확신 ≥ 0.05) {len(rows):,} = 사람 {len(tp):,} + 헛 {len(fp):,} · 정답 {sum(ngt.values()):,}")
print("자세 (원래 이름):", {k: sum(r['pose'] == k for r in tp) for k in sorted({r['pose'] for r in tp})})

# ① 자세 — 탐지 박스 · 한 장
def arr(rs, f): return np.array([f(r) for r in rs])
for conf_min in (0.05, 0.20):
    T = [r for r in tp if r["conf"] >= conf_min]
    pose = arr(T, lambda r: P3[r["pose"]]); raw = arr(T, lambda r: r["pose"])
    b0 = arr(T, lambda r: r["b0"]); ph = arr(T, lambda r: r["ps"]["lying"] - r["ps"]["standing"]); ph3 = arr(T, lambda r: r["ps"]["lying"] - np.logaddexp(r["ps"]["standing"], r["ps"]["sitting"]))
    w = arr(T, lambda r: r["box"][2] - r["box"][0]); h = arr(T, lambda r: r["box"][3] - r["box"][1])
    ly, st = raw == "lying", np.isin(raw, ["standing", "walking"]); rest = ~ly & (raw != "crawling")
    print(f"\n[탐지 박스 · 확신 ≥ {conf_min}] 한 장 누움 AUROC")
    print(f"  누움 vs 서기·걷기        n {ly.sum()} / {st.sum()} | B0 {auc(ly[ly | st], b0[ly | st]):.3f} · 물리 {auc(ly[ly | st], ph[ly | st]):.3f}")
    m = (ly | st) & (h >= w)
    print(f"  〃 세로≥가로 구역        n {(ly & m).sum()} / {(st & m).sum()} | B0 {auc(ly[m], b0[m]):.3f} · 물리 {auc(ly[m], ph[m]):.3f}")
    m = ly | rest
    print(f"  누움 vs 나머지 (앉음 포함) n {ly.sum()} / {rest.sum()} | B0 {auc(ly[m], b0[m]):.3f} · 물리(3자세) {auc(ly[m], ph3[m]):.3f}")

# 사람 (배우 × 비행) 단위 누적 — 로그 가능도 비 합 vs B0 평균 · k장 창
T = [r for r in tp if r["conf"] >= 0.20]
by = defaultdict(list)
for r in T:
    by[(r["run"], r["gt"])].append(r)
print("\n[사람 단위 누적 — 같은 사람의 연속 k 장 (정답으로 묶음 = 후보 묶기가 완벽할 때 상한)]")
for k in (1, 5, 10, 30, 100):
    y, sb, sp = [], [], []
    for (run, name), rs in by.items():
        rs = sorted(rs, key=lambda r: r["frame"]); raw = rs[0]["pose"]
        if raw == "crawling":
            continue
        for a in range(0, max(len(rs) - k + 1, 1), max(k // 2, 1)):
            seg = rs[a:a + k]
            y.append(raw == "lying"); sb.append(np.mean([r["b0"] for r in seg]))
            sp.append(np.mean([r["ps"]["lying"] - np.logaddexp(r["ps"]["standing"], r["ps"]["sitting"]) for r in seg]))
    y = np.array(y)
    print(f"  k = {k:>3}: 창 {len(y):>5} (누움 {y.sum()}) | B0 평균 {auc(y, sb):.3f} · 물리 로그비 평균 {auc(y, sp):.3f}")

# ② 크기 타당성 — 가장 잘 맞는 자세 가설의 로그 가능도
best = lambda r: max(r["ps"].values())
print("\n[크기 타당성 — max 가설 로그 가능도 S · 낮을수록 「그 자리 · 그 고도에서 사람 크기가 아님」]")
for conf_min in (0.05, 0.20):
    a = np.array([best(r) for r in tp if r["conf"] >= conf_min]); b = np.array([best(r) for r in fp if r["conf"] >= conf_min])
    print(f"  확신 ≥ {conf_min}: 사람 {len(a):,} · 헛 {len(b):,} | S 중앙 사람 {np.median(a):.2f} · 헛 {np.median(b):.2f} | AUROC(사람 vs 헛) {auc(np.r_[np.ones(len(a), bool), np.zeros(len(b), bool)], np.r_[a, b]):.3f}")
    for thr in (-2.0, -3.0, -4.5, -6.0, -8.0):
        print(f"     S < {thr:>4} 버림 → 헛 −{(b < thr).mean() * 100:5.1f} % · 사람 −{(a < thr).mean() * 100:5.2f} %")
# 사람을 잃는 쪽은 누구인가
a = [(best(r), r) for r in tp if r["conf"] >= 0.20]
lost = [r for s, r in a if s < -4.5]
print("  S < −4.5 로 잃는 사람 자세:", {k: sum(r['pose'] == k for r in lost) for k in sorted({r['pose'] for r in lost})}, "· 전체", {k: sum(r['pose'] == k for _, r in a) for k in sorted({r['pose'] for _, r in a})})
# AP50 — 확신 vs 확신 × 타당성
def ap(rs_scores, n):
    o = sorted(rs_scores, key=lambda x: -x[0]); t = np.cumsum([x[1] for x in o]); f = np.cumsum([not x[1] for x in o])
    rec = t / n; prec = t / np.maximum(t + f, 1)
    for i in range(len(prec) - 2, -1, -1): prec[i] = max(prec[i], prec[i + 1])
    return float(np.sum(np.diff(np.r_[0, rec]) * prec))
n = sum(ngt.values())
print(f"\n[AP50 (IoU 0.5 · 확신 ≥ 0.05 탐지만)] 확신 {ap([(r['conf'], bool(r['gt'])) for r in rows], n):.4f} · 확신 × 타당성 문 (S<−4.5 → ×0.2) {ap([(r['conf'] * (0.2 if best(r) < -4.5 else 1), bool(r['gt'])) for r in rows], n):.4f}")
for thr in (0.20, 0.15, 0.10):
    k = [r for r in rows if r["conf"] >= thr]; kk = [r for r in k if best(r) >= -4.5]
    print(f"  문턱 {thr}: 재현율 {sum(bool(r['gt']) for r in k) / n:.3f} · 헛 {sum(not r['gt'] for r in k)} → 타당성 문 뒤 재현율 {sum(bool(r['gt']) for r in kk) / n:.3f} · 헛 {sum(not r['gt'] for r in kk)}")
