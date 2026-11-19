"""
color_peta_probe.py — 상의 색: 「옷이 많은」 학습셋으로 SigLIP 2 특징 위 머리 학습 (11-15 · 진단 · 판정 아님)

  왜  10-29 선형 학습 (B2 · C8 · C9) 이 제로샷을 못 넘은 건 방법이 아니라 **옷 수** 때문일 수 있다 — UAV-Human 학습셋은 85명 = 서로 다른 옷 85벌 (장수는 4,696)
      PETA 는 19,000장 · 8천여 명 (감시 카메라 · 내려다보는 시점 · 작은 사람) — 확인 셋 P (1,606장) 만 쓰고 나머지는 안 썼다
  방법 PETA 에서 P 에 든 사람을 뺀 나머지 (상의 색 하나인 사람) → 사람 키 40~140 px 로 줄여 worker 와 같은 상의 크롭 → SigLIP 2 base 특징 → 로지스틱 (C 는 학습셋 안 사람 5겹)
      남색은 PETA 에 없음 → 머리의 「파랑」 확률을 제로샷의 파랑 : 남색 비로 나눔 (미리 정한 규칙)
      섞기 = 배포판 확률과 머리 확률의 기하 평균 (가중 0.5 · 미리 정함 · 평가셋으로 안 고름)
  평가 U (UAV-Human 시험 · 드론) · N (NOMAD · 드론) · E (UE · 드론) · D · V (디관) = 머리가 처음 보는 영역 / P = PETA 다른 사람 (같은 영역 · 참고)
      기준 = 배포 1.3 (제로샷 상의 + 잔디 문장 + 남색 문턱 · 자세 안 넘김) · 짝 사람 블록 부트스트랩
실행  /home/se/venvs/state/bin/python color_peta_probe.py
"""
import json, pickle, random
from collections import Counter, defaultdict

import cv2
import numpy as np

import color_lab as CL
from color_lab import BASE, CI, COLORS, LAB, PETA, PETA_C

OUT = BASE / "metrics" / "color_peta_probe.json"
PART = "upper_nopose"


def peta_items(exclude, per_person=3, seed=0):
    rng = random.Random(seed); items = []
    for sub in sorted(PETA.iterdir()):
        lab = {}
        for line in open(sub / "archive" / "Label.txt"):
            t = line.split()
            ups = [PETA_C[a[9:]] for a in t[1:] if a.startswith("upperBody") and a[9:] in PETA_C]
            if len(ups) == 1:
                lab[t[0]] = ups[0]
        by = defaultdict(list)
        for f in sorted((sub / "archive").iterdir()):
            if f.name == "Label.txt":
                continue
            pid = f.name if f.name in lab else f.name.split("_")[0]
            if pid in lab and f"{sub.name}:{pid}" not in exclude:
                by[pid].append(f)
        for pid, fs in sorted(by.items()):
            for f in rng.sample(fs, min(per_person, len(fs))):
                img = cv2.imread(str(f))
                if img is None:
                    continue
                fr, box = CL._frame_from_crop(img, rng.randint(40, 140))
                items.append({"frame": fr, "box": box, "pose": None, "primary": lab[pid], "person": f"{sub.name}:{pid}"})
    return items


class Head:
    """torch 로 맞춘 다항 로지스틱 (sklearn 꼴 흉내) — classes_ · predict_proba"""
    def __init__(self, W, b, classes):
        self.coef_, self.intercept_, self.classes_ = W, b, classes

    def predict_proba(self, X):
        z = X @ self.coef_.T + self.intercept_; z = np.exp(z - z.max(1, keepdims=True))
        return z / z.sum(1, keepdims=True)


def _lr(X, y, wd, iters=200):
    import torch
    cls = np.unique(y); yi = np.searchsorted(cls, y)
    Xt = torch.tensor(X, dtype=torch.float32, device="cuda"); yt = torch.tensor(yi, device="cuda")
    cnt = torch.bincount(yt, minlength=len(cls)).float(); w = (1 / cnt) / (1 / cnt).sum() * len(cls)        # 색 균형 가중
    W = torch.zeros(len(cls), X.shape[1], device="cuda", requires_grad=True); b = torch.zeros(len(cls), device="cuda", requires_grad=True)
    opt = torch.optim.LBFGS([W, b], lr=1.0, max_iter=iters, history_size=20, line_search_fn="strong_wolfe")

    def closure():
        opt.zero_grad()
        loss = torch.nn.functional.cross_entropy(Xt @ W.T * 20 + b, yt, weight=w) + wd * (W ** 2).sum()
        loss.backward(); return loss
    opt.step(closure)
    return Head((W.detach() * 20).cpu().numpy(), b.detach().cpu().numpy(), cls)


def fit(X, y, g):
    """가중치 감쇠는 학습셋 안 사람 3겹 교차검증 (색 균형 정확도) 으로 고름 — 평가셋은 안 봄"""
    from sklearn.model_selection import GroupKFold
    best = None
    for wd in (3e-5, 1e-4, 3e-4, 1e-3):
        accs = []
        for tr, va in GroupKFold(3).split(X, y, g):
            m = _lr(X[tr], y[tr], wd); pr = m.classes_[m.predict_proba(X[va]).argmax(1)]
            accs.append(np.mean([np.mean(pr[y[va] == k] == k) for k in np.unique(y[va])]))
        if best is None or np.mean(accs) > best[0]:
            best = (round(float(np.mean(accs)), 3), wd)
    return _lr(X, y, best[1]), best


def cached_feats(name, items):
    fp = LAB / f"peta_probe_feat_{name}.npy"
    if fp.exists():
        return np.load(fp)
    X = CL.siglip_feats(items, PART); np.save(fp, X)
    return X


def head_probs(m, X, zs):
    """머리 확률 → 12색 · 머리에 없는 색은 제로샷 확률 그대로 (머리 몫은 나머지에 맞춰 줄임) · 남색 = 파랑을 제로샷 파랑 : 남색 비로 나눔"""
    zs = np.asarray(zs); b, n = CI["blue"], CI["navy"]
    P = np.zeros((len(X), len(COLORS))); P[:, m.classes_] = m.predict_proba(X)
    miss = [i for i in range(len(COLORS)) if i not in set(m.classes_) and i != n]
    if miss:
        zm = zs[:, miss].sum(1, keepdims=True)
        P = P * (1 - zm); P[:, miss] = zs[:, miss]
    r = zs[:, n] / np.maximum(zs[:, n] + zs[:, b], 1e-9)
    tot = P[:, b] + P[:, n]
    P[:, n], P[:, b] = tot * r, tot * (1 - r)
    return P


def geo(a, b, w=0.5):
    z = np.exp(w * np.log(np.asarray(a) + 1e-6) + (1 - w) * np.log(np.asarray(b) + 1e-6))
    return z / z.sum(1, keepdims=True)


def main():
    sets = {s: pickle.load(open(LAB / f"{s}.pkl", "rb")) for s in "UNPDVE"}
    tr = peta_items(set())
    print(f"PETA 학습 {len(tr):,}장 · {len({t['person'] for t in tr}):,}명 (전체 · P 는 사람 2겹 교차로 따로) · 색 {dict(Counter(t['primary'] for t in tr).most_common())}", flush=True)
    Xp = cached_feats("peta_train", tr); yp = np.array([CI[t["primary"]] for t in tr]); gp = np.array([t["person"] for t in tr])
    Xu, yu, gu = CL.train_feats("upper")                                   # UAV-Human 학습셋 85명 (캐시)
    heads = {}
    heads["PETA"], b1 = fit(Xp, yp, gp)
    heads["PETA+UAVH"], b2 = fit(np.r_[Xp, Xu], np.r_[yp, yu], np.r_[gp, np.array([f"u{x}" for x in gu])])
    heads["UAVH (10-29 B2 와 같은 재료)"], b3 = fit(Xu, yu, gu)
    print(f"  머리 교차검증 (학습셋 안 · 색 균형) PETA {b1} · PETA+UAVH {b2} · UAVH {b3}", flush=True)
    vlm = json.load(open(BASE / "metrics" / "vlm_color_eval.json"))
    res = {}
    # P (PETA 다른 사람 · 같은 영역 참고) — 사람을 반으로 나눠 서로 학습 · 예측
    pp = sorted({it["person"] for it in sets["P"]}); fold = {p: i % 2 for i, p in enumerate(pp)}
    import zlib
    gfold = np.array([fold.get(g, zlib.crc32(g.encode()) % 2) for g in gp])
    cross = [fit(Xp[gfold != k], yp[gfold != k], gp[gfold != k])[0] for k in (0, 1)]
    for s, items in sets.items():
        X = cached_feats(s, items); CL._FEAT[(id(items), len(items), PART, CL.SIGLIP)] = X
        zs = np.asarray(CL.zero_shot(items, part=PART, navy=True, grass=1.0))
        o0, t0 = CL.metrics(items, list(zs), "U")
        res[s] = {"배포 1.3": {"색 균형 1순위": o0["색 균형 1순위"], "1순위": o0["1순위"], "색 균형 1·2순위": o0["색 균형 1·2순위"]},
                  "VLM (참고 · 11-14)": vlm.get(s, {}).get("VLM 색 균형 1순위")}
        line = f"{s} (n {len(items):,}) 배포 {o0['색 균형 1순위']:.3f} · VLM {res[s]['VLM (참고 · 11-14)']}"
        for hn, m in heads.items():
            if s == "P" and hn.startswith("PETA"):
                if hn != "PETA":
                    continue
                f = np.array([fold[it["person"]] for it in items]); hp = np.zeros((len(items), len(COLORS)))
                for k in (0, 1):
                    hp[f == k] = head_probs(cross[k], X[f == k], zs[f == k])
            else:
                hp = head_probs(m, X, zs)
            for nm, pr in ((f"머리 {hn}", hp), (f"배포 × 머리 {hn}", geo(zs, hp))):
                o, t = CL.metrics(items, list(pr), "U")
                ci = CL.boot(items, t0, t, "U")
                res[s][nm] = {"색 균형 1순위": o["색 균형 1순위"], "1순위": o["1순위"], "색 균형 1·2순위": o["색 균형 1·2순위"], "배포 대비 95 %": ci, "색별": o["색별 1순위"]}
                line += f" | {nm} {o['색 균형 1순위']:.3f} [{ci[0]:+.3f} ~ {ci[1]:+.3f}]"
        print(line, flush=True)
        if s == "U":
            for h in CL.HEIGHTS:
                idx = [i for i, it in enumerate(items) if it["h"] == h]; its = [items[i] for i in idx]
                a = CL.metrics(its, list(zs[idx]), "U")[0]["색 균형 1순위"]
                b = CL.metrics(its, list(geo(zs, head_probs(heads["PETA"], X, zs))[idx]), "U")[0]["색 균형 1순위"]
                res[s][f"키 {h} px"] = {"배포": a, "배포 × 머리 PETA": b}
                print(f"    U 키 {h} px: 배포 {a:.3f} → 배포 × 머리 PETA {b:.3f}", flush=True)
    OUT.write_text(json.dumps(res, ensure_ascii=False, indent=1))
    pickle.dump({k: (m.coef_.astype(np.float32), m.intercept_.astype(np.float32), m.classes_) for k, m in heads.items()}, open(LAB / "peta_heads.pkl", "wb"))


if __name__ == "__main__":
    main()
