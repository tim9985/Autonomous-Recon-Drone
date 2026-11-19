# 관제 프론트엔드 — REAL 데이터 API 연동 안내 v1.0

- 작성일: 2026-10-06
- 대상: 별도 실운용 데이터 서비스 v0.2.0. 실제 기체 비행 활성화는 후속 단계.
- API 계약: [openapi-real.json](openapi-real.json)
- 기존 [SIM API 안내](frontend_api_integration_v1.0.md)와 주소·세션 쿠키·환경이 다르다.

## 접속

학교 서버에서 외부 공개 포트를 열지 않는다. Windows에서는 [open-real-ssh.cmd](../open-real-ssh.cmd)로 SSH 터널을 열고 API의 기본 주소 `https://localhost:19443`을 사용한다. 학교 계정의 SSH 비밀번호를 입력해야 하며 파일에 저장하지 않는다. `19444`는 인증서가 필요한 기체/서비스 TLS 통로이며 브라우저용이 아니다.

현재 게이트웨이는 API와 WebSocket을 제공한다. 관제 화면 코드는 별도 담당자가 연결해야 한다. `/`에 완성된 관제 화면이 배포됐다는 의미는 아니다. 신규 REAL CA는 브라우저가 기본 신뢰하지 않으므로 제공된 공개 CA를 확인하고 개발용 신뢰 설정을 해야 한다. 공개 인터넷 PC·휴대폰 접속과 운영 인증서 구성은 미구축이다.

공개 CA 파일: [real-ca.crt](../evidence/real-ca.crt). 이 파일에 개인키는 포함하지 않았다.

프론트 개발 서버를 별도 origin에서 실행하면 HTTPS 프록시를 사용해 API와 WSS를 허용된 origin으로 연결한다. 현재 CORS를 공개하지 않았으며 쿠키·Origin·CSRF 동작을 함께 확인해야 한다. 브라우저 코드에 서비스 토큰이나 인증서 개인키를 넣지 않는다.

## 로그인·조회

`POST /api/v1/auth/login`의 JSON은 `{"login_id": "real-operator", "password": "<REDACTED>"}`이다. SSH 학교 계정 비밀번호와 관제 비밀번호는 다르다. 발급 정보는 서버의 `/home/se/sandboxes/drone-real/secrets/operator-login.json`에 보관한다. 문서·Git·브라우저 번들에 넣지 않는다.

응답의 `csrf_token`을 변경 요청의 `X-CSRF-Token`으로 전송한다. 로그인 세션은 `drone_real_session` HttpOnly/Secure/SameSite=Strict 쿠키이며 기존 SIM의 `drone_session`과 분리돼 있다. 변경 요청의 허용 Origin은 `https://localhost:19443`, `https://127.0.0.1:19443`이다. 새로고침 후 `GET /api/v1/auth/me`로 CSRF 토큰을 다시 받는다.

| 화면 기능 | API |
|---|---|
| 환경·준비 상태 | `GET /api/v1/readiness` |
| 기체 목록·상태 | `GET /api/v1/drones`, `GET /api/v1/drones/{did}` |
| REAL 임무 등록 | `POST /api/v1/missions` — mission UUID, drone_id, environment=`REAL` |
| 임무·후보 목록 | `GET /api/v1/missions`, `GET /api/v1/missions/{mid}/candidates` |
| 후보 탐지 근거 | `GET /api/v1/candidates/{cid}/observations` — confidence·bbox·프레임·모델·좌표 주장 |
| 임무 상태 이력·재관측 | `GET /api/v1/missions/{mid}/telemetry`, `GET .../{mid}/reobservations` |
| 전체 스냅샷 | `GET /api/v1/missions/{mid}/snapshot` |
| 이벤트 이력 | `GET /api/v1/missions/{mid}/events?after_cursor=0` |
| 운영자 판단 | `POST /api/v1/candidates/{cid}/judgements` — expected_row_version 필요 |
| 운영자 재관측 요청 | `POST /api/v1/candidates/{cid}/reobservations` |
| 기체에서 보고한 외부 명령 결과 | `GET /api/v1/missions/{mid}/command-observations` |
| 증거 이미지·클립 | `GET /api/v1/media-assets/{aid}/content` |
| 이벤트 실시간 연결 | `wss://localhost:19443/api/v1/ws` |

WebSocket 연결 후 `{"mission_id":"실제 UUID","after_cursor":"0"}`를 보낸다. 문자열 커서로 이벤트를 이어 읽고 연결이 끊기면 최근 커서로 재접속한다. 페이지가 없으면 heartbeat를 받는다. 세션 만료·로그아웃·Origin 오류는 연결 종료 후 다시 인증한다.

## 화면에서 구분할 상태

미확정 후보를 포함해 전체 후보를 표시한다. `tracking.auto_confirmed`는 비전 자동 판정, `judgement`는 운영자 판단이다. 모델 상태 추정은 `tracking.reported_state`이고 확정 진단으로 표시하지 않는다. `geo_status=PENDING`인 후보도 카드·목록에 유지한다.

현재 물리 검증 절차가 완료되지 않아 워커 좌표는 `tracking.geo_claim`에 보존된다. 공식 `latest_position`은 null이며 이를 검증된 지도 위치로 표시하지 않는다. 모델의 VALID 주장과 백엔드의 좌표 검증 상태를 구분한다. `tracking.media.snapshot_asset_id`와 `clip_asset_id`를 API 주소로 변환하고, 워커 상대 경로나 서버 파일 경로를 브라우저 URL로 사용하지 않는다.

DB `row_version`은 운영자 변경 충돌을 확인하는 문자열 카운터다. 409가 오면 최신 후보를 읽고 운영자에게 다시 확인하게 한다. 워커의 `worker_revision`을 row_version 대신 전송하지 않는다.

## 비행 기능의 현재 상태

REAL 임무 `start/resume`, 명령 요청, 기체 명령 폴링은 503 `REAL_FLIGHT_DISABLED`를 반환한다. 수신 데이터가 저장됐거나 모델 설정 메타데이터가 등록돼도 비행 버튼을 활성화하지 않는다. 외부 기체가 보고한 명령 결과는 원본 증거로 저장되며 서버가 명령을 승인·실행했다는 의미가 아니다.

현재 관제 연동 대상은 수신·조회·판정·이벤트 API이다. 실기체 연결, 실제 모델 로딩·추론, 좌표 검증, 경로 생성기, 비행 허가/제어, 공개 휴대폰 서비스는 별도 통합·검증 단계다.
