"""rtd_ue_check.py — RT-DETR 과 v12 의 박스 습관을 「정확한 박스」 (UE 분할 마스크) 로 비교 + UE 재현율 · 헛탐지 (11-15 · 진단)
   UE S1 · S3 · S4 (16 m) · 3장마다 · 배포 방식 (타일 4장 · 경계 합치기) · 확신 ≥ 0.05"""
import json, sys, os
import cv2, numpy as np
BASE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(BASE, "deploy", "vision_worker")); sys.path.insert(0, BASE)
from app.vision_core.detector import PersonDetector
from eval_test_v2 import iou_mat
out = {}
for name in sys.argv[1:]:
    d = PersonDetector(os.path.join(BASE, "runs_person", name, "weights", "best.pt"), conf=0.05)
    rw, rh, conf_tp, conf_fp, ngt, nimg = [], [], [], [], 0, 0
    for run in ("S1_a16", "S3_a16", "S4_a16", "S5_a16"):
        R = os.path.join(BASE, "ue_flight", run)
        for k, l in enumerate(open(f"{R}/boxes.jsonl")):
            if k % 3:
                continue
            r = json.loads(l); img = cv2.imread(f"{R}/frames/{r['frame']}.jpg")
            if img is None:
                continue
            nimg += 1
            G = np.array([b["bb"] for b in r["boxes"].values() if not b.get("cut") and b["px"] >= 60], np.float32).reshape(-1, 4)
            I = np.array([b["bb"] for b in r["boxes"].values() if b.get("cut") or b["px"] < 60], np.float32).reshape(-1, 4)
            B, C, _ = d.detect(img); ngt += len(G)
            M = iou_mat(G, B) if len(G) and len(B) else np.zeros((len(G), len(B))); used = set()
            for j in np.argsort(-C):
                g = int(M[:, j].argmax()) if len(G) else -1
                if g >= 0 and M[g, j] >= 0.5 and g not in used:
                    used.add(g); conf_tp.append(C[j]); rw.append((B[j, 2] - B[j, 0]) / (G[g, 2] - G[g, 0])); rh.append((B[j, 3] - B[j, 1]) / (G[g, 3] - G[g, 1]))
                elif (len(G) and M[:, j].max() >= 0.3) or (len(I) and iou_mat(I, B[j:j + 1]).max() >= 0.3):
                    continue
                else:
                    conf_fp.append(C[j])
    ct, cf = np.array(conf_tp), np.array(conf_fp)
    out[name] = dict(w=round(float(np.median(rw)), 3), h=round(float(np.median(rh)), 3), n=len(rw))
    line = f"{name}: 박스 / 정확한 박스 중앙 — 가로 {np.median(rw):.3f} · 세로 {np.median(rh):.3f} (짝 {len(rw)} · 그림 {nimg}) | "
    for t in (0.2, 0.3, 0.5):
        line += f"@{t} 재현율 {(ct >= t).sum() / ngt:.3f} 헛 {(cf >= t).sum() / nimg:.2f} 건/장 · "
    print(line, flush=True)
json.dump(out, open(os.path.join(BASE, "metrics", "rtd_ue_check.json"), "w"), ensure_ascii=False, indent=1)
