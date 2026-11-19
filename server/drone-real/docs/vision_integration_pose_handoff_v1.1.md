# SIM·REAL 비전 연동 및 프레임 pose 전달 v1.1

반영일: 2026-10-14. 서버 실행 상태를 확인하고 적용한 문서다. 이전 `vision_sim_real_pose_review_20261014.md`는 수정 전 검토 기록이며, 아래 결과가 현재 상태다.

## 현재 구성

```text
Unreal/Cosys-AirSim (담당자 PC)
  └─ 이미지 응답의 camera pose·timestamp + 별도 기체 snapshot·시간 차이
      └─ 로컬 프레임 spool → SSH 터널 → SIM FastAPI
          └─ 해시 검증·미디어 저장 → frame 등록 + analysis job 생성
              └─ SIM CUDA worker → leased completion → drone_dev

실기체 현장 gateway (연결 후)
  └─ 미디어·frame·동기화 근거 → REAL FastAPI
      └─ REAL CUDA worker → 탐지·후보·색상·crop → 로컬 JSONL
          └─ mTLS + Bearer 전송 → receipt·관측·후보 → drone_real
```

SIM과 REAL 모두 `python -m app.vision_ingest`로 실행한다. 기존 학습/Jupyter 폴더는 사용하지 않는다. 두 컨테이너는 신원·모델 사본·작업 저장소·DB를 구분하며 `network_mode: none`을 유지한다. GPU는 같은 RTX 3090을 공유한다.

| 항목 | SIM | REAL |
|---|---|---|
| 서버 경로 | `/home/se/sandboxes/drone-dev` | `/home/se/sandboxes/drone-real` |
| 업무 DB | 기존 `drone_dev` | 별도 `drone_real` |
| 모델 ID | `c70e5063-bd4b-5d90-9c3b-b84418c89a10` | `55ad2b5e-599c-515f-aa95-82d82e84e689` |
| 활성 모델 | `soup_v7r2/best.pt` | `soup_v7r2/best.pt` |
| 실행 | PyTorch FP16 / CUDA | PyTorch FP16 / CUDA |
| CPU·RAM 상한 | CPU 2 / RAM 4 GiB | CPU 6 / RAM 8 GiB |
| 결과 전달 | claim·attempt·completion | JSONL·ACK·receipt |

실제 파일 SHA-256은 `6863f3b909ed3e5a1f78ee477b8d4c945d08374b4415fceff7aad612aaed1ffd`다. 환경별 모델 ID를 혼용하지 않는다. 파일·manifest·등록 해시를 모델 역직렬화 전에 확인하며, CUDA와 단일 person 클래스·초기 추론을 확인한 뒤 작업을 받는다. CPU fallback은 없다. 업로드된 TensorRT 엔진은 활성화하지 않았다.

REAL 모델 등록의 `DRAFT`, `provenance_only`, `artifact_loaded=false`는 등록 당시의 메타데이터다. 현재 로딩 상태는 인증된 `/api/v1/readiness`의 `model_loaded`를 확인한다. 이 값은 등록 해시와 일치하는 워커 보고에 45초 유효시간을 적용한다. 물리 좌표 검증·비행 준비·탐지 정확도를 뜻하지 않는다.

## SIM 담당자

기존 실행 요청에 아래 `pipeline_config`를 넣어야 비전 프레임·분석 작업이 생성된다. 빈 설정은 기존 telemetry 실행으로 유지된다. `mission_id`는 관제 사용자가 접근 가능한 `sim-pi-01`의 SIM 임무여야 한다.

```json
{
  "pipeline_config": {
    "mission_id": "관제 API에서 생성한 SIM 임무 UUID",
    "model_config_id": "c70e5063-bd4b-5d90-9c3b-b84418c89a10",
    "camera_name": "0",
    "interval_s": 2
  }
}
```

연결기는 실행을 claim한 `producer_session_id`를 `X-Simulator-Session` 헤더에도 보낸다.

1. `POST /device/v1/simulations/runs/{rid}/media-bundles`: FRAME 파일 ID·크기·SHA-256 예약.
2. `PUT /device/v1/simulations/runs/{rid}/media-assets/{aid}/content`: 원본 PNG 바이트 전송.
3. `POST /device/v1/simulations/runs/{rid}/media-bundles/{bid}/finalize`: 저장 확인.
4. `POST /device/v1/simulations/runs/{rid}/frames`: `{producer_session_id, frame, analysis_run_id}` 등록. 응답은 `{frame, job}`이다.

다른 worker·run·mission·session의 파일은 거부한다. 실행 종료 후에는 해당 실행·세션에서 미리 예약한 파일의 재전송만 허용한다. 프레임 전송은 별도 스레드이고 미전송 큐는 최대 30장이다. 큐가 차면 기존 프레임을 덮지 않고 새 캡처를 보류한다. 시뮬레이션이 끝나고 기체가 착륙한 뒤 최대 30초 전송을 기다린다. 남은 프레임이 있으면 성공 완료를 보고하지 않고 로컬 기록을 보존한다. 종료 후 미예약 파일을 임의로 다시 등록하지 않는다.

PC에는 `server_simulation_bridge.py`, `simulation_vision.py`, 기존 route 도구를 함께 배포한다. 자신의 SIM 인증서·토큰만 사용한다. 기존 SSH 접속·PKI 검증 방식을 유지하며 외부 포트·Cloudflare 설정을 추가하지 않았다.

## 비전 담당자

REAL 입력은 `GET /internal/v1/frames`에서 받는다. 이제 `pose`, `pose_status`, `pose_reason`도 반환한다. SIM은 claim 후 `GET /internal/v1/analysis-runs/{rid}/frame`에서 메타데이터, `/input`에서 바이트를 받는다. 바이트 해시와 실제 디코딩 크기를 검사한다.

신규 frame의 `pose`는 `frame-pose/1.0` 구조다.

| 필드 | 의미 |
|---|---|
| `frame_id`, `capture_at` | 바깥 frame과 같은 ID·시각이어야 함 |
| `clock_domain`, `source_timestamp_ns` | 이미지 시계 기준·nanoseconds decimal string |
| `body_timestamp_ns`, `sync_error_ms` | 같은 시계 기준의 기체 snapshot 시각·이미지와의 차이 |
| `geographic` | 위도·경도·고도(m)·고도 기준: MSL/ELLIPSOID/AGL/RELATIVE_HOME |
| `body_attitude` | BODY_FRD_TO_NED 단위 quaternion |
| `camera_attitude`, `camera_position_ned` | 카메라의 NED 방향·위치(m) |
| `mount` | GIMBAL/FIXED, CAMERA_FRD_TO_BODY_FRD 방향, calibration_id |
| `missing_reasons` | 제공하지 못한 측정·동기화·보정 항목 |

새 입력의 임의 pose dict는 422로 거부한다. quaternion은 정규화돼야 하고 NaN·무한대는 거부한다. REAL pose는 UTC/DEVICE_MONOTONIC만 허용하며 SIM clock은 거부한다. 기존 DB의 이전 pose dict는 읽을 때 보존한다.

같은 프레임의 이미지 응답에 카메라 pose가 있어도, 별도 조회한 기체 snapshot을 완전 동시 관측으로 주장하지 않는다. 서로 다른 시계라면 먼저 시계 매핑이 필요하다. 짐벌 값·고도 기준·보정이 모르면 null과 사유를 남긴다. 현재 UE 시험의 `mount`도 검증된 짐벌 보정이 없어 null이다.

현재 공식 지리 좌표는 모두 PENDING이다. pose가 없으면 `POSE_MISSING`, pose가 있어도 물리 보정 전에는 `PHYSICAL_VALIDATION_REQUIRED` 또는 SIM 보류 사유를 남긴다. 누락된 자세를 0°, 짐벌을 -45°, 지면을 평지로 채워 좌표를 생성하지 않는다. REAL 워커의 VALID 주장은 별도 근거로 저장하고 공식 위치로 승격하지 않는다.

REAL 탐지 결과 계약 `vision-ingest/1.0`은 유지한다. `model_config_id`는 위 REAL ID를 사용한다. JSONL은 워커 자체 재전송 기록이며 백엔드가 직접 공유 파일을 읽지 않는다. crop은 기존 내부 미디어 API로 전달한다. 새 이미지 decode·크기·해시 실패를 성공 탐지로 기록하지 않는다. 탐지·후보 연결·자동 판정의 정확도 및 기존 개수/메시지 크기 제한은 비전 담당자의 성능 검증 범위다.

## 확인 근거와 한계

- 실제 UE CAPTURE 실행 `cff540e7-a31c-43df-ba74-43132287e903`: frame 4장, pose 4건, 분석 완료 4건, 미전송 0건. 비행 명령 없음. 탐지 관측 12건도 개발 DB에 저장됐으며, 정답 비교를 수행한 검출 정확도 검증은 아니다.
- 단위 검증 27개: pose 바인딩·형식·시계·실행 격리·JSONL 복구·등록 해시 선검사·전송 완료 대기 등.
- REAL 저장 회귀 48개: 실제 PostgreSQL의 임시 DB·별도 저장소 사용, 시험 종료 후 제거. 운용 DB에 시험 임무·후보를 넣지 않음.
- 실제 서비스 TLS/WSS 인증 12개 통과. REAL·SIM 파일·서비스 신원·DB 경계 유지.
- 초기 CUDA 사전 추론은 RTX 3090, `pytorch_fp16`, 약 4.03초였다. 이는 warmup 시간이며 운영 프레임 지연 기준이 아니다.

별도 시뮬 전용 DB나 신규 시뮬 테이블은 생성하지 않았다. SIM은 기존 개발 환경만 사용한다. 실기체 영상·짐벌 동기화·좌표 보정·비행·학습 동시 GPU 부하·TensorRT·실테더링 장시간 품질은 아직 검증하지 않았다. `physical_validation_ready=false`, `flight_enabled=false`를 유지한다.

OpenAPI: `openapi-vision.json`(REAL), `openapi-sim-vision.json`(SIM). 서버 근거는 각 환경 `evidence/vision-pose-*.json`, REAL `evidence/real-vision-pose-*.json`을 확인한다.
