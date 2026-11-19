# chain_r 자동 결과 (10-04~)

| 모델 | test_obl | test_v2 | test_kr |
|---|---|---|---|
| ft_s41 | 0.6079 | 0.5588 | 0.9726 |
| ft_s42 | 0.6064 | 0.5653 | 0.9728 |
| ft_s43 | 0.6056 | 0.5637 | 0.9724 |
| soup_ft3 | 0.6078 | 0.5644 | 0.9727 |
| soup_ft3b | 0.6287 | 0.5677 | 0.9841 |
**soup_v9x2 → soup_ft3**
test_obl  soup_ft3 − soup_v9x2 = -5.2 %p  (95 % -6.5 ~ -4.0 %p · 블록 48) → 차이 있음
test_v2  soup_ft3 − soup_v9x2 = -0.8 %p  (95 % -2.6 ~ +0.9 %p · 블록 72) → 구분 안 됨
test_kr  soup_ft3 − soup_v9x2 = -0.2 %p  (95 % -1.5 ~ +1.1 %p · 블록 61) → 구분 안 됨
**soup_v9x2 → soup_ft3b**
test_obl  soup_ft3b − soup_v9x2 = -3.1 %p  (95 % -3.9 ~ -2.1 %p · 블록 48) → 차이 있음
test_v2  soup_ft3b − soup_v9x2 = -0.5 %p  (95 % -1.7 ~ +1.0 %p · 블록 72) → 구분 안 됨
test_kr  soup_ft3b − soup_v9x2 = +0.9 %p  (95 % -0.2 ~ +1.3 %p · 블록 61) → 구분 안 됨
   soup_v9x2|test_obl: 가림 0.264 · 누움 0.495 · 앉음 0.558 · 너비비 0.9
   soup_ft3|test_obl: 가림 0.248 · 누움 0.484 · 앉음 0.505 · 너비비 0.877
   soup_ft3b|test_obl: 가림 0.244 · 누움 0.5 · 앉음 0.516 · 너비비 0.882
v7:v7_r2                 mean_z 0.118 (최대 0.77) · logvar 0.089 · w_cos 0.0354
v7:v7_r3                 mean_z 0.292 (최대 2.40) · logvar 0.230 · w_cos 0.2538
v9_s31:v9_s32            mean_z 0.243 (최대 1.77) · logvar 0.177 · w_cos 0.1775
v9_s33:v9_s34            mean_z 0.301 (최대 2.60) · logvar 0.231 · w_cos 0.2617
y26_s31:y26_s32          mean_z 0.242 (최대 1.30) · logvar 0.157 · w_cos 0.0912
ft_s41:ft_s42            mean_z 0.015 (최대 0.11) · logvar 0.015 · w_cos 0.0004
ft_s41:ft_s43            mean_z 0.028 (최대 0.19) · logvar 0.026 · w_cos 0.0014
ft_s42:ft_s43            mean_z 0.028 (최대 0.16) · logvar 0.027 · w_cos 0.0014
soup_v9x2:ft_s41         mean_z 0.069 (최대 0.51) · logvar 0.204 · w_cos 0.0059

## R3 v10 = v9 + LADD
| v10_s31 | 0.6337 | 0.601 | 0.977 | 참고 LADD 뒤 0.8064 |
| v10_s32 | 0.6207 | 0.5965 | 0.9737 | 참고 LADD 뒤 0.815 |
| v9_s31 | 0.6182 | 0.5603 | 0.9719 | 참고 LADD 뒤 0.7818 |
| v9_s32 | 0.6155 | 0.5782 | 0.9704 | 참고 LADD 뒤 0.8116 |
| soup_v9x2 | 0.6596 | 0.5724 | 0.9749 | 참고 LADD 뒤 0.7815 |
test_obl  v10_s31 − v9_s31 = +1.6 %p  (95 % +0.2 ~ +2.8 %p · 블록 48) → 차이 있음
test_v2  v10_s31 − v9_s31 = +4.1 %p  (95 % +1.9 ~ +6.7 %p · 블록 72) → 차이 있음
test_kr  v10_s31 − v9_s31 = +0.5 %p  (95 % -0.9 ~ +1.8 %p · 블록 61) → 구분 안 됨
test_obl  v10_s32 − v9_s32 = +0.5 %p  (95 % -0.8 ~ +1.7 %p · 블록 48) → 구분 안 됨
test_v2  v10_s32 − v9_s32 = +1.8 %p  (95 % -0.3 ~ +4.3 %p · 블록 72) → 구분 안 됨
test_kr  v10_s32 − v9_s32 = +0.3 %p  (95 % -0.8 ~ +2.6 %p · 블록 61) → 구분 안 됨
| soup_v10x2 | 0.7002 | 0.5384 | 0.9127 | 참고 LADD 뒤 0.7673 |
test_obl  soup_v10x2 − soup_v9x2 = +4.1 %p  (95 % +2.3 ~ +5.7 %p · 블록 48) → 차이 있음
test_v2  soup_v10x2 − soup_v9x2 = -3.4 %p  (95 % -9.4 ~ +1.8 %p · 블록 72) → 구분 안 됨
test_kr  soup_v10x2 − soup_v9x2 = -6.2 %p  (95 % -11.5 ~ -3.1 %p · 블록 61) → 차이 있음
   v9_s31:v10_s31: 통과 (유의 이득 ['test_v2'] · 유의 손해 없음)
   v9_s32:v10_s32: 탈락 (유의 이득 없음 · 유의 손해 없음)
   soup_v9x2:soup_v10x2: 탈락 (유의 이득 ['test_obl'] · 유의 손해 ['test_kr'])
FAIL

## R5 중간발표 후보 (soup_v7r2 대비 같은 규칙)
test_obl  soup_ft3 − soup_v7r2 = -2.5 %p  (95 % -4.1 ~ -1.6 %p · 블록 48) → 차이 있음
test_v2  soup_ft3 − soup_v7r2 = -2.8 %p  (95 % -5.1 ~ -0.8 %p · 블록 72) → 차이 있음
test_kr  soup_ft3 − soup_v7r2 = +0.5 %p  (95 % -0.7 ~ +1.8 %p · 블록 61) → 구분 안 됨
test_obl  soup_ft3b − soup_v7r2 = -0.4 %p  (95 % -1.6 ~ +0.5 %p · 블록 48) → 구분 안 됨
test_v2  soup_ft3b − soup_v7r2 = -2.5 %p  (95 % -4.8 ~ -0.3 %p · 블록 72) → 차이 있음
test_kr  soup_ft3b − soup_v7r2 = +1.6 %p  (95 % +0.4 ~ +2.1 %p · 블록 61) → 차이 있음
