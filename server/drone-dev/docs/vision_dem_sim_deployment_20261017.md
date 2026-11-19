# SIM 비전 DEM 배포와 통합 확인

확인일: 2026-10-17 KST. 요청서 `/home/se/JupyterLAB/Capstone/drone_yolo/deploy/vision_worker/동료_요청_메모.md` 최상단 10-17 배포 요청을 기준으로 적용했다. **SIM 비전 배포는 완료했다. ROUTE의 비행·착륙은 성공했으나 저장 한도로 영상 30장이 미전송되어 전체 통합 검증은 INCONCLUSIVE다.**

## 반영 내용

| 요청 | 반영과 확인 |
|---|---|
| pose.py와 ingest.py 교체 | SIM `/home/se/sandboxes/drone-dev/app/vision_core/`에 DEM·저고도 후보 제외 기능을 적용했다. 새 ingest를 통째로 덮지 않고 기존 프레임 시계·추적 초기화·빈 인상착의 조건·영상 크기 처리를 보존했다. |
| DEM 읽기 전용 연결 | `data/spatial/campus-04e1b46514574d45/terrain`을 SIM vision의 `/dem:ro`로 연결했다. 실제 컨테이너 Mount의 `RW=false`를 확인했다. |
| 설정 | `VISION_DEM_DIR=/dem`, `VISION_MIN_AGL_M=10`. 좌표 계산·보고·좌표 기반 후보 묶기는 `VISION_GEO_CLAIMS=0`, `VISION_GEO_GROUPING=0`, `VISION_GEO_AGL_FLAT=0`으로 잠갔다. |
| 비전 재시작 | Compose의 SIM vision만 재생성했다. 새 상태 파일에서 `dem_loaded=true`, `min_agl_m=10`, `backend=tensorrt`, `model_loaded=true`, `flight_enabled=false`, `error=null`을 확인했다. |

REAL 소스·설정은 변경하지 않았고 DEM을 REAL에 연결하지 않았다. SIM vision 외 기존 컨테이너의 ID·시작 시각을 배포 전후와 시험 후에 대조했다. Jupyter 학습 코드·모델·패키지는 수정하지 않았다. 파일과 서비스가 분리되어도 학교 호스트의 GPU·CPU·RAM·디스크 자원은 공유된다.

타일은 Terrarium PNG 74장이며 요청서의 묶음 해시 `de40dcdac226fa8addcf89a2de7c0ad38831d96828bba21d31d8ddb6b4664d05`와 일치했다. SIM 세계 버전은 `990bee4527600963`이다. 원본 DEM은 90m 격자이고 10m 재표본이며 수직 기준은 `UNVERIFIED_SOURCE_DEM`이다. **이 자료는 SIM 전용이다. 실제 비행 지형으로 사용하지 않는다.** 요청서에 적힌 실기체용 NGII 5m·1m 자료의 별도 확보 및 수직 기준 검증은 이번 작업에서 수행하지 않았다.

## 코드와 회귀 확인

적용 파일 SHA-256:

```text
pose.py   93069ec09fef8854fa4790ea11049f16b842bcfa575ca0407b177c4309e319c3
ingest.py 22e6e1d3c6ab267a68356fc89b8c0e4ad2cccc22468e02839288f18b9c48da52
```

원본 DEM 기능 외에는 타일이 지원하지 않는 극지 위도를 결측 지형으로 처리하는 방어와 지리 좌표 계산 비활성 분기를 보강했다. DEM 기반 높이 계산은 좌표 주장과 별도로 동작한다. 높이 10m 미만은 탐지는 수행하되 후보·관측을 만들지 않는다. DEM 또는 pose가 없거나 타일 범위 밖이면 후보를 일괄 제거하지 않고 `agl_unknown_frames`를 올린다.

실제 배포 이미지의 별도 CPU 검사 컨테이너에서 실제 타일을 읽어 다음 5개 그룹이 통과했다. 이 검사는 가짜 탐지기를 사용하며 모델 정확도 시험이 아니다. GPU와 업무 DB를 사용하지 않았다.

1. 0m·9.99m 후보 제외, 10m·15m 후보 유지, 좌표 계산 함수 호출 차단.
2. pose 결측·타일 범위 밖 후보 유지와 unknown 계수, 극지 위도 결측 처리.
3. SIM 원본 시각 사용, 명시적 빈 인상착의 조건, 프레임 공백 시 추적 초기화 보존.
4. 저고도 결과의 SKIPPED 사유와 빈 관측.
5. DEM 미연결 MSL 입력의 후보 유지.

검사 소스는 `drone-services/tests/vision_dem.py`, 서버 실행본은 `workspace/vision-dem-20261017-codex/test_dem.py`에 있다. 배포 전후 컨테이너·REAL 파일 보존과 실제 읽기 전용 마운트는 별도로 확인했다. BAZE quick 검토와 Sonnet의 저고도 제외 조건 한정 검토는 완료됐고 잘린 응답은 없었다. 최종 판정은 직접 실행한 검사와 저장 증거를 기준으로 한다.

## Kumoh ROUTE 한 번의 결과

| 항목 | 결과 |
|---|---|
| 실행 ID | `5286f6a8-7f9d-40c4-a0ea-830532d1d02c` |
| SIM 임무 | `52796cb5-9608-4ba0-a570-a923c38b9d01` |
| 조건 | SimpleFlight, Kumoh, 상대고도 15m, 4m 사각 경로와 복귀, 1m/s, JPEG 2fps 요청 |
| 가상 비행 | `route_reached=true`, `landed_disarmed=true`, 비행 결과 PASS, 약 108.55초 |
| 착륙 | 새 지면 접촉·정지·Landed 확인. 이번 실행에서 보완 하강은 0회. 단회 성공이며 과거 두 실패의 모든 조건 해결을 보장하지 않음. |
| 촬영과 업로드 | 137장 촬영, 107장 저장·분석, 30장 로컬 미전송. 큐 상한 30장에 도달해 촬영 기회 87회 생략. |
| 수신된 저고도 구간 | 25프레임, 관측 0건. 실제 탐지 3건을 후보 생성 전에 제외. |
| 수신된 순항 구간 | 82프레임, 관측 12건, 전체 후보 9개. 모든 오탐이 사라졌다고 해석하지 않음. |
| 지형 결측 | 수신·분석된 107장에서는 `agl_unknown_frames=0` |
| 시각 오차 | 이미지와 기체 상태 시각 차이 최소 165.00ms·중앙 183.00ms·최대 213.00ms. 미수정이며 좌표 기능 비활성 유지. |
| 최종 서버 상태 | FAILED. 영상 미전송 때문에 완료로 표시하지 않았다. 실패·종료 보고를 같은 저널로 재전송해 서버에 반영했다. |

서버의 응답은 `503 STORAGE_QUOTA_EXCEEDED`다. SIM 미디어 예약량은 1,072,883,016바이트이고 설정된 한도는 1,073,741,824바이트(1GiB)다. 물리 디스크 전체가 가득 찼다는 뜻은 아니다. 기존 자료 삭제나 저장 한도 변경은 수행하지 않았다.

저고도 후보 제외는 수신된 프레임에서 확인했다. 미전송 30장에는 착륙 구간 영상이 포함되어 전체 착륙 영상의 서버 검증은 미완료다. 큐와 파일을 보존했으며 실패 실행을 성공으로 바꾸지 않았다. 시험용 연결기를 종료하고 접지 확인 후 이번에 시작한 Unreal을 정상 종료했다.

미전송 폴더는 NET_SITL의 `runtime/server-simulation/identities/<worker 인증서 해시>/5286f6a8-7f9d-40c4-a0ea-830532d1d02c/frames`다. 저장 정책을 정한 뒤 기존 식별자로 재전송하고, 이전 비행은 재실행하지 않는다.

## 함께 전달할 통합 항목

| 항목 | 현재 상태와 다음 작업 |
|---|---|
| frame-pose 형식 버전 | 로컬 `scripts/simulation_vision.py`가 `schema_version: frame-pose/1.0`을 명시하도록 반영했다. 기존 연결기 6개 오프라인 검사 그룹과 착륙 보호 검사 통과. 이번 수신 107장에서도 형식 버전을 확인했다. 기존 노트북 소스 ZIP은 이 변경 전이므로 최신 파일 전달 시 구분한다. |
| 사진과 위치의 시각 | 미수정. 이미지 응답의 카메라 위치·자세와 나중에 읽은 기체 GPS·자세를 섞는 경로다. 메모 제안처럼 이미지 기준 geographic을 만들 경우 출처·근거 시각 계약을 먼저 추가해야 한다. 현재 백엔드는 sync_error_ms를 이미지와 body_timestamp_ns 차이로 검증하므로 값을 0으로 덮어 계약을 우회하지 않는다. |
| Kumoh 착륙과 복구 | 기존 보완·보호를 유지했으며 이번 ROUTE는 접지·무장 해제 성공. 반복 실패 재현 조건의 추가 인수는 남아 있다. |
| 사람 생성 플러그인 | 이번 DEM 배포에서 수정·빌드하지 않았다. 새 사람 자산의 생성·표시·기준 박스 검증은 별도 통합 작업이다. |

불확실한 착륙이면 `RECOVERY_REQUIRED`를 유지한다. 이전 제어기 종료와 실제 가상 기체 접지·무장 해제를 확인하고, 미전송 결과와 서버 소유 session을 대조한 뒤 같은 신원으로 다음 절차를 사용한다.

```powershell
.\.venv\Scripts\python.exe scripts\server_simulation_bridge.py `
  --identity runtime\server-identities\sim-worker-01 --execute `
  --ack-recovery <중단된-run-UUID>
```

이 명령은 이전 실행을 실패 종료하고 재실행하지 않는 복구 절차다. 접지 확인이나 실제 FC 안전성을 대신하지 않는다. 이번 실행은 접지·무장 해제가 확인되어 `requires_recovery=false`이며, 위 명령으로 강제 복구하지 않았다.

## 근거와 롤백

- 로컬 검증: `output/vision-dem-20261017/verification-bundle.json`, `deployment.json`, `route-verification.json`, `flight-result.json`, `frame-metrics.json`, `pending-upload.json`, `unit-checks.json`.
- 서버 검증: `/home/se/sandboxes/drone-dev/evidence/vision-dem-20261017/`.
- 변경 전 백업: `/home/se/sandboxes/drone-dev/backups/vision-dem-20261017T074420Z/`의 두 코드 파일과 `compose.vision.json`.
- 롤백은 세 파일을 함께 복원한 뒤 기존 세 Compose 파일로 SIM vision만 `up -d --no-deps --force-recreate vision`한다. DB·모델·runtime 저널은 복원 또는 삭제하지 않는다.

서버 접속 비밀번호는 배포 스크립트·검증 JSON·이 문서에 저장하지 않았다.
