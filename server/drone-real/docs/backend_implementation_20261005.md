# 백엔드 구축 결과 — 2026-10-05

갱신: 2026-10-06, 업무 백엔드 v0.1.1. 현재 검증은 정상·회귀 79개, 실제 HTTPS/WSS 11개, 기존 서비스 26개, DB 부정 입력 41개 및 격리 점검을 통과했다. 아래 초기 구축 기록에 추가해 제어 세대·권한 회수, 실패 claim, 미디어 취소·만료·장애 복구, 비동기 처리와 응답 계약을 보완했다. 최신 요청·응답은 [OpenAPI](openapi.json)의 53개 작업·61개 schema 및 [연동 안내](frontend_api_integration_v1.0.md)를 따른다.

적용 전 백업: `/home/se/sandboxes/drone-dev/backups/backend-fix-20261006T005534Z/`. DB custom dump, 전체 기존 업무 코드, 게이트웨이와 설정, 검증한 후보 코드 스냅샷을 보존한다. 배포 후 검사 실패 시 코드 복구 경로를 갖췄으며 이번 적용에서 복구 실행이나 dump 복원 시험을 추가로 수행하지 않았다. 새 검증 도구는 운영 파일을 설치하지 않고 고유 임시 DB·저장소·컨테이너에서 시험한 뒤 정리한다.

## 완료 범위

**학교 Ubuntu 24.04 서버에 SIM 업무 백엔드를 구현·배포했다. 프론트엔드·학습 코드는 변경하지 않았다.** 실제 모델 추론·실기체 운용까지 완성된 상태는 아니다.

- 로컬: `D:\Capstone1\Backend`
- 서버: `/home/se/sandboxes/drone-dev/backend/drone_backend`
- 파일 저장소: 동일 샌드박스의 `data/backend`, 컨테이너 `/data`
- DB: `drone_dev.drone`, 18개 업무 테이블·298개 컬럼, migration 001~006
- 접속: 기존 SSH 터널의 `https://localhost:18443`, 업무 API `/api/v1`, 사건 WSS `/api/v1/ws`

## 구현과 제한

| 영역 | 이번 구현 | 후속 통합 |
|---|---|---|
| 인증 | 기존 개발 계정을 DB 사용자로 등록, 서버 세션·쿠키·Origin/CSRF·객체 인가 | 운영용 계정 관리, MFA/SSO, 외부 공개 로그인 정책 |
| 임무·제어 | SIM 생성/조회·개정/승인·제어권, optimistic revision 검사 | REAL readiness와 시작/재개·임무 상태 전이 |
| Pi 계약 | SIM 세션/세대/lease·telemetry·명령/보고·안전 보고 | 실제 Pi 클라이언트, FC 프로토콜·영상/시간 검증 |
| 미디어 | 예약→해시/바이트 검증 업로드→원자적 파일 확정→PERSISTED, 권한별 다운로드 | 실제 영상 코덱·sidecar 의미 검증, 실시간 영상 프로파일·대규모 저장 정책 |
| AI 계약 | 분석 등록/claim/입력/결과/실패, 0건 성공·원자적 완료·역순 재분석 | 승인 모델 산출물, 추론 worker·성능 검증 |
| 후보·관제 | 조회·판정·재관측 요청·알림 확인, snapshot/replay/WSS | 프론트 UI, 실제 알림·탐지·재관측 실행 |
| 공간 | SIM 수동 구역/계획/셀 저장 및 PostGIS 검사 | 자동 경로·실측 좌표/오차·관측 커버리지/belief |

관제 웹 화면 코드는 수정하지 않았다. 서버 게이트웨이의 API/WSS 프록시만 추가했다. 기존 정적 상태 화면과 Basic 조회 API는 유지했으며 새로운 업무 API는 사용자 세션으로 인증한다. 실제 기체 세대·명령 시간을 임의의 SIM 타이머로 대체하지 않는다.

`model_loaded=false`, `flight_enabled=false`, `real_device_enabled=false`를 유지한다. `start/resume`은 503으로 차단하며 `VALID` 실제 좌표 결과도 검증 전에는 받지 않는다. 시험용 APPROVED 설정은 `environment=SIM`, `artifact_ready=false`, `real_validated=false`인 mock 메타데이터다.

## 트랜잭션·안전 처리

- 동일 UUID/요청 내용 재전송은 기존 효과를 반환한다. 동일 ID의 변경 내용과 오래된 개정/세대는 거부한다.
- 분석 결과·후보 갱신·종료 사건을 같은 DB 트랜잭션에 기록한다. 더 낮은 분석 개정이 늦게 완료되어도 최신 성공 결과를 덮지 않는다. 사람이 판정한 상태는 AI 정정으로 지우지 않는다.
- 명령 요청 접수 202와 실행 완료를 분리한다. FC ACK만으로 COMPLETED 처리하지 않으며 RC 인수·단절 시 새 명령을 막고 복구 보고로 자동 재개하지 않는다.
- 파일은 서버 생성 경로에 저장하며 경로 탈출/심볼릭 링크를 거부한다. 바이트와 해시를 맞춘 후 확정하고 STORED 파일을 덮어쓰지 않는다. 묶음 구성 파일과 manifest를 검증한 후 PERSISTED를 응답한다.
- snapshot은 동일 REPEATABLE READ에서 조회한다. cursor 및 int64 계열 값은 문자열로 반환한다. WSS는 Origin·서비스/사용자 인증을 검사하고 세션 철회를 계속 반영한다.
- 개발 사건 쓰기는 공통 advisory lock으로 직렬화한다. WSS는 1초 DB 조회 방식이며 개발용 단일 worker/동시성 제한 환경이다. 대규모 운영 부하·분산 broadcast 검증은 수행하지 않았다.

## DB·샌드박스

`005_backend_business_api.sql`은 테이블/컬럼을 유지하고 고정 업무 쓰기·잠금 함수를 추가했다. 함수 소유자는 NOLOGIN `drone_schema_owner`, 고정 search_path, PUBLIC 실행 불허다. `drone_api`에는 필요한 함수 실행 권한만 부여하고 일반 DML·DDL·역할 생성은 계속 차단했다. 배포한 migration 001~005의 checksum을 확인했다.

서비스는 `network_mode: none`, 서로 다른 UID, 읽기 전용 root filesystem, capabilities 제거, 명시적 Unix 소켓·저장소 마운트를 유지한다. 서비스 통신은 mTLS 인증서 지문과 개별 토큰을 함께 검증하며 브라우저의 임의 신원 헤더를 신뢰하지 않는다. vision/Web/서버 게이트웨이에는 DB 소켓이나 백엔드 원본 저장소를 마운트하지 않는다.

기존 학습·Jupyter·기존 DB 경로와 분리했다. GPU/CPU/RAM은 호스트에서 공유된다. 기존 샌드박스 `http://127.0.0.1:18400/health/components`의 정상 응답과 비행 비활성 상태를 배포 후 검사했다. 학습 프로세스 자체의 성능/완료 여부를 확인한 것은 아니다.

## 실행한 검증

| 검증 | 결과 | 증거 |
|---|---:|---|
| 임시 실제 PostgreSQL 업무 흐름 | 32개 통과 | [acceptance.json](../evidence/acceptance.json) |
| 실제 TLS 게이트웨이·HTTPS·WSS | 11개 통과 | [live.json](../evidence/live.json) |
| 기존 서비스 인증·SIM·조회 회귀 | 26개 통과 | [integration.json](../evidence/integration.json) |
| DB 구조·권한·불변성 부정 입력 | 41개 통과, sample rollback | [database.json](../evidence/database.json) |
| 컨테이너·저장소·DB 경계·기존 환경 | 통과 | [deployment-audit.json](../evidence/deployment-audit.json) |
| 코드/프론트/migration 해시·서비스 상태 | 기록 | [release.json](../evidence/release.json) |

업무 시험은 `backend_verify_20261005` 임시 DB에서 수행했다. 인증·CSRF·객체 권한, int64 정밀도, 재전송·충돌, FC ACK/완료 구분, 파일 확정, 0건/복수 분석·역순 완료, 사람 판정 유지, RC 차단, 로그아웃을 검사했다. 이 시험에서 미디어 bytes와 AI 결과는 SIM fixture이며 실제 코덱·모델 추론 검증은 아니다.

실제 WSS 시험은 게이트웨이→백엔드의 TLS 신원 유지, 잘못된 Origin/구독 거부, 활성 연결의 세션 철회 종료까지 확인했다. DB 검증 fixture가 기존 사건과 섞이는 문제를 고정 fixture ID로 수정했고 전체 검증이 통과했다. 이 수정은 DB 검사 SQL이며 배포된 migration checksum은 바꾸지 않았다.

BAZE quick에 비밀값 없는 제한된 코드 발췌를 검토시켰고 정상 종료했다. 사건 ID 재사용 시 대상/행위자 비교와 대기 명령의 실행 deadline 검사 조언을 적용한 후 로컬/서버 검증을 수행했다. 외부 의견 자체를 시험 증거로 취급하지 않는다.

## 배포·복구·연동 인계

배포 전 DB 백업과 기존 compose/서비스 Python 파일을 서버 `backups/backend-release-*`에 보관했다. 실제 경로·크기는 release 증거에 기록한다. migration 005 이후 입력이 생긴 DB를 과거 dump로 무조건 덮어쓰면 데이터가 손실된다. 향후 변경은 forward migration으로 처리하고 복구 시험은 임시 DB에서 한다. 이번 배포 전 백업의 실제 복원 시험은 수행하지 않았다.

검증용 임시 DB는 검증 완료 후 제거한다. 시험 파일은 `data/backend/backend-acceptance` 아래 분리되어 있으며 운영 미디어로 사용하지 않는다. 실제 DB에는 개발 사용자·SIM 드론·mock 설정과 HTTPS 검증용 SIM 임무/철회 세션·사건이 남는다. SIM 데이터와 운영 데이터를 혼동하지 않는다.

프론트 담당자는 [연동 안내](frontend_api_integration_v1.0.md)와 [OpenAPI](openapi.json)를 사용한다. Pi·AI 담당자는 OpenAPI의 `/device/v1/*`, `/internal/v1/*` 계약을 사용하되 현재 서버 내부 인증 경계에서만 검증할 수 있다. 외부 HTTPS·Pi 접속망과 실제 모델/기체 준비 후 해당 미완료 범위를 별도 통합한다.
