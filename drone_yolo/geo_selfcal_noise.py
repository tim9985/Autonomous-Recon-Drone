"""
geo_selfcal_noise.py — 좌표 자체 보정이 실비행 수준 잡음에서도 되나 (11-15 · 진단) — geo_selfcal_probe 에 항법 잡음을 얹어 다시

  잡음 (비행마다 새로 뽑음)  GPS 수평 = 느리게 떠도는 오차 (가우스-마르코프 · 1σ 1.0 m · 상관 시간 30 s) + 흰 잡음 0.2 m
                           고도 = 떠도는 오차 1σ 0.5 m (30 s) · 방위 = 떠도는 오차 1σ 1.5° (20 s) + 흰 잡음 0.5° · 피치 흔들림 흰 잡음 0.3°
  넣은 고정 치우침  피치 +2° · 방위 −3° · 시각 0.3 s  → 되찾은 값 · 좌표 오차 (가만히 있는 배우 정답 대비)
실행  /home/se/miniconda3/envs/drone/bin/python geo_selfcal_noise.py
"""
import json, math
import numpy as np
from scipy.optimize import least_squares
import geo_selfcal_probe as G
from phys_posture_probe import F, H, ROOT, W


def gm(n, dt, sigma, tau, rng):
    a = math.exp(-dt / tau); x = np.zeros(n); x[0] = rng.normal(0, sigma)
    for i in range(1, n):
        x[i] = a * x[i - 1] + rng.normal(0, sigma * math.sqrt(1 - a * a))
    return x


def noisy(R, rng):
    n = len(R["t"]); dt = 0.1
    xyz = R["xyz"].copy()
    xyz[:, 0] += gm(n, dt, 1.0, 30, rng) + rng.normal(0, 0.2, n); xyz[:, 1] += gm(n, dt, 1.0, 30, rng) + rng.normal(0, 0.2, n)
    xyz[:, 2] += gm(n, dt, 0.5, 30, rng)
    yaw = R["yaw"] + np.radians(gm(n, dt, 1.5, 20, rng) + rng.normal(0, 0.5, n))
    return dict(R, xyz=xyz, yaw=yaw, pj=rng.normal(0, 0.3, len(R["obs"])))


def project(R, theta, bias, flat=False):
    o = R["obs"]; tq = o[:, 1] - bias[2] + theta[2]
    x = np.interp(tq, R["t"], R["xyz"][:, 0]); y = np.interp(tq, R["t"], R["xyz"][:, 1]); z = np.interp(tq, R["t"], R["xyz"][:, 2])
    yaw = np.interp(tq, R["t"], R["yaw"]) + math.radians(bias[1] + theta[1])
    p = -np.radians(R["mount"] + bias[0] + theta[0] + R.get("pj", 0.0))
    rx, ry, rz = np.ones(len(o)), (o[:, 2] - W / 2) / F, (o[:, 3] - H / 2) / F
    cx, sx = np.cos(p), np.sin(p)
    bx, by, bz = cx * rx + sx * rz, ry, -sx * rx + cx * rz
    dx, dy = np.cos(yaw) * bx - np.sin(yaw) * by, np.sin(yaw) * bx + np.cos(yaw) * by
    zg = np.full(len(o), R["ground"]) if flat else o[:, 4]
    s = (zg - z) / np.maximum(bz, 1e-3)
    return np.c_[x + s * dx, y + s * dy]


G.project = project                                   # 흔들림 항이 든 투영으로 바꿔 끼움 (solve · err 가 이걸 씀)
runs = [f"S{i}_a{a}" for i in (1, 3, 4) for a in (16, 20)]
R0 = {r: G.load_run(r) for r in runs}
rng = np.random.default_rng(0); bias = (2.0, -3.0, 0.3); out = {}
for flat in (False, True):
    TH, EB, EA, EN = [], [], [], []
    for rep in range(8):
        for r, d in R0.items():
            dn = noisy(d, rng)
            th = G.solve(dn, bias, flat); TH.append(th)
            EB.append(G.err(dn, np.zeros(3), bias, flat)); EA.append(G.err(dn, th, bias, flat)); EN.append(G.err(dn, np.zeros(3), (0, 0, 0), flat))
    TH = np.array(TH); EB, EA, EN = np.concatenate(EB), np.concatenate(EA), np.concatenate(EN)
    q = lambda e: f"{np.median(e):.2f} / {np.percentile(e, 95):.2f}"
    print(f"[{'평지 가정' if flat else 'DEM 앎'}] 되찾은 값 (참값 −2 · +3 · +0.3): 피치 {TH[:, 0].mean():+.2f} ± {TH[:, 0].std():.2f} · 방위 {TH[:, 1].mean():+.2f} ± {TH[:, 1].std():.2f} · 시각 {TH[:, 2].mean():+.2f} ± {TH[:, 2].std():.2f} (비행 {len(TH)})")
    print(f"    좌표 오차 중앙 / P95 m — 치우침 그대로 {q(EB)} → 자체 보정 뒤 {q(EA)} · (치우침이 없었다면 {q(EN)})")
    out["flat" if flat else "dem"] = dict(found_mean=[round(float(x), 2) for x in TH.mean(0)], found_sd=[round(float(x), 2) for x in TH.std(0)],
                                          before=q(EB), after=q(EA), no_bias=q(EN))
(ROOT / "metrics" / "geo_selfcal_noise_1115.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
