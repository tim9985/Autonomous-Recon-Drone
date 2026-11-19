"""
color_cnn_probe.py — 상의 색: 화소에서 바로 배우는 작은 합성곱 망 (11-15 · 진단 · 판정 아님)

  앞 단계 (color_peta_probe.py): 옷 7,503벌 (PETA) 로 SigLIP 2 **묶음 특징** 위 선형 머리를 맞춰도 드론셋에서 제로샷과 구분 안 됨 (같은 영역 P 만 +5~6 %p)
      → 「옷 수가 모자라서」 가 아니라 **묶음 특징이 색을 잘 못 담는다** 는 쪽 · VLM 은 같은 그림에서 +13~27 %p → 정보는 화소에 있다
  여기  같은 상의 크롭 (박스 위 10~62 %) 을 48×48 로 줄여 작은 합성곱 망 (0.3 M) 을 처음부터 학습 — 색은 낮은 수준 특징이라 화소에서 바로 배우는 편이 유리할 수 있다
      학습 = PETA 전체 (+ UAV-Human 학습셋 85명) · 증강 = 크기 · 잘라내기 · 좌우 뒤집기 · 밝기 · 약한 채널 이득 (색이 바뀌지 않을 만큼) · 잡음
      평가 = color_peta_probe 와 같음 (U · N · E · D · V 처음 보는 영역 / P 사람 2겹 교차) · 배포판과 기하 평균 (0.5 · 미리 정함)
실행  /home/se/venvs/state/bin/python color_cnn_probe.py
"""
import json, pickle, zlib
from collections import Counter

import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as Fn

import color_lab as CL
from color_lab import BASE, CI, COLORS, LAB
from color_peta_probe import PART, geo, peta_items

S = 48


def crops(items):
    out = np.zeros((len(items), S, S, 3), np.uint8)
    for i, it in enumerate(items):
        c = CL.person_rgb(it, PART)
        out[i] = cv2.resize(c, (S, S), interpolation=cv2.INTER_AREA if c.shape[0] > S else cv2.INTER_LINEAR)
    return out


class Net(nn.Module):
    def __init__(self, nc):
        super().__init__()
        def blk(a, b):
            return nn.Sequential(nn.Conv2d(a, b, 3, padding=1, bias=False), nn.BatchNorm2d(b), nn.ReLU(inplace=True),
                                 nn.Conv2d(b, b, 3, padding=1, bias=False), nn.BatchNorm2d(b), nn.ReLU(inplace=True))
        self.f = nn.Sequential(blk(3, 32), nn.MaxPool2d(2), blk(32, 64), nn.MaxPool2d(2), blk(64, 128), nn.MaxPool2d(2), blk(128, 128))
        self.h = nn.Sequential(nn.Dropout(0.3), nn.Linear(128, nc))

    def forward(self, x):
        return self.h(self.f(x).mean((2, 3)))


def augment(x):
    """x: (B,3,S,S) 0~1 · GPU"""
    B = x.shape[0]
    if True:                                                     # 무작위 잘라 다시 키우기 (0.75~1) · 뒤집기
        s = torch.empty(B, device=x.device).uniform_(0.75, 1.0); tx = (torch.rand(B, device=x.device) * 2 - 1) * (1 - s); ty = (torch.rand(B, device=x.device) * 2 - 1) * (1 - s)
        flip = torch.where(torch.rand(B, device=x.device) < 0.5, -1.0, 1.0)
        theta = torch.zeros(B, 2, 3, device=x.device); theta[:, 0, 0] = s * flip; theta[:, 1, 1] = s; theta[:, 0, 2] = tx; theta[:, 1, 2] = ty
        x = Fn.grid_sample(x, Fn.affine_grid(theta, x.shape, align_corners=False), mode="bilinear", padding_mode="border", align_corners=False)
    x = x * torch.empty(B, 1, 1, 1, device=x.device).uniform_(0.7, 1.3)                       # 밝기
    x = x * torch.empty(B, 3, 1, 1, device=x.device).uniform_(0.94, 1.06)                    # 약한 채널 이득 (화이트밸런스 흔들림)
    k = torch.rand(B, device=x.device) < 0.3                                                  # 흐림 (작은 사람 · 압축 흉내)
    if k.any():
        x[k] = Fn.interpolate(Fn.interpolate(x[k], scale_factor=0.5, mode="area"), size=S, mode="bilinear", align_corners=False)
    return (x + torch.randn_like(x) * 0.02).clamp(0, 1)


def train(X, y, epochs=40, seed=0):
    torch.manual_seed(seed); np.random.seed(seed)
    cls = np.unique(y); yi = torch.tensor(np.searchsorted(cls, y), device="cuda")
    Xt = torch.tensor(X, device="cuda").permute(0, 3, 1, 2).float() / 255
    cnt = torch.bincount(yi, minlength=len(cls)).float(); w = (1 / cnt)[yi]
    net = Net(len(cls)).cuda(); opt = torch.optim.AdamW(net.parameters(), 2e-3, weight_decay=5e-4)
    steps = epochs * (len(y) // 256 + 1); sched = torch.optim.lr_scheduler.OneCycleLR(opt, 4e-3, total_steps=steps)
    net.train()
    for _ in range(steps):
        idx = torch.multinomial(w, 256, replacement=True)        # 색 균형 뽑기
        loss = Fn.cross_entropy(net(augment(Xt[idx])), yi[idx], label_smoothing=0.05)
        opt.zero_grad(); loss.backward(); opt.step(); sched.step()
    net.eval()
    return net, cls


@torch.no_grad()
def predict(net, cls, X, zs):
    Xt = torch.tensor(X, device="cuda").permute(0, 3, 1, 2).float() / 255
    p = torch.cat([Fn.softmax(net(Xt[i:i + 1024]), 1) + Fn.softmax(net(Xt[i:i + 1024].flip(3)), 1) for i in range(0, len(Xt), 1024)]).cpu().numpy() / 2
    P = np.zeros((len(X), len(COLORS))); P[:, cls] = p
    zs = np.asarray(zs); b, n = CI["blue"], CI["navy"]
    miss = [i for i in range(len(COLORS)) if i not in set(cls) and i != n]
    if miss:
        zm = zs[:, miss].sum(1, keepdims=True); P = P * (1 - zm); P[:, miss] = zs[:, miss]
    r = zs[:, n] / np.maximum(zs[:, n] + zs[:, b], 1e-9); tot = P[:, b] + P[:, n]
    P[:, n], P[:, b] = tot * r, tot * (1 - r)
    return P


def main():
    sets = {s: pickle.load(open(LAB / f"{s}.pkl", "rb")) for s in "UNPDVE"}
    tr = peta_items(set())
    Xp = crops(tr); yp = np.array([CI[t["primary"]] for t in tr]); gp = np.array([t["person"] for t in tr])
    import random
    rng = random.Random(0); ui = []
    for f, c, pid in CL.uavh_list("train", 600, 0):
        img = cv2.imread(str(f)); fr, box = CL._frame_from_crop(img, rng.randint(40, 140))
        ui.append({"frame": fr, "box": box, "pose": None, "primary": c, "person": pid})
    Xu = crops(ui); yu = np.array([CI[t["primary"]] for t in ui])
    print(f"학습 PETA {len(tr):,}장 · UAV-Human {len(ui):,}장 (85명) · 입력 {S}×{S}", flush=True)
    nets = {"PETA": train(Xp, yp), "PETA+UAVH": train(np.r_[Xp, Xu], np.r_[yp, yu])}
    pp = sorted({it["person"] for it in sets["P"]}); fold = {p: i % 2 for i, p in enumerate(pp)}
    gfold = np.array([fold.get(g, zlib.crc32(g.encode()) % 2) for g in gp])
    cross = [train(Xp[gfold != k], yp[gfold != k]) for k in (0, 1)]
    vlm = json.load(open(BASE / "metrics" / "vlm_color_eval.json")); res = {}
    for s, items in sets.items():
        CL._FEAT[(id(items), len(items), PART, CL.SIGLIP)] = np.load(LAB / f"peta_probe_feat_{s}.npy")
        zs = np.asarray(CL.zero_shot(items, part=PART, navy=True, grass=1.0)); X = crops(items)
        o0, t0 = CL.metrics(items, list(zs), "U")
        res[s] = {"배포 1.3": o0["색 균형 1순위"], "VLM (참고)": vlm.get(s, {}).get("VLM 색 균형 1순위")}
        line = f"{s} (n {len(items):,}) 배포 {o0['색 균형 1순위']:.3f} · VLM {res[s]['VLM (참고)']}"
        for hn, (net, cls) in nets.items():
            if s == "P":
                if hn != "PETA":
                    continue
                f = np.array([fold[it["person"]] for it in items]); hp = np.zeros((len(items), len(COLORS)))
                for k in (0, 1):
                    hp[f == k] = predict(*cross[k], X[f == k], zs[f == k])
            else:
                hp = predict(net, cls, X, zs)
            for nm, pr in ((f"작은 망 {hn}", hp), (f"배포 × 작은 망 {hn}", geo(zs, hp))):
                o, t = CL.metrics(items, list(pr), "U"); ci = CL.boot(items, t0, t, "U")
                res[s][nm] = {"색 균형 1순위": o["색 균형 1순위"], "배포 대비 95 %": ci, "색별": o["색별 1순위"]}
                line += f" | {nm} {o['색 균형 1순위']:.3f} [{ci[0]:+.3f} ~ {ci[1]:+.3f}]"
        print(line, flush=True)
    (BASE / "metrics" / "color_cnn_probe.json").write_text(json.dumps(res, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
