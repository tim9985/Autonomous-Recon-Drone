"""
phys_posture_probe.py — 물리 (기하) 자세 모델 탐색 (11-14 · 진단 · 판정 아님)

  가설  지금 판정기 = 박스 (log h/w, log 긴변) 2특징 로지스틱 — 카메라 각 · 고도 · 화면 위치를 안 쓴다
        카메라 자세 (마운트각 · 고도) 를 알면 「서 있는 1.7 m 기둥」 · 「땅에 누운 1.7 m 몸 (방위 α)」 · 「앉은 몸」 이
        그 자리에서 어떤 박스로 보일지 예측할 수 있다 → 관측 박스의 가능도 비 = 학습 없는 자세 점수
  데이터 UE level01 (정답 박스 · 마운트 45/60/75 · 고도 16~30 · labels 의 박스 위치 + crops.csv 의 자세 · rel_az)
  비교  B0 (배포 점수 모델 · SARD+NOMAD) · V3 (배포 표시 모델 · UE 로 맞춤 = 표본 안) · 물리 모델 (맞춘 값 없음)
"""
import csv, json, math, sys
from collections import defaultdict
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent
W, H, HFOV = 1920, 1080, 80.2
F = (W / 2) / math.tan(math.radians(HFOV / 2))


def auc(y, s):
    y = np.asarray(y, bool); s = np.asarray(s, float)
    from scipy.stats import rankdata
    r = rankdata(s); n1 = y.sum(); n0 = (~y).sum()
    return float((r[y].sum() - n1 * (n1 + 1) / 2) / (n1 * n0)) if n1 and n0 else float("nan")


def cam_R(mount_deg):
    """카메라 (x 광축 · y 오른쪽 · z 아래) → 세계 (x 앞 · y 오른쪽 · z 아래) · 피치 = −mount"""
    p = -math.radians(mount_deg)
    c, s = math.cos(p), math.sin(p)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])


def ray_world(R, u, v):
    d = R @ np.array([1.0, (u - W / 2) / F, (v - H / 2) / F])
    return d


def project(R, cam_pos, P):
    """세계 점 (N,3) → 화소 (N,2)"""
    pc = (P - cam_pos) @ R            # R^T (P − C)
    return np.c_[W / 2 + F * pc[:, 1] / pc[:, 0], H / 2 + F * pc[:, 2] / pc[:, 0]]


def cuboid(center_xy, yaw, lx, ly, hz, z0=0.0):
    """땅 (z=0 · 아래 +) 위 직육면체 꼭짓점 8 — lx (몸 축) · ly (폭) · 높이 hz"""
    c, s = math.cos(yaw), math.sin(yaw)
    pts = []
    for a in (-lx / 2, lx / 2):
        for b in (-ly / 2, ly / 2):
            for z in (-z0, -(z0 + hz)):
                pts.append((center_xy[0] + a * c - b * s, center_xy[1] + a * s + b * c, z))
    return np.array(pts)


def ellipsoid_box(R, cam, center, axes, yaw):
    """타원체 (반축 axes = (몸축, 폭, 높이) · 중심 center) 의 화면 박스 — 표면 점 표본 투영 (직육면체보다 사람 윤곽에 가깝다)"""
    th = np.linspace(0, 2 * np.pi, 24, endpoint=False); ph = np.linspace(-np.pi / 2, np.pi / 2, 9)
    T, P_ = np.meshgrid(th, ph)
    x = axes[0] * np.cos(P_) * np.cos(T); y = axes[1] * np.cos(P_) * np.sin(T); z = axes[2] * np.sin(P_)
    c, s = math.cos(yaw), math.sin(yaw)
    pts = np.c_[(center[0] + x * c - y * s).ravel(), (center[1] + x * s + y * c).ravel(), (center[2] - z).ravel()]
    uv = project(R, cam, pts)
    return uv[:, 0].max() - uv[:, 0].min(), uv[:, 1].max() - uv[:, 1].min()


SIG = 0.22           # 박스 폭 · 높이 로그 오차 1σ (≈ 22 %) — 맞추지 않은 상수


def loglik(w, h, pw, ph):
    return -0.5 * ((math.log(w / pw) / SIG) ** 2 + (math.log(h / ph) / SIG) ** 2)


def lse(v):
    v = np.asarray(v); m = v.max()
    return float(m + np.log(np.exp(v - m).mean()))


def phys_scores(box, mount, alt):
    """관측 박스 (x1,y1,x2,y2) · 카메라 → (logL 서기, logL 앉음, logL 누움) — 가설마다 치수 · 방위를 고르게 섞어 평균"""
    x1, y1, x2, y2 = box
    w, h = max(x2 - x1, 1.0), max(y2 - y1, 1.0)
    R = cam_R(mount); cam = np.array([0.0, 0.0, -alt])
    # 서기 · 앉음: 발끝 (아래 변 가운데) 광선 × 지면
    d = ray_world(R, (x1 + x2) / 2, y2)
    out = {}
    if d[2] <= 1e-3:
        return None
    t = alt / d[2]; foot = cam + t * d
    az = math.atan2(d[1], d[0])
    Ls = []
    for hs in (1.55, 1.70, 1.85):
        for wd in (0.40, 0.55):
            pw, ph = ellipsoid_box(R, cam, (foot[0], foot[1], -hs / 2), (0.14, wd / 2, hs / 2), az)
            Ls.append(loglik(w, h, pw, ph))
    out["standing"] = lse(Ls)
    Ls = []
    for hs in (0.85, 1.05, 1.25):
        for wd in (0.55, 0.75):
            for dp in (0.5, 0.8):
                pw, ph = ellipsoid_box(R, cam, (foot[0], foot[1], -hs / 2), (dp / 2, wd / 2, hs / 2), az)
                Ls.append(loglik(w, h, pw, ph))
    out["sitting"] = lse(Ls)
    # 누움: 박스 가운데 광선 × (z = 0.12 m) 평면 → 몸 중심 · 방위 α 고르게
    d = ray_world(R, (x1 + x2) / 2, (y1 + y2) / 2)
    t = (alt - 0.12) / d[2]; c = cam + t * d
    Ls = []
    for a in np.arange(0, 180, 15):
        for L in (1.55, 1.75):
            pw, ph = ellipsoid_box(R, cam, (c[0], c[1], -0.13), (L / 2, 0.25, 0.13), az + math.radians(a))
            Ls.append(loglik(w, h, pw, ph))
    out["lying"] = lse(Ls)
    return out


class LR:
    def __init__(self, m):
        self.mean = None if m["mean"] is None else np.array(m["mean"]); self.scale = None if m["scale"] is None else np.array(m["scale"])
        self.W, self.b = np.array(m["coef"]), np.array(m["intercept"])

    def proba(self, wh):
        wh = np.maximum(np.asarray(wh, float).reshape(-1, 2), 1.0)
        X = np.c_[np.log(wh[:, 1] / wh[:, 0]), np.log(wh.max(1))]
        if self.mean is not None:
            X = (X - self.mean) / self.scale
        s = X @ self.W.T + self.b; s = np.exp(s - s.max(1, keepdims=True))
        return s / s.sum(1, keepdims=True)


def main():
    root = ROOT / "data/pose_cls/ue_level01"
    rows = list(csv.DictReader(open(root / "crops.csv")))
    by = defaultdict(list)
    for r in rows:
        stem = r["file"].split("/")[1][:13]            # level01_00001
        by[stem].append(r)
    js = json.loads((ROOT / "runs_person/_pack_v12w_real/posture.json").read_text())
    b0, v3 = LR(js["score"]), LR(js["display"])
    rec = []
    bad = 0
    for stem, rs in by.items():
        lab = [l.split() for l in (root / "labels" / f"{stem}.txt").read_text().strip().splitlines()]
        if len(lab) != len(rs):
            bad += 1; continue
        for r, l in zip(rs, lab):
            cx, cy, bw, bh = float(l[1]) * W, float(l[2]) * H, float(l[3]) * W, float(l[4]) * H
            if abs(bw - float(r["w1080"])) > 1.5 or abs(bh - float(r["h1080"])) > 1.5:
                bad += 1; continue
            if int(r["cut"]):
                continue
            box = (cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2)
            ps = phys_scores(box, float(r["mount"]), float(r["alt"]))
            if ps is None:
                continue
            p0 = b0.proba([[bw, bh]])[0]; p3 = v3.proba([[bw, bh]])[0]
            d = ray_world(cam_R(float(r["mount"])), cx, box[3]); dep = math.degrees(math.atan2(d[2], math.hypot(d[0], d[1])))
            rec.append(dict(scene=stem, pose=r["pose"], raw=r["pose_raw"], mount=int(r["mount"]), alt=int(r["alt"]), w=bw, h=bh, dep=dep,
                            rel=abs(((float(r["rel_az"]) + 180) % 360) - 180), b0=p0, v3=p3, ps=ps))
    print(f"행 {len(rec):,} (어긋남 {bad}) · 자세 { {k: sum(r['pose'] == k for r in rec) for k in ('lying', 'sitting', 'standing')} }")
    pose = np.array([r["pose"] for r in rec]); w = np.array([r["w"] for r in rec]); h = np.array([r["h"] for r in rec])
    rel = np.array([r["rel"] for r in rec]); mount = np.array([r["mount"] for r in rec]); dep = np.array([r["dep"] for r in rec])
    b0l = np.array([r["b0"][0] for r in rec]); v3l = np.array([r["v3"][0] for r in rec])
    PS = np.array([[r["ps"]["lying"], r["ps"]["sitting"], r["ps"]["standing"]] for r in rec])
    e = np.exp(PS - PS.max(1, keepdims=True)); PP = e / e.sum(1, keepdims=True)
    phl = PS[:, 0] - np.logaddexp(PS[:, 1], PS[:, 2])                     # 누움 대 나머지 로그 가능도 비
    phl2 = PS[:, 0] - PS[:, 2]                                            # 누움 대 서기
    ly, st, si = pose == "lying", pose == "standing", pose == "sitting"
    los = ly & ((rel <= 20) | (rel >= 160))

    def line(name, m_pos, m_neg, extra=""):
        m = m_pos | m_neg
        print(f"  {name:<34} n+ {m_pos.sum():>5} n− {m_neg.sum():>5} | B0 {auc(m_pos[m], b0l[m]):.3f} · V3 {auc(m_pos[m], v3l[m]):.3f} · 물리 {auc(m_pos[m], phl2[m] if 'vs 서기' in name else phl[m]):.3f} {extra}")

    print("\n누움 AUROC (높을수록 누운 사람을 위로)")
    line("누움 vs 서기 (전체)", ly, st)
    line("누움 vs 서기 (세로≥가로 구역)", ly & (h >= w), st & (h >= w))
    line("시선 방향 누움 vs 서기", los, st)
    line("누움 vs 서기+앉음 (전체)", ly, st | si)
    line("누움 vs 서기+앉음 (세로≥가로)", ly & (h >= w), (st | si) & (h >= w))
    for mt in (45, 60, 75):
        line(f"누움 vs 서기 · 마운트 {mt}°", ly & (mount == mt), st & (mount == mt))
    for lo, hi in ((20, 40), (40, 50), (50, 65), (65, 90)):
        k = (dep >= lo) & (dep < hi)
        line(f"시선 방향 누움 vs 서기 · φ {lo}~{hi}°", los & k, st & k)
    print("\n3자세 판정 (가장 높은 확률) — 매크로 F1 · 자세별 재현율")
    for name, P in (("B0", np.array([r["b0"] for r in rec])), ("V3 (UE 로 맞춤 · 표본 안)", np.array([r["v3"] for r in rec])), ("물리 (맞춘 값 없음)", PP)):
        pred = np.array(["lying", "sitting", "standing"])[P.argmax(1)]
        f1s, rc = [], []
        for c in ("lying", "sitting", "standing"):
            tp = ((pred == c) & (pose == c)).sum(); fp = ((pred == c) & (pose != c)).sum(); fn = ((pred != c) & (pose == c)).sum()
            f1s.append(2 * tp / max(2 * tp + fp + fn, 1)); rc.append(tp / max(tp + fn, 1))
        print(f"  {name:<28} 매크로 F1 {np.mean(f1s):.3f} · 재현율 누움 {rc[0]:.3f} · 앉음 {rc[1]:.3f} · 서기 {rc[2]:.3f}")
    # 장면 블록 부트스트랩 — 물리 − B0 (누움 vs 서기 전체 · 세로≥가로)
    scenes = np.array([r["scene"] for r in rec]); us = np.unique(scenes); idx = {s: np.flatnonzero(scenes == s) for s in us}
    rng = np.random.default_rng(0)
    for name, m in (("누움 vs 서기 전체", ly | st), ("세로≥가로", (ly | st) & (h >= w)), ("시선 방향", los | st)):
        diffs = []
        for _ in range(300):
            pick = np.concatenate([idx[s] for s in rng.choice(us, len(us))]); pick = pick[m[pick]]
            diffs.append(auc(ly[pick], phl2[pick]) - auc(ly[pick], b0l[pick]))
        lo, hi = np.percentile(diffs, [2.5, 97.5])
        print(f"  물리 − B0 · {name}: {np.mean(diffs):+.3f} (95 % {lo:+.3f} ~ {hi:+.3f})")
    np.save(ROOT / "runs_state" / "phys_ue.npy",
            dict(pose=pose, w=w, h=h, rel=rel, mount=mount, dep=dep, PS=PS, b0l=b0l, v3l=v3l), allow_pickle=True)


if __name__ == "__main__":
    main()
