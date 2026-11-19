# 드론 업무 DB 구축 결과 — 2026-10-05

상태: **서버 스키마 구축 완료, 업무 API 연동 대기**.

## 실제 구축 대상

- 서버: `se@<SERVER_HOST>:7540`, Ubuntu 24.04.
- 서비스 경로: `/home/se/sandboxes/drone-dev`.
- DB: PostgreSQL 16.9 / PostGIS 3.5.2, `drone_dev`의 `drone` 스키마.
- 데이터: 위 경로의 `data/postgres`; 백엔드 파일은 `data/backend`, 모델은 `data/models`로 분리.
- 접속: backend 전용 Unix 소켓 `/run/db-socket`, SCRAM 인증. DB TCP와 외부 포트는 비활성.

[DB 설계 v1.1](drone_database_design_spec_v1.1.md)의 원래 대상은 구 샌드박스 `drone` DB였다. 이후 [서비스 아키텍처 v1.1](service_architecture_zero_trust_v1.1.md)과 실제 backend 연결이 새 격리 환경 `drone_dev`를 사용하므로 여기에 업무 스키마를 배포했다. 구 DB·`drone.environment_info`와 학교 Jupyter/Conda/학습 폴더는 변경하지 않았다. 커널·CPU·RAM·GPU는 호스트 자원으로 공유한다.

원본 HWPX의 SHA-256은 설계서 기록과 일치한다: `1e99ca37476b41eedd57a60b46ca5bf78ce8c934465d844663b6f026a99b2e4b`.

## 생성한 테이블

| 테이블 | 업무 컬럼 수 |
|---|---:|
| user_account | 6 |
| user_session | 6 |
| drone | 13 |
| telemetry_sample | 15 |
| config_version | 13 |
| mission | 17 |
| mission_revision | 15 |
| search_plan | 19 |
| search_region | 15 |
| reobservation_request | 15 |
| video_frame | 36 |
| media_asset | 19 |
| person_candidate | 19 |
| detection_observation | 16 |
| observation_cell | 20 |
| flight_command | 23 |
| alert | 10 |
| mission_event | 21 |
| **합계** | **18개 / 298컬럼** |

`drone.schema_migration`은 기술 테이블이다. `drone` 스키마는 총 19개 테이블, 기존 `integration.probe`를 포함한 자체 테이블은 20개다. PostGIS의 `public.spatial_ref_sys`는 이 수에서 제외한다. 새 DB에 기존 환경 정보를 복제하지 않았다. 운영자·임무·탐지 샘플은 인수시험 트랜잭션에서만 사용하고 모두 rollback했다.

## SQL과 권한

- [001_business_schema.sql](../drone-services/db/migrations/001_business_schema.sql): 정확한 테이블·컬럼·자료형·NULL/PK와 기본 행 값 검증.
- [002_constraints_and_indexes.sql](../drone-services/db/migrations/002_constraints_and_indexes.sql): 복합/순환 FK, 개정·격자·기체 일치, 공간·유한 수치·시간·경로·JSON 검증, 멱등/조회 인덱스.
- [003_event_and_role_rules.sql](../drone-services/db/migrations/003_event_and_role_rules.sql): config 종류 검사, 분석 원장 참조, 불변 이력, 사건 커서, 최소 권한.

각 SQL의 SHA-256과 적용 시각을 `schema_migration`에 기록했다. 동일 버전·동일 해시는 재실행 시 확인만 하고, 다른 해시는 거부한다. 적용은 하나의 트랜잭션이며 기존 데이터 디렉터리를 삭제하거나 DB를 재생성하지 않는다. 이미 적용한 SQL 수정은 금지하고 새 번호의 전진 migration으로 진행한다. 현재 apply 도구는 정확히 동일한 전체 이력의 재확인만 지원하며, 추가 migration을 적용하는 배포 절차는 후속 변경에서 확장한다.

기존 `drone_owner`는 DB 초기화·관리용 LOGIN 계정으로 보존한다. 새 `drone_schema_owner`는 NOLOGIN 업무 객체 소유자, `drone_migrator`는 NOLOGIN 배포 권한 그룹이다. 서비스에는 관리자 인증 정보를 제공하지 않는다. `drone_api`는 기존 SIM probe 권한과 업무 조회 권한을 가진다. 일반 업무 테이블의 INSERT/UPDATE/DELETE/TRUNCATE/DDL 및 직접 event 쓰기는 허용하지 않는다. 비분석 사건 기록·배포 상태 함수만 허용하며, 분석·집계 사건은 범용 기록 함수에서 거부한다. `drone_vision`은 비활성 NOLOGIN 역할로, AI는 기존 인증된 backend API만 사용한다. `drone_reader`는 비밀번호 해시/토큰 digest를 제외한 계정·세션 안전 view만 조회한다.

JSON array로 고정한 필드: permissions, priority_sources, visit_order, candidates, gaps, refs, evidence_refs, excluded_reasons, region_allocations. 나머지 JSON 필드는 object다. 공유 API 계약을 실제 구현할 때 이 형태를 명시적으로 매핑해야 한다. 원문에 열거되지 않은 상태값은 임의 목록으로 확정하지 않았다.

사건 커서는 sequence 대신 transaction advisory lock 아래 max+1로 발급한다. 업무 서비스가 사건을 포함한 변경을 구현할 때는 **공통 잠금 → 업무 행 잠금/변경 → 사건 → 즉시 commit** 순서를 지켜야 한다. 행 트리거만으로 애플리케이션의 잠금 순서까지 보장하지 않는다. 현재 업무 DML 권한은 비활성이고, 허용한 사건 함수는 잠금을 먼저 취득한다. 파일 수신·추론·네트워크 송신은 해당 잠금 밖에서 수행해야 한다.

일반 CHECK의 NULL 허용과 복합 FK의 MATCH 규칙은 [PostgreSQL 16 제약조건 문서](https://www.postgresql.org/docs/16/ddl-constraints.html)에 따라 검증했다. 공간 형상은 SRID/형상 타입과 위경도 범위를 제한하고 [ST_IsValid](https://postgis.net/docs/ST_IsValid.html)로 위상을 확인한다. 이것만으로 실측 좌표 정확도가 검증되는 것은 아니다.

## 검증과 백업

- 새 스키마를 임시 DB에 적용하고 18테이블/298컬럼의 이름·순서·자료형·NULL 조건을 설계서와 대조했다.
- [인수시험 SQL](../drone-services/db/checks/001_acceptance.sql)의 오류 입력 29개가 예상 SQLSTATE로 거부됐다. 계정/세션·다른 개정 계획/명령·공간 범위/교차·NaN·촬영 근거·분석 중복/최종 상태·파일 경로·불변 이력·권한을 포함한다.
- 두 DB 연결의 느린 선행/빠른 후행 commit 및 선행 rollback에서 사건 커서 누락이 없었으며, 동일 event ID 재시도는 원 cursor를 반환했다.
- staging custom dump를 다른 임시 DB에 복원하고 동일 카탈로그·제약 시험과 사건 3행 보존을 확인했다. 검사 DB 두 개는 이 작업에서 만든 이름을 확인한 뒤 제거했다.
- 실제 DB 적용 후 동일 시험과 checksum 재적용 검사를 통과했다.
- backend 재시작 후 서비스 인수시험 26개와 기존 서비스 격리·구 DB health 회귀를 통과했다. 상태는 `business_schema_deployed=true`, `business_api_ready=false`, `model_loaded=false`, `flight_enabled=false`다.

백업 위치: `/home/se/sandboxes/drone-dev/backups/business-schema-20261005T104415Z/`.

| 파일 | 용도 |
|---|---|
| before.dump | 새 서비스 DB의 적용 전 백업 |
| staging.dump | 검증 DB와 사건 시험 데이터의 복원 검증용 백업 |
| after.dump | 실제 DB의 스키마 적용 후 백업 |

백업은 관리자 전용 권한으로 보존한다. 같은 서버 디스크의 DB 백업이며 별도 재해복구 사본·영상 파일 백업·역할 비밀번호 백업은 아니다. restore 시험은 같은 클러스터에서 기존 역할을 유지해 진행했으므로 다른 서버 복원에는 역할 및 비밀 정보의 별도 복구가 필요하다.

증거는 서버와 로컬의 `drone-services/evidence/database/`에 있다. [deployment.json](../drone-services/evidence/database/deployment.json), [verification.json](../drone-services/evidence/database/verification.json), [service-acceptance.json](../drone-services/evidence/database/service-acceptance.json), [service-audit.json](../drone-services/evidence/database/service-audit.json)을 참조한다.

반복 확인 명령(학교 서버):

```bash
cd /home/se/sandboxes/drone-dev
sudo python3 db/verify.py
sudo scripts/stack.sh --profile verify run --rm verifier
```

`verify.py`는 카탈로그·체크섬·권한·저장 설정을 확인하고 샘플 행을 rollback한다. 스키마 적용 상태 확인에는 `sudo python3 db/apply.py`도 사용할 수 있다. `deploy.py`는 최초 배포 절차이므로 이미 배포된 DB에는 재실행하지 않는다. 새 PostgreSQL 데이터 디렉터리를 처음 초기화하면 현재 `db/init.sh`는 integration 환경만 생성하므로 서비스 초기화 후 `db/deploy.py`로 업무 스키마를 별도 적용해야 한다.

## 미구현 범위

DB 구조 구축과 서비스 회귀는 완료했다. 18개 DAO/API, 파일 bytes·manifest/PERSISTED 원자 처리, 분석 현재값 선택·후보/셀 재계산, 실제 Pi·FC 명령/lease 검증, 실모델 추론·부하시험은 후속 업무다. 설계서 DB-01~24 전체 통합시험 완료로 표시하지 않는다. 승인된 모델이나 미정 운용 정책을 임의 기본값으로 채우지 않았으며 비행 기능은 비활성이다.

외부 검토: BAZE quick(Luna)의 배포 요건 점검은 정상 종료했다. 추가 review(Sonnet)는 `finish_reason=length`로 본문을 받지 못했으므로 검토 통과로 기록하지 않았고 더 비싼 모델로 대체하지 않았다.
