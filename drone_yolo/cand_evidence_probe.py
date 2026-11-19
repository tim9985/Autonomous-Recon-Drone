"""
cand_evidence_probe.py — 후보 단위 증거 쌓기 (11-15 · 진단) — 프레임마다 문턱으로 자르지 않고 지면 좌표에서 여러 프레임 증거를 모으면 헛후보가 얼마나 줄어드나

  지금  후보 = 한 장에서 확신 ≥ 0.20 인 탐지 → 좌표로 묶음 · 후보 점수 = best_conf (가장 높은 한 장) · 확정 = 3 초 안 2 장
  가설  진짜 사람은 「보이는 프레임의 대부분」 에서 잡히고 헛탐지는 드문드문 잡힌다 → 본 횟수가 아니라 **잡힌 비율 (잡힘 / 그 자리가 화면에 든 프레임)** · 그 평균 확신이 더 잘 가른다
        약한 탐지 (0.05~0.20) 도 같은 자리에 되풀이되면 증거 — 추적 (화면 안 연결) 이 끊겨도 지면 좌표로는 이어진다
  재료  runs_state/ue_flight_phys.pkl (배포 엔진 · 확신 ≥ 0.05 · 정답 이름) + ue_flight/<비행>/flight.csv · run.json (자세 · 평지 가정 — 장면 중심 지면)
  방법  탐지마다 발끝 광선 × 평지 → NED 점 · 3 m 안 탐욕 묶음 (확신 높은 것부터 · 같은 프레임 둘은 안 묶음) → 묶음마다 그 점이 화면 (가장자리 40 px 안쪽) 에 든 프레임 수 = 기회
        묶음 = 사람 (정답 이름이 붙은 탐지가 과반) / 헛
  점수  best (지금) · 잡힌 횟수 n · 잡힌 비율 n / 기회 · 평균 확신 Σ확신 / 기회 · 로그 승산 합 Σ[logit(확신) − logit(0.05)] − λ · 놓친 프레임
실행  /home/se/miniconda3/envs/drone/bin/python cand_evidence_probe.py
"""
import csv, json, math, pickle
from collections import defaultdict
import numpy as np
from phys_posture_probe import F, H, ROOT, W, auc, cam_R

rows, ngt = pickle.load(open(ROOT / "runs_state" / "ue_flight_phys.pkl", "rb"))
GATE = 3.0
out = {}
ALL = []          # (비행, 묶음 종류, 점수들)
for run in ngt:
    D = ROOT / "ue_flight" / run
    fl = list(csv.DictReader(open(D / "flight.csv"))); rj = json.loads((D / "run.json").read_text())
    pose = {}
    for r in fl:
        alt = rj["ground_ned_z"] - float(r["ned_z"]); yaw = math.radians(float(r["yaw_deg"])); mount = -float(r["cam_pitch_rel_body_deg"])
        pose[r["frame"]] = (float(r["ned_x"]), float(r["ned_y"]), alt, yaw, mount)
    dets = [r for r in rows if r["run"] == run]
    P = []
    for r in dets:
        x, y, alt, yaw, mount = pose[r["frame"]]
        if alt < 10:
            P.append(None); continue
        R = cam_R(mount); b = r["box"]
        d = R @ np.array([1.0, ((b[0] + b[2]) / 2 - W / 2) / F, (b[3] - H / 2) / F])
        if d[2] <= 1e-3:
            P.append(None); continue
        t = alt / d[2]; fx, fy = t * d[0], t * d[1]
        P.append((x + fx * math.cos(yaw) - fy * math.sin(yaw), y + fx * math.sin(yaw) + fy * math.cos(yaw)))
    idx = [i for i, p in enumerate(P) if p is not None]
    idx.sort(key=lambda i: -dets[i]["conf"])
    clusters = []                                 # dict(c=(x,y), members=[i], frames=set)
    for i in idx:
        p = P[i]; best = None
        for c in clusters:
            dd = math.hypot(c["c"][0] - p[0], c["c"][1] - p[1])
            if dd <= GATE and dets[i]["frame"] not in c["frames"] and (best is None or dd < best[0]):
                best = (dd, c)
        if best is None:
            clusters.append(dict(c=p, members=[i], frames={dets[i]["frame"]}))
        else:
            c = best[1]; n = len(c["members"]); c["c"] = ((c["c"][0] * n + p[0]) / (n + 1), (c["c"][1] * n + p[1]) / (n + 1))
            c["members"].append(i); c["frames"].add(dets[i]["frame"])
    # 기회 = 묶음 중심이 화면에 든 프레임
    for c in clusters:
        opp = 0
        for fr, (x, y, alt, yaw, mount) in pose.items():
            if alt < 10:
                continue
            dx, dy = c["c"][0] - x, c["c"][1] - y
            fx, fy = dx * math.cos(yaw) + dy * math.sin(yaw), -dx * math.sin(yaw) + dy * math.cos(yaw)
            pc = np.array([fx, fy, alt]) @ cam_R(mount)
            if pc[0] <= 0:
                continue
            u, v = W / 2 + F * pc[1] / pc[0], H / 2 + F * pc[2] / pc[0]
            opp += int(40 <= u <= W - 40 and 40 <= v <= H - 40)
        conf = np.array([dets[i]["conf"] for i in c["members"]]); names = [dets[i]["gt"] for i in c["members"]]
        n_gt = sum(n is not None for n in names); kind = "사람" if n_gt > len(names) / 2 else "헛"
        hi = conf >= 0.20; opp = max(opp, len(conf))
        lg = lambda p: np.log(np.clip(p, 1e-4, 1 - 1e-4) / (1 - np.clip(p, 1e-4, 1 - 1e-4)))
        ALL.append(dict(run=run, kind=kind, name=max(set(n for n in names if n), key=names.count) if n_gt else None, n=len(conf), n20=int(hi.sum()), opp=opp,
                        best=float(conf.max()), ratio=len(conf) / opp, ratio20=float(hi.sum()) / opp, mean=float(conf.sum()) / opp,
                        lo=float((lg(conf) - lg(0.05)).sum() - 0.15 * (opp - len(conf)))))
per = [c for c in ALL if c["kind"] == "사람"]; fp = [c for c in ALL if c["kind"] == "헛"]
truth = sum(len(json.loads((ROOT / "ue_flight" / r / "actors.json").read_text())) for r in ngt)
print(f"묶음 {len(ALL):,} = 사람 {len(per)} (배우 × 비행 {truth} · 한 사람이 여러 묶음일 수 있음) + 헛 {len(fp):,}")
found = lambda cs: len({(c["run"], c["name"]) for c in cs})
print(f"  사람 묶음이 덮은 배우 × 비행 {found(per)} / {truth}")
# 지금 방식: 확신 ≥ 0.20 탐지가 한 장이라도 있는 묶음 = 후보
now_p = [c for c in per if c["n20"] >= 1]; now_f = [c for c in fp if c["n20"] >= 1]
print(f"[지금] 확신 ≥ 0.20 이 한 장이라도 → 후보: 사람 묶음 {len(now_p)} (배우 {found(now_p)}) · 헛후보 {len(now_f)}")
c2p = [c for c in per if c["n20"] >= 2]; c2f = [c for c in fp if c["n20"] >= 2]
print(f"[지금 · 확정 ≈ 2 장 이상] 사람 묶음 {len(c2p)} (배우 {found(c2p)}) · 헛후보 {len(c2f)}")
y = np.r_[np.ones(len(per), bool), np.zeros(len(fp), bool)]
print("\n후보 점수별 — 사람 묶음 vs 헛 묶음 AUROC · 배우를 하나도 안 잃는 문턱에서 남는 헛후보 수")
res = {}
for key, lab in (("best", "가장 높은 한 장 (지금)"), ("n", "잡힌 횟수 (확신 ≥ 0.05)"), ("n20", "잡힌 횟수 (확신 ≥ 0.20)"), ("ratio", "잡힌 비율 (≥ 0.05 / 기회)"),
                 ("ratio20", "잡힌 비율 (≥ 0.20 / 기회)"), ("mean", "평균 확신 (Σ / 기회)"), ("lo", "로그 승산 합")):
    s = np.array([c[key] for c in per + fp]); a = auc(y, s)
    # 배우 × 비행마다 가장 좋은 묶음 점수 → 모두 살리는 문턱
    bestp = defaultdict(lambda: -1e9)
    for c in per:
        bestp[(c["run"], c["name"])] = max(bestp[(c["run"], c["name"])], c[key])
    v = np.sort(np.array(list(bestp.values())))
    row = {"AUROC": round(a, 3)}
    for keep in (1.0, 0.95):
        thr = v[int(np.floor((1 - keep) * len(v)))]
        row[f"헛후보@배우 {keep:.0%}"] = int(sum(c[key] >= thr for c in fp)); row[f"사람묶음@배우 {keep:.0%}"] = int(sum(c[key] >= thr for c in per))
    res[lab] = row
    print(f"  {lab:<26} AUROC {a:.3f} · 배우 100 % 살릴 때 헛후보 {row['헛후보@배우 100%']:>4} (사람 묶음 {row['사람묶음@배우 100%']}) · 95 % 살릴 때 {row['헛후보@배우 95%']:>4}")
# 헛 묶음의 성격
r = np.array([c["ratio"] for c in fp]); n = np.array([c["n"] for c in fp]); rp = np.array([c["ratio"] for c in per])
print(f"\n헛 묶음 잡힌 비율 중앙 {np.median(r):.3f} (90 % {np.percentile(r, 90):.3f}) · 잡힌 횟수 중앙 {np.median(n):.0f} · 1 번만 잡힌 묶음 {np.mean(n == 1):.0%}")
print(f"사람 묶음 잡힌 비율 중앙 {np.median(rp):.3f} (10 % {np.percentile(rp, 10):.3f})")
big = sorted(fp, key=lambda c: -c["n20"])[:8]
print("오래 잡힌 헛 묶음 (확신 ≥ 0.20 횟수 · 기회 · 최고 확신):", [(c["run"], c["n20"], c["opp"], round(c["best"], 2)) for c in big])
(ROOT / "metrics" / "cand_evidence_1115.json").write_text(json.dumps(dict(n_person_clusters=len(per), n_fp_clusters=len(fp), actors=truth, scores=res), ensure_ascii=False, indent=1))
