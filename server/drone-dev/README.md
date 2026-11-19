# 현재 서버 폴더 안내

현재 아키텍처와 DB 구조는 [아키텍처 v1.2](../drone-server/docs/service_architecture_zero_trust_v1.2.md), [서비스·DB·데이터셋 v1.2](../drone-server/docs/service_db_dataset_structure_v1.2.md)를 따른다.

현재 실제 폴더는 drone-server·drone-dev·drone-real이며 날짜 이름 링크와 drone-legacy는 제거했다. 폴더명 안내는 [sandboxes 트리](../README.md), 현재 상세 구조는 [파일 구조·운영 가이드 v1.2](../drone-server/docs/server_file_structure_services_v1.2.md)를 따른다. 정리 복구 자료는 drone-server/backups/maintenance에 보존한다.

# 격리된 드론 서비스 개발 환경

Ubuntu 24.04 학교 서버의 `/home/se/sandboxes/drone-dev`에 배포한다. 기존 `/home/se/sandboxes/drone-server`의 DB·녹화·Jupyter·학습 환경은 그대로 유지한다. 전용 Docker 엔진과 캐시 이미지만 재사용하며 해당 엔진 설정은 바꾸지 않는다.

## 구성

- database: PostgreSQL/PostGIS, TCP 비활성, backend만 Unix 소켓/SCRAM으로 접속.
- backend: FastAPI, TLS client 인증서 지문에 서비스 토큰을 결합하여 scope·주체를 검사.
- vision: 인증된 heartbeat API를 호출하는 모델 검증 대기 프로세스. 실제 모델·추론 미연결.
- web: 정적 개발 상태 화면, DB/서비스 토큰/임무 데이터 마운트 없음.
- gateway: 학교 서버 내부 HTTPS 게이트웨이. 관제 개발 계정·업무 세션을 인증하고 내부 mTLS로 Web·backend에 연결한다. 명시적 관제 업무 API만 전달하며 현장 게이트웨이(Pi)와 별개다.
- verifier: 기본 실행 제외된 관리자 시험 프로파일. SIM 장치/비전 통신과 거부 시나리오 검증.

모든 컨테이너는 `network_mode: none`이다. 명시적으로 마운트한 소켓 디렉터리로만 통신한다. HTTP API는 Unix 소켓 위에서도 TLS 서버 검증·client 인증을 적용한다. DB Unix 소켓은 TCP TLS 연결이 아니라 로컬 커널 IPC이며 SCRAM·소켓 디렉터리 권한·최소 DB 역할로 통제한다. 호스트 `se`/root 및 Docker 엔진 관리자는 관리 신뢰 경계에 포함된다. 컨테이너는 커널과 하드웨어를 공유하며 VM 격리를 제공하지 않는다.

전체 목표 구조는 `드론 ↔ 현장 게이트웨이(Pi) ↔ 학교 서버 ↔ 관제 시스템(PC·휴대폰)`이다. 휴대폰은 LTE·5G로 학교 서버의 외부 HTTPS 주소에 직접 접속하며 현장 게이트웨이·개발 PC를 거치지 않는다. 현재 외부 접속은 미구성이고 아래 SSH 개발 접속만 제공한다.

## 개발 접속

개발 PC에서:

```powershell
ssh -p 7540 -N -L 18443:127.0.0.1:18443 se@<SERVER_HOST>
```

접속 주소: `https://localhost:18443`. 서버에서 관제용 계정은 아래 파일로 확인한다. OS/Jupyter 비밀번호와 다르다.

```bash
cat /home/se/sandboxes/drone-dev/secrets/operator-login.json
```

개발 CA는 `secrets/ca.crt`다. 인증서를 검증하는 CLI에는 해당 파일을 전달한다. 브라우저의 로컬 인증서 신뢰 등록은 별도로 수행하며 이번 배포에서 사용자 PC의 인증서 저장소를 변경하지 않는다. TLS 검증을 끄는 방법을 정상 접속 절차로 사용하지 않는다. CA 개인키 `ca.key`는 컨테이너와 PC에 배포하지 않는다.

기존 상태 화면은 TLS 안의 HTTP Basic 조회 인증을 사용한다. 업무 API는 `POST /api/v1/auth/login`의 HttpOnly/Secure 세션 쿠키, Origin·CSRF 및 드론별 권한으로 인증한다. MFA/SSO와 실제 운용 정책은 후속 범위다.

## 점검

```bash
cd /home/se/sandboxes/drone-dev
scripts/stack.sh ps
scripts/stack.sh --profile verify run --rm verifier
```

기본 서비스는 모델·비행을 활성화하지 않는다. `drone_dev.drone`의 업무 18개 테이블/298개 컬럼에 migration 001–006을 적용했고 SIM 업무 백엔드 v0.1.1을 배포했다. `/v1/vision/sim-results`는 기존 명시적 SIM 교환 시험이며 추론을 실행하지 않는다. 실제 Pi·FC·영상·GRACE·학습 모델·관제 UI는 후속 통합 범위다.

DB 반복 점검: `sudo python3 db/verify.py`. 생성 SQL·권한·백업·검증 범위는 [DB 구축 결과](docs/drone_database_deployment_20261005.md)를 참조한다.

## 운영 경계

- 새 DB 데이터는 `data/postgres`, backend 파일은 `data/backend`, 모델은 `data/models`로 분리한다. vision은 모델을 읽기만 하며 backend 임무 파일은 보지 못한다.
- 인증서는 30일, 개발 CA는 90일 유효하다. 운영 사용 전 만료 감시와 갱신·폐기 절차를 구현해야 한다. 개발 서비스 토큰은 인증서 지문과 결합되며 개별 token 교체/권한 폐기는 backend registry 수정과 관련 서비스 재시작으로 적용한다.
- 개인키·토큰은 `secrets/<service>/`에만 두고 각 프로세스 UID가 읽는다. secrets/데이터는 Git과 일반 코드 복사에서 제외한다.
- verifier에는 시험에 필요한 다수의 신원이 있으므로 관리자 전용이며 상시 실행하지 않는다.
- systemd `drone-services-relay`만 호스트 loopback TCP 18443을 열고 gateway 소켓으로 TLS bytes를 전달한다. 외부 HTTPS/UDP 포트는 열지 않는다.
- 기존 서비스 전체를 중지하거나 `down -v`, `docker system prune`을 실행하지 않는다. 새 프로젝트만 중지하려면 `scripts/stack.sh stop`과 `sudo systemctl stop drone-services-relay`를 사용한다. 데이터와 자격증명은 보존된다.
- 새 업무 DB의 적용 전/후 custom dump와 임시 DB 복원을 검증했다. 백업은 `backups/business-schema-20261005T104415Z/`에 있으며 같은 디스크 사본이다. 기존 백업 스크립트의 자동 보호나 외부 사본을 의미하지 않는다.

## 현재 결과

2026-10-06 정상·회귀 79개, 실제 업무 HTTPS/WSS 11개, 기존 서비스 26개, DB 부정 입력 41개 및 서비스 격리 점검을 통과했다. DB·전체 백엔드·게이트웨이 백업은 `backups/backend-fix-20261006T005534Z/`에 보존했다. 코드 복구 경로는 준비되어 있으며 이번 배포에서 장애 복구를 실제 실행하지 않았다. 실제 서비스 모델과 비행은 비활성이다. 상세 구현·연동 계약은 [백엔드 README](backend/README.md), [전체 시스템 아키텍처](docs/service_architecture_zero_trust_v1.1.md), [실제 구조도](docs/server_file_structure_services_v1.0.md)를 참조한다.
