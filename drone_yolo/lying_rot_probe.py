"""
lying_rot_probe.py — 그림을 90° 돌려 한 번 더 보면 누운 사람이 더 잡히나 (11-15 · 진단)

  가설  비스듬 시점 학습 (v6_oblique · 회전 ±10°) 은 사람이 「위아래로 선」 모양에 치우쳐 있다 → 누운 사람 (가로로 긴 몸) 은 90° 돌린 그림에서 선 사람처럼 보여 확신이 오를 수 있다
        전체 한 장 추론 (1088×1920) 은 타일 4장의 0.57 배 연산 → 「전체 한 장 + 돌린 한 장」 은 지금 타일 4장과 비슷한 시간
  방식  T  타일 4장 (배포)          R1 / R3  전체 한 장을 90° 반시계 / 시계로 돌려 추론 → 박스를 되돌림          T+R = 합쳐서 NMS 0.6 (최고 점수)
  재는 것  ① 누운 사람 묶음 (lying_bench · OK · OK-벤치 · UE · NM) 뜸 · 엄격 재현율 — 문턱 0.20 과 「도로 헛탐지를 T @0.20 과 같게 맞춘 문턱」
          ② AU-AIR 사람 없는 장 헛탐지 ③ test_obl · test_v2 AP50 (선 사람 손해 없는지 · infer_geom_eval 과 같은 채점)
실행  /home/se/miniconda3/envs/drone/bin/python lying_rot_probe.py [--model v12_f91_swa15]
"""
import argparse, json, os, pickle, sys
from collections import defaultdict
from pathlib import Path

import cv2
import numpy as np

BASE = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE))
from eval_test_v2 import TH, TILES, TW, ap101, load_gt  # noqa: E402
from tile_merge import edge_merge  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("--model", default="v12_f91_swa15")
ap.add_argument("--sets", default="test_obl,test_v2")
a = ap.parse_args()
CACHE = BASE / "runs_person" / "dumps" / f"rot_{a.model}.pkl"


def nms(b, s, thr=0.6):
    if not len(b):
        return np.zeros(0, int)
    k = cv2.dnn.NMSBoxes([[float(x1), float(y1), float(x2 - x1), float(y2 - y1)] for x1, y1, x2, y2 in b], s.tolist(), 0.01, thr)
    return np.array(k).ravel().astype(int) if len(k) else np.zeros(0, int)


def run_all(yolo, img):
    """→ dict(T=(b,s), R1=(b,s), R3=(b,s)) · 원본 좌표"""
    h, w = img.shape[:2]; out = {}
    P = lambda ims, sz: [(r.boxes.xyxy.cpu().numpy().astype(np.float32), r.boxes.conf.cpu().numpy().astype(np.float32))
                         for r in yolo.predict(ims, imgsz=sz, conf=0.01, iou=0.7, batch=len(ims), quantize="fp16", verbose=False)]
    if (w, h) == (1920, 1080):
        r = P([img[y:y + TH, x:x + TW] for x, y in TILES], 1280)
        b = np.concatenate([bb + np.array([ox, oy, ox, oy], np.float32) for (ox, oy), (bb, _) in zip(TILES, r)]); s = np.concatenate([ss for _, ss in r])
        t = np.concatenate([np.full(len(ss), k) for k, (_, ss) in enumerate(r)])
        k = nms(b, s); b, s = edge_merge(b[k], s[k], t[k])
    else:
        b, s = P([img], 1280)[0]; k = nms(b, s); b, s = b[k], s[k]
    out["T"] = (b, s)
    sz = max(w, h) if (w, h) == (1920, 1080) else 1280
    b, s = P([np.ascontiguousarray(np.rot90(img, 1))], sz)[0]            # 반시계 90°: x' = y · y' = W − 1 − x
    out["R1"] = (np.c_[w - b[:, 3], b[:, 0], w - b[:, 1], b[:, 2]].astype(np.float32), s)
    b, s = P([np.ascontiguousarray(np.rot90(img, 3))], sz)[0]            # 시계 90°: x' = H − 1 − y · y' = x
    out["R3"] = (np.c_[b[:, 1], h - b[:, 2], b[:, 3], h - b[:, 0]].astype(np.float32), s)
    return out


def merge(d, keys):
    b = np.concatenate([d[k][0] for k in keys]); s = np.concatenate([d[k][1] for k in keys]); k = nms(b, s)
    return b[k], s[k]


def main():
    if CACHE.exists():
        C = pickle.load(open(CACHE, "rb"))
    else:
        from ultralytics import YOLO
        import lying_bench as LB
        yolo = YOLO(str(BASE / "runs_person" / a.model / "weights" / "best.pt")); C = {"lying": [], "neg": [], "sets": {}}
        its = LB.items()
        for i, (kind, path, G) in enumerate(its):
            img, s = LB.load(path, "OK" if kind.startswith("OK") else kind)
            if img is None:
                continue
            gb = [(g[0] * s, g[1] * s, (g[0] + g[2]) * s, (g[1] + g[3]) * s) if kind == "NM" else tuple(g) for g in G]
            C["lying"].append((kind, gb, run_all(yolo, img)))
            if i % 200 == 0:
                print(f"  누움 {i}/{len(its)}", flush=True)
        au = sorted((BASE / "data" / "test_auair" / "images").glob("*.jpg"))
        for i, p in enumerate(au):
            if len(load_gt(p)):
                continue
            C["neg"].append(run_all(yolo, cv2.imread(str(p))))
        print("  도로 빈 장", len(C["neg"]), flush=True)
        for tag in a.sets.split(","):
            L = []
            for i, p in enumerate(sorted((BASE / "data" / tag / "images").glob("*.jpg"))):
                img = cv2.imread(str(p)); h, w = img.shape[:2]
                L.append((p.stem, load_gt(p, w, h), run_all(yolo, img)))
                if i % 300 == 0:
                    print(f"  {tag} {i}", flush=True)
            C["sets"][tag] = L
        pickle.dump(C, open(CACHE, "wb"))
    from lying_rescue_check import hit
    from okutama_motion_det import iou
    from infer_geom_eval import boot_pair, score
    from ignore_regions import Ignore
    METHODS = {"T (배포)": ("T",), "T+R1": ("T", "R1"), "T+R3": ("T", "R3"), "T+R1+R3": ("T", "R1", "R3"), "R1 만": ("R1",)}
    res = {}
    thr = {}
    for name, keys in METHODS.items():
        sc = np.concatenate([merge(d, keys)[1] for d in C["neg"]])
        if name == "T (배포)":
            base = float((sc >= 0.20).sum()) / len(C["neg"])
        k = int(round(base * len(C["neg"]))); ss = np.sort(sc)[::-1]
        thr[name] = float(ss[k - 1]) if 0 < k <= len(ss) else 0.20
        res.setdefault("도로 헛 건/장 @0.20", {})[name] = round(float((sc >= 0.20).sum()) / len(C["neg"]), 3)
    print(f"도로 (AU-AIR 빈 {len(C['neg'])} 장) 헛 @0.20:", res["도로 헛 건/장 @0.20"], "· 같은 헛탐지 문턱:", {k: round(v, 3) for k, v in thr.items()})
    print("\n누운 사람 — 뜸 재현율 @0.20 · 같은 헛탐지 문턱 · (엄격 IoU 0.5 @같은 헛탐지)")
    for name, keys in METHODS.items():
        acc = defaultdict(lambda: defaultdict(list))
        for kind, G, d in C["lying"]:
            b, s = merge(d, keys)
            for g in G:
                acc[kind]["뜸@0.20"].append(hit(b, s, g, 0.20)); acc[kind]["뜸@같은헛"].append(hit(b, s, g, thr[name]))
                acc[kind]["엄격@같은헛"].append(any(iou(tuple(x), g) >= 0.5 and c >= thr[name] for x, c in zip(b, s)))
        res[name] = {k: {m: round(float(np.mean(v)), 3) for m, v in M.items()} | {"n": len(M["뜸@0.20"])} for k, M in acc.items()}
        print(f"  {name:<10} " + " | ".join(f"{k} {v['뜸@0.20']:.3f} · {v['뜸@같은헛']:.3f} ({v['엄격@같은헛']:.3f}) n {v['n']}" for k, v in sorted(res[name].items())))
    ign = Ignore(BASE / "data" / "test_v2" / "ignore_v1.json")
    for tag, L in C["sets"].items():
        names = [x[0] for x in L]; gts = [x[1] for x in L]; n = sum(len(g) for g in gts); b0 = None
        print(f"\n{tag} AP50 (정답 {n:,})")
        for name, keys in METHODS.items():
            sc = score([merge(x[2], keys) for x in L], gts, names, ign if tag == "test_v2" else None); v = ap101(sc[0], sc[1], n)
            rec = float(sc[1][sc[0] >= thr[name]].sum()) / n
            if b0 is None:
                b0 = sc; v0, r0 = v, rec; ci = ""
            else:
                lo, hi = boot_pair(b0, sc, names, 500); ci = f" (95 % {lo * 100:+.1f} ~ {hi * 100:+.1f})"
            res.setdefault(tag, {})[name] = dict(AP50=round(v, 4), recall_same_fp=round(rec, 4))
            print(f"  {name:<10} AP50 {v:.4f} ({(v - v0) * 100:+.1f}{ci}) · 같은 헛탐지 재현율 {rec:.4f} ({(rec - r0) * 100:+.1f})")
    (BASE / "metrics" / f"lying_rot_{a.model}.json").write_text(json.dumps(res, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
