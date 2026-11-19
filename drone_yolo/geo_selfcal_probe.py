"""
geo_selfcal_probe.py — 좌표 자체 보정: 표시점 없이 비행 기록만으로 짐벌 피치 · 방위 치우침 · 영상↔자세 시각 어긋남을 맞춘다 (11-15 · 진단)

  문제  좌표 = 발끝 광선 × 지면 · 고정 치우침 (짐벌 PWM 각 · 컴퍼스 · 영상과 자세의 시각 차) 은 장 수를 늘려도 안 줄어든다 (11-14 · 2° 면 φ 25° 에서 3.7 m)
  원리  **가만히 있는 것** (선 · 앉은 · 누운 사람 · 가만히 있는 헛탐지 물체 · 표시점) 은 어느 프레임 · 어느 방향에서 봐도 같은 지면 점에 찍혀야 한다
        치우침이 있으면 드론이 다가올수록 (하향각 ↑) · 반대 방향 다리에서 볼 때 찍히는 점이 미끄러진다 → 흩어짐이 가장 작아지는 (피치 δp · 방위 δy · 시각 τ) 를 찾는다
        절대 위치 (GPS 고정 오프셋) 는 안 보인다 → 그건 표시점으로만
  시험  UE 비행 (S1~S4 × 16 · 20 m · 정확한 자세) 에 치우침을 일부러 넣고 → 되찾는지 · 좌표 오차 (가만히 있는 배우 정답 위치 대비) 가 돌아오는지
        관측 = 배포 엔진 탐지 박스 (runs_state/ue_flight_phys.pkl · 확신 ≥ 0.20 · 정답 이름으로 묶음) · 지면 높이 = 배우 발 높이 (DEM 을 안다고 가정) / 평지 (모른다고 가정)
실행  /home/se/miniconda3/envs/drone/bin/python geo_selfcal_probe.py
"""
import csv, json, math, pickle
from collections import defaultdict

import numpy as np
from scipy.optimize import least_squares

from phys_posture_probe import F, H, ROOT, W

rows, ngt = pickle.load(open(ROOT / "runs_state" / "ue_flight_phys.pkl", "rb"))
FPS = 10.0


def load_run(run):
    D = ROOT / "ue_flight" / run
    fl = list(csv.DictReader(open(D / "flight.csv"))); rj = json.loads((D / "run.json").read_text()); acts = json.loads((D / "actors.json").read_text())
    t = np.array([float(r["t_s"]) for r in fl]); xyz = np.array([[float(r["ned_x"]), float(r["ned_y"]), float(r["ned_z"])] for r in fl])
    yaw = np.unwrap(np.radians([float(r["yaw_deg"]) for r in fl])); mount = -float(fl[0]["cam_pitch_rel_body_deg"])
    fidx = {r["frame"]: i for i, r in enumerate(fl)}
    obs = []                                           # (배우 번호, 시각, u, v, 지면 z)
    names = [k for k, v in acts.items() if not v["moving"]]
    for r in rows:
        if r["run"] == run and r["gt"] in names and r["conf"] >= 0.20:
            b = r["box"]; a = acts[r["gt"]]
            v = (b[1] + b[3]) / 2 if a["pose_raw"] == "lying" else b[3]
            obs.append((names.index(r["gt"]), t[fidx[r["frame"]]], (b[0] + b[2]) / 2, v, a["ned"][2]))
    obs = np.array(obs)
    truth = np.array([acts[n]["ned"][:2] for n in names])
    return dict(t=t, xyz=xyz, yaw=yaw, mount=mount, obs=obs, truth=truth, ground=rj["ground_ned_z"], names=names,
                lying=np.array([acts[n]["pose_raw"] == "lying" for n in names]))


def project(R, theta, bias=(0.0, 0.0, 0.0), flat=False):
    """관측 → 지면 NED 점 · bias = 시스템이 잘못 아는 값 (피치 ° · 방위 ° · 자세가 늦게 온 시간 s) · theta = 보정 (피치 ° · 방위 ° · 시각 s)"""
    o = R["obs"]; tq = o[:, 1] - bias[2] + theta[2]
    x = np.interp(tq, R["t"], R["xyz"][:, 0]); y = np.interp(tq, R["t"], R["xyz"][:, 1]); z = np.interp(tq, R["t"], R["xyz"][:, 2])
    yaw = np.interp(tq, R["t"], R["yaw"]) + math.radians(bias[1] + theta[1])
    p = -math.radians(R["mount"] + bias[0] + theta[0])
    rx, ry, rz = np.ones(len(o)), (o[:, 2] - W / 2) / F, (o[:, 3] - H / 2) / F
    cx, sx = math.cos(p), math.sin(p)
    bx, by, bz = cx * rx + sx * rz, ry, -sx * rx + cx * rz                        # 피치
    dx, dy = np.cos(yaw) * bx - np.sin(yaw) * by, np.sin(yaw) * bx + np.cos(yaw) * by
    zg = np.full(len(o), R["ground"]) if flat else o[:, 4]
    s = (zg - z) / np.maximum(bz, 1e-3)
    return np.c_[x + s * dx, y + s * dy]


def scatter_res(theta, R, bias, flat):
    P = project(R, theta, bias, flat); a = R["obs"][:, 0].astype(int); res = np.zeros_like(P)
    for k in np.unique(a):
        m = a == k; res[m] = P[m] - P[m].mean(0)
    return res.ravel()


def solve(R, bias, flat, free=(True, True, True)):
    idx = [i for i, f in enumerate(free) if f]

    def fun(v):
        th = np.zeros(3); th[idx] = v
        return scatter_res(th, R, bias, flat)
    best = None
    for tau0 in (-0.4, 0.0, 0.4):                                                 # 시각은 여러 출발점 (국소 최소 피하기)
        v0 = np.zeros(len(idx))
        if free[2]:
            v0[-1] = tau0
        r = least_squares(fun, v0, loss="soft_l1", f_scale=1.0)
        if best is None or r.cost < best.cost:
            best = r
    th = np.zeros(3); th[idx] = best.x
    return th


def err(R, theta, bias, flat):
    P = project(R, theta, bias, flat); a = R["obs"][:, 0].astype(int)
    keep = ~R["lying"][a]                                                       # 누운 배우 원점 = 회전 축 (발끝이 아님) → 오차 통계에서는 뺌
    return np.hypot(*(P[keep] - R["truth"][a[keep]]).T)


def main():
    runs = [f"S{i}_a{a}" for i in (1, 3, 4) for a in (16, 20)]                  # S2 = 걷는 배우뿐 · S5 = 빈 장면
    R = {r: load_run(r) for r in runs}
    for r, d in R.items():
        print(f"{r}: 가만히 있는 배우 {len(d['names'])} · 관측 {len(d['obs']):,}")
    cases = [(0, 0, 0), (2, 0, 0), (-3, 0, 0), (0, 3, 0), (0, 0, 0.3), (2, -3, 0.3), (-4, 5, -0.5)]
    out = {}
    for flat in (False, True):
        print(f"\n=== 지면 높이: {'평지 가정 (모름)' if flat else '배우 발 높이 (DEM 을 앎)'}")
        print("  넣은 치우침 (피치° · 방위° · 시각 s) → 되찾은 값 평균 (비행 6편 · 표준편차) | 좌표 오차 중앙 / P95 m: 치우침 그대로 → 자체 보정 뒤 (치우침 없을 때)")
        e0 = np.concatenate([err(d, np.zeros(3), (0, 0, 0), flat) for d in R.values()])
        for bias in cases:
            th = np.array([solve(d, bias, flat) for d in R.values()])
            eb = np.concatenate([err(d, np.zeros(3), bias, flat) for d in R.values()])
            ea = np.concatenate([err(d, t, bias, flat) for d, t in zip(R.values(), th)])
            out[f"{'flat' if flat else 'dem'}{bias}"] = dict(found_mean=[round(float(x), 2) for x in th.mean(0)], found_sd=[round(float(x), 2) for x in th.std(0)],
                                                           before=[round(float(np.median(eb)), 2), round(float(np.percentile(eb, 95)), 2)],
                                                           after=[round(float(np.median(ea)), 2), round(float(np.percentile(ea, 95)), 2)],
                                                           exact=[round(float(np.median(e0)), 2), round(float(np.percentile(e0, 95)), 2)])
            print(f"  {str(bias):<16} → 피치 {th[:, 0].mean():+.2f} (±{th[:, 0].std():.2f}) · 방위 {th[:, 1].mean():+.2f} (±{th[:, 1].std():.2f}) · 시각 {th[:, 2].mean():+.2f} (±{th[:, 2].std():.2f})"
                  f" | {np.median(eb):.2f} / {np.percentile(eb, 95):.2f} → {np.median(ea):.2f} / {np.percentile(ea, 95):.2f}  ({np.median(e0):.2f} / {np.percentile(e0, 95):.2f})")
    # 관측이 적을 때 — 배우 수를 줄여서 (2명 · 1명)
    print("\n=== 가만히 있는 대상 수가 적을 때 (DEM 앎 · 치우침 2° · −3° · 0.3 s) — 되찾은 값의 흩어짐")
    rng = np.random.default_rng(0)
    for k in (1, 2, 4):
        th = []
        for d in R.values():
            for _ in range(6):
                if len(d["names"]) < k:
                    continue
                pick = rng.choice(len(d["names"]), k, replace=False); m = np.isin(d["obs"][:, 0].astype(int), pick)
                d2 = dict(d, obs=d["obs"][m])
                th.append(solve(d2, (2, -3, 0.3), False))
        th = np.array(th)
        out[f"few{k}"] = dict(mean=[round(float(x), 2) for x in th.mean(0)], sd=[round(float(x), 2) for x in th.std(0)], n=len(th))
        print(f"  대상 {k} 개: 피치 {th[:, 0].mean():+.2f} ± {th[:, 0].std():.2f} · 방위 {th[:, 1].mean():+.2f} ± {th[:, 1].std():.2f} · 시각 {th[:, 2].mean():+.2f} ± {th[:, 2].std():.2f} (참값 −2 · +3 · −0.3 · 시도 {len(th)})")
    (ROOT / "metrics" / "geo_selfcal_1115.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
