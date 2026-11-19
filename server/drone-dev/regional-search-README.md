# 학교 DEV 지역수색 계획 연결

기존 `research_fused + candidate / VIEW_TRACKING` 계획 코어를 학교 서버의 인증·임무·개정·PostgreSQL 계약에 연결한다. **현재 배포 범위는 캠퍼스의 계획 생성·저장까지다. 학교 SIM 실행기와 실제 관측 누적 연결은 완료되지 않았다.**

## 모듈과 입력

| 파일 | 역할 |
|---|---|
| `export_package.py` | 현재 지도·DEM·건물 정책·수목 분류·원본 의미구역과 계획 코어를 불변 패키지로 추출 |
| `planner.py` | 동일한 계획 코어로 경로를 새로 계산하고 연속 이동·기체 yaw 구간 출력 |
| `worker.py` | 작업을 한 번에 하나씩 별도 프로세스로 계산; 150초 watchdog |
| `package.py` | 지도 파일과 계산 코드 해시, 경로 이탈, 변조 검사 |
| `../school/regional_search.py` | 인증·CSRF·권한·구역·임무 개정 검사, 비동기 제출·결과 반영 |
| `../migrations/012_regional_search.sql` | 작업 원장 추가 및 기존 `search_plan`에 결과를 한 번만 등록 |
| `acceptance_school.py` | 실제 학교 HTTPS를 통해 임무 생성부터 계획 저장까지 확인 |

패키지에는 계정·비밀번호·과거 경로·녹화가 포함되지 않는다. 원본 구역과 현재 활동 건물 정책을 사용한다. 높이가 확인되면 그 값을, 연결이 확인된 층수만 있으면 층수×4m를 사용한다. 둘 다 미상인 건물 비활성화와 현재 수목 제외 정책을 유지한다.

코어는 `mission_control_pwa/backend/app/search_primitive_graph.py`이고, 학교 연결 진입점은 이 폴더의 `planner.py`다. 기존 벤치마크의 진입점 계산을 `app/search_entry.py`로 분리해 두 환경이 공유한다.

## API 사용 순서

1. 학교 인증으로 로그인하고 응답의 CSRF 토큰을 사용한다. 로컬 관제 계정 DB를 복사하지 않는다.
2. `/api/v1/missions`로 SIM 임무를 만든다.
3. `/api/v1/missions/{missionId}/map-drafts`로 캠퍼스 릴리스와 구역을 선택한다. 해당 프로파일의 조건은 기준 고도 30m, 기본 속도 3m/s, 지점 대기 3초다. 웹의 기존 기본 고도 15m와 다르다.
4. `/api/v1/missions/{missionId}/regions`에서 **현재 개정**의 지역 UUID를 얻는다.
5. 아래 요청을 보낸다. 요청 ID는 같은 요청의 재시도에서 유지한다.

```http
POST /api/v1/missions/{missionId}/regional-search
Content-Type: application/json
Origin: https://127.0.0.1:18443
X-CSRF-Token: <로그인 응답 토큰>
```

```json
{
  "job_id": "<새 UUID>",
  "mission_revision": 2,
  "region_id": "<현재 개정의 지역 UUID>",
  "policy_profile": "RESEARCH_FUSED_CANDIDATE_95_V1"
}
```

`entry_ned`와 `entry_yaw_deg`를 제공하면 실제 진입 위치로 새로 계산할 수 있다. 생략하면 기존 공통 진입 계산을 사용한다. 임의 좌표를 넣으면 안전 경로 검사에서 실패할 수 있다.

6. `GET /api/v1/missions/{missionId}/regional-search/{jobId}`를 약 2초 간격으로 조회한다. 현재 구조에서는 이 조회가 결과 파일을 검사해 DB에 반영하고, DB 커밋 후 요청 파일 쓰기가 중단됐던 경우 재발행한다. 자동 백그라운드 DB 반영기로 오해하지 않는다.
7. `READY`이면 `plan_id`와 예측 결과를 받는다. `INCOMPLETE`는 준비 시간 또는 예측 관측 목표 미달, `FAILED`는 계산 실패, `INVALIDATED`는 계산 중 임무 개정 변경이다. 실패·미달을 실제 관측 성공으로 세지 않는다.
8. `/api/v1/missions/{missionId}/regional-search/{jobId}/readiness`로 실행 연결 상태를 확인한다. **현재 `executable=false`이며 이 API는 비행 명령을 보내지 않는다.**

동일 job ID의 다른 내용은 409, 인증 누락은 401, CSRF 누락은 403이다. 지도·구역 도형·프로파일 조건이 다르면 계산을 시작하지 않는다. 입력 패키지나 연결 코드의 해시가 달라지면 기존 계획을 현재 실행 계획으로 사용하지 않는다.

## 유지한 관측·속도 기준

- 기본 3m/s, 조건을 만족하는 직선 이동 4m/s. 기체 yaw와 이동 방향은 독립적으로 계획한다.
- 카메라 1920×1080, 수평 화각 78°, 하향 45°. 기체 고정 카메라이며 3축 짐벌을 가정하지 않는다.
- 셀 완료는 **서로 다른 유효 프레임 3개 이상 AND 연속 관측 1초 이상**. 최대 프레임 공백 1.5초와 기존 품질·GSD·사전 지도 가림 검사를 유지한다.
- 지도 조건의 `observation_seconds=3`은 지점 대기 시간이며, 셀 완료의 1초 기준과 다르다.
- 목표 95%, 준비 계산 60초. 큐 대기 시간은 계산 시간과 별도로 측정한다.

## 학교 SIM 연결에 남은 작업

기존 `CAPTURE/ROUTE` 프로토콜은 최대 64개 경유점과 속도 3m/s를 표현한다. 이 지역수색의 곡선·독립 yaw·관측 대기를 그대로 보존하려면 `SIM_BODY_YAW_PHASES_V1`을 소비하는 PC 실행 어댑터와 실제 RGB/촬영 자세의 관측 누적 연결이 필요하다. 단순히 경유점을 줄이거나 yaw를 버려서 실행하지 않는다.

현재 결과의 `execution`에는 진입·복귀 경로와 각 구간의 NED 위치, 시작 yaw, yaw 변화량, 지속 시간이 들어 있다. 이 값은 **계획 출력**이며, 실제 비행 제어 연결이나 관측 실적을 뜻하지 않는다. 현재 학교 서버의 기존 순찰 버튼은 이 지역수색 API로 바꾸지 않았다.

실행기 연결 시 필수 조건은 입력 버전 일치, 위치·속도·yaw 동시 제어, 실제 RGB와 동일 프레임 자세, 연결 상실 시 로컬 중단이다. 실제 임무의 권한·시작 승인·TTL·중복 방지·복귀·착륙은 해당 실행기에서 함께 검증해야 한다.

## 운영과 복구

배포 경로는 `/home/se/sandboxes/drone-dev`다. `scripts/stack.sh`는 기존 vision override에 `compose.regional-search.yml`만 추가한다. 계획 worker는 네트워크·DB 비밀번호·GPU 없이 CPU 2개, 메모리 4GiB 한도에서 동작한다. HTTP backend가 계산을 직접 실행하지 않는다.

이번 변경의 원본 코드는 `/home/se/sandboxes/drone-dev/backups/regional-search-20261022/`에 보존한다. `database-schema.sql`은 스키마 백업이며 전체 데이터 백업이 아니다. migration은 기존 행을 바꾸지 않는 추가 방식이다.

문제가 생기면 새 `regional-planner` 서비스만 중지하고, 보관한 `school/backend.py`와 `scripts/stack.sh`를 원래 위치에 복원한 뒤 backend를 재시작한다. 새 작업 테이블·계획 기록·불변 패키지는 조사와 복구를 위해 남긴다. 기존 DB 전체 복원이나 REAL·vision 재시작은 필요하지 않다. 적용된 migration 파일의 내용과 체크섬은 변경하지 않는다.

구미시 공간 릴리스는 기존 서버에 존재하지만 이번 지역계획 패키지는 캠퍼스용이다. 구미 입력은 별도 패키지 검증·등록 전까지 이 API에서 자동 선택하지 않는다.
