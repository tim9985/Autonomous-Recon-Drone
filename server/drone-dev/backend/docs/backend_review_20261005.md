# 백엔드 전체 코드 검토 — 2026-10-05

## 판단

**제어 명령의 권한 회수와 제어권 세대 처리를 먼저 보완해야 한다.** 기본 SIM 흐름과 서비스 격리는 구현되어 있지만, 현재 검증만으로 상태 변경·재접속·작업 실패·용량 소진까지 안전하다고 판단할 수 없다. 아래는 수정 우선순위 12개다. P1은 다음 기능 확장 전 우선 수정, P2는 해당 연동·반복 운용 전에 수정할 항목이다. 실제 비행은 계속 비활성 상태이며 이 검토에서 비행을 실행하지 않았다.

이번 작업은 검토다. 서비스 코드·DB·배포 설정을 수정하지 않았고, 검토 문서와 재현 자료만 작성했다. 함수 재현은 실제 소스를 추출하되 DB와 인증/전송 경계는 대역으로 구성했다. **실제 HTTP·PostgreSQL 전체 통합 재시험이나 부하 시험 결과는 아니다.**

## 우선 수정 사항

### R01 · P1 · 제어권을 반납했다가 다시 얻으면 이전 명령이 되살아남

- 위치: [device_api.py:108](D:/Capstone1/Backend/drone_backend/device_api.py:108), [명령 봉투 구성:77](D:/Capstone1/Backend/drone_backend/device_api.py:77), [backend_control SQL:99](D:/Capstone1/Sever/drone-services/db/migrations/005_backend_business_api.sql:99)
- 조건: 세션 S에서 명령을 요청하고, 아직 장치가 수신하지 않은 상태에서 제어권 반납 → 같은 세션으로 재획득. 명령 TTL과 실행 기한은 남아 있다.
- 문제: 제어권 개정은 증가하지만 명령에는 발행 당시 제어권 개정이 저장되지 않는다. pending은 세션 ID만 비교하므로 이전 명령이 다시 반환된다. SQL도 반납 시 대기 명령을 무효화하거나 control_epoch를 올리지 않는다.
- 확인: 실제 control/pending 함수 분리 재현에서 개정 `7 → 8 → 9`, 대기 명령 수 `1 → 0 → 1`을 확인했다. SQL 동작을 함께 대조했다.
- 수정 방향: 명령을 발행 당시 제어권 개정과 결합하고 전달 시 일치를 검사하거나, 제어권 반납/세대 변경 때 미전달 명령을 명시적으로 종료한다. 단순 세션 비교로 대체하지 않는다.

### R02 · P1 · 사용자 제어 권한을 회수해도 이미 대기 중인 명령은 전달됨

- 위치: [device_api.py:108](D:/Capstone1/Backend/drone_backend/device_api.py:108)
- 조건: 명령 발행 뒤 사용자의 permissions에서 해당 드론의 control 권한을 제거한다. 계정은 ACTIVE이고 세션과 제어권 보유 상태는 아직 남아 있다.
- 문제: pending은 계정 상태·세션 만료·소유 세션만 검사하고 현재 permissions를 확인하지 않는다. 새 명령 발행은 거절되더라도 기존 대기 명령은 전달될 수 있다.
- 확인: permissions를 빈 배열로 바꾼 함수 분리 재현에서도 기존 명령 1개가 반환됐다. 현재 SQL의 control 함수에는 권한 변경 시 자동 취소하는 처리도 없다.
- 수정 방향: 전달 단계에서도 현재 대상별 control 권한을 다시 확인한다. 권한 회수 절차에서 제어권·대기 명령도 함께 무효화한다.

### R03 · P2 · RC 인수·제어권 변경 사건이 임무 WebSocket에서 누락됨

- 위치: [main.py:124](D:/Capstone1/Backend/drone_backend/main.py:124), [device_api.py:148](D:/Capstone1/Backend/drone_backend/device_api.py:148), [replay 필터:205](D:/Capstone1/Backend/drone_backend/main.py:205)
- 조건: 임무 snapshot을 받은 관제가 `/api/v1/ws`에서 그 임무를 구독하는 동안 제어권이 바뀌거나 RC_TAKEOVER가 보고된다.
- 문제: CONTROL_ACQUIRED/RELEASED, DEVICE_CONNECTED, SAFETY_REPORTED는 mission_id 없이 기록된다. REST replay와 WSS는 `mission_id = 구독 임무`만 조회한다. 초기 snapshot에 있던 드론/제어 상태가 달라져도 이를 알리는 사건이 구독에 전달되지 않는다.
- 확인: 제어권 반납·재획득·RC 인수 사건 3개를 기록한 함수 재현에서 해당 임무 replay는 0개였다. 드론의 rc_taken은 실제 함수 안에서 true로 변경됐다.
- 수정 방향: 권한 있는 드론 단위 사건을 임무 구독에 포함하거나 별도 드론 구독을 제공한다. snapshot cursor 경계와 사용자 권한 검사는 유지한다.

### R04 · P2 · 실패 보고한 분석 attempt가 다시 완료 처리될 수 있음

- 위치: [analysis.py:66](D:/Capstone1/Backend/drone_backend/analysis.py:66), [completion:132](D:/Capstone1/Backend/drone_backend/analysis.py:132), [attempt-failures:161](D:/Capstone1/Backend/drone_backend/analysis.py:161)
- 조건: worker가 attempt-failures를 보고한 뒤, 다음 attempt가 발급되기 전 같은 claim_id/attempt_no로 completion을 보낸다. claim 시간은 아직 유효하다.
- 문제: claim 재발급 경로는 실패 이력을 보고 즉시 재할당할 수 있는데, completion의 check_claim은 실패 이력을 조회하지 않는다. 같은 attempt를 한 경로에서는 종료된 것으로, 다른 경로에서는 유효한 것으로 취급한다.
- 확인: check_claim 및 complete 함수 분리 재현에서 실패 이력을 검사하지 않고 ANALYSIS_COMPLETED 기록 경로에 도달했다. 기존 SQL event_guard도 attempt-failure를 해당 attempt의 완료 거부 조건으로 확인하지 않는다. DB 실제 삽입 시험은 수행하지 않았다.
- 수정 방향: 실패한 attempt의 claim은 완료 제출에 사용할 수 없도록 공통 유효성 검사를 추가한다. 실패 요청 재전송의 멱등 응답은 별도로 유지한다.

### R05 · P2 · 로그인 시도 제한이 비밀번호 검증 비용을 제한하지 않음

- 위치: [main.py:65](D:/Capstone1/Backend/drone_backend/main.py:65), [gateway.py:23](D:/Capstone1/Sever/drone-services/app/gateway.py:23)
- 조건: 실패 한도를 넘긴 뒤 같은 계정으로 계속 로그인 요청한다.
- 문제: 요청마다 DB 조회 및 100만 회 PBKDF2 검증을 한 뒤 실패 응답만 429로 바꾼다. 시도 처리량과 계산 비용을 제한하지 않는다. business 로그인 실패 사전은 서로 다른 login_id에 대해 전역 크기 제한/빈 키 정리도 없다.
- 확인: 실패 한도 이후 3회 요청에서도 비밀번호 검사 함수가 3회 호출됐다. PBKDF 자체를 반복 실행하는 공격성 부하 시험은 하지 않았다.
- 수정 방향: 계산 전 신뢰할 수 있는 연결별 요청 예산·동시성 제한 등으로 비용을 제한한다. **실패 누적만으로 정상 운영자를 계정 단위로 잠그는 방식은 기존 요구와 충돌하므로 BAZE의 단순 사전 차단 조언을 그대로 적용하지 않는다.**

### R06 · P2 · 비동기 요청 처리 중 동기 계산·DB 접근으로 다른 연결을 지연시킴

- 위치: [gateway.py:43](D:/Capstone1/Sever/drone-services/app/gateway.py:43), [main.py:281](D:/Capstone1/Backend/drone_backend/main.py:281)
- 조건: 상태 조회의 Basic 인증 요청이 반복되거나, 여러 WSS 구독 중 DB 응답이 느려진다.
- 문제: async gateway 함수가 operator의 PBKDF2를 직접 호출한다. backend WSS도 매 주기 동기 psycopg 연결·쿼리를 이벤트 루프에서 수행한다. 하나의 계산/DB 대기가 같은 프로세스의 다른 API·WSS 전달을 막을 수 있다.
- 확인: 호출 경로와 sync/async 경계를 코드로 대조했다. 실제 지연 시간·부하 한계는 측정하지 않았다.
- 수정 방향: 인증 계산과 WSS의 전체 DB 조회 단위를 threadpool로 넘기거나 async 접근으로 바꾼다. 동시성 24개 제한만으로 이 blocking이 없어지지는 않는다.

### R07 · P2 · 전달한 OpenAPI의 응답·오류·인증 계약이 불완전함

- 위치: [openapi.json](D:/Capstone1/Backend/BE_docs/openapi.json), [main.py:21](D:/Capstone1/Backend/drone_backend/main.py:21), [실제 오류 응답:25](D:/Capstone1/Backend/drone_backend/main.py:25)
- 문제: 46개 경로·50개 HTTP 작업의 성공 응답 schema가 모두 `{}`다. securitySchemes도 없다. 422는 기본 HTTPValidationError로 문서화되어 있으나 실제 앱은 `{error: {code, fields}}`를 반환한다. 파일 다운로드도 JSON 성공 응답처럼 문서화된다.
- 영향: 프론트 담당자는 요청 필드는 알 수 있지만 응답 타입·오류 처리·쿠키/CSRF 조건을 명세만으로 구현할 수 없다. 생성된 클라이언트의 성공 응답 타입도 실질적인 정보를 제공하지 못한다.
- 확인: 배포에서 추출한 OpenAPI JSON을 파싱해 50/50 빈 성공 schema와 기본 422 참조를 확인했고 실제 예외 처리기와 대조했다.
- 수정 방향: 주요 응답 DTO와 공통 오류 schema, cookie 및 서비스별 인증 조건, 파일 응답 media type을 정의하고 OpenAPI를 재생성한다. 요청 schema만 있어도 참고 자료는 되지만 완전한 입출력 계약이라고 소개하면 안 된다.

### R08 · P2 · 임시 DB 검증 스크립트가 운영 코드·설정도 바꿈

- 위치: [verify_server.py:8](D:/Capstone1/Backend/tools/verify_server.py:8), [고정 DB 처리:17](D:/Capstone1/Backend/tools/verify_server.py:17)
- 조건: 새 staging 코드/compose를 두고 검증 스크립트를 실행한다.
- 문제: 시험 전에 운영 bind mount의 코드·migration·compose를 덮어쓰고 운영 backend에 compose up을 실행한다. 시험 실패 후 원상복구도 없다. 따라서 임시 DB에 대한 검증이어도 운영 실행 파일은 격리되지 않는다. 고정 `backend_verify_20261005`가 있으면 이번 실행의 소유 여부를 확인하지 않고 삭제하므로 검증끼리 충돌할 수도 있다.
- 확인: 소스와 compose의 실제 mount 경로를 대조했다. 파괴적 검증 스크립트를 이번 리뷰에서 실행하지 않았다. README가 고정 시험 DB 재생성을 알리고 있으므로 이를 운영 DB 무단 삭제로 표현하지 않는다.
- 수정 방향: 별도 staging mount의 일회성 컨테이너와 실행별 고유 임시 DB로 검증하고, 성공한 산출물만 배포한다. 생성한 자원만 정리하고 실패 시 운영 코드에 영향을 주지 않도록 한다.

### R09 · P2 · 분석 작업 101번째부터 미할당인데도 job 없음으로 응답 가능

- 위치: [analysis.py:78](D:/Capstone1/Backend/drone_backend/analysis.py:78)
- 조건: 앞선 미종료 작업 100개가 모두 유효한 claim을 가진 채 101번째 미할당 작업이 기다린다.
- 문제: SQL에서 미종료 작업을 100개로 자른 뒤 Python에서 유효 claim을 걸러낸다. 미할당 작업이 뒤에 있어도 `{job: null}`이 반환된다.
- 확인: 함수 분리 재현에서 활성 claim 100개 + 대기 작업 1개에 job 없음 응답을 확인했다.
- 수정 방향: claim 가능 조건을 SQL에서 적용한 뒤 제한하거나 다음 페이지를 탐색한다.

### R10 · P2 · 후보의 실제 증거 개수가 1,000에서 멈춤

- 위치: [analysis.py:108](D:/Capstone1/Backend/drone_backend/analysis.py:108)
- 조건: 한 후보에 선택된 관측이 1,001개 이상 쌓인다.
- 문제: LIMIT 1000으로 가져온 목록 길이를 evidence_count로 저장해 실제 개수가 잘못 집계된다.
- 확인: 실제 요약 함수에 선택 증거 1,001개를 제공하는 대역 조회를 적용했을 때 저장 요청의 evidence_count는 1,000이었다.
- 수정 방향: 전체 COUNT와 최신 관측 조회를 분리한다. 전체 개수 필드를 조회 샘플 개수로 대신하지 않는다.

### R11 · P2 · 포기한 업로드 예약이 저장 한도를 계속 차지함

- 위치: [media.py:28](D:/Capstone1/Backend/drone_backend/media.py:28)
- 조건: bundle 예약 후 업로드를 포기하거나 장치가 새 ID로 다시 예약하는 일이 누적된다.
- 문제: WRITING 예약도 총용량에 포함하지만 취소·만료·회수 경로가 없다. PROTECTED 예약 메타데이터만으로 1 GiB 개발 한도를 채울 수 있고 실제 파일이 없어도 새 업로드가 차단된다.
- 확인: media 전체 경로와 제공된 서비스 scripts에서 예약 회수 경로를 찾지 못했다. 학교 서버에 실제 한도 소진 요청을 보내지는 않았다. 별도 수동 운영 정리가 있다면 완화되지만 코드에 포함된 복구 절차는 아니다.
- 수정 방향: 미완료 예약의 취소/만료와 용량 회수를 제공하고 진행 중 업로드와 충돌하지 않게 처리한다.

### R12 · P2 · 같은 자산 동시 업로드의 임시 파일이 quota를 초과할 수 있음

- 위치: [media.py:67](D:/Capstone1/Backend/drone_backend/media.py:67), [임시 파일 생성:78](D:/Capstone1/Backend/drone_backend/media.py:78)
- 조건: 최종 파일이 아직 없는 동일 자산에 여러 PUT을 동시에 보낸다.
- 문제: 각 요청은 다른 UUID의 .part 파일을 만들지만 DB quota는 자산 크기 한 번만 계산한다. 예를 들어 같은 64 MiB 자산에 동시 요청 20개가 진행되면 임시 파일만 1.25 GiB까지 커질 수 있다. 요청별 크기 제한은 총 임시 용량을 제한하지 않는다.
- 확인: 파일명 생성·예약 합계·동시성 설정을 코드로 대조했다. 실제 디스크 채우기/ENOSPC 시험은 하지 않았다. 최종 파일의 배타적 확정과 해시 재검사는 별도로 올바르게 수행하고 있다.
- 수정 방향: 자산별 업로드 배타권과 전체 진행 중 업로드 용량 예산을 둔다. 종료된 프로세스의 임시 파일 회수도 같은 절차에 포함한다.

## BAZE 결과를 그대로 채택하지 않은 항목

- Luna의 “잘못된 GeoJSON은 500” 주장은 그대로 채택하지 않았다. main.py에 psycopg 예외 처리기가 있으며 SQLSTATE에 따라 409/422/503으로 변환한다. 입력 오류의 실제 분류 적절성은 PostGIS 실제 요청으로 추가 확인해야 한다.
- Sonnet 실패를 완료로 처리하지 않았다. 첫 병렬 호출에서 review 2개가 finish_reason=length로 텍스트 없이 실패했고, 출력 한도를 늘린 동일 모델 재시도도 실패했다. 같은 단가로 조회된 기본 analysis 모델로 전환했다.
- Sol의 신규 디렉터리 부모 fsync 지적은 별도 내구성 확인 후보로 남겼다. 파일/직접 부모 디렉터리 fsync는 있으나, 새 디렉터리 연결의 장애 후 유지 여부는 지원 파일시스템과 전원 장애 시험 없이 확정하지 않았다.
- 프론트 화면, 실제 모델 추론 worker, REAL 기체/좌표/자동 계획, 공개 WAN 미구현은 이미 합의된 후속 범위이므로 이번 코드 결함 수에 넣지 않았다.

## 검토 방식·증거·한계

1. BAZE `delegate_parallel`에 인증/명령, AI/미디어/DB, API/배포 세 분야를 배정했다. 필요한 소스만 전달했고 비밀 파일·실제 자격증명·대화 전체는 전달하지 않았다.
2. 최종 성공 결과: gpt-6.1-sol 2개 + gpt-6-luna 1개, 모두 `finish_reason=stop`, `truncated=false`. 실패 4개는 별도 기록했다. 성공 응답의 보고 토큰 합은 55,330이며 실패 요청의 사용량/과금은 반환되지 않아 전체 비용을 확정할 수 없다.
3. Codex가 관련 함수, migration 003~005의 조건, 게이트웨이·compose·설계·OpenAPI를 대조하고 소스 함수 분리 재현을 수행했다. 과거 32/11/26/41 통과 기록은 검토 배경으로만 사용했고 이번에 전체 통합 시험을 반복하지 않았다.
4. 서버에는 읽기 전용으로 접속해 기존 release 증거에 포함된 17개 파일이 같은 hash임을 확인했다. 전체 호스트 설정/모든 서비스 파일의 최신 상태를 새로 감사한 것은 아니다.

| 증거 | 경로 |
|---|---|
| 최초 병렬 응답·부분 실패 | [baze-attempt-1.json](D:/Capstone1/Backend/evidence/review-20261005/baze-attempt-1.json) |
| 동일 모델 재시도 실패 | [baze-attempt-2.json](D:/Capstone1/Backend/evidence/review-20261005/baze-attempt-2.json) |
| Sol 병렬 검토 성공 | [baze-attempt-3.json](D:/Capstone1/Backend/evidence/review-20261005/baze-attempt-3.json) |
| 함수 분리 재현 스크립트 | [reproduce_review_findings.py](D:/Capstone1/Backend/evidence/review-20261005/reproduce_review_findings.py) |
| 함수 분리 재현 결과 | [local-reproduction.json](D:/Capstone1/Backend/evidence/review-20261005/local-reproduction.json) |

재현 스크립트의 assert는 “현재 결함이 관찰되는가”를 확인하는 감사용이다. 수정 후에는 기대값을 안전한 동작으로 바꾼 회귀 시험이 필요하다. API·DB 통합, 세션/제어권 동시 변경, 파일 장애/복구, 실제 worker 재시도는 다음 수정 검증에 포함한다.

## 권장 수정 순서

1. R01/R02: 대기 명령의 권한 및 제어권 세대 검사.
2. R03/R04: 관제 안전 사건 전달 및 실패한 분석 claim 종료.
3. R07: 프론트 인계용 응답/오류/인증 명세.
4. R05/R06/R08: 요청 처리 비용과 검증·배포 분리.
5. R09~R12: 작업/집계 상한 및 저장 공간 회수·동시 업로드.
