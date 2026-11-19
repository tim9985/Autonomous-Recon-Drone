"""UE 비행 녹화 × 배포 탐지기 (v12_f91_swa15 엔진 · 문턱 0.05) → 탐지 박스에서 물리 자세 · 크기 타당성 (진단)"""
import csv, json, math, sys, pickle
from pathlib import Path
import cv2, numpy as np
sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))
from phys_posture_probe import phys_scores, LR, auc, ROOT
sys.path.insert(0, str(ROOT / "deploy/vision_worker"))
from app.vision_core.detector import PersonDetector

PACK = ROOT / "runs_person/_pack_v12w_real"
det = PersonDetector(PACK / "v12_f91_swa15/best.pt", PACK / "v12_f91_swa15/best_trt11.3.0.99_RTX3090.engine", conf=0.05)
print("backend", det.backend, flush=True)
js = json.loads((PACK / "posture.json").read_text()); b0 = LR(js["score"])


def iou(a, b):
    ix = max(0.0, min(a[2], b[2]) - max(a[0], b[0])); iy = max(0.0, min(a[3], b[3]) - max(a[1], b[1]))
    u = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - ix * iy
    return ix * iy / u if u > 0 else 0.0


rows = []          # 탐지 하나 = dict(run, frame, conf, box, gt 이름 or None, pose_raw, ps, b0)
ngt = {}
for run in [f"S{i}_a{a}" for i in range(1, 6) for a in (16, 20)]:
    D = ROOT / "ue_flight" / run
    rj = json.loads((D / "run.json").read_text()); acts = json.loads((D / "actors.json").read_text())
    fl = {r["frame"]: r for r in csv.DictReader(open(D / "flight.csv"))}
    n = 0
    for line in open(D / "boxes.jsonl"):
        b = json.loads(line); fr = b["frame"]
        img = cv2.imread(str(D / "frames" / f"{fr}.jpg"))
        if img is None:
            continue
        alt = rj["ground_ned_z"] - float(fl[fr]["ned_z"])
        mount = -float(fl[fr]["cam_pitch_rel_body_deg"])
        if alt < 10:
            continue
        gts = [(k, v["bb"]) for k, v in b["boxes"].items() if not v.get("cut") and v["px"] >= 60]
        ign = [v["bb"] for k, v in b["boxes"].items() if v.get("cut") or v["px"] < 60]
        n += len(gts)
        B, C, _ = det.detect(img)
        used = set()
        for i in np.argsort(-C):
            box = [float(x) for x in B[i]]
            best, bj = 0, None
            for j, (k, g) in enumerate(gts):
                o = iou(box, g)
                if j not in used and o > best:
                    best, bj = o, j
            name = None
            if best >= 0.5:
                used.add(bj); name = gts[bj][0]
            elif any(iou(box, g) >= 0.3 for g in ign) or any(iou(box, g) >= 0.3 for _, g in gts):
                continue                               # 잘린 사람 · 위치 어긋난 중복은 헛탐지로 안 셈 (크기 타당성 판단과 무관)
            ps = phys_scores(box, mount, alt)
            if ps is None:
                continue
            w, h = box[2] - box[0], box[3] - box[1]
            rows.append(dict(run=run, frame=fr, conf=float(C[i]), box=box, gt=name, pose=acts[name]["pose_raw"] if name else None,
                             ps=ps, b0=float(b0.proba([[w, h]])[0][0]), alt=alt))
    ngt[run] = n
    print(run, "정답", n, "탐지 누적", len(rows), flush=True)
pickle.dump((rows, ngt), open(ROOT / "runs_state" / "ue_flight_phys.pkl", "wb"))
