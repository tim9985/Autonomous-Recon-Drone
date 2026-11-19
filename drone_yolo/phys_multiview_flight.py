"""
phys_multiview_flight.py — 여러 시점 묶음 물리 자세를 UE 비행 (배포 엔진 탐지 박스 · 10 fps) 에서 확인 (11-15 · 진단)

  재료  runs_state/ue_flight_phys.pkl (phys_flight_dump.py · 확신 ≥ 0.05 · 정답 이름으로 묶음 = 후보 묶기가 완벽할 때 상한) + ue_flight/<비행>/flight.csv (고도 · 방위)
  비교  B0 평균 (배포) · M3 (11-14 장마다 섞기) · J3 (묶음 가설 · 세계 몸 방위 고정) · R (키 회귀 h)
        창 = 같은 사람의 연속 k 장 (10 fps) · 1 Hz 로 솎은 것도 (worker 는 1 초마다 상태 갱신)
  잡음  --noise: 짐벌 피치 치우침 · 고도 배율 · 박스 흔들림을 넣고 다시
실행  /home/se/miniconda3/envs/drone/bin/python phys_multiview_flight.py [--pitch 2 --alt 1.1 --box 0.12]
"""
import argparse, csv, pickle
from collections import defaultdict
import numpy as np
from phys_posture_probe import ROOT, auc
from phys_multiview_probe import hyp_ll, joint_scores

ap = argparse.ArgumentParser()
ap.add_argument("--pitch", type=float, default=0.0, help="짐벌 피치 치우침 ° (마운트각을 이만큼 틀리게 앎)")
ap.add_argument("--alt", type=float, default=1.0, help="고도 배율 (이만큼 틀리게 앎)")
ap.add_argument("--box", type=float, default=0.0, help="박스 폭 · 높이 로그 잡음 1σ")
a = ap.parse_args()
rng = np.random.default_rng(0)
rows, ngt = pickle.load(open(ROOT / "runs_state" / "ue_flight_phys.pkl", "rb"))
fl = {}
for run in ngt:
    p = ROOT / "ue_flight" / run / "flight.csv"
    if p.exists():
        fl[run] = {r["frame"]: r for r in csv.DictReader(open(p))}
by = defaultdict(list)
for r in rows:
    if r["gt"] and r["conf"] >= 0.20:
        by[(r["run"], r["gt"])].append(r)
tracks = {}
for key, rs in by.items():
    rs = sorted(rs, key=lambda r: r["frame"]); obs = []
    for r in rs:
        f = fl[r["run"]][r["frame"]]
        x1, y1, x2, y2 = r["box"]
        if a.box:
            cx, cy = (x1 + x2) / 2, (y1 + y2) / 2; w = (x2 - x1) * np.exp(rng.normal(0, a.box)); h = (y2 - y1) * np.exp(rng.normal(0, a.box))
            x1, x2, y1, y2 = cx - w / 2, cx + w / 2, cy - h / 2, cy + h / 2
        mount = -float(f["cam_pitch_rel_body_deg"]) + a.pitch
        o = hyp_ll((x1, y1, x2, y2), mount, r["alt"] * a.alt, None)
        if o is None:
            continue
        # 누움 가설의 세계 몸 방위를 관측 내내 고정: 몸 방위 (카메라 정렬 좌표) = ψ − 기체 방위 → 다시 계산
        from phys_multiview_probe import LY, ebox, ll
        from phys_posture_probe import cam_R, ray_world
        import math
        R = cam_R(mount); cam = np.array([0.0, 0.0, -r["alt"] * a.alt])
        dc = ray_world(R, (x1 + x2) / 2, (y1 + y2) / 2); c = cam + (r["alt"] * a.alt - 0.12) / dc[2] * dc
        yaw = math.radians(float(f["yaw_deg"])); w_, h_ = max(x2 - x1, 1.0), max(y2 - y1, 1.0)
        lyw = np.array([ll(w_, h_, *ebox(R, cam, (c[0], c[1], -0.13), (L / 2, 0.25, 0.13), math.radians(al) - yaw)) for al, L in LY])
        obs.append(dict(o=(o[0], o[1], lyw, o[3]), o1=o, b0=r["b0"], frame=int(r["frame"]), dep=o[3][2] if o[3] else np.nan))
    tracks[key] = (rs[0]["pose"], obs)
print(f"사람 × 비행 {len(tracks)} · 관측 {sum(len(v[1]) for v in tracks.values()):,} · 잡음 피치 {a.pitch}° · 고도 ×{a.alt} · 박스 {a.box}")


def run(k, step=1, label=""):
    y, S = [], defaultdict(list)
    for (run_, name), (raw, obs) in tracks.items():
        if raw == "crawling":
            continue
        ob = obs[::step]
        for s in range(0, max(len(ob) - k + 1, 1), max(k // 2, 1)):
            seg = ob[s:s + k]
            if len(seg) < min(k, 2) and k > 1:
                continue
            js = joint_scores([x["o"] for x in seg]); j1 = joint_scores([x["o1"] for x in seg])
            y.append(raw); S["B0"].append(np.mean([x["b0"] for x in seg])); S["M3"].append(j1["M3"]); S["J3"].append(js["J3"]); S["M"].append(j1["M"]); S["J"].append(js["J"])
            S["R"].append(-js.get("Rh_ridge", np.nan)); S["span"].append(np.nanmax([x["dep"] for x in seg]) - np.nanmin([x["dep"] for x in seg]))
    y = np.array(y); ly = y == "lying"; st = np.isin(y, ["standing", "walking"]); si = np.isin(y, ["sitting", "crouching"])
    f = lambda pos, neg, key: auc(pos[pos | neg], np.nan_to_num(np.array(S[key])[pos | neg], nan=0.0))
    print(f"  {label:<26} 창 {len(y):>5} (누움 {ly.sum()} · 서기 {st.sum()} · 앉음 {si.sum()}) · 하향각 벌어짐 중앙 {np.median(S['span']):4.1f}° | "
          f"누움 vs 서기 B0 {f(ly, st, 'B0'):.3f} · M {f(ly, st, 'M'):.3f} · J {f(ly, st, 'J'):.3f} · R {f(ly, st, 'R'):.3f} | "
          f"누움 vs 나머지 B0 {f(ly, st | si, 'B0'):.3f} · M3 {f(ly, st | si, 'M3'):.3f} · J3 {f(ly, st | si, 'J3'):.3f} | 누움+앉음 vs 서기 R {f(ly | si, st, 'R'):.3f} · B0 {f(ly | si, st, 'B0'):.3f}")
    return y, S


print("[10 fps 연속 k 장]")
for k in (1, 10, 30, 100, 300):
    run(k, 1, f"k = {k} ({k / 10:.0f} s)")
print("[1 Hz 로 솎음 — worker 상태 갱신 주기]")
for k in (3, 5, 10, 20):
    run(k, 10, f"k = {k} ({k} s)")
print("[사람 × 비행 전체를 한 묶음]")
y, S = run(10 ** 6, 10, "전체 (1 Hz)")
# 사람별 키 회귀 값
print("\n사람 × 비행 전체 관측 키 회귀 (m)")
hh = defaultdict(list)
for (run_, name), (raw, obs) in tracks.items():
    js = joint_scores([x["o"] for x in obs[::10]])
    if "Rh" in js:
        hh[raw].append((js["Rh_ridge"], js["Ra"], js["spread"]))
for k, v in hh.items():
    v = np.array(v); print(f"  {k:<10} n {len(v):>2} · h 중앙 {np.median(v[:, 0]):.2f} [{v[:, 0].min():.2f} ~ {v[:, 0].max():.2f}] · a {np.median(v[:, 1]):.2f}")
