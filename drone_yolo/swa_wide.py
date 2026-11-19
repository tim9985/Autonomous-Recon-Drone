"""swa_wide.py <run> [lo=15] — 에폭 lo~29 EMA 평균 → runs_person/<run>_swa<lo>/weights/best.pt (H0 넓은 평균 · probe_h0 와 같은 방식)"""
import sys
import probe_h0 as H
r = sys.argv[1]; lo = int(sys.argv[2]) if len(sys.argv) > 2 else 15
H.RUNS, H.EPS, H.SWA = (r,), (), (lo,)
H.main()
