"""
make_testset_obl4k.py — test_obl1080 과 같은 프레임을 Okutama 4K 원본 해상도 그대로 (11-17 · 「4K 로 받으면 의미 있나」) → data/test_obl4k

  make_testset_obl1080.py 와 같은 프레임 고르기 (160×90 내용 맞춤 · 결정적) → 축소 없이 3840×2160 JPEG 95 · 라벨 (정규화) 복사
  test_obl1080/_제외 (정렬 의심 4장) 는 뺌 → 남는 954장이 test_obl1080 과 1:1
  시퀀스마다 프로세스 하나 (병렬)
  ⚠ Okutama 원본 · 파생물은 git 밖 (data/)
실행  /home/se/miniconda3/envs/drone/bin/python make_testset_obl4k.py
"""
import glob, json, shutil
from collections import defaultdict
from multiprocessing import Pool
from pathlib import Path

import cv2
import numpy as np

BASE = Path(__file__).resolve().parent
SRC = BASE / "data" / "test_obl"; RAW = BASE / "data" / "raw" / "okutama"; OUT = BASE / "data" / "test_obl4k"; REF = BASE / "data" / "test_obl1080"


def one(args):
    seq, frs = args
    keep = {p.stem for p in (REF / "images").glob(f"okutama_{seq}_*.jpg")}
    vids = [v for v in glob.glob(str(RAW / "**" / f"{seq}.*"), recursive=True) if v.endswith((".mp4", ".mov"))]
    if not vids:
        return seq, "영상 없음"
    cap = cv2.VideoCapture(vids[0]); th = []
    while True:
        ok, im = cap.read()
        if not ok:
            break
        g = cv2.cvtColor(cv2.resize(im, (160, 90), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY).astype(np.float32); th.append((g - g.mean()) / (g.std() + 1e-6))
    cap.release(); th = np.stack(th).reshape(len(th), -1)
    pick, prev = {}, 0
    for f in sorted(frs):
        r = cv2.cvtColor(cv2.resize(cv2.imread(str(SRC / "images" / f"okutama_{seq}_{f:05d}.jpg")), (160, 90), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY).astype(np.float32)
        r = ((r - r.mean()) / (r.std() + 1e-6)).ravel(); lo, hi = max(0, f + prev - 400), min(len(th), f + prev + 400)
        if hi <= lo:
            continue
        c = th[lo:hi] @ r / r.size; k = lo + int(np.argmax(c)); pick[f] = k; prev = k - f
    cap = cv2.VideoCapture(vids[0]); want_k = {k: f for f, k in pick.items()}; k = -1; done = n = 0
    while done < len(want_k):
        ok = cap.grab(); k += 1
        if not ok:
            break
        if k in want_k:
            ok, im = cap.retrieve(); f = want_k[k]; done += 1; name = f"okutama_{seq}_{f:05d}"
            if name in keep:
                cv2.imwrite(str(OUT / "images" / f"{name}.jpg"), im, [cv2.IMWRITE_JPEG_QUALITY, 95]); shutil.copy(SRC / "labels" / f"{name}.txt", OUT / "labels" / f"{name}.txt"); n += 1
    cap.release()
    return seq, {"장수": n, "해상도": [int(im.shape[1]), int(im.shape[0])] if n else None}


def main():
    want = defaultdict(list)
    for p in sorted((SRC / "images").glob("*.jpg")):
        _, seq, fr = p.stem.split("_"); want[seq].append(int(fr))
    for d in ("images", "labels"):
        (OUT / d).mkdir(parents=True, exist_ok=True)
    with Pool(8) as pool:
        log = dict(pool.map(one, sorted(want.items())))
    print(log)
    (OUT / "manifest.json").write_text(json.dumps({"목적": "test_obl1080 과 같은 프레임 · 정답을 Okutama 4K 원본 해상도 그대로 (축소 없음)", "JPEG": 95, "확인": log}, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
