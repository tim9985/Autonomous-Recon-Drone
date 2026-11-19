"""좌표 융합 방식 비교 (몬테카를로) — 같은 사람을 여러 방위에서 볼 때: 지금 (등방 σ 역분산 평균) vs 타원 (2×2 공분산) 융합
   오차: 짐벌 피치 고정 치우침 b° + 프레임 잡음 1° · 방위 2° · GPS 1.5 m (관측마다 독립) · 고도 1 m (비행 내 고정 치우침)"""
import math, numpy as np
rng = np.random.default_rng(0)
D = math.radians

def one(h, dep, bearing, pb, pn=1.0, yn=2.0, gps=1.5, hb=0.0):
    """사람 = 원점 · 드론은 bearing 방향에서 봄 → 추정 위치 (동, 북) · 공분산 (모형 σ: 피치 1° · 고도 1 · 방위 2° · GPS 1.5)"""
    r = h / math.tan(D(dep))
    u = np.array([math.sin(D(bearing)), math.cos(D(bearing))])       # 드론 → 사람 수평 단위벡터
    v = np.array([u[1], -u[0]])
    drone = -r * u
    dep_m = dep + pb + rng.normal(0, pn)                              # 실제 광선은 dep · 계산은 치우친 각으로
    r_est = (h + hb) / math.tan(D(max(dep_m, 3)))
    yaw_e = D(rng.normal(0, yn))
    u_e = np.array([math.sin(D(bearing) + yaw_e), math.cos(D(bearing) + yaw_e)])
    p = drone + r_est * u_e + rng.normal(0, gps, 2)
    sa = math.sqrt((h / math.sin(D(dep)) ** 2 * D(1.0)) ** 2 + (1.0 / math.tan(D(dep))) ** 2 + gps ** 2)
    sc = math.sqrt((r * D(2.0)) ** 2 + gps ** 2)
    C = sa ** 2 * np.outer(u, u) + sc ** 2 * np.outer(v, v)
    return p, C, max(sa, sc)

def run(h, dep, bearings, pb, hb=0.0, n=4000):
    e1, eiso, ecov = [], [], []
    for _ in range(n):
        obs = [one(h, dep, b, pb, hb=hb) for b in bearings]
        e1.append(np.linalg.norm(obs[0][0]))
        w = np.array([1 / o[2] ** 2 for o in obs]); eiso.append(np.linalg.norm(sum(wi * o[0] for wi, o in zip(w, obs)) / w.sum()))
        I = sum(np.linalg.inv(o[1]) for o in obs); x = np.linalg.solve(I, sum(np.linalg.inv(o[1]) @ o[0] for o in obs)); ecov.append(np.linalg.norm(x))
    f = lambda v: f"{np.median(v):.2f}/{np.percentile(v, 95):.2f}"
    return f(e1), f(eiso), f(ecov)

print("고도 20 m · 중앙/P95 m — 한 장 | 지금 (등방 평균) | 타원 융합")
for dep in (25, 35, 45, 60):
    for pb in (0, 2, 4):
        for name, bs in (("한 방향 5장", [0] * 5), ("직각 2방향 (0 · 90°) 각 3장", [0, 0, 0, 90, 90, 90]), ("마주 2방향 (0 · 180°) 각 3장", [0, 0, 0, 180, 180, 180]), ("4방향 각 2장", [0, 0, 90, 90, 180, 180, 270, 270])):
            a, b, c = run(20, dep, bs, pb)
            print(f"  φ {dep}° · 피치 치우침 {pb}° · {name:<26} {a} | {b} | {c}")
