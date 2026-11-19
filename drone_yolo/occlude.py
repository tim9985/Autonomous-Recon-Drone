"""
occlude.py — 사람 상자 일부를 식생 조각으로 덮은 사본을 만든다 (v10 가림 증강)

왜 필요한가
  v9(NOMAD 가림·누움 부분집합)로 누운 사람 재현율은 0.33 → 0.50 으로 올랐지만
  **가림 재현율은 0.24 → 0.26** 으로 거의 그대로였다 (test_obl 층별 분석).
  산림 수색에서는 덤불·수관·줄기에 몸 일부가 가린 사람이 흔하므로,
  가린 모습을 학습에서 더 자주 보게 한다.

어떻게
  · 덮개 조각: 같은 학습셋의 **사람이 없는 영역**에서 식생·흙 질감 조각을 오린다
    (회색 도로·하늘처럼 채도·질감이 낮은 곳은 뺀다)
  · 덮는 모양: 상자의 아래(덤불) · 위(수관) · 옆(줄기·가지) 중 한쪽에서
    상자 길이의 30~65 % 를 덮는 덩어리(타원 여러 개) · 가장자리는 흐리게
  · 색: 덮개 평균색을 사람 주변 배경 쪽으로 40 % 당겨 튀지 않게
  · 라벨: **원래 사람 상자 그대로** (가려도 사람은 그 자리에 있다)
  · 너무 작은 사람(짧은 변 12 px 미만)은 덮지 않는다

실행
  python occlude.py --n 40 --smoke          # 미리보기 (outputs: runs_occ/smoke_sheet.jpg)
  python occlude.py --n 3000                # data/det_v6/occ_v10 + configs/lists/occ_v10.txt
"""
import argparse
import json
import random
from collections import Counter
from pathlib import Path

import cv2
import numpy as np

BASE = Path(__file__).resolve().parent
LISTS = ["train_v7.txt", "nomad_v9.txt"]
BANK_SETS = ("nomad_v9", "wisard", "det_aihub", "heridal", "sard", "nadir_rot")   # 식생·흙 배경이 많은 셋
SKIP_SETS = ("uc_neg", "det_neg")                                                # 사람 없는 셋
NATURAL = BANK_SETS                                                              # 사본은 자연 배경에서만 (도로·건물 위 식생은 어색하다)


def label_path(img):
    return Path(str(img).replace("/images/", "/labels/")).with_suffix(".txt")


def read_boxes(img, W, H):
    p = label_path(img)
    out = []
    if not p.exists():
        return out
    for ln in p.read_text().split("\n"):
        v = ln.split()
        if len(v) != 5:
            continue
        cx, cy, w, h = (float(x) for x in v[1:])
        out.append((int((cx - w / 2) * W), int((cy - h / 2) * H), int((cx + w / 2) * W), int((cy + h / 2) * H)))
    return out


def imread(p):
    return cv2.imdecode(np.fromfile(str(p), dtype=np.uint8), cv2.IMREAD_COLOR)


def imwrite(p, img):
    p.parent.mkdir(parents=True, exist_ok=True)
    ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 93])
    buf.tofile(str(p))


def build_bank(paths, n, rng):
    """사람 없는 영역에서 식생·흙 질감 조각을 모은다"""
    bank = []
    cand = [p for p in paths if any(f"/{s}/" in p for s in BANK_SETS)]
    rng.shuffle(cand)
    for p in cand:
        if len(bank) >= n:
            break
        img = imread(p)
        if img is None:
            continue
        H, W = img.shape[:2]
        boxes = read_boxes(p, W, H)
        for _ in range(6):
            s = rng.randint(48, min(220, W // 3, H // 3))
            x, y = rng.randint(0, W - s), rng.randint(0, H - s)
            if any(not (x + s < b[0] - 8 or x > b[2] + 8 or y + s < b[1] - 8 or y > b[3] + 8) for b in boxes):
                continue
            crop = img[y:y + s, x:x + s]
            hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
            gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
            if hsv[..., 1].mean() / 255 < 0.12 or gray.std() < 14 or gray.mean() > 200:
                continue                                            # 도로·하늘·단색 면은 뺀다
            bank.append(crop.copy())
            if len(bank) >= n:
                break
    return bank


def blob_mask(h, w, side, rng):
    """덮개 사각형 안의 덩어리 모양 (0~1) — 타원을 안쪽에 두고 가장자리를 흐려 둥글게"""
    m = np.zeros((h, w), np.float32)
    k = rng.randint(3, 6)
    for _ in range(k):
        ax, ay = rng.uniform(0.18, 0.38) * w, rng.uniform(0.18, 0.38) * h
        if side in ("bottom", "top"):
            cx = rng.uniform(ax, w - ax); cy = rng.uniform(max(ay, 0.45 * h), h - ay) if side == "bottom" else rng.uniform(ay, min(h - ay, 0.55 * h))
        else:
            cy = rng.uniform(ay, h - ay); cx = rng.uniform(ax, min(w - ax, 0.55 * w)) if side == "left" else rng.uniform(max(ax, 0.45 * w), w - ax)
        cv2.ellipse(m, (int(cx), int(cy)), (max(1, int(ax)), max(1, int(ay))), rng.uniform(0, 180), 0, 360, 1.0, -1)
    # 잎 사이 틈 — 낮은 주파수 잡음으로 군데군데 비운다
    noise = cv2.resize(np.random.RandomState(rng.randint(0, 1 << 30)).rand(max(2, h // 6), max(2, w // 6)).astype(np.float32), (w, h))
    m *= (noise > 0.18).astype(np.float32)
    sig = max(1.0, 0.06 * min(h, w))
    return cv2.GaussianBlur(m, (0, 0), sig)


def occlude_box(img, box, bank, rng, stat):
    H, W = img.shape[:2]
    x1, y1, x2, y2 = box
    w, h = x2 - x1, y2 - y1
    if min(w, h) < 12:
        stat["작아서 뺌"] += 1
        return False
    side = rng.choices(("bottom", "top", "left", "right"), (0.4, 0.2, 0.2, 0.2))[0]
    f = rng.uniform(0.30, 0.65)
    if side == "bottom":
        rx1, rx2 = x1 - 0.15 * w, x2 + 0.15 * w; ry1, ry2 = y2 - f * h, y2 + 0.1 * h
    elif side == "top":
        rx1, rx2 = x1 - 0.15 * w, x2 + 0.15 * w; ry1, ry2 = y1 - 0.1 * h, y1 + f * h
    elif side == "left":
        rx1, rx2 = x1 - 0.1 * w, x1 + f * w; ry1, ry2 = y1 - 0.1 * h, y2 + 0.1 * h
    else:
        rx1, rx2 = x2 - f * w, x2 + 0.1 * w; ry1, ry2 = y1 - 0.1 * h, y2 + 0.1 * h
    rx1, ry1 = max(0, int(rx1)), max(0, int(ry1)); rx2, ry2 = min(W, int(rx2)), min(H, int(ry2))
    if rx2 - rx1 < 4 or ry2 - ry1 < 4:
        return False
    hh, ww = ry2 - ry1, rx2 - rx1
    tex = cv2.resize(bank[rng.randrange(len(bank))], (ww, hh), interpolation=cv2.INTER_LINEAR).astype(np.float32)
    # 주변 배경 평균색으로 40 % 당긴다 (상자 바깥 띠)
    pad = max(4, int(0.3 * max(w, h)))
    bx1, by1, bx2, by2 = max(0, x1 - pad), max(0, y1 - pad), min(W, x2 + pad), min(H, y2 + pad)
    ring = img[by1:by2, bx1:bx2].astype(np.float32)
    inner = np.zeros(ring.shape[:2], bool); inner[y1 - by1:y2 - by1, x1 - bx1:x2 - bx1] = True
    bg = ring[~inner].mean(axis=0) if (~inner).any() else ring.reshape(-1, 3).mean(axis=0)
    tex = tex + 0.4 * (bg - tex.reshape(-1, 3).mean(axis=0))
    a = blob_mask(hh, ww, side, rng)[..., None]
    roi = img[ry1:ry2, rx1:rx2].astype(np.float32)
    img[ry1:ry2, rx1:rx2] = np.clip(roi * (1 - a) + tex * a, 0, 255).astype(np.uint8)
    # 상자 안에서 실제로 덮인 비율
    cov = a[max(0, y1 - ry1):max(0, y2 - ry1), max(0, x1 - rx1):max(0, x2 - rx1)]
    stat["덮은 비율"].append(float(cov.sum() / max(1, w * h)))
    stat[side] += 1
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=3000, help="만들 사본 수")
    ap.add_argument("--bank", type=int, default=2500, help="덮개 조각 수")
    ap.add_argument("--seed", type=int, default=10)
    ap.add_argument("--out", default="data/det_v6/occ_v10")
    ap.add_argument("--list", default="occ_v10.txt")
    ap.add_argument("--smoke", action="store_true", help="미리보기 판만 만든다 (목록은 안 쓴다)")
    a = ap.parse_args()
    rng = random.Random(a.seed)
    paths = []
    for l in LISTS:
        paths += [x.strip() for x in open(BASE / "configs" / "lists" / l) if x.strip()]
    pos = [p for p in paths if any(f"/{s}/" in p for s in NATURAL) and label_path(p).exists() and label_path(p).stat().st_size > 0]
    print(f"후보 {len(pos)}장 (자연 배경 · 사람 있는 학습 사진)")
    bank = build_bank(paths, min(a.bank, 300) if a.smoke else a.bank, rng)
    print(f"덮개 조각 {len(bank)}개")
    out = (BASE / a.out) if not a.smoke else (BASE / "runs_occ" / "smoke")
    rng.shuffle(pos)
    made, stat, src = [], Counter(), Counter()
    stat["덮은 비율"] = []
    sheet = []
    for p in pos:
        if len(made) >= a.n:
            break
        img = imread(p)
        if img is None:
            continue
        H, W = img.shape[:2]
        boxes = read_boxes(p, W, H)
        before = img.copy()
        done = [b for b in boxes if rng.random() < 0.7 and occlude_box(img, b, bank, rng, stat)]
        if not done:
            continue
        stem = Path(p).stem + "_occ"
        imwrite(out / "images" / "train" / f"{stem}.jpg", img)
        lp = out / "labels" / "train" / f"{stem}.txt"; lp.parent.mkdir(parents=True, exist_ok=True)
        lp.write_text(label_path(p).read_text())
        made.append(str(out / "images" / "train" / f"{stem}.jpg"))
        src[next((s for s in Path(p).parts if s in ("unicamp", "nadir_rot", "visdrone", "det_aihub", "sard", "wisard", "heridal", "nomad_v9")), "기타")] += 1
        if a.smoke and len(sheet) < 24:
            b = max(done, key=lambda b: (b[2] - b[0]) * (b[3] - b[1]))
            pad = int(0.8 * max(b[2] - b[0], b[3] - b[1])) + 10
            cx1, cy1, cx2, cy2 = max(0, b[0] - pad), max(0, b[1] - pad), min(W, b[2] + pad), min(H, b[3] + pad)
            pair = [cv2.resize(x[cy1:cy2, cx1:cx2], (220, 220)) for x in (before, img)]
            for x in pair:
                cv2.rectangle(x, (int((b[0] - cx1) * 220 / (cx2 - cx1)), int((b[1] - cy1) * 220 / (cy2 - cy1))),
                              (int((b[2] - cx1) * 220 / (cx2 - cx1)), int((b[3] - cy1) * 220 / (cy2 - cy1))), (0, 255, 255), 1)
            sheet.append(np.hstack(pair))
    cov = stat.pop("덮은 비율")
    meta = dict(n=len(made), sources=dict(src), sides={k: v for k, v in stat.items()},
                cover_mean=round(float(np.mean(cov)), 3) if cov else None, cover_q=[round(float(x), 3) for x in np.percentile(cov, [10, 50, 90])] if cov else None)
    print(json.dumps(meta, ensure_ascii=False))
    if a.smoke:
        rows = [np.hstack(sheet[i:i + 4]) for i in range(0, len(sheet) - len(sheet) % 4, 4)]
        if rows:
            imwrite(BASE / "runs_occ" / "smoke_sheet.jpg", np.vstack(rows))
            print("미리보기:", BASE / "runs_occ" / "smoke_sheet.jpg")
        return
    (BASE / "configs" / "lists" / a.list).write_text("\n".join(made) + "\n")
    (out / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1))
    print(f"목록 {a.list}: {len(made)}장")


if __name__ == "__main__":
    main()
