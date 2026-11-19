"""
res4k_probe.py — 「4K 로 받으면 탐지에 의미가 있나」 (11-17 · 진단) — 같은 Okutama 프레임을 1080p (운용) 와 4K 원본으로

  재료  data/test_obl1080 (4K 원본 → 1920×1080 면적 평균 · 954장 · 운용과 같은 입력) · data/test_obl4k (같은 프레임 4K 그대로 · make_testset_obl4k.py)
  방식  A    1080p → 타일 4장 (1280×720 · 겹침 50 %) · NMS 0.6 · 경계 합치기          = 지금 worker (4K 를 받아도 이렇게 줄여서 봄)
        B25  4K 원본 → 타일 25장 (겹침 50 %)  — 사람이 2배 크게 보임 · 계산 6.25 배
        B16  4K 원본 → 타일 16장 (겹침 ≈ 33 %) — 계산 4 배
        B9   4K 원본 → 타일 9장 (겹침 없음)   — 계산 2.25 배
        D    A 를 돌리고 「애매한 후보」 (확신 0.02~0.4) 자리만 4K 에서 1280×720 창으로 다시 봄 (프레임당 창 ≤ 6) · 창 안의 낮은 확신 박스는 4K 판정으로 바꿈 — 실시간에 4K 를 쓰는 싼 방법
  재는 것  AP50 · AP30 · 중심 일치 AP · 재현율@0.20 크기별 (1080p 기준 긴 변 px) · 같은 셋 안 헛탐지 (중심 일치로 정답 아닌 탐지) 를 A @0.20 과 같게 맞춘 문턱에서 재현율 · 프레임당 타일 수 · 시간
  ⚠ Okutama = 남의 카메라 · 원본 녹화 (전송 압축 없음) → 「4K 정보가 있을 때의 상한」 · 우리 링크는 4K 압축이 더 셀 수 있음
실행  /home/se/miniconda3/envs/drone/bin/python res4k_probe.py [--model v12_f91_swa15]
"""
import argparse, json, time
from pathlib import Path

import cv2
import numpy as np

from analyze_dets import ap_at, match
from diag_headroom import ap_center
from eval_test_v2 import ap101, iou_mat, load_gt
from tile_merge import ios

BASE = Path(__file__).resolve().parent
TW, TH = 1280, 720
BINS = [(0, 24), (24, 36), (36, 50), (50, 80), (80, 1e9)]


def grid(W, H, nx, ny):
    xs = np.linspace(0, W - TW, nx).round().astype(int) if nx > 1 else [0]
    ys = np.linspace(0, H - TH, ny).round().astype(int) if ny > 1 else [0]
    return [(int(x), int(y)) for y in ys for x in xs]


def nms(b, s, thr=0.6):
    if not len(b):
        return np.zeros(0, int)
    k = cv2.dnn.NMSBoxes([[float(x1), float(y1), float(x2 - x1), float(y2 - y1)] for x1, y1, x2, y2 in b], s.tolist(), 0.01, thr)
    return np.array(k).ravel().astype(int) if len(k) else np.zeros(0, int)


def edge_merge_grid(b, s, t, offs, W, H, e=3.0, thr=0.6):
    """tile_merge.edge_merge 를 아무 타일 배치에나 — 자기 타일 안쪽 경계에 닿은 작은 박스가 다른 타일의 큰 박스 안에 60 % 넘게 들면 지움"""
    if not len(b):
        return b, s
    s = s.copy(); area = (b[:, 2] - b[:, 0]) * (b[:, 3] - b[:, 1]); drop = np.zeros(len(b), bool)
    for i in np.argsort(area):
        x0, y0 = offs[t[i]]
        if not ((x0 > 0 and b[i, 0] - x0 <= e) or (x0 + TW < W and x0 + TW - b[i, 2] <= e) or (y0 > 0 and b[i, 1] - y0 <= e) or (y0 + TH < H and y0 + TH - b[i, 3] <= e)):
            continue
        c = np.flatnonzero((t != t[i]) & ~drop & (area > area[i]))
        if len(c):
            r = ios(b[i], b[c])
            if r.max() >= thr:
                j = c[np.argmax(r)]; s[j] = max(s[j], s[i]); drop[i] = True
    return b[~drop], s[~drop]


def run_tiles(model, img, offs):
    tiles = [img[y:y + TH, x:x + TW] for x, y in offs]
    B, S, T = [], [], []
    for k0 in range(0, len(tiles), 16):
        res = model.predict(tiles[k0:k0 + 16], imgsz=1280, conf=0.01, iou=0.7, batch=len(tiles[k0:k0 + 16]), quantize="fp16", verbose=False)
        for k, r in enumerate(res, start=k0):
            if len(r.boxes):
                ox, oy = offs[k]
                B.append(r.boxes.xyxy.cpu().numpy() + np.array([ox, oy, ox, oy], np.float32)); S.append(r.boxes.conf.cpu().numpy()); T.append(np.full(len(r.boxes), k))
    if not B:
        return np.zeros((0, 4), np.float32), np.zeros(0, np.float32)
    b, s, t = np.concatenate(B), np.concatenate(S), np.concatenate(T)
    k = nms(b, s); H, W = img.shape[:2]
    return edge_merge_grid(b[k], s[k], t[k], offs, W, H)


def recheck(model, img4k, b, s, lo=0.02, hi=0.4, cap=6):
    """A 의 애매한 후보 자리만 4K 에서 다시 — 창 (4K 1280×720 = 1080p 640×360) 안의 낮은 확신 박스를 4K 판정으로 바꿈"""
    cand = np.flatnonzero((s >= lo) & (s < hi)); cand = cand[np.argsort(-s[cand])]
    wins = []
    for i in cand:
        cx, cy = (b[i, 0] + b[i, 2]), (b[i, 1] + b[i, 3])           # 4K 좌표 중심 (1080p ×2 / 2 = 그대로 합)
        if any(x0 + 0.2 * TW <= cx <= x0 + 0.8 * TW and y0 + 0.2 * TH <= cy <= y0 + 0.8 * TH for x0, y0 in wins):
            continue
        wins.append((int(np.clip(cx - TW / 2, 0, 3840 - TW)), int(np.clip(cy - TH / 2, 0, 2160 - TH))))
        if len(wins) >= cap:
            break
    if not wins:
        return b, s, 0
    keep = np.ones(len(b), bool); NB, NS = [b], [s]
    for x0, y0 in wins:
        X0, Y0 = x0 / 2, y0 / 2
        inside = ((b[:, 0] + b[:, 2]) / 2 >= X0) & ((b[:, 0] + b[:, 2]) / 2 <= X0 + TW / 2) & ((b[:, 1] + b[:, 3]) / 2 >= Y0) & ((b[:, 1] + b[:, 3]) / 2 <= Y0 + TH / 2)
        keep &= ~(inside & (s < hi))
    res = model.predict([img4k[y:y + TH, x:x + TW] for x, y in wins], imgsz=1280, conf=0.01, iou=0.7, batch=len(wins), quantize="fp16", verbose=False)
    for (x0, y0), r in zip(wins, res):
        if not len(r.boxes):
            continue
        bb = r.boxes.xyxy.cpu().numpy(); ss = r.boxes.conf.cpu().numpy()
        e = 3.0                                                      # 창 안쪽 경계에 닿은 (잘린) 박스는 버림 · 그 사람은 A 쪽 박스가 남음
        ok = ~(((bb[:, 0] <= e) & (x0 > 0)) | ((bb[:, 2] >= TW - e) & (x0 + TW < 3840)) | ((bb[:, 1] <= e) & (y0 > 0)) | ((bb[:, 3] >= TH - e) & (y0 + TH < 2160)))
        bb, ss = bb[ok], ss[ok]
        NB.append(((bb + np.array([x0, y0, x0, y0], np.float32)) / 2).astype(np.float32)); NS.append(ss.astype(np.float32))
    b2 = np.concatenate([NB[0][keep]] + NB[1:]); s2 = np.concatenate([NS[0][keep]] + NS[1:]); k = nms(b2, s2)
    return b2[k], s2[k], len(wins)


def fp_center(dets, gts):
    """중심 일치로 정답이 아닌 탐지의 점수 (같은 셋 안 헛탐지)"""
    out = []
    for i, gt in enumerate(gts):
        b, s = dets[i]; o = np.argsort(-s); used = np.zeros(len(gt), bool)
        for j in o:
            cx, cy = (b[j, 0] + b[j, 2]) / 2, (b[j, 1] + b[j, 3]) / 2; ok = False
            if len(gt):
                gx, gy = (gt[:, 0] + gt[:, 2]) / 2, (gt[:, 1] + gt[:, 3]) / 2
                h = (((gt[:, 0] <= cx) & (cx <= gt[:, 2]) & (gt[:, 1] <= cy) & (cy <= gt[:, 3])) | ((b[j, 0] <= gx) & (gx <= b[j, 2]) & (b[j, 1] <= gy) & (gy <= b[j, 3]))) & ~used
                if h.any():
                    c = np.flatnonzero(h); used[c[np.argmin((gx[c] - cx) ** 2 + (gy[c] - cy) ** 2)]] = True; ok = True
            if not ok:
                out.append(float(s[j]))
    return np.sort(np.array(out))[::-1]


def recall_center(dets, gts, thr):
    hit = n = 0
    for i, gt in enumerate(gts):
        n += len(gt); b, s = dets[i]; k = s >= thr; b = b[k]
        if not len(gt) or not len(b):
            continue
        used = np.zeros(len(b), bool)
        for g in gt:
            gx, gy = (g[0] + g[2]) / 2, (g[1] + g[3]) / 2; cx, cy = (b[:, 0] + b[:, 2]) / 2, (b[:, 1] + b[:, 3]) / 2
            h = (((g[0] <= cx) & (cx <= g[2]) & (g[1] <= cy) & (cy <= g[3])) | ((b[:, 0] <= gx) & (gx <= b[:, 2]) & (b[:, 1] <= gy) & (gy <= b[:, 3]))) & ~used
            if h.any():
                used[np.flatnonzero(h)[0]] = True; hit += 1
    return hit / max(n, 1)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--model", default="v12_f91_swa15"); a = ap.parse_args()
    from ultralytics import YOLO
    model = YOLO(str(BASE / "runs_person" / a.model / "weights" / "best.pt"))
    D1, D4 = BASE / "data" / "test_obl1080", BASE / "data" / "test_obl4k"
    names = [p.stem for p in sorted((D1 / "images").glob("*.jpg")) if (D4 / "images" / f"{p.stem}.jpg").exists()]
    print(f"{a.model} · 같은 프레임 {len(names)} 장 (1080p · 4K)", flush=True)
    G = {"A 1080p 타일 4장 (지금)": (1920, 1080, 2, 2), "B25 4K 타일 25장": (3840, 2160, 5, 5), "B16 4K 타일 16장": (3840, 2160, 4, 4), "B9 4K 타일 9장": (3840, 2160, 3, 3)}
    dets = {k: {} for k in list(G) + ["D 1080p + 4K 확인 창"]}; gts = []; ms = {k: 0.0 for k in dets}; wins = []
    for i, n in enumerate(names):
        im1 = cv2.imread(str(D1 / "images" / f"{n}.jpg")); im4 = cv2.imread(str(D4 / "images" / f"{n}.jpg"))
        gts.append(load_gt(D1 / "images" / f"{n}.jpg", 1920, 1080))
        for k, (W, H, nx, ny) in G.items():
            img = im1 if W == 1920 else im4; t0 = time.perf_counter()
            b, s = run_tiles(model, img, grid(W, H, nx, ny)); ms[k] += (time.perf_counter() - t0) * 1000
            dets[k][i] = (b / (W / 1920), s)
        t0 = time.perf_counter(); b, s, nw = recheck(model, im4, *dets["A 1080p 타일 4장 (지금)"][i]); ms["D 1080p + 4K 확인 창"] += (time.perf_counter() - t0) * 1000
        dets["D 1080p + 4K 확인 창"][i] = (b, s); wins.append(nw)
        if i % 100 == 0:
            print(f"  {i}/{len(names)}", flush=True)
    ms["D 1080p + 4K 확인 창"] += ms["A 1080p 타일 4장 (지금)"]
    base_fp = fp_center(dets["A 1080p 타일 4장 (지금)"], gts); k0 = int((base_fp >= 0.20).sum())
    res = {}
    print(f"\n같은 셋 안 헛탐지 (중심 일치로 정답 아님) A @0.20 = {k0} 개 ({k0 / len(names):.2f} 건/장) — 방식마다 이 수가 되는 문턱에서 재현율")
    print(f"{'방식':<24} {'AP50':>7} {'AP30':>6} {'중심AP':>7} | {'재현@0.2':>8} {'같은헛 문턱':>9} {'중심재현':>8} | 크기별 재현율@0.20 (<24 · 24-36 · 36-50 · 50-80 · 80+) | 타일/장 · ms/장")
    n_gt = sum(len(g) for g in gts)
    for k, d in dets.items():
        fp = fp_center(d, gts); thr = float(fp[k0 - 1]) if 0 < k0 <= len(fp) else 0.20
        size = []
        for lo, hi in BINS:
            h = c = 0
            for i, gt in enumerate(gts):
                if not len(gt):
                    continue
                L = np.maximum(gt[:, 2] - gt[:, 0], gt[:, 3] - gt[:, 1]); m = (L >= lo) & (L < hi)
                if not m.any():
                    continue
                b, s = d[i]; _, used = match(gt[m], b[s >= 0.20], s[s >= 0.20], 0.5); h += int(used.sum()); c += int(m.sum())
            size.append((round(h / max(c, 1), 3), c))
        S, T = [], []
        for i, gt in enumerate(gts):
            b, s = d[i]; rows, _ = match(gt, b, s, 0.5); S += [r[0] for r in rows]; T += [r[1] for r in rows]
        S, T = np.array(S), np.array(T, bool); r20 = float(T[S >= 0.20].sum()) / n_gt
        row = dict(AP50=ap_at(d, gts, 0.5), AP30=ap_at(d, gts, 0.3), center=ap_center(d, gts), recall_020=round(r20, 4), thr_same_fp=round(thr, 3),
                   recall_center_same_fp=round(recall_center(d, gts, thr), 4), size_recall_020=size,
                   tiles=(4 + float(np.mean(wins))) if k.startswith("D") else G[k][2] * G[k][3], ms=round(ms[k] / len(names), 1))
        res[k] = row
        print(f"{k:<24} {row['AP50']:7.4f} {row['AP30']:6.3f} {row['center']:7.3f} | {r20:8.3f} {thr:9.3f} {row['recall_center_same_fp']:8.3f} | " + " · ".join(f"{v:.2f}" for v, _ in size) + f" | {row['tiles']:.1f} · {row['ms']}")
    print("크기별 정답 수:", [c for _, c in res["A 1080p 타일 4장 (지금)"]["size_recall_020"]], "· D 의 확인 창 평균", round(float(np.mean(wins)), 2), "개/장")
    (BASE / "metrics" / f"res4k_{a.model}.json").write_text(json.dumps(res, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
