"""
geo_selfcal.py — 비행 기록만으로 좌표 치우침 자체 보정 (11-15 · 근거 geo_selfcal_probe.py · geo_selfcal_noise.py)

  무엇을  짐벌 피치 치우침 δp · 방위 (컴퍼스 · 요) 치우침 δy · 영상↔자세 시각 어긋남 τ — 표시점 없이 그 비행의 탐지 기록에서 추정
  원리    가만히 있는 것 (선 · 앉은 · 누운 사람 · 가만히 있는 헛탐지 물체 · 표시점 위 사람) 은 어느 프레임 · 어느 방향에서 봐도 같은 지면 점에 찍혀야 한다
          치우침이 있으면 드론이 다가올수록 · 반대 방향에서 볼 때 찍히는 점이 미끄러진다 → 묶음 안 흩어짐이 가장 작은 (δp, δy, τ)
          ⚠ 절대 위치 (GPS 고정 오프셋) 는 안 보인다 → 표시점으로만 · 고도 치우침은 피치와 섞여 같이 못 푼다 (라이다 AGL 을 믿음)
  입력    worker 녹화 `<임무>/poses.jsonl` (frame-pose/1.0 + analysis 박스 · record.py) — 지면 = 평지 AGL (altitude_datum AGL · 아니면 --ground-msl)
          또는 --ue <ue_flight 런 이름> (자체 시험 · 배포 엔진 탐지 = runs_state/ue_flight_phys.pkl · 정답 이름은 안 씀)
  절차    ① 발끝 광선 × 평지 → 지면 점 ② 이웃 프레임끼리 1.5 m 안이면 한 줄로 이음 (사람이 6 m 간격이어도 안 섞임)
          ③ 쓸 줄 = 관측 ≥ 12 · 2 초 이상 · 하향각 벌어짐 ≥ 8° (또는 방위 ≥ 40°) ④ 줄 안 흩어짐 최소화 (soft-L1 1 m) → 피치 · 방위 · 움직인 줄 (걷는 사람) 빼고 다시
          ⑤ 보정한 점으로 3 m 안 줄끼리 묶음 (다른 통과에서 본 같은 대상) → 피치 · 방위 · 시각 (τ 는 출발점 3개 · 여러 통과 묶음이 있을 때만)
          ⑥ 묶음 부트스트랩으로 표준오차 · 쓸 수 있는지 판단
  출력    metrics/geo_selfcal_<이름>.json — 보정값 · 표준오차 · 흩어짐 전/후 · 묶음 수 · 판단
  쓰는 법 보정값을 실비행 좌표 재계산에 넣는다 (피치 = 카메라가 보고보다 더 아래를 봄이 + · 방위 = 시계 방향 + · τ = 영상 시각에 더할 초)
실행  python geo_selfcal.py <녹화 임무 폴더> [--hfov 80.2] [--ground-msl 51.2] [--conf 0.3]
      python geo_selfcal.py --selftest          (UE 6편 · 치우침 2° · −3° · 0.3 s 를 넣고 되찾기 · 정답 이름 안 씀)
"""
import argparse, csv, json, math, pickle, sys
from datetime import datetime
from pathlib import Path

import numpy as np
from scipy.optimize import least_squares

BASE = Path(__file__).resolve().parent
D2R = math.pi / 180


def _Ry(t):
    c, s = math.cos(t), math.sin(t)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])


def _Rz(t):
    c, s = math.cos(t), math.sin(t)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


class Flight:
    """t (s) · ne (N,2 · 첫 프레임 기준 m) · agl (N) · R (N,3,3 카메라 FRD → NED) · obs (M,4: 프레임 번호, u, v, 확신) · W · H · f"""

    def __init__(self, t, ne, agl, R, obs, W=1920, H=1080, hfov=80.2):
        o = np.argsort(t)
        remap = np.empty(len(t), int); remap[o] = np.arange(len(t))
        self.t, self.ne, self.agl, self.R = np.asarray(t, float)[o], np.asarray(ne, float)[o], np.asarray(agl, float)[o], np.asarray(R, float)[o]
        obs = np.asarray(obs, float).reshape(-1, 4); obs[:, 0] = remap[obs[:, 0].astype(int)]
        self.obs, self.W, self.H = obs, W, H
        self.f = (W / 2) / math.tan(hfov * D2R / 2)
        self.yaw = np.unwrap(np.arctan2(self.R[:, 1, 0], self.R[:, 0, 0]))            # 카메라 광축의 수평 방위
        fi = self.obs[:, 0].astype(int)
        self.rays = np.c_[np.ones(len(self.obs)), (self.obs[:, 1] - W / 2) / self.f, (self.obs[:, 2] - H / 2) / self.f]
        self.ot = self.t[fi]; self.fi = fi

    def project(self, th=(0.0, 0.0, 0.0)):
        """관측 → 지면 NE 점 (M,2) · 하향각 (M) · th = (피치 아래 + °, 방위 시계 + °, 시각 s)"""
        tq = self.ot + th[2]
        n = np.interp(tq, self.t, self.ne[:, 0]); e = np.interp(tq, self.t, self.ne[:, 1]); h = np.interp(tq, self.t, self.agl)
        dyaw = np.interp(tq, self.t, self.yaw) - self.yaw[self.fi]                     # 시각을 옮긴 만큼 방위도 따라 돌림 (피치 · 롤은 그 프레임 값)
        Rp = _Ry(-th[0] * D2R)
        d = np.einsum("mij,mj->mi", self.R[self.fi], self.rays @ Rp.T)
        a = dyaw + th[1] * D2R; c, s = np.cos(a), np.sin(a)
        dn, de, dz = c * d[:, 0] - s * d[:, 1], s * d[:, 0] + c * d[:, 1], d[:, 2]
        ok = dz > 0.05
        k = np.where(ok, h / np.maximum(dz, 0.05), np.nan)
        dep = np.degrees(np.arctan2(dz, np.hypot(dn, de)))
        return np.c_[n + k * dn, e + k * de], dep


def cluster(P, conf, frame, gate):
    """확신 높은 것부터 탐욕 묶음 — 같은 프레임의 두 관측은 한 묶음에 안 넣는다 → 묶음 번호 (M · 못 쓰는 관측 −1)"""
    lab = np.full(len(P), -1); cen, cnt, frs = [], [], []
    for i in np.argsort(-conf):
        if not np.isfinite(P[i]).all():
            continue
        best = None
        for k in range(len(cen)):
            dd = math.hypot(cen[k][0] - P[i, 0], cen[k][1] - P[i, 1])
            if dd <= gate and frame[i] not in frs[k] and (best is None or dd < best[0]):
                best = (dd, k)
        if best is None:
            cen.append(P[i].copy()); cnt.append(1); frs.append({frame[i]}); lab[i] = len(cen) - 1
        else:
            k = best[1]; cen[k] = (cen[k] * cnt[k] + P[i]) / (cnt[k] + 1); cnt[k] += 1; frs[k].add(frame[i]); lab[i] = k
    return lab


def usable(F, lab, P, dep, n_min=12, dur_min=3.0, dep_min=8.0, head_min=40.0):
    keep = []
    head = np.degrees(F.yaw[F.fi])
    for k in np.unique(lab[lab >= 0]):
        m = lab == k
        if m.sum() < n_min or np.ptp(F.ot[m]) < dur_min:
            continue
        hs = np.degrees(np.unwrap(np.radians(head[m])))
        if np.ptp(dep[m]) >= dep_min or np.ptp(hs) >= head_min:
            keep.append(k)
    return keep


def solve(F, lab, keep, free=(True, True, True)):
    m = np.isin(lab, keep); idx = np.flatnonzero(m); L = lab[idx]
    groups = [np.flatnonzero(L == k) for k in keep]
    fi = [i for i, f in enumerate(free) if f]

    def res(v):
        th = np.zeros(3); th[fi] = v
        P, _ = F.project(th); P = P[idx]; r = np.zeros_like(P)
        for g in groups:
            r[g] = P[g] - np.nanmean(P[g], 0)
        return np.nan_to_num(r, nan=5.0).ravel()

    best = None
    for tau0 in ((-0.4, 0.0, 0.4) if free[2] else (0.0,)):
        v0 = np.zeros(len(fi))
        if free[2]:
            v0[-1] = tau0
        r = least_squares(res, v0, loss="soft_l1", f_scale=1.0)
        if best is None or r.cost < best.cost:
            best = r
    th = np.zeros(3); th[fi] = best.x
    J = best.jac; dof = max(len(best.fun) - len(fi) - 2 * len(groups), 1)
    try:
        cov = np.linalg.inv(J.T @ J) * float((best.fun ** 2).sum() / dof)
        sd = np.zeros(3); sd[fi] = np.sqrt(np.maximum(np.diag(cov), 0))
    except np.linalg.LinAlgError:
        sd = np.full(3, np.inf)
    return th, sd


def scatter(F, lab, keep, th):
    P, _ = F.project(th); out = []
    for k in keep:
        m = lab == k; out.append(float(np.sqrt(np.nanmean(((P[m] - np.nanmean(P[m], 0)) ** 2).sum(1)))))
    return np.array(out)


def tracklets(F, P, gate=1.5, gap=1.0):
    """프레임 순서대로 잇기 — 바로 앞 관측과 지면 점이 gate m 안 · gap 초 안이면 같은 줄 (치우침이 있어도 이웃 프레임끼리는 거의 안 움직인다)
    6 m 묶음은 사람이 6 m 간격으로 서 있으면 (치우침 3~6 m) 이웃을 한 묶음으로 합쳐 버린다 → 먼저 줄로 잇고, 보정한 뒤에 줄끼리 묶는다"""
    lab = np.full(len(P), -1); last = []                         # last = [n, e, t, 프레임]
    for i in np.lexsort((-F.obs[:, 3], F.ot)):
        if not np.isfinite(P[i]).all():
            continue
        best = None
        for k, (n, e, t, fr) in enumerate(last):
            dd = math.hypot(n - P[i, 0], e - P[i, 1])
            if fr != F.fi[i] and F.ot[i] - t <= gap and dd <= gate and (best is None or dd < best[0]):
                best = (dd, k)
        if best is None:
            last.append([P[i, 0], P[i, 1], F.ot[i], F.fi[i]]); lab[i] = len(last) - 1
        else:
            k = best[1]; last[k] = [P[i, 0], P[i, 1], F.ot[i], F.fi[i]]; lab[i] = k
    return lab


def merge_tracklets(F, lab, keep, th, gate=3.0):
    """보정한 지면 점으로 줄의 중심을 구해 gate m 안 줄끼리 한 묶음 (다른 통과에서 본 같은 대상) — 같은 시각에 겹치는 줄은 다른 사람"""
    P, _ = F.project(th); cen = {k: np.nanmedian(P[lab == k], 0) for k in keep}; span = {k: (F.ot[lab == k].min(), F.ot[lab == k].max()) for k in keep}
    grp, out = [], np.full(len(lab), -1)
    for k in sorted(keep, key=lambda k: -int((lab == k).sum())):
        best = None
        for gi, g in enumerate(grp):
            c = np.mean([cen[j] for j in g], 0); dd = float(np.hypot(*(c - cen[k])))
            clash = any(not (span[k][1] < span[j][0] or span[j][1] < span[k][0]) for j in g)
            if dd <= gate and not clash and (best is None or dd < best[0]):
                best = (dd, gi)
        if best is None:
            grp.append([k])
        else:
            grp[best[1]].append(k)
    for gi, g in enumerate(grp):
        out[np.isin(lab, g)] = gi
    return out, list(range(len(grp))), sum(len(g) > 1 for g in grp)


def calibrate(F, verbose=True):
    P0, dep0 = F.project()
    lab = tracklets(F, P0); keep = usable(F, lab, P0, dep0, n_min=12, dur_min=2.0, dep_min=8.0, head_min=40.0)
    out = {"관측": int(len(F.obs)), "이은 줄": int(len(np.unique(lab[lab >= 0]))), "쓸 줄 (관측 ≥ 12 · 2 초 · 하향각 ≥ 8° 벌어짐)": len(keep)}
    if len(keep) < 1:
        out["판단"] = "못 맞춤 — 가만히 있는 대상을 여러 하향각에서 본 줄이 없다"
        return out
    # ① 줄 안 흩어짐으로 피치 · 방위 (시각은 한 방향 통과만으로는 안 보인다) → 움직인 줄 (걷는 사람) 빼고 다시
    th, sd = solve(F, lab, keep, free=(True, True, False))
    sc = scatter(F, lab, keep, th); lim = max(1.0, 2.5 * float(np.median(sc)))
    keep = [k for k, s_ in zip(keep, sc) if s_ <= lim] or keep
    th, sd = solve(F, lab, keep, free=(True, True, False))
    # ② 보정한 뒤 줄끼리 묶어 (다른 통과 · 반대 방향) 세 값 모두
    lab2, keep2, n_multi = merge_tracklets(F, lab, keep, th)
    free = (True, True, n_multi >= 1)
    th2, sd2 = solve(F, lab2, keep2, free=free)
    sc2 = scatter(F, lab2, keep2, th2); lim2 = max(1.5, 2.5 * float(np.median(sc2)))
    keep3 = [k for k, s_ in zip(keep2, sc2) if s_ <= lim2] or keep2
    th2, _ = solve(F, lab2, keep3, free=free)
    s0, s1 = scatter(F, lab2, keep3, np.zeros(3)), scatter(F, lab2, keep3, th2)
    # 표준오차 = 묶음을 다시 뽑아 (부트스트랩 24회) 푼 값의 흩어짐 — 야코비안 식은 묶기 오류를 몰라 너무 작게 나온다
    rng = np.random.default_rng(0); bs = []
    for _ in range(24 if len(keep3) >= 2 else 0):
        pick = rng.choice(len(keep3), len(keep3)); lab_b = np.full(len(lab2), -1); kb = []
        for j, k in enumerate(pick):                              # 같은 묶음이 두 번 뽑히면 따로 센다 (관측을 복제하지 않고 가중만 못 줘서 한 번만 반영)
            if (lab_b[lab2 == keep3[k]] == -1).all():
                lab_b[lab2 == keep3[k]] = j; kb.append(j)
        bs.append(solve(F, lab_b, kb, free=free)[0])
    sd2 = np.std(bs, 0) if bs else np.full(3, np.inf)
    weak = sd2[0] > 1.0 or sd2[1] > 1.5 or not np.isfinite(sd2).all() or len(keep3) < 2
    out.update({"쓴 줄": len(keep), "묶음": len(keep3), "여러 통과에서 본 묶음": int(n_multi), "쓴 관측": int(np.isin(lab2, keep3).sum()),
                "보정 (피치 아래 + ° · 방위 시계 + ° · 시각 s)": [round(float(x), 2) for x in th2], "표준오차": [round(float(x), 2) for x in sd2],
                "시각 추정": ("함 — 표준오차가 0.1 s 를 넘으면 참고만 (사람이 촘촘하면 통과끼리 묶기가 틀릴 수 있음)" if free[2] else "못 함 (같은 대상을 다른 통과에서 본 묶음이 없음 → 0 으로 둠)"),
                "묶음 안 흩어짐 RMS m (중앙) 전 → 후": [round(float(np.median(s0)), 2), round(float(np.median(s1)), 2)],
                "판단": ("약함 — 묶음이 적거나 표준오차가 큼 (피치 > 1° · 방위 > 1.5°) · 참고만" if weak else "쓸 만함") +
                        (" · 보정이 작음 (|피치| < 0.5° · |방위| < 1° · |시각| < 0.1 s) → 그대로 써도 됨" if abs(th2[0]) < 0.5 and abs(th2[1]) < 1.0 and abs(th2[2]) < 0.1 else "")})
    if verbose:
        print(json.dumps(out, ensure_ascii=False, indent=1))
    return out


# ───────────────────────── 입력 ─────────────────────────
def load_recording(root, hfov, ground_msl=None, conf_min=0.3):
    sys.path.insert(0, str(BASE / "deploy" / "vision_worker"))
    from app.vision_core.pose import camera_rotation
    t, ne, agl, R, obs = [], [], [], [], []; lat0 = lon0 = None; W = H = None
    for line in open(Path(root) / "poses.jsonl"):
        r = json.loads(line); p = r.get("pose")
        if not p:
            continue
        g = p.get("geographic") or {}
        Rm, _, why = camera_rotation(p)
        if why or g.get("latitude") is None or g.get("altitude_m") is None:
            continue
        if g.get("altitude_datum") == "AGL":
            h = float(g["altitude_m"])
        elif ground_msl is not None:
            h = float(g["altitude_m"]) - ground_msl
        else:
            continue
        if h < 3:
            continue
        ts = datetime.fromisoformat(str(p.get("capture_at") or r.get("capture_at")).replace("Z", "+00:00")).timestamp()
        if lat0 is None:
            lat0, lon0 = float(g["latitude"]), float(g["longitude"])
        k = 111320.0
        ne.append(((float(g["latitude"]) - lat0) * k, (float(g["longitude"]) - lon0) * k * math.cos(lat0 * D2R)))
        t.append(ts); agl.append(h); R.append(Rm); W, H = r.get("width") or 1920, r.get("height") or 1080
        for a in r.get("analysis") or []:
            b = a.get("bbox") or a.get("box")
            if b is None or (a.get("confidence") or 0) < conf_min:
                continue
            x1, y1, x2, y2 = (b["x1"], b["y1"], b["x2"], b["y2"]) if isinstance(b, dict) else b
            if y2 >= H - 4:
                continue                                                    # 발끝이 화면 아래 끝 — 잘렸을 수 있음
            obs.append((len(t) - 1, (x1 + x2) / 2, y2, a["confidence"]))
    if not t:
        raise SystemExit("쓸 수 있는 프레임이 없다 (pose · 카메라 자세 · AGL 고도 — 고도가 MSL 이면 --ground-msl)")
    t = np.array(t) - min(t)
    return Flight(t, ne, agl, R, obs, W, H, hfov)


def load_ue(run, bias=(0.0, 0.0, 0.0), conf_min=0.3, rows=None):
    """UE 비행 → Flight · bias = 시스템이 잘못 아는 값 (피치 ° 아래로 더 보는 줄 앎 · 방위 ° · 자세가 늦게 온 s) — 정답 이름은 안 쓴다 (헛탐지 · 걷는 사람 포함)"""
    D = BASE / "ue_flight" / run
    fl = list(csv.DictReader(open(D / "flight.csv"))); rj = json.loads((D / "run.json").read_text())
    t = np.array([float(r["t_s"]) for r in fl]); fidx = {r["frame"]: i for i, r in enumerate(fl)}
    xyz = np.array([[float(r["ned_x"]), float(r["ned_y"]), float(r["ned_z"])] for r in fl]); yaw = np.unwrap(np.radians([float(r["yaw_deg"]) for r in fl]))
    mount = -float(fl[0]["cam_pitch_rel_body_deg"])
    tb = t - bias[2]                                                        # 시스템이 받은 자세 = 실제보다 bias[2] 초 전 것
    ne = np.c_[np.interp(tb, t, xyz[:, 0]), np.interp(tb, t, xyz[:, 1])]; agl = rj["ground_ned_z"] - np.interp(tb, t, xyz[:, 2])
    yb = np.interp(tb, t, yaw) + bias[1] * D2R
    R = np.array([_Rz(y) @ _Ry(-(mount + bias[0]) * D2R) for y in yb])
    if rows is None:
        rows, _ = pickle.load(open(BASE / "runs_state" / "ue_flight_phys.pkl", "rb"))
    obs = [(fidx[r["frame"]], (r["box"][0] + r["box"][2]) / 2, r["box"][3], r["conf"]) for r in rows
           if r["run"] == run and r["conf"] >= conf_min and r["box"][3] < 1076 and agl[fidx[r["frame"]]] >= 10]
    return Flight(t, ne, agl, R, obs, 1920, 1080, rj.get("hfov_deg", 80.2))


def selftest():
    rows, _ = pickle.load(open(BASE / "runs_state" / "ue_flight_phys.pkl", "rb"))
    runs = [f"S{i}_a{a}" for i in (1, 3, 4) for a in (16, 20)]
    print("UE 6편 · 배포 엔진 탐지 (확신 ≥ 0.3 · 헛탐지 · 걷는 사람 포함 · 정답 이름 안 씀) · 평지 가정 (실제 지형 기복 ±1 m)")
    res = {}
    for bias in ((0, 0, 0), (2, -3, 0.3), (-3, 4, -0.4)):
        TH, OK = [], 0
        for run in runs:
            o = calibrate(load_ue(run, bias, rows=rows), verbose=False)
            if "보정 (피치 아래 + ° · 방위 시계 + ° · 시각 s)" in o:
                TH.append(o["보정 (피치 아래 + ° · 방위 시계 + ° · 시각 s)"]); OK += o["판단"].startswith("쓸 만함")
        TH = np.array(TH); want = (-bias[0], -bias[1], bias[2])
        res[str(bias)] = dict(want=want, mean=[round(float(x), 2) for x in TH.mean(0)], sd=[round(float(x), 2) for x in TH.std(0)], ok=OK, n=len(TH))
        print(f"  넣은 치우침 {bias} → 되찾아야 할 값 {want} | 되찾은 값 피치 {TH[:, 0].mean():+.2f} ± {TH[:, 0].std():.2f} · 방위 {TH[:, 1].mean():+.2f} ± {TH[:, 1].std():.2f} · 시각 {TH[:, 2].mean():+.2f} ± {TH[:, 2].std():.2f} (비행 {len(TH)} · 「쓸 만함」 {OK})")
    (BASE / "metrics" / "geo_selfcal_selftest.json").write_text(json.dumps(res, ensure_ascii=False, indent=1))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("root", nargs="?")
    ap.add_argument("--ue", default=None)
    ap.add_argument("--selftest", action="store_true")
    ap.add_argument("--hfov", type=float, default=80.2)
    ap.add_argument("--ground-msl", type=float, default=None)
    ap.add_argument("--conf", type=float, default=0.3)
    a = ap.parse_args()
    if a.selftest:
        return selftest()
    if a.ue:
        F, name = load_ue(a.ue, conf_min=a.conf), a.ue
    else:
        F, name = load_recording(a.root, a.hfov, a.ground_msl, a.conf), Path(a.root).name
    out = calibrate(F, verbose=False)
    print(json.dumps(out, ensure_ascii=False, indent=1))
    (BASE / "metrics" / f"geo_selfcal_{name}.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
