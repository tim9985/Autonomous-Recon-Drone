"""geom_mount.py — 마운트각별 화면 기하 · 사람 크기 · 체류 시간 · 좌표 오차 (2026-09-29)

88° 렌즈 (수평 80.2° · f 1,141 px) · 1920×1080 · 평지 · 화면 가운데 열 기준
  φ(v) = θ + atan((v − 540) / f)       화면 v 행 광선의 하향각 (θ = 마운트각)
  d = h / tan φ (수평) · R = h / sin φ (사선)
  폭: 정확한 핀홀 투영 — 반폭 = 960 · h / ((v−540)·cosθ + f·sinθ)
  사람 px = max((L·cosφ + foot·sinφ)/R, foot/R) · f     (서 있음 L 1.70 · foot 0.81 / 누움 L 0.30 · foot 1.70)
  좌표 오차 (제곱합): GPS 3 m · 자세/짐벌 2° · 고도 3 m · 지형 기복 5 m · 발끝 10 px
실행: python geom_mount.py [45 60 ...]  → metrics/geom_mount.json
"""
import math, json, sys
from pathlib import Path
F = 960 / math.tan(math.radians(80.2 / 2)); CY = 540
def phi(theta, v): return theta + math.degrees(math.atan((v - CY) / F))
def ground(theta, h, v):
    p = math.radians(phi(theta, v)); th = math.radians(theta)
    den = (v - CY) * math.cos(th) + F * math.sin(th)
    return h / math.tan(p), h / math.sin(p), 2 * 960 * h / den
def px(theta, h, v, L, foot):
    p = math.radians(phi(theta, v)); R = h / math.sin(p)
    return max((L * math.cos(p) + foot * math.sin(p)) / R, foot / R) * F
def err(theta, h, v):
    p = math.radians(phi(theta, v))
    e_ang = h / math.sin(p) ** 2 * math.radians(2); e_alt = 3 / math.tan(p); e_rel = 5 / math.tan(p)
    d0 = h / math.tan(p); d1 = h / math.tan(math.radians(phi(theta, v + 10))); e_foot = abs(d0 - d1)
    return math.sqrt(3 ** 2 + e_ang ** 2 + e_alt ** 2 + e_rel ** 2 + e_foot ** 2)
def first_row(cond):   # 위(v=0)부터 내려오며 조건을 처음 만족하는 행
    for v in range(0, 1081):
        if cond(v): return v
    return None
out = {}
for theta in [float(a) for a in sys.argv[1:]] or [45.0, 60.0]:
    rows = []
    for h in (16, 20, 25, 30):
        dn, _, wn = ground(theta, h, 1080); dc, Rc, wc = ground(theta, h, 540); df, _, wf = ground(theta, h, 0)
        r = {"고도": h, "앞_가까운_m": round(dn, 1), "앞_가운데_m": round(dc, 1), "앞_먼_m": round(df, 1),
             "진행방향_길이_m": round(df - dn, 1), "폭_가까운_m": round(wn, 1), "폭_먼_m": round(wf, 1),
             "서있음_px": {"아래": round(px(theta, h, 1080, 1.7, 0.81)), "가운데": round(px(theta, h, 540, 1.7, 0.81)), "위": round(px(theta, h, 0, 1.7, 0.81))},
             "누움_px": {"아래": round(px(theta, h, 1080, 0.3, 1.7)), "가운데": round(px(theta, h, 540, 0.3, 1.7)), "위": round(px(theta, h, 0, 0.3, 1.7))},
             "좌표오차_m": {"아래": round(err(theta, h, 1070), 1), "가운데": round(err(theta, h, 540), 1), "위": round(err(theta, h, 0), 1)}}
        for key, thr in (("유효_36px", 36), ("유효_24px", 24)):
            v0 = first_row(lambda v: min(px(theta, h, v, 1.7, 0.81), px(theta, h, v, 0.3, 1.7)) >= thr)
            if v0 is None: r[key] = None; continue
            d_eff = ground(theta, h, v0)[0]
            r[key] = {"먼_m": round(d_eff, 1), "길이_m": round(d_eff - dn, 1), "화면_위에서_%": round(100 * v0 / 1080),
                      "체류_s": {s: round((d_eff - dn) / s, 1) for s in (3, 5, 8)}, "3초_최대속도": round((d_eff - dn) / 3, 1)}
        v15 = first_row(lambda v: err(theta, h, v) <= 15); v10 = first_row(lambda v: err(theta, h, v) <= 10)
        r["좌표15m_이내_화면_위에서_%"] = round(100 * v15 / 1080) if v15 is not None else None
        r["좌표10m_이내_화면_위에서_%"] = round(100 * v10 / 1080) if v10 is not None else None
        rows.append(r)
    out[f"{int(theta)}"] = rows
Path("metrics/geom_mount.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
for th, rows in out.items():
    print(f"\n=== 마운트 {th}° ===")
    print("고도 | 앞 범위(가까운~먼) | 길이 | 폭(가까운·먼) | 서있음 px 아래/가운데/위 | 누움 px | 좌표오차 아래/가운데/위 | 36px 유효(먼·길이·5m/s체류·3초최대) | 24px 유효 | 오차≤15m 행(위에서%)")
    for r in rows:
        e36, e24 = r["유효_36px"], r["유효_24px"]
        f36 = f'{e36["먼_m"]} m · {e36["길이_m"]} m · {e36["체류_s"][5]} s · {e36["3초_최대속도"]} m/s (위 {e36["화면_위에서_%"]}% 제외)' if e36 else "없음"
        f24 = f'{e24["먼_m"]} m · {e24["길이_m"]} m (위 {e24["화면_위에서_%"]}% 제외)' if e24 else "없음"
        s, l, e = r["서있음_px"], r["누움_px"], r["좌표오차_m"]
        print(f'{r["고도"]} m | {r["앞_가까운_m"]}~{r["앞_먼_m"]} | {r["진행방향_길이_m"]} | {r["폭_가까운_m"]}·{r["폭_먼_m"]} | {s["아래"]}/{s["가운데"]}/{s["위"]} | {l["아래"]}/{l["가운데"]}/{l["위"]} | {e["아래"]}/{e["가운데"]}/{e["위"]} | {f36} | {f24} | {r["좌표15m_이내_화면_위에서_%"]}%')
