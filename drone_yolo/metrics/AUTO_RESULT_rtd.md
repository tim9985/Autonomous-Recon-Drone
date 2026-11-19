[2026-11-15 02:23:16 KST] chain_rtd 시작 — RT-DETR-L · v12_f91 목록 · AdamW 1e-4 · batch 4 · 30 에폭 (≈ 45분/에폭)
[2026-11-15 15:05:33 KST]    rtd_v12_f91 학습 끝
[2026-11-15 15:17:52 KST]    rtd_v12_f91 AP50 obl 0.7112 · v2 edge+무시 0.6554 · kr edge 0.9883 · 도로 오탐 98.291 건/장
test_obl  평균[rtd_v12_f91] − 평균[v12_f91_swa15+v12_f92_swa15+v12_f93_swa15] = +7.7 %p  (95 % +5.6 ~ +9.9 %p · 블록 48) → 차이 있음
test_v2_edge_ign  평균[rtd_v12_f91] − 평균[v12_f91_swa15+v12_f92_swa15+v12_f93_swa15] = +0.9 %p  (95 % -2.3 ~ +3.9 %p · 블록 72) → 구분 안 됨
test_kr_edge  평균[rtd_v12_f91] − 평균[v12_f91_swa15+v12_f92_swa15+v12_f93_swa15] = -0.8 %p  (95 % -1.2 ~ -0.0 %p · 블록 61) → 차이 있음
[2026-11-15 15:39:37 KST]    rtd_v12_f91_swa15 AP50 obl 0.719 · v2 edge+무시 0.663 · kr edge 0.9875 · 도로 오탐 88.008 건/장
test_obl  평균[rtd_v12_f91_swa15] − 평균[v12_f91_swa15+v12_f92_swa15+v12_f93_swa15] = +8.4 %p  (95 % +6.2 ~ +10.8 %p · 블록 48) → 차이 있음
test_v2_edge_ign  평균[rtd_v12_f91_swa15] − 평균[v12_f91_swa15+v12_f92_swa15+v12_f93_swa15] = +1.6 %p  (95 % -1.8 ~ +4.7 %p · 블록 72) → 구분 안 됨
test_kr_edge  평균[rtd_v12_f91_swa15] − 평균[v12_f91_swa15+v12_f92_swa15+v12_f93_swa15] = -0.9 %p  (95 % -1.3 ~ -0.1 %p · 블록 61) → 차이 있음
[2026-11-15 15:47:20 KST] chain_rtd 완료 — 합침 이득 (diag_headroom 방식) 은 따로 · 판정 _학습 큐 「11-15 RT」
