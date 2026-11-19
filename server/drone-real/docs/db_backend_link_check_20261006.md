# DB·백엔드 연동 확인 — 2026-10-06

확인 시각: 2026-10-06 10:05:29 KST (01:05:29 UTC). **학교 서버의 백엔드 v0.1.1과 PostgreSQL 업무 DB의 연결·조회 및 격리된 쓰기 검증을 통과했다.**

| 확인 항목 | 결과 |
|---|---|
| 실행 중인 백엔드의 실제 DB | `drone_dev`, 접속 계정 `drone_api` |
| 연결 경로 | `/run/db-socket` Unix 소켓; DB TCP 주소 없음 |
| 운영 조회 | 실제 HTTPS 게이트웨이 → 백엔드 → DB, HTTP 200, `database=connected` |
| DB 함수·권한 | 업무 함수 실행·테이블 조회 허용; `drone.mission` 직접 INSERT/UPDATE/DELETE 불허 |
| 스키마 | 업무 18개 테이블, migration 001–006의 파일·DB 체크섬 일치 |
| 시험 코드 | 배포된 코드·시험·통신 앱·migration 32개 파일과 후보 소스가 동일 |
| 임시 DB 시험 | 정상·회귀 79개 통과: 저장/조회, 중복 요청, 상태 전이, 실패 시 rollback·정리 등 |
| 시험 종료 | 생성한 임시 DB·컨테이너·저장소 정리; 운영 업무 테이블별 행 수 전후 동일 |
| 서비스 변경 | 운영 코드·자격증명 변경 및 서비스 재시작 없음 |

운영 DB에서는 읽기 전용 SQL과 실제 TLS 조회 경로를 확인했다. 쓰기 시험은 별도 실제 PostgreSQL DB와 저장소에서 배포 코드와 동일한 업무 API로 수행했다. 임시 API 시험의 HTTP 클라이언트는 FastAPI TestClient이며 검증된 인증서 신원 scope를 시험용으로 제공한다. 따라서 이번 결과를 운영 DB에 실제 쓰기 요청을 보냈다는 의미로 해석하지 않는다.

운영 업무 DB는 현재 개발 초기 데이터만 보유한다. 연결 검증 통과가 실기체 데이터 수집이나 실제 비전 추론 완료를 뜻하지 않는다. `model_loaded=false`, `flight_enabled=false`를 유지한다.

검증 결과: [JSON 증거](../evidence/db-backend-check.json). 재검증 도구: [verify_db_backend.py](../tools/verify_db_backend.py).

학교 서버에서 현재 도구를 다시 실행하려면:

```bash
sudo python3 /home/se/sandboxes/drone-dev/db-link-check-stage/verify_db_backend.py
```

배포 코드와 시험 후보가 달라지면 도구는 검증을 중단하므로, 변경된 후보를 먼저 동기화하고 검토해야 한다.
