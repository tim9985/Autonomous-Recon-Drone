# worker 1.4 — 임무별 2차 검증 · 그림자 모드 (11-13)

> 한 줄: 파일 2개 추가 + `ingest.py` 패치 6줄 + 모델 폴더 하나 → 재시작 · **새 패키지 없음** · 기본 꺼짐 (`VISION_VERIFY=shadow` 일 때만)
> 그림자 = 관제로 가는 관측 · 후보 · 등급 · 색 일치는 **1.3 과 똑같다** (시험으로 확인) · 2차 판정은 파일에만 → 비행 뒤 정답으로 재고 기준 넘는 것만 켬
> 판정 기준 = obsidian `_학습 큐` 「11-13 V14」

| 임무 | 2차 검증 | 어디서 | 비용 |
|---|---|---|---|
| 모든 임무 (요구조자 등급) | **자세 관절점** ViTPose-B (TensorRT FP32) → 물리 특징 4 + 박스 2 → P(누움) · 박스가 서기처럼 보일 때만 | worker 안 · 별도 스레드 | 후보당 1초 1번 · GPU +0.4 GB |
| 찾는 색이 있는 임무 | **색 후보 확장** P(정답 = 찾는 색 \| 보인 색) 혼동 행렬 (UAV-Human 학습셋) | worker 안 | 계산만 |
| 찾는 색이 있는 임무 | **VLM 색 확인** Qwen3-VL-4B — worker 는 크롭 + 질의만 파일로 | 서버 밖 사이드카 `drone_yolo/vlm_color_sidecar.py` (state 환경) | 후보당 10초 1번 · 64 ms · GPU 8.3 GB |
| 좌표 | 2차 판정 없음 — 실비행 기준점으로 잼 | `real_flight_eval.py` | |

## 파일

- `app/vision_core/verify.py` · `_rtmlib_vitpose.py` (rtmlib Apache-2.0 전후처리 그대로) → 배포 판 `app/vision_core/`
- `ingest_real.patch` (drone-real `ingest.py` b24e4b88 기준) · `ingest_dev.patch` (drone-dev 6f1618d5 기준) — 1.3 이 적용된 판
- 모델 폴더 `drone_yolo/runs_person/_pack_v12w_{real,sim}/verify_v14/` → `/models/verify_v14/` (읽기 전용) — `vitpose-b-coco.onnx` · `posture_kp.json` · `color_sim.json` · `verify_model.json` (해시)

## 환경 변수

| 변수 | 기본 | 뜻 |
|---|---|---|
| `VISION_VERIFY` | (끔) | `shadow` 이면 켬 |
| `VISION_VERIFY_PACK` | `/models/verify_v14` | |
| `VISION_VERIFY_DIR` | `/scratch/verify` | `<임무>/verify.jsonl` · `vlm/*.jpg` · `vlm_req.jsonl` · 엔진 캐시 `_engine/` (첫 기동 때 1~2분 · 분석은 안 막음) |
| `VISION_VERIFY_EVERY_S` · `VISION_VERIFY_VLM_EVERY_S` | 1 · 10 | 후보마다 간격 |

- 상태 파일: `verify` · `verify_ready` · `verify_n` · `verify_ms_p50` · `verify_dropped` · `verify_error`
- ⚠ `vlm/*.jpg` 는 사람 크롭 — 녹화와 같이 평가 뒤 지움

## 시험 (11-13 · 비전)

`python tests_verify.py` — ① 관절점: worker 판 ↔ 연구 판 P(누움) 최대 차 0.0001 (UE 30장) ② UE S1_a16 백엔드 계약 746/746 · REAL · SIM 모두 **관제 수치 1.3 과 같음** · verify 943 줄 · 관절 판정 285 · VLM 요청 375 → `metrics/integration_v1_4_{real,dev}_verify.json`

## 실비행 전 평가 (VLM · 색 균형 1순위 · SigLIP 배포판 대비 · `metrics/vlm_color_eval.json`)

| 셋 | VLM | SigLIP | 차 95 % | 둘이 다를 때 VLM 맞음 : SigLIP 맞음 |
|---|---|---|---|---|
| PETA (1,606) | **0.709** | 0.560 | **+0.126 ~ +0.172** | 320 : 81 |
| 디관 사진 D (106) | 0.721 | 0.662 | −0.064 ~ +0.523 | 29 : 1 |
| 디관 영상 V (45) | 0.870 | 0.845 | −0.038 ~ +0.324 | 13 : 3 |

| UAV-Human 드론 U (3,276 · 키 48~120 px) | **0.694** | 0.502 | **+0.13 ~ +0.27** | 815 : 123 |
| UE 드론 E (3,188) | **0.756** | 0.540 | **+0.15 ~ +0.26** | 694 : 34 |
| NOMAD 드론 N (3,279) | **0.500** | 0.345 | **+0.08 ~ +0.21** | 736 : 248 |

→ 11-14 드론셋 3개 모두 유의 개선 · 손해 셋 없음 · 65 ms → **V14 ③ 실비행 전 기준 충족** · 실비행 색 장면에서 다시 확인 후 켬
