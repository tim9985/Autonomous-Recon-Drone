"""fig_mount45.py — 45° vs 60° 화면 기하 그림 (옵시디언 _첨부/fig_45도_화면기하.svg)"""
import json, math
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager as fm
SP = "/tmp/claude-1001/-home-se-JupyterLAB/027ea9bd-abdf-476f-ad0d-25f3e2ea7ffc/scratchpad/"
fm.fontManager.addfont(SP + "NanumGothic.ttf"); fm.fontManager.addfont(SP + "NanumGothicBold.ttf")
plt.rcParams["font.family"] = fm.FontProperties(fname=SP + "NanumGothic.ttf").get_name()
G = json.load(open("metrics/geom_mount.json"))
F = 960 / math.tan(math.radians(40.1)); CY = 540
def dist(theta, h, pct):
    v = pct / 100 * 1080; phi = theta + math.degrees(math.atan((v - CY) / F)); return h / math.tan(math.radians(phi))
fig, (a1, a2) = plt.subplots(1, 2, figsize=(13, 4.6), gridspec_kw={"width_ratios": [1.6, 1]})
h = 30
for th, c, ls in ((60, "#2c63ad", "--"), (45, "#cf6f14", "-")):
    r = [x for x in G[str(th)] if x["고도"] == h][0]
    for d in (r["앞_가까운_m"], r["앞_먼_m"]):
        a1.plot([0, d], [h, 0], color=c, ls=ls, lw=1.6)
    a1.fill_between([r["앞_가까운_m"], r["앞_먼_m"]], -3.2 if th == 45 else -1.6, -1.6 if th == 45 else 0, color=c, alpha=0.35, lw=0)
    a1.text(r["앞_먼_m"] + 1, -2.4 if th == 45 else -0.8, f'{th}°  {r["앞_가까운_m"]:.0f}~{r["앞_먼_m"]:.0f} m', color=c, va="center", fontsize=10, fontweight="bold")
r45 = [x for x in G["45"] if x["고도"] == h][0]
e36 = r45["유효_36px"]["먼_m"]; e10 = dist(45, h, r45["좌표10m_이내_화면_위에서_%"]); e15 = dist(45, h, r45["좌표15m_이내_화면_위에서_%"])
for x, lab, yy in ((e36, f"사람 36 px 경계 {e36:.0f} m", 24), (e10, f"좌표 10 m 경계 {e10:.0f} m", 18), (e15, f"좌표 15 m 경계 {e15:.0f} m", 12)):
    a1.axvline(x, ymin=0.08, ymax=0.9, color="#8a6d3b", lw=1, ls=":"); a1.text(x + 0.8, yy, lab, fontsize=9, color="#8a6d3b")
a1.plot([0], [h], marker="^", ms=10, color="#1f2d3a"); a1.text(1, h + 1.2, "기체 30 m", fontsize=10)
a1.axhline(0, color="#546e7a", lw=1)
a1.set_xlim(-2, 100); a1.set_ylim(-4, 36); a1.set_xlabel("기체 앞 수평 거리 (m)"); a1.set_yticks([])
a1.set_title("옆에서 본 화면 범위 — 고도 30 m · 88° 렌즈", fontsize=12, fontweight="bold", loc="left")
for s in ("top", "right", "left"): a1.spines[s].set_visible(False)
hs = [16, 20, 25, 30]; x = range(len(hs)); w = 0.26
p36 = [ (r["유효_36px"] or {}).get("화면_위에서_%", 0) for r in G["45"]]
p10 = [r["좌표10m_이내_화면_위에서_%"] for r in G["45"]]; p15 = [r["좌표15m_이내_화면_위에서_%"] for r in G["45"]]
b1 = a2.bar([i - w for i in x], p36, w, color="#7446ad", label="사람 36 px 미만")
b2 = a2.bar(list(x), p10, w, color="#cf6f14", label="좌표 오차 10 m 초과")
b3 = a2.bar([i + w for i in x], p15, w, color="#c0392b", label="좌표 오차 15 m 초과")
for bars in (b1, b2, b3):
    for b in bars: a2.text(b.get_x() + b.get_width() / 2, b.get_height() + 0.6, f"{b.get_height():.0f}", ha="center", fontsize=9)
a2.set_xticks(list(x)); a2.set_xticklabels([f"{h_} m" for h_ in hs]); a2.set_ylabel("화면 위쪽에서 차지하는 비율 (%)")
a2.set_title("45° 에서 화면 위쪽 약한 구간 (60° 는 모두 0 %)", fontsize=12, fontweight="bold", loc="left")
a2.legend(frameon=False, fontsize=9, loc="upper left"); a2.set_ylim(0, 38)
for s in ("top", "right"): a2.spines[s].set_visible(False)
plt.tight_layout()
out = "/home/se/JupyterLAB/Capstone/obsidian/_첨부/fig_45도_화면기하.svg"
plt.savefig(out); plt.savefig("/tmp/claude-1001/-home-se-JupyterLAB/027ea9bd-abdf-476f-ad0d-25f3e2ea7ffc/scratchpad/fig45.png", dpi=110); print("saved", out, round(e36, 1), round(e10, 1), round(e15, 1))
