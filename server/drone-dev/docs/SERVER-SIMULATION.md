# 학교 서버 시뮬레이션 연결

이 연결기는 관제에서 지정한 SIM 실행을 로컬 Unreal/Cosys-AirSim에 전달하고 측정값과 결과를 서버 DB에 누적한다. 경로 최적화기는 연결하지 않았으며, 입력된 경로를 실행해 `optimized=false`로 기록한다. 2026-10-14부터 pipeline_config로 임무·모델을 지정하면 프레임별 pose와 이미지를 서버의 SIM CUDA 워커로 전달한다. 최신 모델 ID·pose·업로드 계약은 D:/Capstone1/Backend/BE_docs/vision_integration_pose_handoff_v1.1.md를 따른다.

## PC별 준비

최신 NET_SITL 소스·Python 가상환경·Unreal/Cosys-AirSim을 준비한다. `server_simulation_bridge.py`, `simulation_vision.py`, `simulation_route.py`, `airsim_route.py`, 변경된 `flight_smoke.py`와 `Start.ps1`을 함께 사용한다. `runtime`과 개인키·토큰은 Git에 넣지 않는다.

관리자가 각 PC에 서로 다른 `sim-worker-01`/`02`/`03` 신원 중 하나를 배정한다. 자신의 `ca.crt`, `client.crt`, `client.key`, `token`만 보호된 경로로 받는다. CA 개인키는 받지 않는다. 인증서는 발급일부터 30일 유효하다. 학교 서버 SSH 접속 권한은 별도로 필요하다.

프로젝트 루트에서 별도 터미널로 터널을 유지한다. 같은 PC에 터널이 이미 실행 중이면 중복 실행하지 않는다.

```powershell
ssh -p 7540 -N -L 18443:127.0.0.1:18443 -L 18444:127.0.0.1:18444 se@<SERVER_HOST>
```

자신의 worker 번호로 바꿔 실행한다.

```powershell
.\.venv\Scripts\python.exe scripts\server_simulation_bridge.py `
  --identity runtime\server-identities\sim-worker-01 `
  --execute --start-simulator --profile SimpleFlight
```

한 PC에는 연결기 하나만 실행한다. 서로 다른 PC가 같은 worker 신원을 공유하지 않는다. 관제 `https://localhost:18443/simulation-lab`에서 대상 PC·맵·시나리오를 선택한다. 먼저 CAPTURE로 실제 측정값 왕복 저장을 확인한다. ROUTE는 로컬 가상 비행을 실행하며 비행 중 정지는 관제 STOP을 사용한다.

## 재접속과 복구

결과는 `runtime/server-simulation/identities/<certificate-file-hash>/<run-UUID>`에, 요청과 접속 실패 기록은 `runtime/server-communication/<certificate-file-hash>`에 저장된다. 미전송 파일과 업로드 위치는 재시작 때 사용하므로 지우지 않는다. 서버가 저장한 뒤 응답이 유실돼도 같은 ID로 재전송해 중복 저장을 막는다.

`RECOVERY_REQUIRED`가 나오면 모든 새 작업이 보류된다. 이전 연결기의 종료와 가상 기체 착륙을 확인한 뒤 같은 신원으로 실행한다.

```powershell
.\.venv\Scripts\python.exe scripts\server_simulation_bridge.py `
  --identity runtime\server-identities\sim-worker-01 --execute `
  --ack-recovery <중단된-run-UUID>
```

착륙 상태·미전송 업로드·서버 session 소유권을 확인하며 이전 비행을 재실행하지 않는다. RUNNING 실행을 실패 종료로 기록한 후 정상 연결기를 다시 시작하고 새 run을 요청한다. 실제 FC의 비행 안전성이나 disarm을 대신 검증하는 기능은 아니다.

## 통신 추적

운영자는 `https://localhost:18443/communication-monitor`에서 로그를 조회한다. 일반 SIM 공용 세션이나 worker 인증서에는 전체 로그 조회 권한이 없다. 모니터링 권한이 있는 개인 관제 계정으로 로그인한다. 사람별 행동을 구분하려면 사람별 관제 계정이 필요하다.

- `simulation.run/command/sample`: 실행 요청, 명령, 측정·계획·종료 결과.
- `observability.communication_log`: 요청 ID, worker/사용자, 실행 ID, 상태, 시간, 전송량, DB 처리 구간, 실패.
- SERVER와 CLIENT_REPORTED를 구분한다. 서버에 도착하지 않은 요청은 로컬 로그에 남고 재접속 후 업로드된다.
- 같은 요청 UUID로 서버 시간과 클라이언트 왕복 시간을 비교한다. PC 시계 오차가 있으므로 UTC 시각 차이만으로 병목을 확정하지 않는다.
- 비밀번호·토큰·쿠키·본문은 기록하지 않는다. SSH·TLS 이전 구간이나 RF 손실은 HTTP 로그만으로 판별할 수 없다.

## 확인된 범위

한 물리 PC의 서로 다른 인증서를 사용하는 프로세스 3개로 실제 서버 병렬 저장·중복 재전송·재시작·다른 worker 접근 거부를 검증했다. 실제 PC 3대와 Unreal 3개의 동시 가상 비행은 아직 검증하지 않았다. 각 PC의 CAPTURE 왕복 시험 후 짧은 ROUTE, 장시간 부하 시험 순서로 진행한다.

로컬 검사:

```powershell
.\.venv\Scripts\python.exe scripts\test_server_simulation_bridge.py
.\.venv\Scripts\python.exe scripts\simulation_route.py
```

`test_multi_simulation_live.py`는 관제에서 새 CAPTURE 실행 3개를 만든 후 그 실행 ID 목록을 지정하는 운영 검증용이다. 하나의 Unreal에서 읽기만 하는 프로세스 병렬 시험이며, 한 PC에 제어 연결기 여러 개를 실행하는 운영 방식으로 사용하지 않는다.
