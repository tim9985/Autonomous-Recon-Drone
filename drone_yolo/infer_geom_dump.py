"""
infer_geom_dump.py — 추론 방식 비교용 검출 덤프 (11-15 · 「같은 시간 안에서 더 나은 추론 방식이 있나」) → runs_person/dumps/geom_<모델>_<tag>.npz

  왜  타일 4장 (1280×720 · 겹침 50 %) 은 1920×1080 한 장 (2.07 MP) 을 3.69 MP 로 처리한다 (같은 화소를 평균 1.78 번)
      09-20 「타일 추론」 은 문턱 고정 재현율만 비교 (재현율 +2.9 %p · 오탐 +48 %) → 같은 오탐에서 나은지 · AP 로는 한 번도 안 잼
      전체 한 장 (1088×1920) 이 타일과 같다면 남는 시간으로 좌우 뒤집기 · 두 번째 모델을 실시간 안에 넣을 수 있다
  뽑는 것 (그림마다 · conf ≥ 0.01 · 패스 안 NMS 0.7)
      패스 0 = 타일 4장 (배포)          패스 1 = 타일 4장 좌우 뒤집기
      패스 2 = 전체 한 장 imgsz 1920    패스 3 = 전체 한 장 좌우 뒤집기
      1920×1080 이 아닌 그림 (test_obl 1280×720) 은 패스 0 = 한 장 · 패스 1 = 뒤집기만
  저장  img · box (xyxy 원본 좌표) · score · tile (타일 번호 · 통째 −1) · pas (패스) · names · gt · wh · ms (패스별 평균 시간 · GPU 를 학습과 나눠 쓰면 부풀려짐 — 비율만 봄)
실행  /home/se/miniconda3/envs/drone/bin/python infer_geom_dump.py --model v12_f91_swa15 --sets test_ladd_h,test_nii [--step 3]
"""
import argparse
import time
from pathlib import Path

import cv2
import numpy as np

from eval_test_v2 import TH, TILES, TW, load_gt

BASE = Path(__file__).resolve().parent
OUT = BASE / "runs_person" / "dumps"


def run(yolo, imgs, imgsz):
    t0 = time.perf_counter()
    res = yolo.predict(imgs, imgsz=imgsz, conf=0.01, iou=0.7, batch=len(imgs), quantize="fp16", verbose=False)
    out = [(r.boxes.xyxy.cpu().numpy().astype(np.float32), r.boxes.conf.cpu().numpy().astype(np.float32)) for r in res]
    return out, (time.perf_counter() - t0) * 1000


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True)
    ap.add_argument("--sets", required=True)
    ap.add_argument("--step", type=int, default=1, help="그림을 이만큼 건너뛰며 (큰 셋 줄이기)")
    a = ap.parse_args()
    from ultralytics import YOLO
    yolo = YOLO(str(BASE / "runs_person" / a.model / "weights" / "best.pt"))
    OUT.mkdir(parents=True, exist_ok=True)
    for tag in a.sets.split(","):
        root = BASE / "data" / ("val_v12_set" if tag == "val_v12" else tag)
        imgs = sorted((root / "images").glob("*.jpg"))[::a.step]
        I, B, S, T, P, names, gts, wh = [], [], [], [], [], [], [], []
        ms = np.zeros(4); nms_ = np.zeros(4)

        def add(i, b, s, t, p):
            I.append(np.full(len(b), i)); B.append(b); S.append(s); T.append(np.full(len(b), t)); P.append(np.full(len(b), p))

        for i, p in enumerate(imgs):
            img = cv2.imread(str(p))
            if img is None:
                continue
            h, w = img.shape[:2]
            gts.append(load_gt(p, w, h)); names.append(p.stem); wh.append((w, h)); i = len(names) - 1
            if (w, h) == (1920, 1080):
                tiles = [img[y:y + TH, x:x + TW] for x, y in TILES]
                r, t = run(yolo, tiles, 1280); ms[0] += t; nms_[0] += 1
                for k, ((ox, oy), (b, s)) in enumerate(zip(TILES, r)):
                    add(i, b + np.array([ox, oy, ox, oy], np.float32), s, k, 0)
                r, t = run(yolo, [np.ascontiguousarray(x[:, ::-1]) for x in tiles], 1280); ms[1] += t; nms_[1] += 1
                for k, ((ox, oy), (b, s)) in enumerate(zip(TILES, r)):
                    b = np.c_[TW - b[:, 2], b[:, 1], TW - b[:, 0], b[:, 3]]
                    add(i, b + np.array([ox, oy, ox, oy], np.float32), s, k, 1)
                r, t = run(yolo, [img], 1920); ms[2] += t; nms_[2] += 1
                add(i, r[0][0], r[0][1], -1, 2)
                r, t = run(yolo, [np.ascontiguousarray(img[:, ::-1])], 1920); ms[3] += t; nms_[3] += 1
                b, s = r[0]; add(i, np.c_[w - b[:, 2], b[:, 1], w - b[:, 0], b[:, 3]], s, -1, 3)
            elif (w, h) == (1280, 720):
                r, t = run(yolo, [img], 1280); ms[0] += t; nms_[0] += 1
                add(i, r[0][0], r[0][1], -1, 0)
                r, t = run(yolo, [np.ascontiguousarray(img[:, ::-1])], 1280); ms[1] += t; nms_[1] += 1
                b, s = r[0]; add(i, np.c_[w - b[:, 2], b[:, 1], w - b[:, 0], b[:, 3]], s, -1, 1)
            # 그 밖의 크기는 건너뜀 (정답만 남김 → 평가에서 뺌)
            if i % 200 == 0:
                print(f"  {a.model} {tag} {i}/{len(imgs)} · ms {np.round(ms / np.maximum(nms_, 1), 1)}", flush=True)
        np.savez_compressed(OUT / f"geom_{a.model}_{tag}.npz", img=np.concatenate(I), box=np.concatenate(B).astype(np.float32),
                            score=np.concatenate(S).astype(np.float32), tile=np.concatenate(T), pas=np.concatenate(P),
                            names=np.array(names), wh=np.array(wh), gt=np.array(gts + [None], dtype=object)[:-1],
                            ms=ms / np.maximum(nms_, 1), allow_pickle=True)
        print(a.model, tag, "그림", len(names), "검출", sum(len(x) for x in B), "ms", np.round(ms / np.maximum(nms_, 1), 1), flush=True)


if __name__ == "__main__":
    main()
