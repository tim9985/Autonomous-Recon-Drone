"""
infer_geom_eval.py — 추론 방식 비교 (11-15 · 진단) — infer_geom_dump.py 덤프를 오프라인으로 합쳐 AP50 · 같은 헛탐지에서의 재현율을 잰다

  방식 (패스 0 타일 4장 · 1 타일 뒤집기 · 2 전체 한 장 · 3 전체 뒤집기 · 4/5 전체 90° 돌리기 — 있으면)
    T        타일 4장 → NMS 0.6 → 경계 잘린 박스 지우기            (= 배포 · 기준)
    F        전체 한 장 → NMS 0.6
    T+Tf     타일 + 타일 뒤집기 (8 관측)                            (시간 2 배 · 상한 참고)
    F+Ff     전체 + 전체 뒤집기 (2 관측 · 처리 화소 4.2 MP ≈ 타일 3.7 MP)
    *-max    겹친 박스 중 최고 점수 (NMS)      *-avg  본 관측 수로 나눈 평균 (WBF 식 · 못 본 관측은 0)      *-mix  (최고 + 평균) / 2
  채점  eval_test_v2 와 같은 탐욕 짝 (IoU 0.5) · test_v2 는 무시 영역 · 짝 블록 부트스트랩 (기준 T 대비)
  같은 헛탐지  AU-AIR 사람 없는 장에서 T @0.20 과 같은 건/장이 되는 문턱을 방식마다 찾아 그 문턱의 재현율을 비교
실행  /home/se/miniconda3/envs/drone/bin/python infer_geom_eval.py --model v12_f91_swa15
"""
import argparse, json
from pathlib import Path

import cv2
import numpy as np

from eval_test_v2 import ap101, blocks_of, iou_mat
from ignore_regions import Ignore
from tile_merge import TILES, TW, TH, edge_merge, ios, touches

BASE = Path(__file__).resolve().parent
D = BASE / "runs_person" / "dumps"
DEV = ("test_nii", "test_ladd_h", "test_sar", "test_sar45")
JUDGE = ("test_v2", "test_kr", "test_obl")


def load(model, tag, prefix="geom"):
    z = np.load(D / f"{prefix}_{model}_{tag}.npz", allow_pickle=True)
    n = len(z["names"]); img = z["img"]; o = np.argsort(img, kind="stable")
    cut = np.searchsorted(img[o], np.arange(n + 1))
    per = [dict(b=z["box"][o[cut[i]:cut[i + 1]]], s=z["score"][o[cut[i]:cut[i + 1]]], t=z["tile"][o[cut[i]:cut[i + 1]]],
                p=z["pas"][o[cut[i]:cut[i + 1]]]) for i in range(n)]
    return dict(per=per, gt=list(z["gt"]), names=[str(x) for x in z["names"]], wh=z["wh"], ms=z["ms"])


def nms(b, s, thr=0.6):
    if not len(b):
        return np.zeros(0, int)
    k = cv2.dnn.NMSBoxes([[float(x1), float(y1), float(x2 - x1), float(y2 - y1)] for x1, y1, x2, y2 in b], s.tolist(), 0.01, thr)
    return np.array(k).ravel().astype(int) if len(k) else np.zeros(0, int)


def drop_cut(b, s, t, v):
    """타일 안쪽 경계에 닿은 잘린 박스를 (합치기 전에) 지운다 — 다른 타일의 더 큰 박스에 60 % 넘게 들어가면 · 점수는 넘기지 않음"""
    if not len(b):
        return b, s, t, v
    area = (b[:, 2] - b[:, 0]) * (b[:, 3] - b[:, 1]); keep = np.ones(len(b), bool)
    for i in np.flatnonzero(t >= 0):
        if touches(b[i], t[i]):
            c = np.flatnonzero((t != t[i]) & (area > area[i]))
            if len(c) and ios(b[i], b[c]).max() >= 0.6:
                keep[i] = False
    return b[keep], s[keep], t[keep], v[keep]


def n_cover(box, views, wh):
    """이 박스를 온전히 볼 수 있는 관측 수 — 전체 한 장 패스는 1 · 타일 패스는 박스가 (2 px 여유로) 들어가는 타일 수"""
    n = 0
    for p in views:
        if p >= 2 or tuple(wh) != (1920, 1080):
            n += 1
        else:
            for (x0, y0) in TILES:
                in_x = (box[0] >= x0 + (2 if x0 > 0 else -1e9)) and (box[2] <= x0 + TW - (2 if x0 + TW < 1920 else -1e9))
                in_y = (box[1] >= y0 + (2 if y0 > 0 else -1e9)) and (box[3] <= y0 + TH - (2 if y0 + TH < 1080 else -1e9))
                n += int(in_x and in_y)
    return max(n, 1)


def fuse(d, wh, views, mode, thr=0.55):
    """관측 여러 개의 박스 묶기 — 묶음마다 관측별 최고 박스 하나 · 박스 = 점수 가중 평균 · 점수 = mode"""
    m = np.isin(d["p"], views)
    b, s, t, p = d["b"][m], d["s"][m], d["t"][m], d["p"][m]
    v = p * 10 + np.maximum(t, 0)                                   # 관측 번호 (패스 × 타일)
    if tuple(wh) == (1920, 1080):
        b, s, t, v = drop_cut(b, s, t, v)
    if not len(b):
        return np.zeros((0, 4), np.float32), np.zeros(0, np.float32)
    o = np.argsort(-s); b, s, v = b[o], s[o], v[o]
    used = np.zeros(len(b), bool); fb, fs = [], []
    M = iou_mat(b, b)
    for j in range(len(b)):
        if used[j]:
            continue
        mk = (M[j] >= thr) & ~used; mk[j] = True                    # 넓이 0 박스도 자기 자신은 묶음에
        grp = np.flatnonzero(mk); used[grp] = True
        best = {}
        for g in grp:                                               # 점수 내림차순이라 처음 본 것이 그 관측의 최고
            best.setdefault(int(v[g]), g)
        gi = np.array(list(best.values()), int); w = s[gi]
        box = (b[gi] * w[:, None]).sum(0) / w.sum()
        nc = max(n_cover(box, views, wh), len(gi))
        mx, av = float(w.max()), float(w.sum() / nc)
        fs.append(mx if mode == "max" else av if mode == "avg" else (mx + av) / 2)
        fb.append(box if mode != "max" else b[gi[0]])
    return np.array(fb, np.float32).reshape(-1, 4), np.array(fs, np.float32)


def deployed(d, wh, views=(0,)):
    """배포 방식 — NMS 0.6 → (1920×1080 이면) 경계 잘린 박스 지우기"""
    m = np.isin(d["p"], views); b, s, t = d["b"][m], d["s"][m], d["t"][m]
    k = nms(b, s, 0.6); b, s, t = b[k], s[k], t[k]
    if tuple(wh) == (1920, 1080) and (t >= 0).any():
        b, s = edge_merge(b, s, t)
    return b, s


def score(dets, gts, names, ign=None):
    """→ (점수, 맞음, 그림 번호, 그림별 정답 수)"""
    S, T, I = [], [], []
    for i, gt in enumerate(gts):
        b, s = dets[i]; o = np.argsort(-s); b, s = b[o], s[o]
        out = np.zeros(len(b), bool)
        if ign is not None:
            b, out = ign.prepare(names[i], b)
        M = iou_mat(gt, b); used = np.zeros(len(gt), bool)
        for j in range(len(b)):
            k = -1
            if len(gt):
                c = np.where((M[:, j] >= 0.5) & ~used)[0]
                if len(c):
                    k = c[np.argmax(M[c, j])]
            if k < 0 and ign is not None and ign.skip(names[i], b[j], out[j]):
                continue
            S.append(float(s[j])); T.append(k >= 0); I.append(i)
            if k >= 0:
                used[k] = True
    return np.array(S), np.array(T, bool), np.array(I, int), np.array([len(g) for g in gts], float)


def boot_pair(a, b, names, B=1000, seed=0):
    """짝 블록 부트스트랩 — b − a 의 AP50 차 95 % 구간"""
    blk, nblk, _ = blocks_of(names); rng = np.random.default_rng(seed)
    ia = [np.where(blk[a[2]] == k)[0] for k in range(nblk)]; ib = [np.where(blk[b[2]] == k)[0] for k in range(nblk)]
    g = np.bincount(blk, weights=a[3], minlength=nblk); d = []
    for _ in range(B):
        pk = rng.integers(0, nblk, nblk); n = g[pk].sum()
        xa = np.concatenate([ia[k] for k in pk]); xb = np.concatenate([ib[k] for k in pk])
        d.append(ap101(b[0][xb], b[1][xb], n) - ap101(a[0][xa], a[1][xa], n))
    return np.percentile(d, [2.5, 97.5])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="v12_f91_swa15")
    ap.add_argument("--boot", type=int, default=1000)
    a = ap.parse_args()
    METHODS = {
        "T (배포)": lambda d, wh: deployed(d, wh, (0,)),
        "F 전체 한 장": lambda d, wh: deployed(d, wh, (2,)),
        "T-avg": lambda d, wh: fuse(d, wh, (0,), "avg"),
        "T-mix": lambda d, wh: fuse(d, wh, (0,), "mix"),
        "F+Ff-max": lambda d, wh: deployed(d, wh, (2, 3)),
        "F+Ff-avg": lambda d, wh: fuse(d, wh, (2, 3), "avg"),
        "F+Ff-mix": lambda d, wh: fuse(d, wh, (2, 3), "mix"),
        "T+F-mix": lambda d, wh: fuse(d, wh, (0, 2), "mix"),
        "T+Tf-max": lambda d, wh: deployed(d, wh, (0, 1)),
        "T+Tf-mix": lambda d, wh: fuse(d, wh, (0, 1), "mix"),
    }
    res = {}
    # 같은 헛탐지 문턱 — AU-AIR 사람 없는 장
    au = load(a.model, "test_auair"); neg = [i for i, g in enumerate(au["gt"]) if not len(g)]
    thr = {}
    for name, fn in METHODS.items():
        sc = np.concatenate([fn(au["per"][i], au["wh"][i])[1] for i in neg]) if neg else np.zeros(0)
        if name == "T (배포)":
            base_fp = float((sc >= 0.20).sum()) / len(neg)
        k = int(round(base_fp * len(neg))); ss = np.sort(sc)[::-1]
        thr[name] = float(ss[k - 1]) if 0 < k <= len(ss) else 0.20
        res.setdefault("도로 (AU-AIR 사람 없는 장) 헛 건/장 @0.20", {})[name] = round(float((sc >= 0.20).sum()) / len(neg), 3)
    print(f"AU-AIR 사람 없는 {len(neg)} 장 · T @0.20 헛 {base_fp:.3f} 건/장 → 방식별 같은 헛탐지 문턱", {k: round(v, 3) for k, v in thr.items()})
    print("  @0.20 헛 건/장", res["도로 (AU-AIR 사람 없는 장) 헛 건/장 @0.20"])
    ign = Ignore(BASE / "data" / "test_v2" / "ignore_v1.json")
    for tag in DEV + JUDGE:
        if not (D / f"geom_{a.model}_{tag}.npz").exists():
            continue
        z = load(a.model, tag); keep = [i for i in range(len(z["names"])) if tuple(z["wh"][i]) in ((1920, 1080), (1280, 720))]
        gts = [z["gt"][i] for i in keep]; names = [z["names"][i] for i in keep]; n = sum(len(g) for g in gts)
        R = {}; base = None
        print(f"\n== {tag} · {len(keep)} 장 · 정답 {n:,}")
        for name, fn in METHODS.items():
            if tuple(z["wh"][keep[0]]) != (1920, 1080) and name in ("F 전체 한 장", "F+Ff-max", "F+Ff-avg", "F+Ff-mix", "T+F-mix", "T-avg", "T-mix"):
                continue                                                  # 1280×720 셋은 한 장 = 타일 하나
            dets = [fn(z["per"][i], z["wh"][i]) for i in keep]
            sc = score(dets, gts, names, ign if tag == "test_v2" else None)
            ap50 = ap101(sc[0], sc[1], n)
            rec = float(sc[1][sc[0] >= thr[name]].sum()) / max(n, 1); rec20 = float(sc[1][sc[0] >= 0.20].sum()) / max(n, 1)
            row = dict(AP50=round(ap50, 4), recall_same_fp=round(rec, 4), recall_020=round(rec20, 4))
            if base is None:
                base = sc
            elif a.boot:
                lo, hi = boot_pair(base, sc, names, a.boot); row["d_ci"] = [round(float(lo) * 100, 1), round(float(hi) * 100, 1)]
            R[name] = row
            ci = f" (95 % {row['d_ci'][0]:+.1f} ~ {row['d_ci'][1]:+.1f})" if "d_ci" in row else ""
            b0 = R["T (배포)"]
            print(f"  {name:<12} AP50 {ap50:.4f} ({(ap50 - b0['AP50']) * 100:+.1f}{ci}) · 같은 헛탐지 재현율 {rec:.4f} ({(rec - b0['recall_same_fp']) * 100:+.1f}) · @0.20 {rec20:.4f}")
        res[tag] = R
    res["ms (GPU 를 학습과 나눠 씀 — 비율만)"] = dict(zip(("타일 4장", "타일 뒤집기", "전체 한 장", "전체 뒤집기"), [round(float(x), 1) for x in au["ms"]]))
    (BASE / "metrics" / f"infer_geom_{a.model}.json").write_text(json.dumps(res, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
