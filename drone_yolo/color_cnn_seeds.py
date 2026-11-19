"""color_cnn_seeds.py — 작은 색 망 (color_cnn_probe.py) 의 시드 흔들림 · 시드 3개 평균 (11-15 · 진단) — PETA+UAV-Human 학습 · 배포판과 기하 평균"""
import json, pickle, random
import cv2, numpy as np
import color_lab as CL
from color_lab import BASE, CI, LAB
from color_peta_probe import PART, geo, peta_items
from color_cnn_probe import crops, predict, train

sets = {s: pickle.load(open(LAB / f"{s}.pkl", "rb")) for s in "UNDVE"}
tr = peta_items(set()); Xp = crops(tr); yp = np.array([CI[t["primary"]] for t in tr])
rng = random.Random(0); ui = []
for f, c, pid in CL.uavh_list("train", 600, 0):
    img = cv2.imread(str(f)); fr, box = CL._frame_from_crop(img, rng.randint(40, 140)); ui.append({"frame": fr, "box": box, "pose": None, "primary": c, "person": pid})
Xu = crops(ui); yu = np.array([CI[t["primary"]] for t in ui])
X, y = np.r_[Xp, Xu], np.r_[yp, yu]
nets = [train(X, y, seed=s) for s in (0, 1, 2)]
res = {}
for s, items in sets.items():
    CL._FEAT[(id(items), len(items), PART, CL.SIGLIP)] = np.load(LAB / f"peta_probe_feat_{s}.npy")
    zs = np.asarray(CL.zero_shot(items, part=PART, navy=True, grass=1.0)); Xe = crops(items)
    o0, t0 = CL.metrics(items, list(zs), "U")
    hp = [predict(n, c, Xe, zs) for n, c in nets]
    one = [CL.metrics(items, list(geo(zs, h)), "U")[0]["색 균형 1순위"] for h in hp]
    avg = geo(zs, np.mean(hp, 0)); o, t = CL.metrics(items, list(avg), "U"); ci = CL.boot(items, t0, t, "U")
    res[s] = dict(배포=o0["색 균형 1순위"], 시드별=one, 시드3평균=o["색 균형 1순위"], ci=ci, 색별=o["색별 1순위"], 배포색별=o0["색별 1순위"])
    print(f"{s} (n {len(items):,}) 배포 {o0['색 균형 1순위']:.3f} | 배포 × 작은 망 시드별 {one} | 시드 3개 평균 {o['색 균형 1순위']:.3f} [{ci[0]:+.3f} ~ {ci[1]:+.3f}]", flush=True)
    print("     색별 (배포 → 섞음):", " · ".join(f"{k} {o0['색별 1순위'].get(k, 0):.2f}→{v:.2f}" for k, v in o["색별 1순위"].items()), flush=True)
(BASE / "metrics" / "color_cnn_seeds.json").write_text(json.dumps(res, ensure_ascii=False, indent=1))
import torch
torch.save({"nets": [n.state_dict() for n, _ in nets], "classes": nets[0][1], "size": 48}, LAB / "color_cnn_3seeds.pt")
