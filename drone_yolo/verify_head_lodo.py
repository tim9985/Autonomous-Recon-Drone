"""학습된 2차 확인 머리 (진단) — v12 탐지 박스 (확신 ≥ 0.05) 의 SigLIP 2 임베딩 + 로지스틱 · 데이터셋 하나 빼고 학습 → 뺀 셋에서 AP50 · 같은 헛탐지 재현율
   11-08 V (제로샷 문장) 는 ❌ 였음 — 여기는 「학습된 머리가 처음 보는 데이터셋으로 옮겨가나」 만 본다 (평가셋을 학습 재료로 쓴 진단 · 채택 판정 아님)"""
import sys, json
from pathlib import Path
import cv2, numpy as np, torch
from PIL import Image
from transformers import AutoModel, AutoProcessor
from sklearn.linear_model import LogisticRegression

BASE = Path(__file__).resolve().parent; RUN = BASE / "runs_fair"; TAG = "v12_f91_swa@tile1280"
SETS = ["test_sar", "test_nomad", "test_obl", "test_v2", "test_cy", "test_visdrone", "test_kr", "test_ladd_h", "test_auair"]
OUT = BASE / "runs_state" / "verify_head_feats.npz"


def iou1(a, B):
    x1 = np.maximum(a[0], B[:, 0]); y1 = np.maximum(a[1], B[:, 1]); x2 = np.minimum(a[2], B[:, 2]); y2 = np.minimum(a[3], B[:, 3])
    it = np.clip(x2 - x1, 0, None) * np.clip(y2 - y1, 0, None)
    return it / ((a[2] - a[0]) * (a[3] - a[1]) + (B[:, 2] - B[:, 0]) * (B[:, 3] - B[:, 1]) - it + 1e-9)


@torch.no_grad()
def extract():
    proc = AutoProcessor.from_pretrained("google/siglip2-base-patch16-224"); m = AutoModel.from_pretrained("google/siglip2-base-patch16-224", dtype=torch.float16).cuda().eval()
    D = {}
    for s in SETS:
        g = np.load(RUN / s / "gt.npz"); d = np.load(RUN / s / f"{TAG}.npz"); keep = d["conf"] >= 0.05
        img, box, conf = d["img"][keep], d["box"][keep], d["conf"][keep]
        feats = np.zeros((len(conf), 768), np.float16); maxiou = np.zeros(len(conf), np.float32); L = np.zeros(len(conf), np.float32)
        crops, idx = [], []
        def flush():
            if not crops:
                return
            v = proc(images=crops, return_tensors="pt").to("cuda"); f = m.get_image_features(pixel_values=v["pixel_values"].half()); f = getattr(f, "pooler_output", f).float()
            feats[idx] = (f / f.norm(dim=-1, keepdim=True)).cpu().numpy().astype(np.float16); crops.clear(); idx.clear()
        for i in np.unique(img):
            im = cv2.imread(str(BASE / "data" / s / "images" / str(g["names"][i]))); H, W = im.shape[:2]; gt = g["gt"][g["gt_img"] == i]
            for j in np.flatnonzero(img == i):
                x1, y1, x2, y2 = box[j]; L[j] = max(x2 - x1, y2 - y1) * 1920 / W
                maxiou[j] = iou1(box[j], gt).max() if len(gt) else 0
                mx, my = max((x2 - x1) * 0.3, 4), max((y2 - y1) * 0.3, 4)
                c = im[int(max(0, y1 - my)):int(min(H, y2 + my)), int(max(0, x1 - mx)):int(min(W, x2 + mx))]
                crops.append(Image.fromarray(cv2.cvtColor(c, cv2.COLOR_BGR2RGB))); idx.append(j)
                if len(crops) == 256:
                    flush()
        flush()
        D[s] = dict(img=img, box=box, conf=conf, f=feats, miou=maxiou, L=L)
        print(s, len(conf), "사람 (IoU≥.5)", int((maxiou >= 0.5).sum()), flush=True)
    np.savez(OUT, **{f"{s}/{k}": v for s, d in D.items() for k, v in d.items()})


def ap_and_ops(g, img, box, score, thr_fp_ref=None):
    """점수순 욕심 매칭 (IoU 0.5) → AP50 (모든 점) · (점수, tp) 목록"""
    tp = np.zeros(len(score), bool)
    for i in np.unique(img):
        gt = g["gt"][g["gt_img"] == i]; js = np.flatnonzero(img == i); js = js[np.argsort(-score[js])]; used = np.zeros(len(gt), bool)
        if not len(gt):
            continue
        for j in js:
            o = iou1(box[j], gt); o[used] = 0
            k = int(np.argmax(o))
            if o[k] >= 0.5:
                used[k] = True; tp[j] = True
    o = np.argsort(-score); t = np.cumsum(tp[o]); f = np.cumsum(~tp[o]); n = len(g["gt"])
    if n == 0:
        return None, tp
    rec = t / n; prec = t / np.maximum(t + f, 1)
    for k in range(len(prec) - 2, -1, -1):
        prec[k] = max(prec[k], prec[k + 1])
    ap = float(np.sum(np.diff(np.r_[0, rec]) * prec))
    return ap, tp


def main():
    if not OUT.exists():
        extract()
    Z = np.load(OUT); D = {s: {k: Z[f"{s}/{k}"] for k in ("img", "box", "conf", "f", "miou", "L")} for s in SETS}
    rng = np.random.default_rng(0); res = {}
    for hold in SETS:
        X, y = [], []
        for s in SETS:
            if s == hold:
                continue
            d = D[s]; lab = np.where(d["miou"] >= 0.5, 1, np.where(d["miou"] < 0.1, 0, -1)); ok = np.flatnonzero(lab >= 0)
            if len(ok) > 4000:
                ok = rng.choice(ok, 4000, replace=False)
            lg = np.log(d["conf"][ok] / (1 - d["conf"][ok]))
            X.append(np.c_[d["f"][ok].astype(np.float32), lg, np.log(d["L"][ok])]); y.append(lab[ok])
        X, y = np.concatenate(X), np.concatenate(y)
        mu, sd = X[:, -2:].mean(0), X[:, -2:].std(0); X[:, -2:] = (X[:, -2:] - mu) / sd
        clf = LogisticRegression(C=0.3, max_iter=2000, class_weight="balanced").fit(X, y)
        d = D[hold]; g = np.load(RUN / hold / "gt.npz")
        Xh = np.c_[d["f"].astype(np.float32), (np.log(d["conf"] / (1 - d["conf"])) - mu[0]) / sd[0], (np.log(d["L"]) - mu[1]) / sd[1]]
        p = clf.predict_proba(Xh)[:, 1]
        ap0, tp0 = ap_and_ops(g, d["img"], d["box"], d["conf"]); ap1, tp1 = ap_and_ops(g, d["img"], d["box"], p)
        nimg = len(g["names"]); n = max(len(g["gt"]), 1)
        op = d["conf"] >= 0.20; fp0 = int((~tp0 & op).sum()); r0 = (tp0 & op).sum() / n
        o = np.argsort(-p); f = np.cumsum(~tp1[o]); t = np.cumsum(tp1[o])
        k = np.searchsorted(f, fp0, side="right") - 1; r_same_fp = t[max(k, 0)] / n if len(t) else 0       # 같은 헛탐지 수에서 재현율
        k2 = np.searchsorted(t, (tp0 & op).sum(), side="left"); fp_same_r = int(f[min(k2, len(f) - 1)]) if len(f) else 0   # 같은 재현율에서 헛탐지
        res[hold] = dict(ap0=ap0, ap1=ap1, r0=float(r0), fp0=fp0 / nimg, r_same_fp=float(r_same_fp), fp_same_r=fp_same_r / nimg)
        a = lambda v: "  —  " if v is None else f"{v:.3f}"
        print(f"{hold:14s} AP50 {a(ap0)} → {a(ap1)} | @0.20 재현율 {r0:.3f} · 헛 {fp0 / nimg:.2f} 건/장 → 같은 헛에서 재현율 {r_same_fp:.3f} ({(r_same_fp - r0) * 100:+.1f} %p) · 같은 재현율에서 헛 {fp_same_r / nimg:.2f}", flush=True)
    json.dump(res, open(BASE / "metrics" / "verify_head_lodo.json", "w"), indent=1)


if __name__ == "__main__":
    main()
