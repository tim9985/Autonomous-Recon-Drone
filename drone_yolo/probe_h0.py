"""
probe_h0.py — 학습 길이 · 가중치 평균 구간 진단 (11-11 H0 · 학습 없음 · 판정 = _학습 큐 「11-11 H0」)

  v12_f91 · f92 · f93 (같은 설정 3회) 의 에폭별 EMA 체크포인트 (epoch0~29 · 0부터 셈 · 29 = 마지막) 로
    ① 단일 에폭  ep10 · ep15 · ep20 · ep25 · ep29   → 처음 보는 장소 성능이 학습 중 언제 가장 높은가 (학습 길이 · 학습률 단서)
    ② 평균 구간  swa15 (15~29) · swa20 (20~29)       → 기준 v12_f9x_swa (26~29) 보다 넓게 평균하면 나은가 (SWAD 꼴 · 학습 없이 바로 쓸 수 있음)
  출력 runs_person/<run>_ep<N>/weights/best.pt (원본 체크포인트로 가는 심볼릭 링크) · runs_person/<run>_swa<lo>/weights/best.pt
실행  python probe_h0.py            (만들기만 · 평가는 chain_h0.sh)
"""
from datetime import datetime, timedelta, timezone
from pathlib import Path

import torch

BASE = Path(__file__).resolve().parent
RUNS = ("v12_f91", "v12_f92", "v12_f93")
EPS = (10, 15, 20, 25, 29)
SWA = (15, 20)


def main():
    for r in RUNS:
        w = BASE / "runs_person" / r / "weights"
        for e in EPS:
            d = BASE / "runs_person" / f"{r}_ep{e}" / "weights"; d.mkdir(parents=True, exist_ok=True)
            link = d / "best.pt"
            if not link.exists():
                link.symlink_to(w / f"epoch{e}.pt")
        for lo in SWA:
            out = BASE / "runs_person" / f"{r}_swa{lo}" / "weights" / "best.pt"
            if out.exists():
                continue
            eps = [e for e in range(lo, 30) if (w / f"epoch{e}.pt").exists()]
            cks = [torch.load(w / f"epoch{e}.pt", map_location="cpu", weights_only=False) for e in eps]
            sds = [(c.get("ema") or c["model"]).float().state_dict() for c in cks]
            avg = {k: sum(s[k] for s in sds) / len(sds) if sds[0][k].is_floating_point() else sds[0][k] for k in sds[0]}
            model = (cks[-1].get("ema") or cks[-1]["model"]).float(); model.load_state_dict(avg)
            ck = dict(cks[-1], model=model.half(), ema=None, optimizer=None, swa_epochs=eps,
                      date=datetime.now(timezone(timedelta(hours=9))).isoformat(timespec="seconds"),
                      train_args=dict(cks[-1]["train_args"], name=f"{r}_swa{lo}"))
            out.parent.mkdir(parents=True, exist_ok=True); torch.save(ck, out)
            print(f"{r}_swa{lo} ← 에폭 {eps[0]}~{eps[-1]} ({len(eps)}개) 평균")
            del cks, sds, avg


if __name__ == "__main__":
    main()
