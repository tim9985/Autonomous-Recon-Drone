"""
ens_rtd_eval.py — v12 + RT-DETR 합침 이득 (11-15 · _학습 큐 「11-15 RT」 판정 ② — 체인에 없는 수동 단계)

  판정 방식 (미리 정함) = 11-08 diag_headroom.py 와 같은 식 — 덤프 (dump_dets.py · 타일 4장 · conf ≥ 0.01) → 그림마다 NMS 0.6 → WBF 간이 (wbf_n) → AP (IoU 0.5 · 0.3 · 중심 일치)
      ⚠ 무시 영역 · 경계 합치기 안 씀 (상대 비교용) · 기준 = 숲 ≥ +2.8 그리고 비스듬 ≥ +3.1 %p (FlyPose 합침의 절반)
  보조  같은 데이터 반복끼리 (f91 + f92) · FlyPose 합침을 같은 표에 (11-08 값 재현 확인) · 도로 헛탐지 (AU-AIR 빈 장 · 같은 재현율 / 같은 헛탐지)
        짝 블록 부트스트랩 (합침 − v12 단독 · IoU 0.5)
실행  /home/se/miniconda3/envs/drone/bin/python dump_dets.py --model <rtd 이름> --sets test_v2,test_obl,test_kr,test_auair
      /home/se/miniconda3/envs/drone/bin/python ens_rtd_eval.py <rtd 이름> [기준 v12 이름 = v12_f91_swa]
"""
import json, sys
from pathlib import Path

import numpy as np

from analyze_dets import ap_at, load, match, per_image
from diag_headroom import ap_center, wbf_n
from eval_test_v2 import ap101, blocks_of

BASE = Path(__file__).resolve().parent
D = BASE / "runs_person" / "dumps"


def per_image_fast(d, merge=0.6, min_conf=0.0):
    """analyze_dets.per_image 와 같은 결과 꼴 — NMS 는 cv2 (빠름) · min_conf 아래 박스는 버림
    (RT-DETR 은 그림마다 질의 300 × 타일 4 = 1,200 박스 → 순수 파이썬 합침이 몇 시간 걸려 확신 낮은 꼬리를 자름)"""
    import cv2
    from collections import defaultdict
    out = defaultdict(lambda: (np.zeros((0, 4), np.float32), np.zeros(0, np.float32)))
    img, box, sc = d["img"], d["box"], d["score"]
    k = sc >= min_conf; img, box, sc = img[k], box[k], sc[k]
    order = np.argsort(img, kind="stable"); img, box, sc = img[order], box[order], sc[order]
    cuts = np.flatnonzero(np.diff(img)) + 1
    for seg in np.split(np.arange(len(img)), cuts):
        if not len(seg):
            continue
        b, s_ = box[seg], sc[seg]
        kk = cv2.dnn.NMSBoxes([[float(x1), float(y1), float(x2 - x1), float(y2 - y1)] for x1, y1, x2, y2 in b], s_.tolist(), 0.0, merge)
        kk = np.array(kk).ravel().astype(int) if len(kk) else np.zeros(0, int)
        out[int(img[seg[0]])] = (b[kk], s_[kk])
    return out


RMIN = 0.05          # 합침에 넣는 RT-DETR 박스 확신 하한 (단독 AP 는 0.01 부터)


def wbf(ds):
    """diag_headroom.wbf_n + 두 모델 모두 박스가 없는 그림은 빈 결과로"""
    from collections import defaultdict
    out = defaultdict(lambda: (np.zeros((0, 4), np.float32), np.zeros(0, np.float32)))
    out.update(wbf_n(ds))
    return out


def st(dets, gts):
    """→ (점수, 맞음, 그림 번호, 그림별 정답 수) — 짝 부트스트랩용"""
    S, T, I = [], [], []
    for i, gt in enumerate(gts):
        b, s = dets[i]; rows, _ = match(gt, b, s, 0.5)
        S += [r[0] for r in rows]; T += [r[1] for r in rows]; I += [i] * len(rows)
    return np.array(S), np.array(T, bool), np.array(I, int), np.array([len(g) for g in gts], float)


def boot(a, b, names, B=1000):
    blk, nblk, _ = blocks_of(names); rng = np.random.default_rng(0)
    ia = [np.where(blk[a[2]] == k)[0] for k in range(nblk)]; ib = [np.where(blk[b[2]] == k)[0] for k in range(nblk)]
    g = np.bincount(blk, weights=a[3], minlength=nblk); d = []
    for _ in range(B):
        pk = rng.integers(0, nblk, nblk); n = g[pk].sum()
        xa = np.concatenate([ia[k] for k in pk]); xb = np.concatenate([ib[k] for k in pk])
        d.append(ap101(b[0][xb], b[1][xb], n) - ap101(a[0][xa], a[1][xa], n))
    return np.percentile(d, [2.5, 97.5])


def main():
    rtd = sys.argv[1]; v12 = sys.argv[2] if len(sys.argv) > 2 else "v12_f91_swa"
    res = {}
    for tag in ("test_v2", "test_obl", "test_kr"):
        if not (D / f"{rtd}_{tag}.npz").exists():
            continue
        A = load(v12, tag); gts = list(A["gt"]); names = [str(x) for x in A["names"]]
        Rd = load(rtd, tag)
        dv = per_image(A, 0.6); dr0 = per_image_fast(Rd, 0.6, 0.01); dr = per_image_fast(Rd, 0.6, RMIN)
        rows = {v12: dv, rtd: dr0, f"{v12} + {rtd}": wbf([dv, dr])}
        if (D / f"v12_f92_swa_{tag}.npz").exists() and v12 == "v12_f91_swa":
            rows["v12_f91_swa + v12_f92_swa (같은 데이터 반복)"] = wbf([dv, per_image(load("v12_f92_swa", tag), 0.6)])
        if (D / f"flypose_{tag}.npz").exists():
            df = per_image(load("flypose", tag), 0.6)
            rows[f"{v12} + FlyPose (다른 데이터 11종)"] = wbf([dv, df]); rows[f"{v12} + {rtd} + FlyPose"] = wbf([dv, dr, df])
        base = st(dv, gts); R = {}
        print(f"\n== {tag} (정답 {sum(len(g) for g in gts):,}) — AP IoU 0.3 · 0.5 · 중심 일치")
        for k, d in rows.items():
            a3, a5, ac = ap_at(d, gts, 0.3), ap_at(d, gts, 0.5), ap_center(d, gts)
            R[k] = dict(AP30=a3, AP50=a5, center=ac)
            line = f"  {k:<46} {a3:.3f} · {a5:.4f} · {ac:.3f}"
            if d is not dv:
                lo, hi = boot(base, st(d, gts), names); R[k]["d_AP50"] = round((a5 - R[v12]["AP50"]) * 100, 1); R[k]["ci"] = [round(float(lo) * 100, 1), round(float(hi) * 100, 1)]
                line += f"   AP50 {R[k]['d_AP50']:+.1f} %p (95 % {lo * 100:+.1f} ~ {hi * 100:+.1f})"
            print(line)
        res[tag] = R
    # 도로 헛탐지 — 합쳐도 늘지 않나 (AU-AIR 빈 장 · v12 @0.20 기준)
    if (D / f"{rtd}_test_auair.npz").exists():
        A = load(v12, "test_auair"); neg = [i for i, g in enumerate(A["gt"]) if not len(g)]
        dv = per_image(A, 0.6); dr = per_image_fast(load(rtd, "test_auair"), 0.6, RMIN); en = wbf([dv, dr])
        f = lambda d, t: sum(int((d[i][1] >= t).sum()) for i in neg) / len(neg)
        base_fp = f(dv, 0.20); sc = np.sort(np.concatenate([en[i][1] for i in neg]))[::-1]; k = int(round(base_fp * len(neg)))
        t_same = float(sc[k - 1]) if 0 < k <= len(sc) else 0.20
        res["도로"] = dict(v12_fp020=round(base_fp, 3), rtd_fp020=round(f(dr, 0.20), 3), ens_same_fp_thr=round(t_same, 3))
        print(f"\n도로 (AU-AIR 빈 {len(neg)} 장) 헛 @0.20: {v12} {base_fp:.3f} · {rtd} {f(dr, 0.20):.3f} 건/장 · 합침이 같은 헛탐지가 되는 문턱 {t_same:.3f}")
        for tag in ("test_v2", "test_obl"):
            if tag not in res:
                continue
            A = load(v12, tag); gts = list(A["gt"]); n = sum(len(g) for g in gts)
            dv = per_image(A, 0.6); en = wbf([dv, per_image_fast(load(rtd, tag), 0.6, RMIN)])
            rec = lambda d, t: sum(int(match(gt, d[i][0][d[i][1] >= t], d[i][1][d[i][1] >= t], 0.5)[1].sum()) for i, gt in enumerate(gts) if len(gt)) / n
            r0, r1 = rec(dv, 0.20), rec(en, t_same)
            res["도로"][tag] = dict(recall_v12=round(r0, 4), recall_ens_same_fp=round(r1, 4))
            print(f"  {tag}: 재현율 {v12} @0.20 {r0:.4f} → 합침 (같은 헛탐지) {r1:.4f} ({(r1 - r0) * 100:+.1f} %p)")
    v2 = res.get("test_v2", {}).get(f"{v12} + {rtd}", {}).get("d_AP50"); ob = res.get("test_obl", {}).get(f"{v12} + {rtd}", {}).get("d_AP50")
    if v2 is not None and ob is not None:
        verdict = "구조 · 사전학습 몫이 큼 (재분석용 2차 모델 · 증류 선생 후보)" if (v2 >= 2.8 and ob >= 3.1) else "데이터 다양성 결론 유지 (이 팔 닫음)" if (v2 < 2.8 and ob < 2.8) else "구분 안 됨"
        res["판정 (미리 정한 기준)"] = dict(숲=v2, 비스듬=ob, 결론=verdict)
        print(f"\n판정 (미리 정한 기준 · 숲 ≥ +2.8 그리고 비스듬 ≥ +3.1): 숲 {v2:+.1f} · 비스듬 {ob:+.1f} → {verdict}")
    (BASE / "metrics" / f"ens_rtd_{rtd}.json").write_text(json.dumps(res, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
