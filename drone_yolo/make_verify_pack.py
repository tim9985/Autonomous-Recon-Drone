"""
make_verify_pack.py — worker 1.4 2차 검증 꾸러미 (자세 관절점) (11-13 · K3 결과 그대로 · 새 학습 데이터 없음)

  ViTPose-B (COCO · easy_ViTPose ONNX · Apache-2.0) + 물리 특징 4 (몸통 · 다리 기울기 · 길이) + 박스 2 → 로지스틱 (Archangel 누움 900 · 서기 3,000)
  = kp_k3.py 와 같은 특징 · 같은 학습 → UE AUROC 다시 계산해 기록 (K3 0.789)
  출력 runs_person/_pack_v12w_{real,sim}/verify_v14/ {vitpose-b-coco.onnx · posture_kp.json} (+ make_color_sim.py 의 color_sim.json) · verify_model.json (해시)
실행  /home/se/miniconda3/envs/drone/bin/python make_verify_pack.py
"""
import hashlib, json, shutil
from pathlib import Path

import numpy as np
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

import kp_k3 as K
from posture_v2 import auc

BASE = Path(__file__).resolve().parent
arch = K.crops(K.ARCH, K.ARCH / "crops.csv", None, n_stand=3000); ue = K.crops(K.UE, K.UE / "crops.csv", "crops")
ya = np.array([r["pose"] == "lying" for r in arch]); yu = np.array([r["pose"] == "lying" for r in ue])
box = lambda rows: np.c_[np.log(np.array([r["h"] / r["w"] for r in rows])), np.log(np.array([r["L"] for r in rows]))]
z = np.load(K.OUT / "vitpose_b.npz")
Xa, Xu = np.c_[box(arch), z["Bg_arch"]], np.c_[box(ue), z["Bg_ue"]]
pipe = make_pipeline(SimpleImputer(strategy="mean"), StandardScaler(), LogisticRegression(max_iter=3000)).fit(Xa, ya)
pu = pipe.predict_proba(Xu)[:, 1]; a_ue = round(float(auc(pu[yu], pu[~yu])), 4)
im, sc, lr = pipe.steps[0][1], pipe.steps[1][1], pipe.steps[2][1]
card = {"name": "posture-kp-vitpose_b-v14", "features": ["log(h/w)", "log(L px@1080)", "torso_tilt", "torso_len/side", "leg_tilt", "leg_len/side"],
        "feature_note": "side = 크롭 정사각 한 변 / 1.5 = 박스 긴 변 (kp_k3.crop_box) · 기울기 = |atan2(dx, dy)| rad · 못 찾음 = impute 평균 (지름길 차단)",
        "applies_when": "h ≥ w 이고 긴 변 ≥ 45 px (1080p) — 박스가 서기처럼 보이는 곳만 (K3 B 와 같은 범위)",
        "impute_mean": im.statistics_.round(6).tolist(), "scaler_mean": sc.mean_.round(6).tolist(), "scaler_scale": sc.scale_.round(6).tolist(),
        "coef": lr.coef_[0].round(6).tolist(), "intercept": round(float(lr.intercept_[0]), 6),
        "train": "Archangel 누움 900 · 서기 3,000 (K3 B①)", "eval_ue_auroc": a_ue, "eval_ue_n": [int(yu.sum()), int((~yu).sum())],
        "keypoint_model": {"file": "vitpose-b-coco.onnx", "input": [1, 3, 256, 192], "padding": 1.25, "mean": [123.675, 116.28, 103.53], "std": [58.395, 57.12, 57.375], "decode": "DARK-UDP k11"}}
onnx = BASE.parent / "data" / "raw" / "pose_ext" / "vitpose-b-coco.onnx"
for e in ("real", "sim"):
    d = BASE / "runs_person" / f"_pack_v12w_{e}" / "verify_v14"; d.mkdir(parents=True, exist_ok=True)
    shutil.copy2(onnx, d / onnx.name); (d / "posture_kp.json").write_text(json.dumps(card, ensure_ascii=False, indent=1))
    files = sorted(p.name for p in d.iterdir() if p.name != "verify_model.json")
    (d / "verify_model.json").write_text(json.dumps({"name": "verify-v14", "sha256": {f: hashlib.sha256((d / f).read_bytes()).hexdigest() for f in files}}, ensure_ascii=False, indent=1))
print("UE AUROC", a_ue, "(K3 0.789)")
