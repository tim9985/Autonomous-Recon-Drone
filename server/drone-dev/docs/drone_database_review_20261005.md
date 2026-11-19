# 드론 DB 설계·구현 검토 — 2026-10-05

**판정: 관계형 구조와 기본 보호는 적절하지만, 업무 쓰기와 사건 배포를 연결하기 전에 수정·보완이 필요하다.**

앞선 구축 완료는 스키마 생성, 기본 제약 시험, 백업 복원과 서비스 회귀 완료를 뜻한다. 이번 검토에서는 그 시험이 놓친 동시 처리 오류와 관계 검증 공백을 실제로 재현했다. 테이블/컬럼 수와 제약 개수가 많다는 사실만으로 업무 설계가 완성됐다고 볼 수 없다.

## 검토 방법과 적용 범위

- 기준: DB 설계 v1.1, 배포 migration 001~003, 적용·검증 스크립트, 실제 backend 호출 경로.
- 서버 `drone_dev`의 실제 스키마를 schema-only dump로 복제하여 임시 `drone_review_20261005t111611z`에서 시험했다. 단순 로컬 SQL 추측이 아니다.
- 기존 29개 거부 시험을 포함한 fixture를 임시 DB에만 저장하고, 추가 무결성·두 연결 동시성·migration 시험을 수행했다.
- 검토 후 임시 DB를 제거했다. 운영 DB migration 이력과 함수 정의 해시는 검토 전후 동일하며 업무 18개 테이블은 0행이다.
- 현재 backend는 `integration.probe`에만 쓰며, 업무 테이블 DML은 `drone_api`에 허용하지 않는다. 사건 기록/배포 함수만 실행 가능하다. 따라서 아래 잠재 무결성 문제를 현재 Web에서 악용할 수 있다고 주장하지 않는다.
- 재현 원본: [review_schema.py](../drone-services/db/review_schema.py). 결과: [review-20261005.json](../drone-services/evidence/database/review-20261005.json).

## 우선 수정할 구현 문제

### R1. [P1] 사건 배포 함수의 잠금 순서가 반대여서 교착상태 발생

위치: [003_event_and_role_rules.sql:193](../drone-services/db/migrations/003_event_and_role_rules.sql#L193)의 `mark_event_published`, 같은 파일의 `event_guard`.

`record_event`는 공통 advisory lock을 먼저 얻는다. 반면 `mark_event_published`는 UPDATE가 사건 행을 잠근 다음 BEFORE 트리거 안에서 공통 잠금을 요청한다. 두 경로의 순서가 다르다.

실제 `drone_api` 역할로 다음 순서를 재현했다.

1. 연결 A: 사건 X를 배포 완료로 갱신 → 공통 잠금 보유 → 2초 대기.
2. 연결 B: 사건 Y를 갱신 → Y 행 잠금 보유 → 공통 잠금 대기.
3. 연결 A: 같은 트랜잭션에서 Y 갱신 → B가 가진 행 잠금 대기.
4. PostgreSQL이 `40P01: deadlock detected`로 한 트랜잭션을 중단했다.

영향: 사건 배포를 묶어서 처리하거나 여러 작업자가 처리하면 갱신이 rollback된다. 중복 전송 허용 설계라도 배포 상태 갱신 실패·재시도는 발생한다. 현재 앱에는 publisher 호출 경로가 아직 없어 운영 장애가 발생한 것으로 보지는 않는다.

수정: 배포 함수를 PL/pgSQL로 바꾸고 **공통 잠금 → UPDATE** 순서를 적용한다. 업무 변경 함수들도 같은 순서로 통일해야 한다. BEFORE 행 트리거만으로 전역 잠금을 먼저 획득했다고 간주하면 안 된다. [PostgreSQL 잠금·교착상태 설명](https://www.postgresql.org/docs/16/explicit-locking.html)

### R2. [P2] 임무 NULL이 선택 관계의 무결성 검사를 우회

위치: [002_constraints_and_indexes.sql:49](../drone-services/db/migrations/002_constraints_and_indexes.sql#L49)의 프레임→계획 FK, 같은 파일 100행의 알림→사건 FK.

다음 두 입력이 `SET CONSTRAINTS ALL IMMEDIATE`까지 통과했다.

- `video_frame.mission_id=NULL`인데 `plan_id`는 특정 임무의 탐색 계획.
- `alert.mission_id=NULL`인데 `source_event_id`는 특정 임무의 분석 사건.

단일 ID FK는 참조 행의 존재만 확인한다. 복합 FK의 `MATCH SIMPLE`은 구성 컬럼 중 하나가 NULL이면 관계 검사를 생략하므로 임무 일치를 보장하지 못한다. 이 동작은 [PostgreSQL 복합 FK 규칙](https://www.postgresql.org/docs/16/ddl-constraints.html)에 따른다.

영향: 프레임·알림을 임무별로 조회할 때 계획/원사건은 존재하지만 해당 증거는 임무 목록에서 빠질 수 있다.

수정: 프레임에는 `plan_id IS NULL OR mission_id IS NOT NULL`을 추가하고 기존 복합 FK를 유지한다. 알림에는 원사건의 임무와 `IS NOT DISTINCT FROM` 기준으로 일치시키는 검증을 둔다. 공용 사건은 mission_id=NULL이 정상일 수 있으므로 알림 FK를 무조건 MATCH FULL로 변경하면 안 된다. 공용 알림이 임무 사건을 참조해도 되는 특별한 정책을 의도했다면 그 예외를 먼저 명세화해야 한다.

### R3. [P2] 새 migration을 추가해도 적용 도구가 거부

위치: [apply.py:13](../drone-services/db/apply.py#L13).

001~003이 적용된 임시 DB에 대해, 원본 파일은 그대로 두고 별도 임시 디렉터리에 `004_review_noop.sql`을 추가한 뒤 적용 도구를 실행했다. 새 SQL 내용은 `SELECT 1`뿐이었다. 결과는 다음과 같다.

```text
Existing migration history differs; use a new forward migration
```

원인: 기존 이력과 디렉터리 전체 목록이 완전히 같아야만 성공한다. 이미 적용된 파일의 변조와 정상적인 미적용 migration 추가를 구분하지 않는다. 구축 결과서에도 기록된 제한이지만, 실제 오류 수정 배포를 하려면 먼저 해결해야 한다.

수정: 기존 적용 이력이 새 목록의 올바른 앞부분인지 확인하고, 그 파일들의 checksum이 같으면 뒤의 미적용 migration만 순서대로 적용한다. 삭제·순서 변경·기존 checksum 변경은 계속 거부한다.

## 업무 연동 전에 보완할 데이터 계약

이 항목들은 현재 서비스 계정의 쓰기 권한 차단과 미구현 업무 API로 인해 아직 외부 쓰기 경로가 없다. DB에서 어떤 규칙을 강제하고 서비스가 무엇을 책임질지 확정해야 한다.

### R4. 저장 완료 자산의 정체성이 DB에서 고정되지 않음

`media_asset`을 STORED로 만든 뒤 같은 `asset_id`의 `content_hash`를 `aaaa…`에서 `bbbb…`로, 경로를 `models/test.onnx`에서 `models/replaced.onnx`로 바꾸는 UPDATE가 성공했다. `stored_evidence`는 hash/meta의 존재만 검사하고, `asset_active_path`는 경로 중복만 막는다.

이대로 업무 UPDATE를 허용하면 과거 분석이 참조하는 모델/파일 ID는 같아도 실제 내용의 의미가 바뀔 수 있다. 파일 저장 서비스에서 동일 ID·다른 hash를 거부해야 하며, DB에도 STORED 이후 hash·자산 정체성의 변경을 제한하는 편이 안전하다. 보존 기간·결손 품질 정보와 관리 목적의 위치 이동은 별도 허용 정책으로 분리한다. 경로 이동을 허용하더라도 동일 bytes/hash와 이력은 보존해야 한다.

### R5. 관측 JSON과 완료 결과 집합의 검증이 미완성

`geo_result={"status":"VALID","lon":999,"lat":999}`인 관측 INSERT가 성공했다. 이 관측은 이미 COMPLETED인 run에 다른 detection_index로 추가됐다. 다음 두 경계가 아직 없다.

- geometry 컬럼에는 좌표 범위 검사가 있으나 `geo_result` JSON에는 object 여부만 검사한다. VALID 위치 범위·좌표 설정·품질 근거를 강제해야 한다.
- 이미 완료된 run에 새 관측을 추가하면 기록된 result_hash/detection_count와 실제 관측 집합이 달라질 수 있다. 분석 완료 함수에서 모든 observation과 terminal event를 한 트랜잭션으로 확정하고, 이후에는 새 분석 revision으로 정정해야 한다.

완료와 최종 실패 사건을 동시에 넣는 문제와는 다르다. 그 문제는 이미 `analysis_terminal_run` UNIQUE 인덱스가 차단한다. 새 결과를 임의 추가하는 경계가 남아 있다는 뜻이다.

### R6. 편집 중 revision의 변경 정책이 컬럼마다 다름

미승인 revision의 `grid_version` UPDATE는 `23514: immutable relationship: mission_revision.grid_version`으로 거부됐다. 전역 관계 검사에서 grid_version을 고정하기 때문이다. 반면 같은 미승인 행의 일반 계획 내용은 `immutable_record`가 편집을 허용한다.

다만 설계서 8.1에는 편집할 때 새 revision을 생성한다고 되어 있다. 따라서 이를 무조건 설계 위반이나 임무 생성 불가능이라고 단정하지 않는다. 모든 편집을 새 revision으로 할 것인지, 미승인 revision을 제자리에서 완성할 것인지 계약을 명확히 해야 한다. 후자를 지원하면 grid_version의 NULL→값 설정 및 미승인 변경을 허용하되 승인본과 이미 연결된 실행 구역은 보호해야 한다.

## 성능·운영 평가

| 항목 | 판정과 근거 |
|---|---|
| 테이블 분리 | 적절. 계정/세션, 임무/개정/계획, 원프레임/관측/후보, 파일/사건의 책임이 구분됨 |
| 시공간 자료형 | 적절. UUID, bigint, timestamptz, PostGIS SRID 4326과 유한 수치 검사 사용 |
| 관계 보호 | 대체로 적절. 75 FK, 개정/기체/후보의 복합 관계와 순환 참조 지원. R2의 NULL 경계는 수정 필요 |
| 중복 방지 | 적절한 출발점. 생산자 세션/순번, 원프레임 정체성, 분석 run/index/terminal, 자산 경로의 UNIQUE 존재 |
| JSON 사용 | 자세·설정·가변 근거에 합리적. 다만 object/array 검사만으로 업무 계약을 검증한 것은 아님 |
| 권한 | 현재 개발 단계에 적절. DB 외부 TCP 차단, backend 최소 권한, NOLOGIN 객체 소유자, reader 비밀 필드 제외. 업무 DML 권한을 열기 전 함수 계약 필요 |
| 인덱스 | 조회용 B-tree와 필요한 GiST 존재. 88개라는 수만으로 과다/충분 판정 불가. 실제 데이터와 쿼리 EXPLAIN 필요 |
| 전역 잠금 | 실제로 모든 업무 테이블 INSERT/UPDATE를 직렬화. 세션 갱신이 잠금을 가진 동안 별도 기체 INSERT가 400ms lock_timeout으로 실패함 |
| 처리량 | 미검증. 위 시험은 대기 경로의 존재를 증명하며, 목표 fps 미달을 측정한 것은 아님. 짧은 사건 commit 구간보다 잠금 적용 범위가 넓으므로 영상·텔레메트리·로그인 동시 부하를 측정해야 함 |
| 백업 | 이전 배포에서 적용 전/후 dump와 같은 클러스터의 임시 DB 복원은 확인됨. 이번 검토에서 재해복구 전체를 재시험하지 않음 |
| 운영 복구 | 다른 디스크 사본, 새 서버의 역할/비밀 복구, 원본 파일과 DB의 같은 시점 복구, RPO/RTO는 미완료 |

전역 잠금 자체를 즉시 없애면 사건 cursor 순서 보장이 깨질 수 있다. 먼저 R1의 잠금 순서를 고치고, 이후 계정·원시 수신 등 정말 사건 직렬화가 필요한 쓰기 범위를 구분해야 한다. 파티션, Redis, 별도 메시지 브로커를 현재 검토만으로 추가할 근거는 없다.

## 검증 범위에 대한 보완

- 기존 거부 시험은 기본 값을 검사하지만 정상 편집→승인→분석 완료→정정이라는 전체 생명주기는 검사하지 않는다.
- 기존 동시성 시험은 record_event끼리의 순서만 시험하여 publisher 혼합 경로의 교착을 놓쳤다.
- verify.py는 타입을 `udt_name`으로 비교하므로 geometry의 subtype/SRID와 varchar 길이까지 확인하지 않는다. 실제 카탈로그 점검에는 `format_type`과 PostGIS typmod를 포함하는 것이 좋다.
- 설계서 DB-01~24 전체 통합 인수시험이 완료된 것은 아니다. RC/lease/TTL, 파일 fsync/ACK 복구, 현재 분석 선택·후보/셀 재생, 실제 추론·동시 부하는 업무 서비스 단계의 검증이 남아 있다.

## 수정 순서와 재시험

1. 적용 도구가 정상적인 후속 migration을 적용하도록 수정하고 004 이상 새 migration을 사용한다. 기존 001~003의 해시는 변경하지 않는다.
2. R1의 배포 함수 잠금 순서를 수정한다. 이번 두 연결 재현을 성공 완료로 바꾸고 기록 함수와 배포 함수의 혼합 경로도 시험한다.
3. R2의 프레임/알림 임무 조건을 보완한다. 비임무 프레임+plan=NULL, 공용 사건+공용 알림은 계속 허용되는지 함께 확인한다.
4. 자산 불변성·관측 JSON·분석 완료 경계를 확정하고, 그 규칙을 구현한 서비스 함수에만 필요한 쓰기 권한을 부여한다.
5. 편집 정책을 정한 뒤 정상 승인 경로와 영상/텔레메트리/계정 처리의 동시 부하를 시험한다.

이번 요청에서는 배포 SQL·업무 권한·서비스 코드를 수정하지 않았다. 검토 스크립트와 결과 문서/증거만 추가했다.

BAZE review(Sonnet) 독립 검토는 이번에는 정상 완료됐다(`finish_reason=stop`, 잘림 없음). 잠금 순서와 편집 제약에 대한 지적은 로컬/서버에서 확인했다. 제공하지 않은 002 migration의 UNIQUE 인덱스를 보지 못해 제기한 분석 사건 중복 지적은 실제 인덱스와 거부 시험에 의해 기각했다. 최종 판단은 실행된 전체 스키마와 재현 결과를 기준으로 했다.
