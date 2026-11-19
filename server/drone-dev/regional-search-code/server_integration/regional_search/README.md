# 학교 DEV 지역수색 계획·실행·관측 연결

기존 `research_fused + candidate / VIEW_TRACKING` 계획 코어를 학교 서버의 인증·임무·개정·PostgreSQL 계약에 연결한다. **2026-10-22 학교 DEV에 계획 생성·PC 실행 요청·실제 촬영 기반 관측 누적·웹 시작 화면을 반영했다. 실제 학교 SIM 비행은 연결 미준비로 미검증이다.**

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
| `pc_worker.py`, `pc_flight.py`, `motion.py` | mTLS 학교 PC 실행기와 기존 위치·속도·기체 yaw 추종 |
| `observe.py` | 별도 CPU 서비스에서 실제 RGB 메타데이터로 공통 관측 코어 실행 |
| `../school/regional_execution.py`, `regional_contract.py` | 시작·중지·프레임·실행 상태 API와 입력 검증 |
| `../migrations/013_regional_execution.sql` | 실행·촬영·완료 증거 원장 및 공통 관측 DB 반영 |
| `web/`, `acceptance_execution.py` | 학교 웹 시작 화면과 실제 HTTPS 연결 검증 |

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
8. `/api/v1/missions/{missionId}/regional-search/{jobId}/readiness`로 실행 연결 상태를 확인한다. 이 조회 자체는 비행 명령을 보내지 않는다. 실행기 연결 이후 별도의 명시적 시작 요청이 필요하다.

동일 job ID의 다른 내용은 409, 인증 누락은 401, CSRF 누락은 403이다. 지도·구역 도형·프로파일 조건이 다르면 계산을 시작하지 않는다. 입력 패키지나 연결 코드의 해시가 달라지면 기존 계획을 현재 실행 계획으로 사용하지 않는다.

## 유지한 관측·속도 기준

- 기본 3m/s, 조건을 만족하는 직선 이동 4m/s. 기체 yaw와 이동 방향은 독립적으로 계획한다.
- 카메라 1920×1080, 수평 화각 78°, 하향 45°. 기체 고정 카메라이며 3축 짐벌을 가정하지 않는다.
- 셀 완료는 **서로 다른 유효 프레임 3개 이상 AND 연속 관측 1초 이상**. 최대 프레임 공백 1.5초와 기존 품질·GSD·사전 지도 가림 검사를 유지한다.
- 지도 조건의 `observation_seconds=3`은 지점 대기 시간이며, 셀 완료의 1초 기준과 다르다.
- 목표 95%, 준비 계산 60초. 큐 대기 시간은 계산 시간과 별도로 측정한다.

## 학교 PC 실행과 실제 관측 연결 (2026-10-22 후속)

학교 웹 `/regional-search.html`에서 구역 선택 → 경로 준비 → 준비 상태 확인 → 시작 확인란 → **지역수색 시작**으로 연결된다. 기존 `/test-patrol.html`에 지역수색 링크를 추가했다. 기존 순찰 화면의 경로 생성은 별도 기능으로 유지한다.

PC 실행기는 `pc_worker.py`와 `pc_flight.py`다. 위치·속도·기체 yaw 구간을 유지하고 실제 촬영에만 관측 증거를 부여한다. `Start-RegionalSearchPC.ps1`은 SSH 연결과 실행기를 시작하며, Unreal/SITL을 자동으로 켜지 않는다. 연결 확인만 할 때 `-Probe`를 붙인다.

실행기에는 등록된 불변 입력 `input-v2`, 교정된 장면의 확인서 `sim-scene.json`, 기존 PC용 mTLS 신원이 필요하다. 이미 다른 게이트웨이가 제어 중이거나 올바른 SIM 장면이 준비되지 않았으면 실행 준비 상태가 되지 않는다.

서버의 `regional-observer`는 실제 RGB/촬영 자세/품질/원본 해시 저널을 같은 관측 코어로 처리한다. 이 서비스는 계획 서비스와 독립적이며, HTTP backend가 결과를 검증해 `regional_completion`과 공통 `observation_cell`에 기록한다. 예상 관측 마스크는 이 경로에 전달하지 않는다. PNG 본문은 PC의 `drone_record`에 있고 서버는 원본 해시와 메타데이터를 보유한다.

`execution-readiness`와 기존 `readiness`는 이제 실제 PC 준비 상태를 평가한다. `actualCoverageConnected=true`는 연결 구현을 뜻하며, `executable`은 PC 최신 연결과 버전·현재 임무·동시 제어 상태가 모두 맞을 때만 true다. 현재 미연결 PC의 시작은 차단한다.

`POST .../regional-search/{jobId}/start`는 실행 UUID, worker ID, 결과 해시를 받는다. 같은 요청은 같은 실행으로 반환하며, 서로 다른 요청 내용을 같은 ID로 재사용할 수 없다. `/regional-executions/{executionId}/stop`은 현재 위치 착륙을 요청한다. 연락이 끊기면 자동 재시작하지 않고 착륙 확인 전에는 새 실행을 막는다.

## 운영과 복구

배포 경로는 `/home/se/sandboxes/drone-dev`다. `scripts/stack.sh`는 기존 vision override에 `compose.regional-search.yml`만 추가한다. 계획 worker는 네트워크·DB 비밀번호·GPU 없이 CPU 2개, 메모리 4GiB 한도에서 동작한다. HTTP backend가 계산을 직접 실행하지 않는다.

최초 계획 전용 변경의 원본 코드는 `/home/se/sandboxes/drone-dev/backups/regional-search-20261022/`, 실행 연결 직전 상태는 `/home/se/sandboxes/drone-dev/backups/regional-execution-20261022/`에 보존한다. `database-schema.sql`은 스키마 백업이며 전체 데이터 백업이 아니다. migration은 기존 행을 바꾸지 않는 추가 방식이다.

실행 연결의 문제가 생기면 먼저 새 시작을 막고 착륙·무장 해제 여부를 확인한다. 실행 중이 없을 때 후속 백업을 사용해 실행 API·웹 링크·관측 서비스·레지스트리를 복구한다. 최초 계획 전용 복구 절차만 실행하면 후속 구성과 불일치하므로 아래 후속 보고서의 순서를 따른다. 새 원장·증거·불변 패키지는 남긴다. 적용된 migration 파일의 내용과 체크섬은 변경하지 않는다.

구미시 공간 릴리스는 기존 서버에 존재하지만 이번 지역계획 패키지는 캠퍼스용이다. 구미 입력은 별도 패키지 검증·등록 전까지 이 API에서 자동 선택하지 않는다.

후속 구현·검증·제한: `문서/학교서버_지역수색_실행연결_20261022/README.md`. 이전 계획 전용 배포의 복구 절차와 후속 실행 연결의 복구 절차를 혼용하지 않는다.
