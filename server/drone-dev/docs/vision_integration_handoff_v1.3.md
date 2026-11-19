# 비전·백엔드 연동 전달서 v1.3

v1.3 보강: 2026-10-16 (Asia/Seoul). SIM 프레임 전송·추론 결과의 묶음 처리를 추가했다. 최신 계약과 실측 판정은 [HDD 5fps 검증 기록](vision_5fps_hdd_report_20261016.md)을 우선한다. REAL 모델·비행 설정은 v1.2와 같다.

v1.2 배포·실험: 2026-10-14. 최종 상태 재확인·문서 정리: 2026-10-15 (Asia/Seoul). `동료_요청_메모.md` 최상단 v1.2 요청을 반영했다. 기존 v1.1 문서는 이전 배포 기록이다. 프론트 화면과 실기체 비행 활성화는 이번 범위에 포함하지 않는다.

## 적용한 시스템

```text
UE/Cosys-AirSim (담당자 PC)
  → JPEG + frame별 pose → 로컬 재전송 기록 → SSH 안 mTLS FastAPI
  → drone-dev 미디어/프레임/분석 작업
  → SIM TensorRT·추적·상태·색상 → completion → drone_dev → 관제 API

현장 게이트웨이 (실기체 연결은 후속)
  → REAL 미디어/프레임 API → drone-real TensorRT·추적·상태·색상
  → 워커 JSONL 재전송 → 인증된 결과 API → drone_real → 관제 API
```

컨테이너·신원·소켓·DB·모델 사본은 SIM/REAL별로 분리한다. `network_mode: none`과 Unix 소켓 TLS·토큰 인증을 유지한다. 학습 폴더를 실행 컨테이너에 연결하지 않았다. GPU·CPU·RAM은 학교 호스트의 공유 자원이다.

## 활성 모델

| 항목 | 설정 |
|---|---|
| 모델 / 임계값 | `v12_f91_swa` / `0.20` |
| 이미지 | `drone-vision:v12-20261014` (기존 기반 + lap 0.5.12) |
| SIM model_config_id | `9e223e9c-bff2-5775-84bf-05b7e93818e2` |
| REAL model_config_id | `1ebaedef-8b30-593c-a894-5cb7f8b40d5d` |
| 실행 | TensorRT, GPU |
| 모델 위치 | 각 환경 `data/models/v12_f91_swa/` |
| SIM 자원 상한 | CPU 2 / RAM 4 GiB |
| REAL 자원 상한 | CPU 6 / RAM 8 GiB |

해시:

```text
best.pt: d2a4edc92931401e68e029e7ac193041eb9c45f852b596ab8c698611fd323772
best_trt11.3.0.99_RTX3090.engine: 40b442b529eb29caa49e478ed8064a2debd834b2a57bad57f6799d72b5ff673c
posture.json: c750b56345f8429880fbb743c092dae37c75fbdb5aaf0884c53b0b091a0c235f
```

세 해시를 환경별 등록값과 대조하고 로딩한다. 등록된 엔진이 없거나 해시가 다르면 자동으로 다른 모델로 전환하지 않는다. `posture.json`도 버전 폴더 안에 고정했다. 등록 메타데이터와 현재 로딩 상태는 별개이며, 현재 상태는 인증된 `/api/v1/readiness`의 `model_loaded`로 확인한다(워커 보고 유효시간 45초).

```text
VISION_TRT=1
VISION_GEO_GROUPING=1
VISION_GEO_CLAIMS=0
VISION_GEO_AGL_FLAT=0
SIM_RICH_FIELDS=1  # SIM만
```

## 비전 담당자에게 전달할 변경점

1. v1.2 추적·자세·인상착의 코드를 SIM/REAL에 반영했다. REAL은 기존 JSONL/ACK 재전송, SIM은 기존 claim/attempt/completion을 유지한다. DB에 직접 접근하지 않는다.
2. SIM Observation에 `appearance`, `state`, `track_id`를 추가했다. 기존 응답의 재전송 해시가 바뀌지 않도록 새 필드를 보내지 않은 과거 메시지는 이전 해시 형식을 유지한다.
3. 관제 후보 응답은 `appearance`, `tracking.track_id`, `tracking.reported_state`, `tracking.physical_validation`, `tracking.geo_claim`을 제공한다. 자동 상태 등급과 운영자 판단 `judgement`를 구분한다. 상태의 `motion.measured=false`는 움직임 측정 근거 부족이다.
4. 프레임별 촬영 시각 순서로 처리한다. SIM은 pose의 `source_timestamp_ns`를 상태 판단 시계로 사용한다. 시계 역행 또는 1.6초 초과 프레임 공백에서는 연속 추적 상태를 초기화한다. 배경 움직임 추정 실패 시 과거 정지 시간이 계속 누적되던 부분을 보완했다.
5. 프레임에 명시적인 빈 `appearance_query`가 있으면 파일의 전역 조건으로 되돌아가지 않는다. 새 조건은 워커가 다음 프레임 메타데이터를 조회할 때 적용한다. 과거 관측을 소급 재계산하지 않는다.

## 관제 → 인상착의 조건 → 비전

운영자 로그인 세션·CSRF·임무 수정 권한이 필요하다. 장치와 비전 자격증명으로 조건을 수정할 수 없다.

```http
PUT /api/v1/missions/{mission_id}/appearance-query
Content-Type: application/json
X-CSRF-Token: <로그인 응답 값>

{"request_id":"새 UUID","query":{"upper":["green"]}}
```

`GET /api/v1/missions/{mission_id}/appearance-query`로 유효 조건을 조회한다. 최대 2개 색: red, orange, yellow, green, blue, navy, purple, pink, white, gray, black, brown. 해제는 새 request_id와 `{"query":{"upper":[]}}`를 보낸다. 재전송은 같은 request_id·본문을 사용한다. 조건 변경은 기존 `MISSION_EDITED` 이벤트에 저장하며, 일반 mission 응답의 과거 `appearance_query` 대신 이 전용 GET을 유효 조건 조회에 사용한다.

백엔드가 `/internal/v1/frames`(REAL) 또는 `/internal/v1/analysis-runs/{id}/frame`(SIM) 응답의 `appearance_query`에 조건을 실어 준다. 관제 프론트가 워커에 직접 접속하지 않는다. OpenAPI: [REAL](openapi-vision.json), [SIM](openapi-sim-vision.json).

## UE 연결기 설정과 성능 경계

```json
{"pipeline_config":{
  "mission_id":"SIM 임무 UUID",
  "model_config_id":"9e223e9c-bff2-5775-84bf-05b7e93818e2",
  "camera_name":"0",
  "interval_s":0.2,
  "image_format":"JPEG"
}}
```

허용 간격 최솟값은 0.1초, 기본값은 0.2초다. 촬영과 업로드는 독립 스레드이며 AirSim 클라이언트도 각각 사용한다. Pillow로 JPEG를 만들고 최종 전송 바이트의 해시를 등록한다. 원본 pose는 보존한다. HTTPS 연결을 재사용하되 서버 이름 검증·mTLS를 유지하고, 오류 난 연결은 폐기한다. POST를 통신 계층에서 임의 재실행하지 않고 기존 저널의 동일 식별자로 재전송한다.

**이전 v1.2 측정이며 v1.3 결과가 아니다.** 0.2초 설정 자체는 지속적인 5fps 서버 수신 보장이 아니다. 실제 12초 UE CAPTURE 시험에서 44프레임을 저장하고 모두 분석 완료했다. 촬영 시각 범위는 12.629초이며 업로드 대기열 30장 상한에 걸려 일부 촬영 기회를 건너뛰었다. 촬영 종료 후 약 27초 동안 남은 업로드를 처리했다. 완료 보고는 연결 종료 후 저널 재전송으로 복구했다. 해당 장면 탐지는 0건이다. 이 시험으로 사람 상태 정확도나 장시간 실시간 처리를 입증하지 않는다.

v1.2에서는 프레임마다 예약·업로드·확정·등록 4회가 필요했다. v1.3 연결기는 이미지·pose를 최대 5장씩 `/frames/batch/content` 한 번으로 전송하고, 서버 비전 워커도 최대 5개씩 입력·결과를 처리한다. 기존 단일 요청 경로는 호환성을 위해 유지한다. 대기열 상한은 30장으로 유지하고 촬영 생략 수와 미전송 수를 기록한다. 5fps 달성 여부와 최종 수신·분석 완료 수는 별도 검증 기록을 따른다.

## 좌표·운영 경계

UE의 현재 지리 고도는 MSL이며 지면 기준이 확인되지 않았다. AGL이라고 바꾸거나 평면 지면을 가정하지 않았다. `VISION_GEO_CLAIMS=0`으로 공식 위치는 PENDING이고, `GROUND_UNKNOWN` 등 보류 사유를 유지한다. 상대 시각 동기·카메라 FOV/내부 파라미터·지형 또는 AGL·실기체 보정은 담당자와 확인해야 한다. 카메라 방향만으로 지상 위치를 확정할 수 없다.

상태 등급은 운영자 우선순위 보조다. 신체 상태의 확정 진단이나 비행 제어 입력으로 자동 승격하지 않는다. `flight_enabled=false`, `physical_validation=false`를 유지한다.

## 검증 및 복구

- 모델 인수: test_v2 1,407장, TensorRT AP50 **0.6417**(허용 ±0.003 통과), recall@0.20 **0.7257**, 검출기 시간 중앙값 **22.5ms**. 네트워크·추적·색상·DB를 합친 전체 지연 수치가 아니다.
- REAL 저장/인증 계약 **53개**: 별도 임시 DB·저장소로 검증 후 제거. 운용 DB에 시험 임무·후보를 넣지 않았다.
- 배포된 REAL의 TLS 로그인·인증 거부·mTLS·WSS **12개** 통과. 네 서비스의 계정·읽기 전용 루트·네트워크 none·마운트 격리도 재확인했다.
- 계약/워커 단위 **34개**, 연결기 재전송·복구·TLS 재사용·JPEG 보존 **6개 검사 그룹** 통과.
- 라이브 UE: run `72c1b89e-d439-4c90-856b-29d85cf5f0ae`, mission `1b6549df-bb33-4348-8b03-70cb2bd45382`. 비행 없이 CAPTURE만 실행했으며 종료 후 UE를 정상 종료했다.
- 사람 포함 UE 녹화 S4_a16 재생: 20장→84관측, 84건 상태·인상착의·조건 비교 저장, 43건 추적 ID. 관제 후보 GET에서 상태·인상착의와 PENDING 좌표를 확인했다. run `175aa5e6-e2dc-427a-bc51-cbea79435bad`, mission `c39739ef-054e-406a-ba37-ec32c341f888`. 재생 시험은 촬영 시각을 0.2초 간격으로 재구성했고 pose는 넣지 않았다. 실제 UE 실시간 사람 추적·지리 좌표 정확도 검증과 구분한다.
- REAL migration `010_real_appearance_event.sql`: 기존 이벤트 권한 함수에서 REAL 임무·운영자·APPEARANCE_QUERY 조건만 허용한다. 새 테이블이나 비행 권한을 추가하지 않았다. DEV migration은 기존 11개 그대로다.

배포 전 소스·설정 백업: `/home/se/sandboxes/drone-real/backups/vision-v12-20261014T124302Z`. 이전 모델 사본은 복구용으로 남겼다. 롤백 시 환경별 소스·Compose·active.json을 함께 복원하고 이전 등록 모델 해시와 readiness를 확인한다. 이미 적용한 migration 파일을 수정하거나 적용 이력을 임의 삭제하지 않는다.

남은 인수 항목: 실기체·실테더링 장시간 시험, 학습과 추론 동시 GPU 부하, 지리 좌표 보정, 사람 상태 정확도, 관제 프론트 표시. 현재 검증 결과를 전체 운영 준비 완료로 해석하지 않는다.

검증 JSON은 로컬 `D:/Capstone1/Sever/output/vision-v12-20261014/`와 서버 각 환경 `evidence/vision-v12/`에 보관한다. v1.2 OpenAPI는 2026-10-15 실행 중인 앱에서 내보냈다. REAL 53경로, SIM 88경로이며 관제 조건 설정·조회 API를 포함한다.
