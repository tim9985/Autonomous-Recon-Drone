"""
make_v16_n.py — 팔 N (새 출처) 학습 창 (11-11 · 판정 기준 = _학습 큐 「11-11 E」 · 볼트 27)

  v12 학습 목록은 그대로 두고, 11-11 에 받은 출처만 v12 와 같은 창 규칙 (1280×720 · 확대 금지 · 잘린 사람 · 10 px 미만 가림) 으로 더한다
  출처 (각 ≤ 1,000 창 · 시퀀스 상한)
    tinyperson   HF 사본 640×640 조각 (원본 사진 688장) · 사진마다 ≤ 2 조각 · 해변 · 바다 먼 사람
    rgbt         RGBTDronePerson **가시광 전용 라벨** (sub_train_visible.json · 1,013장) · person 만 양성 · rider · crowd · uncertain 은 가림
                 · 어두운 프레임 (회색 평균 < 45) 은 뺌 (밤 · 가시광에 사람이 안 보이는데 라벨만 있는 것 방지)
    mot          VisDrone2019-MOT 검증 7 시퀀스 · 시퀀스마다 ≤ 115 프레임 (시간 고르게) · pedestrian · people 양성 · 무시 영역 · score 0 가림
  출력 data/det_v16n/{images,labels}/train · configs/lists/train_v16n_f91.txt (= train_v12_f91 + 새 창) · configs/data_v16n_f91.yaml
       metrics/v16n_stats.json · logs/v16n_preview.jpg (눈으로 확인용)
실행  /home/se/miniconda3/envs/drone/bin/python make_v16_n.py [--dry]
"""
import argparse, json, random, re, zlib
from collections import Counter, defaultdict
from multiprocessing import Pool
from pathlib import Path

import cv2
import numpy as np

import make_v12_data as M

BASE = Path(__file__).resolve().parent
RAW = BASE / "data" / "raw"
OUT = BASE / "data" / "det_v16n"
LISTS = BASE / "configs" / "lists"
RG = RAW / "rgbt_droneperson/RGBTDronePerson"
MOT = RAW / "VisDrone_MOT/VisDrone2019-MOT-val"
BUDGET = {"tinyperson": 1000, "rgbt": 1000, "mot": 800}
CAP = {"tinyperson": 2, "rgbt": 25, "mot": 115}
DARK = 45.0

_RGBT = None
_MOT = {}


def rgbt_ann():
    global _RGBT
    if _RGBT is None:
        d = json.load(open(RG / "sub_train_visible.json"))
        by = defaultdict(list)
        for a in d["annotations"]:
            by[a["image_id"]].append(a)
        _RGBT = {im["file_name"]: by[im["id"]] for im in d["images"]}
    return _RGBT


def mot_ann(seq):
    if seq not in _MOT:
        by = defaultdict(lambda: ([], []))
        for ln in open(MOT / "annotations" / f"{seq}.txt"):
            t = ln.strip().split(",")
            if len(t) < 8:
                continue
            f, x, y, w, h, sc, cat = int(t[0]), *map(int, t[2:6]), int(t[6]), int(t[7])
            box = (x, y, x + w, y + h)
            if cat in (1, 2) and sc == 1:
                by[f][0].append(box)
            elif cat == 0 or (cat in (1, 2) and sc == 0):
                by[f][1].append(box)
        _MOT[seq] = by
    return _MOT[seq]


def read_boxes(rec):
    k = rec["kind"]
    if k == "rgbt":
        W, H = 640, 512; P, I = [], []
        for a in rgbt_ann().get(Path(rec["img"]).name, []):
            x, y, w, h = a["bbox"]
            (P if a["category_id"] == 0 else I).append((x, y, x + w, y + h))
        return np.array(P, np.float32).reshape(-1, 4), np.array(I, np.float32).reshape(-1, 4), W, H
    if k == "mot":
        W, H = M.imsize(rec["img"]); P, I = mot_ann(rec["seq"])[rec["order"]]
        return np.array(P, np.float32).reshape(-1, 4), np.array(I, np.float32).reshape(-1, 4), W, H
    return ORIG_READ(rec)


ORIG_READ = M.read_boxes
M.read_boxes = read_boxes
M.OUT = OUT


def src_tinyperson():
    out = []
    for p in sorted((RAW / "tinyperson/hf/images/train").glob("*.jpg")):
        m = re.match(r"(.+)_(\d+)_(\d+)$", p.stem)
        seq = m.group(1) if m else p.stem
        out.append(dict(src="tinyperson", dom="tiny_beach", img=str(p), lab=str(RAW / "tinyperson/hf/labels/train" / f"{p.stem}.txt"),
                        kind="yolo", seq=seq, order=int(m.group(2)) * 10000 + int(m.group(3)) if m else 0, split="train", scale=("native", 1.0)))
    return out


def src_rgbt():
    out = []
    for name in sorted(rgbt_ann()):
        p = RG / "train/visible" / name
        if not p.exists():
            continue
        i = int(Path(name).stem)
        out.append(dict(src="rgbt", dom="rgbt_drone", img=str(p), lab="", kind="rgbt", seq=f"rgbt{i // 100:03d}", order=i, split="train", scale=("native", 1.0)))
    return out


def src_mot():
    out = []
    for sd in sorted((MOT / "sequences").iterdir()):
        for p in sorted(sd.glob("*.jpg")):
            out.append(dict(src="mot", dom="mot_urban", img=str(p), lab="", kind="mot", seq=sd.name, order=int(p.stem), split="train", scale=("native", 0.8)))
    return out


def bright(rec):
    im = cv2.imread(rec["img"], cv2.IMREAD_REDUCED_GRAYSCALE_4)
    return float(im.mean()) if im is not None else 0.0


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--dry", action="store_true"); a = ap.parse_args()
    rng = random.Random(16)
    srcs = {"tinyperson": src_tinyperson(), "rgbt": src_rgbt(), "mot": src_mot()}
    stats = {}
    jobs = []
    for name, recs in srcs.items():
        n0 = len(recs)
        if name == "rgbt":
            with Pool(16) as pool:
                br = pool.map(bright, recs)
            recs = [r for r, b in zip(recs, br) if b >= DARK]
            stats["rgbt_dark_dropped"] = n0 - len(recs)
        if name == "mot":
            recs = [r for r in recs if len(mot_ann(r["seq"])[r["order"]][0])]
        else:
            recs = [r for r in recs if (any(x["category_id"] == 0 for x in rgbt_ann().get(Path(r["img"]).name, [])) if r["kind"] == "rgbt" else M.has_person(r))]
        sel = M.select(recs, int(BUDGET[name] * 1.1), CAP[name], rng)
        stats[name] = dict(frames=n0, eligible=len(recs), seqs=len({r["seq"] for r in recs}), selected=len(sel))
        jobs += [(r, 0, False) for r in sel]
        print(name, stats[name])
    if a.dry:
        return
    for sp in ("images", "labels"):
        (OUT / sp / "train").mkdir(parents=True, exist_ok=True)
    with Pool(16) as pool:
        res = [r for r in pool.map(M.window, jobs, chunksize=8) if r]
    by = defaultdict(list)
    for r in res:
        by[r["src"]].append(r)
    keep = []
    for name, rs in by.items():
        rs = rs[:BUDGET[name]]; keep += rs
        px = [p for r in rs for p in r["px"]]
        stats[name].update(windows=len(rs), persons=len(px), px_median=float(np.median(px)) if px else 0, px_lt24=float(np.mean(np.array(px) < 24)) if px else 0)
        print(name, stats[name])
    base = [l.strip() for l in open(LISTS / "train_v12_f91.txt") if l.strip()]
    new = sorted(r["path"] for r in keep)
    (LISTS / "train_v16n_f91.txt").write_text("\n".join(base + new) + "\n")
    (BASE / "configs/data_v16n_f91.yaml").write_text(
        f"# v16n_f91 (팔 N · 11-11) — train_v12_f91 + 새 출처 창 {len(new)} (tinyperson · rgbt · mot) · val = val_v12\n"
        f"train: {LISTS / 'train_v16n_f91.txt'}\nval: {LISTS / 'val_v12.txt'}\nnc: 1\nnames: ['person']\n")
    stats["total_new"] = len(new); stats["total_list"] = len(base) + len(new)
    json.dump(stats, open(BASE / "metrics/v16n_stats.json", "w"), ensure_ascii=False, indent=1)
    # 눈으로 확인용 미리보기 — 출처마다 6장 · 박스 그림
    tiles = []
    for name in ("tinyperson", "rgbt", "mot"):
        for r in random.Random(1).sample(by[name], min(6, len(by[name]))):
            im = cv2.imread(r["path"]); H, W = im.shape[:2]
            for ln in open(Path(r["path"].replace("/images/", "/labels/")).with_suffix(".txt")):
                c, cx, cy, w, h = map(float, ln.split())
                cv2.rectangle(im, (int((cx - w / 2) * W), int((cy - h / 2) * H)), (int((cx + w / 2) * W), int((cy + h / 2) * H)), (0, 0, 255), 2)
            cv2.putText(im, name, (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 2, (0, 255, 255), 4)
            tiles.append(cv2.resize(im, (640, 360)))
    rows = [np.hstack(tiles[i:i + 3]) for i in range(0, len(tiles) - len(tiles) % 3, 3)]
    cv2.imwrite(str(BASE / "logs/v16n_preview.jpg"), np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 85])
    print(json.dumps(stats, ensure_ascii=False))


if __name__ == "__main__":
    main()
