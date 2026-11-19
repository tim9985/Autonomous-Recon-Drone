"""
phys_multiview_probe.py — 여러 시점을 「한 가설」 로 묶는 물리 자세 판정 (11-15 · 진단 · 판정 아님)

  11-14 물리 모델 = 한 장마다 (치수 · 몸 방위) 를 따로 섞어 평균 → 여러 장은 로그 가능도 비의 평균
      ⚠ 같은 사람인데 장마다 다른 몸 방위 · 다른 키를 허용한다 → 「시선 방향 누움 = 서기」 겹침이 장 수를 늘려도 안 풀린다
  여기  J 묶음 가설 — 사람의 키 · 폭 · (누움이면) 세계 몸 방위는 관측 내내 같다 → 가설마다 장들의 로그 가능도를 평균한 뒤 가설을 섞는다
        R 키 회귀   — 박스 위 · 아래 변 광선을 지면에 내린 두 점의 거리 D = a + h · cot φ_위
                      (h = 물체 높이 · a = 시선 방향 바닥 길이) → 하향각이 다른 장이 2장 넘으면 a · h 가 갈린다
                      서기 h ≈ 1.7 · a ≈ 0.3 / 앉음 h ≈ 1.0 / 누움 h ≈ 0.25 · a = 0.5 (가로) ~ 1.7 (시선 방향)
  데이터 UE level01 정답 박스 (배우 30 · 마운트 45/60/75 · 고도 16~30) — 같은 배우의 다른 장면을 모아 가상 통과를 만든다
        P1 한 통과   같은 방위 (rel_az ±12°) · 하향각이 다른 K 장      P2 방위가 다른 통과  방위 무관 K 장
  비교  B0 평균 (배포) · M (11-14 · 장마다 섞은 로그비 평균) · J · R
실행  /home/se/miniconda3/envs/drone/bin/python phys_multiview_probe.py
"""
import csv, json, math
from collections import defaultdict
from pathlib import Path

import numpy as np

from phys_posture_probe import F, H, LR, ROOT, SIG, W, auc, cam_R, project, ray_world

TH = np.linspace(0, 2 * np.pi, 24, endpoint=False); PH = np.linspace(-np.pi / 2, np.pi / 2, 9)
_T, _P = np.meshgrid(TH, PH)
UX, UY, UZ = (np.cos(_P) * np.cos(_T)).ravel(), (np.cos(_P) * np.sin(_T)).ravel(), np.sin(_P).ravel()

ST = [(hs, wd) for hs in (1.55, 1.70, 1.85) for wd in (0.40, 0.55)]
SI = [(hs, wd, dp) for hs in (0.85, 1.05, 1.25) for wd in (0.55, 0.75) for dp in (0.5, 0.8)]
LY = [(a, L) for a in np.arange(0, 180, 15) for L in (1.55, 1.75)]


def ebox(R, cam, center, axes, yaw):
    c, s = math.cos(yaw), math.sin(yaw)
    x, y, z = axes[0] * UX, axes[1] * UY, axes[2] * UZ
    pts = np.c_[center[0] + x * c - y * s, center[1] + x * s + y * c, center[2] - z]
    uv = project(R, cam, pts)
    return uv[:, 0].max() - uv[:, 0].min(), uv[:, 1].max() - uv[:, 1].min()


def ll(w, h, pw, ph):
    return -0.5 * ((math.log(w / pw) / SIG) ** 2 + (math.log(h / ph) / SIG) ** 2)


def hyp_ll(box, mount, alt, body_minus_view_deg=None):
    """한 관측 → (서기 6, 앉음 12, 누움 24) 가설별 로그 가능도 + 키 회귀 재료 (D, cot φ_위, φ_아래)
    body_minus_view_deg: 누움 가설의 0° 기준 = (세계 몸 방위 − 시선 방위) 의 관측별 값 · None 이면 시선 방위 기준 (한 장 모델과 같음)"""
    x1, y1, x2, y2 = box
    w, h = max(x2 - x1, 1.0), max(y2 - y1, 1.0)
    R = cam_R(mount); cam = np.array([0.0, 0.0, -alt])
    db = ray_world(R, (x1 + x2) / 2, y2)
    if db[2] <= 1e-3:
        return None
    foot = cam + alt / db[2] * db; az = math.atan2(db[1], db[0])
    st = np.array([ll(w, h, *ebox(R, cam, (foot[0], foot[1], -hs / 2), (0.14, wd / 2, hs / 2), az)) for hs, wd in ST])
    si = np.array([ll(w, h, *ebox(R, cam, (foot[0], foot[1], -hs / 2), (dp / 2, wd / 2, hs / 2), az)) for hs, wd, dp in SI])
    dc = ray_world(R, (x1 + x2) / 2, (y1 + y2) / 2)
    c = cam + (alt - 0.12) / dc[2] * dc
    base = az + (0.0 if body_minus_view_deg is None else math.radians(body_minus_view_deg))
    ly = np.array([ll(w, h, *ebox(R, cam, (c[0], c[1], -0.13), (L / 2, 0.25, 0.13), base + math.radians(a))) for a, L in LY])
    dt = ray_world(R, (x1 + x2) / 2, y1)
    reg = None
    if dt[2] > 1e-3:
        top = cam + alt / dt[2] * dt
        reg = (float(np.hypot(top[0] - foot[0], top[1] - foot[1])), float(math.hypot(dt[0], dt[1]) / dt[2]),
               math.degrees(math.atan2(db[2], math.hypot(db[0], db[1]))))
    return st, si, ly, reg


def lse(v, axis=-1):
    m = v.max(axis, keepdims=True)
    return (m + np.log(np.exp(v - m).mean(axis, keepdims=True))).squeeze(axis)


def joint_scores(obs, temp=1.0):
    """obs = [(st, si, ly, reg)] 같은 사람 → dict(M 한 장 섞기 평균, J 묶음 가설, R 키 회귀 h)
    temp: J 에서 장들의 로그 가능도를 더할 때 곱하는 값 / 장 수 (1 = 평균 · K = 합)"""
    st = np.stack([o[0] for o in obs]); si = np.stack([o[1] for o in obs]); ly = np.stack([o[2] for o in obs])
    k = len(obs)
    m_ly, m_st, m_si = lse(ly, 1), lse(st, 1), lse(si, 1)
    M = float(np.mean(m_ly - m_st)); M3 = float(np.mean(m_ly - np.logaddexp(m_st, m_si)))
    j_ly, j_st, j_si = lse(ly.mean(0) * temp), lse(st.mean(0) * temp), lse(si.mean(0) * temp)
    J = float(j_ly - j_st); J3 = float(j_ly - np.logaddexp(j_st, j_si))
    out = dict(M=M, M3=M3, J=J, J3=J3, Jst=float(j_st), Jsi=float(j_si), Jly=float(j_ly))
    regs = [o[3] for o in obs if o[3] is not None]
    if len(regs) >= 2:
        D = np.array([r[0] for r in regs]); c = np.array([r[1] for r in regs])
        out["spread"] = float(c.max() - c.min())
        from scipy.optimize import nnls
        A = np.c_[np.ones(len(c)), c]
        (a, hh), _ = nnls(A, D)
        out["Rh"], out["Ra"] = float(hh), float(a)
        # 약한 사전 (a 0.6 ± 0.8 m · h 1.0 ± 1.0 m) 을 넣은 능선 회귀 — 하향각이 덜 벌어진 때 흔들림 줄이기
        lam = np.diag([1 / 0.8 ** 2, 1 / 1.0 ** 2]) * 0.15 ** 2
        sol = np.linalg.solve(A.T @ A + lam, A.T @ D + lam @ np.array([0.6, 1.0]))
        out["Rh_ridge"] = float(max(sol[1], 0.0))
    return out


def load_ue():
    root = ROOT / "data/pose_cls/ue_level01"
    rows = list(csv.DictReader(open(root / "crops.csv")))
    by = defaultdict(list)
    for r in rows:
        by[r["file"].split("/")[1][:13]].append(r)
    js = json.loads((ROOT / "runs_person/_pack_v12w_real/posture.json").read_text()); b0 = LR(js["score"])
    rec = []
    for stem, rs in by.items():
        lab = [l.split() for l in (root / "labels" / f"{stem}.txt").read_text().strip().splitlines()]
        if len(lab) != len(rs):
            continue
        for r, l in zip(rs, lab):
            cx, cy, bw, bh = float(l[1]) * W, float(l[2]) * H, float(l[3]) * W, float(l[4]) * H
            if abs(bw - float(r["w1080"])) > 1.5 or abs(bh - float(r["h1080"])) > 1.5 or int(r["cut"]):
                continue
            box = (cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2)
            o = hyp_ll(box, float(r["mount"]), float(r["alt"]), -float(r["rel_az"]))
            if o is None or o[3] is None:
                continue
            rec.append(dict(actor=r["actor"], pose=r["pose"], raw=r["pose_raw"], mount=int(r["mount"]), alt=int(r["alt"]), w=bw, h=bh,
                            rel=float(r["rel_az"]), dep=o[3][2], o=o, b0=float(b0.proba([[bw, bh]])[0][0])))
    return rec


def make_sets(rec, K, mode, rng, n_per_actor=150, mounts=(45,), min_dep_span=0.0):
    """가상 통과 — 같은 배우 K 장 · P1: rel_az ±12° 안 · P2: 방위 무관"""
    by = defaultdict(list)
    for i, r in enumerate(rec):
        if r["mount"] in mounts:
            by[r["actor"]].append(i)
    sets = []
    for actor, idx in by.items():
        idx = np.array(idx); rel = np.array([rec[i]["rel"] for i in idx]); dep = np.array([rec[i]["dep"] for i in idx])
        for _ in range(n_per_actor):
            a = rng.integers(len(idx))
            if mode == "P1":
                d = np.abs(((rel - rel[a] + 180) % 360) - 180); cand = np.flatnonzero(d <= 12)
            else:
                cand = np.arange(len(idx))
            if len(cand) < K:
                continue
            for _try in range(20):
                pick = rng.choice(cand, K, replace=False)
                if K == 1 or dep[pick].max() - dep[pick].min() >= min_dep_span:
                    sets.append(idx[pick]); break
    return sets


def evaluate(rec, sets, label):
    y_raw = np.array([rec[s[0]]["raw"] for s in sets]); res = defaultdict(list)
    for s in sets:
        js = joint_scores([rec[i]["o"] for i in s])
        res["B0"].append(np.mean([rec[i]["b0"] for i in s]))
        for k in ("M", "J", "M3", "J3"):
            res[k].append(js[k])
        res["R"].append(-js.get("Rh", np.nan)); res["Rr"].append(-js.get("Rh_ridge", np.nan))
    ly = y_raw == "lying"; st = y_raw == "walking"; si = np.isin(y_raw, ["sitting", "crouching"])
    rel0 = np.array([abs(((rec[s[0]]["rel"] + 180) % 360) - 180) for s in sets]); los = ly & ((rel0 <= 20) | (rel0 >= 160))
    out = {}
    for name, pos, neg, keys in (("누움 vs 서기", ly, st, ("B0", "M", "J", "R", "Rr")), ("시선 방향 누움 vs 서기", los, st, ("B0", "M", "J", "R", "Rr")),
                                 ("누움 vs 서기+앉음", ly, st | si, ("B0", "M3", "J3", "R", "Rr")), ("앉음 vs 서기 (h 낮을수록 앉음)", si, st, ("R", "Rr"))):
        m = pos | neg
        out[name] = {k: round(auc(pos[m], np.nan_to_num(np.array(res[k])[m], nan=0.0)), 3) for k in keys}
    print(f"[{label}] 묶음 {len(sets):,} (누움 {ly.sum()} · 서기 {st.sum()} · 앉음 {si.sum()})")
    for k, v in out.items():
        print(f"    {k:<26} " + " · ".join(f"{a} {b:.3f}" for a, b in v.items()))
    return out, res, y_raw


def main():
    rec = load_ue()
    print(f"관측 {len(rec):,} · 배우 {len({r['actor'] for r in rec})} · 자세 { {k: sum(r['raw'] == k for r in rec) for k in ('lying', 'sitting', 'crouching', 'walking')} }")
    rng = np.random.default_rng(0); allres = {}
    for mounts, mname in (((45,), "마운트 45°"), ((45, 60, 75), "마운트 45·60·75° 섞음")):
        for mode, K, span in (("P1", 1, 0), ("P1", 3, 15), ("P1", 5, 25), ("P1", 5, 0), ("P2", 3, 0), ("P2", 5, 0)):
            sets = make_sets(rec, K, mode, rng, mounts=mounts, min_dep_span=span)
            lab = f"{mname} · {mode} · {K}장" + (f" · 하향각 벌어짐 ≥ {span}°" if span else "")
            allres[lab] = evaluate(rec, sets, lab)[0]
    # 키 회귀가 내는 값 (마운트 45 · P1 5장 · 하향각 ≥ 25°)
    sets = make_sets(rec, 5, "P1", np.random.default_rng(1), mounts=(45,), min_dep_span=25)
    hs = defaultdict(list)
    for s in sets:
        js = joint_scores([rec[i]["o"] for i in s]); hs[rec[s[0]]["raw"]].append((js["Rh"], js["Ra"]))
    print("\n키 회귀 값 (m · 중앙 [10 % ~ 90 %]) — 마운트 45° · 한 통과 5장 · 하향각 ≥ 25°")
    hsum = {}
    for k, v in hs.items():
        v = np.array(v); q = np.percentile(v[:, 0], [10, 50, 90]); qa = np.percentile(v[:, 1], [10, 50, 90])
        hsum[k] = dict(h=[round(float(x), 2) for x in q], a=[round(float(x), 2) for x in qa], n=len(v))
        print(f"    {k:<10} 높이 h {q[1]:.2f} [{q[0]:.2f} ~ {q[2]:.2f}] · 바닥 길이 a {qa[1]:.2f} [{qa[0]:.2f} ~ {qa[2]:.2f}] (n {len(v)})")
    (ROOT / "metrics" / "phys_multiview_1115.json").write_text(json.dumps(dict(auroc=allres, height=hsum), ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
