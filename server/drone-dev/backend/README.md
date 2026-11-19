# 드론 업무 백엔드

학교 Ubuntu 24.04 서버에 배포하는 FastAPI 업무 백엔드다. 프론트엔드와 비전 학습 코드는 이 프로젝트에서 변경하지 않는다.

- 로컬 코드: `D:\Capstone1\Backend\drone_backend`
- 서버 코드: `/home/se/sandboxes/drone-services-20261005/backend/drone_backend`
- DB: `drone_dev.drone`, PostgreSQL 16 / PostGIS, 업무 18개 테이블·298개 컬럼
- 개발 연결: 기존 SSH 터널 → `https://localhost:18443/api/v1`
- 상태: **SIM 업무 API 구현. 실제 기체 비행·모델 추론·외부 공개 연결은 비활성.**

## 구현 범위

| 범위 | 구현 |
|---|---|
| 인증·권한 | 서버 세션, HttpOnly/Secure 쿠키, Origin·CSRF 검사, 사용자별 드론 인가, 서비스 토큰과 mTLS 인증서 결합 |
| 임무·제어 | SIM 임무 생성/조회, 초안 개정/승인, 제어권 획득/반납, 충돌 검출 |
| 기체 연동 계약 | SIM 장치 세션·lease·세대, telemetry 저장/재전송 중복 처리, 명령 요청/조회/보고, RC/영상/WAN 장애 보고 |
| 파일 보관 | 파일 예약, 바이트·SHA-256 검증, 경로 제한, 원자적 파일 확정, 묶음 PERSISTED 확인, 권한별 다운로드 |
| 분석 연동 계약 | 프레임 등록, 분석 작업 등록/claim, 입력 전달, 결과·실패 처리, 0건 결과 완료, 재분석 역순 완료 처리 |
| 관제용 데이터 | 후보 조회/판정/재관측 요청, 알림 확인, snapshot·사건 replay·WebSocket 구독 |
| 공간 데이터 | SIM 수동 구역/계획/셀 등록·조회, PostGIS 영역 검증 |

`start/resume`은 503으로 차단한다. SIM 명령의 202 응답은 요청 저장이며 비행 성공을 뜻하지 않는다. FC ACK만으로 COMPLETED 처리하지 않는다. 승인된 SIM 설정의 MODEL 레코드는 시험용 메타데이터이며 모델 파일이나 실제 추론 성공을 의미하지 않는다.

실제 카메라/자세 검증, 영상 코덱·sidecar 의미 검증, 좌표 변환, 자동 경로 생성, 관측 커버리지·belief 계산, 학습 모델을 실행하는 worker, 실제 Pi/FC 연결은 후속 통합 범위다. 검증되지 않은 belief는 API에서 `null`로 반환한다.

## 파일

```text
Backend/
├─ drone_backend/
│  ├─ deployment.py    # 기존 격리 서버 앱에 업무 라우터 연결
│  ├─ main.py          # 사용자·임무·관제 사건 API
│  ├─ core.py          # DB 트랜잭션·인증·인가·사건·저장 경로
│  ├─ contracts.py     # 요청 계약 및 입력 검증
│  ├─ responses.py     # 실제 DB 필드에 맞춘 공개 응답 계약
│  ├─ openapi.py       # 쿠키·서비스 인증·바이너리·오류 계약
│  ├─ device_api.py    # SIM 장치·명령·안전 보고
│  ├─ media.py         # 파일 보관 계약
│  ├─ analysis.py      # 분석 작업·결과 계약
│  └─ planning.py      # SIM 공간 데이터
├─ tests/
│  ├─ acceptance.py    # 임시 실제 PostgreSQL에서 업무 검증
│  ├─ regressions.py   # 검토 항목 재현·회귀 검증
│  └─ live.py          # 실제 HTTPS/WSS 게이트웨이 검증
├─ tools/             # 학교 서버 관리자용 검증·배포 도구
├─ BE_docs/           # 설계·연동·배포 명세, OpenAPI
├─ evidence/          # 비밀값을 포함하지 않는 검증 결과
└─ pyproject.toml     # 학교 서버에서 확인한 의존성 버전
```

학교 서버의 compose·게이트웨이·migration은 `D:\Capstone1\Sever\drone-services`에 있다. 적용한 `005_backend_business_api.sql`은 기존 스키마를 바꾸지 않고 고정 업무 함수와 최소 EXECUTE 권한을 추가한다. 배포된 migration 수정 대신 다음 migration을 작성한다.

## 실행·검증

학교 서버에서 관리자가 실행한다. 비밀값은 기존 서비스별 `/run/identity` 마운트에서 읽으며 코드에 넣지 않는다.

```bash
cd /home/se/sandboxes/drone-services-20261005
./scripts/stack.sh ps
./scripts/stack.sh --profile verify run --rm verifier
./scripts/stack.sh --profile verify run --rm \
  -v "$PWD/backend/tests:/workspace/backend_tests:ro" \
  verifier python -m backend_tests.live
sudo python3 db/verify.py
sudo python3 scripts/audit.py
```

업무 검증은 `backend_verify_*` 임시 DB 전용이다. `tools/verify_server.py <서버 내 후보 디렉터리>`는 매 실행마다 고유 DB·별도 저장소·일회성 컨테이너를 만들고 정상 흐름과 회귀 검증을 실행한 뒤 정리한다. 운영 코드·설정·자격증명은 덮어쓰지 않는다. `tools/deploy_backend.py <동일 후보 디렉터리>`는 검증한 코드 지문이 일치해야 설치하며, 기존 migration 변경을 거부하고 DB·전체 백엔드 소스·게이트웨이를 백업한다. 설치 후 검증이 실패하면 코드와 게이트웨이를 복구하며 적용한 DB migration은 유지한다.

미완료 미디어 예약은 1시간 후 주기 작업(60초 간격)과 다음 미디어 변경 작업에서 정리한다. 장치 또는 관제에서 `POST /device/v1/media-bundles/{bid}/cancel`, `POST /api/v1/media-bundles/{bid}/cancel`로 취소할 수 있다. 취소 상태를 먼저 DB에 기록하며 미완료 파일의 삭제·동기화가 끝날 때까지 용량을 계산한다. 중단된 정리는 다음 주기에 재개하며 저장된 파일은 보존한다. 저장소별 미디어 변경은 동시에 하나만 허용하며 경합 시 `409 MEDIA_BUSY`, 업로드가 120초를 넘으면 `408 UPLOAD_TIMEOUT`을 반환한다.

늦게 도착한 명령의 관측 증거는 `POST /device/v1/commands/{cid}/evidence`로 보관할 수 있다. 이 API는 `reconciled=false`를 반환하고 명령 상태나 실행 권한을 바꾸지 않는다. 이미 실행 중인 명령의 terminal 보고와 동일 보고 재시도는 원래 장치 세션·세대·해시에 결합해 보존한다. 새로운 ACCEPTED/EXECUTING 전이는 현재 세션·제어권·권한을 재검사한다.

검증 결과와 한계는 [구축 결과](BE_docs/backend_implementation_20261005.md), 프론트 연결은 [API 연동 안내](BE_docs/frontend_api_integration_v1.0.md)를 따른다. 코드·패키지·저장소는 학습 폴더와 분리되어 있으나 GPU/CPU/RAM은 호스트 자원을 공유한다.
