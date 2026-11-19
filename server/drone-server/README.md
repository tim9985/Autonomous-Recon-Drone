# 현재 서버 폴더 안내

현재 아키텍처와 DB 구조는 [아키텍처 v1.2](../drone-server/docs/service_architecture_zero_trust_v1.2.md), [서비스·DB·데이터셋 v1.2](../drone-server/docs/service_db_dataset_structure_v1.2.md)를 따른다.

현재 실제 폴더는 drone-server·drone-dev·drone-real이며 날짜 이름 링크와 drone-legacy는 제거했다. 폴더명 안내는 [sandboxes 트리](../README.md), 현재 상세 구조는 [파일 구조·운영 가이드 v1.2](../drone-server/docs/server_file_structure_services_v1.2.md)를 따른다. 정리 복구 자료는 drone-server/backups/maintenance에 보존한다.

# 드론 서버 개발 샌드박스

## 2026-10-04 서버 설정 보완

인수인계서 v1.1에 맞춰 기존 환경에 설정을 적용했습니다. 전체 결과는 `SETTINGS-20261004.md`를 확인하세요.

- 재구축 Python 패키지: `requirements.lock` 사용. Ubuntu 기반 이미지와 PostGIS·MediaMTX 이미지는 확인된 digest로 고정.
- 컨테이너 stdout/stderr 로그: 각 10MB × 3개로 제한. 임무 영상·보존 기록을 자동 삭제하는 설정이 아닙니다.
- JupyterLab·Vision worker 헬스체크와 `/health/components` 상태 조회 추가. worker의 20초 기준은 운영 진단이며 비행 장애 감지 타이머가 아닙니다.
- Jupyter 시작 로그의 토큰 값 가림. 기존 토큰 인증은 유지합니다.

서버 상태 점검:

```bash
cd /home/se/sandboxes/drone-server
scripts/doctor.sh
```

DB와 설정 백업, 임시 DB 복원 검증:

```bash
scripts/backup.sh
# 위 명령이 출력한 백업 디렉터리를 사용
scripts/verify-backup.sh /home/se/sandboxes/drone-server/data/backups/실제_백업_디렉터리
```

백업은 DB와 코드·설정만 포함하고, 인증 비밀 값과 원본 영상은 포함하지 않습니다. 백업은 같은 디스크에 있어 디스크 장애 대비 별도 백업을 대신하지 않습니다. 복원 시험은 새 임시 DB에서 수행하고 기존 `drone` DB를 덮어쓰지 않습니다. 백업 자동 스케줄은 설정하지 않았습니다.

서버 루트의 개발 코드를 실행 경로로 반영할 때:

```bash
scripts/sync-workspace.sh
scripts/stack.sh restart api vision
```

로컬 PC의 코드 변경은 먼저 원격 프로젝트 루트에 배포해야 합니다. Compose 설정을 변경했을 때는 `scripts/stack.sh up -d`로 적용합니다. 모델 가중치·입력 영상·현장 인증 계약은 아직 연결되지 않았습니다.

사용자 수정 지시에 따라 **Ubuntu 24.04 / Python 3.12**로 구성합니다. 설계서 v1.0의 Ubuntu 22.04 항목을 이번 배포에서 변경했습니다.

서버 경로: `/home/se/sandboxes/drone-server`

## 구성

| 서비스 | 서버 내부 접속 | 역할 |
|---|---|---|
| FastAPI | `127.0.0.1:18400` | 환경 상태 페이지, DB·저장소 준비 상태, API 개발 시작점 |
| PostgreSQL 16 / PostGIS | `127.0.0.1:18432` | 별도 DB, 공간정보 확장 |
| JupyterLab | `127.0.0.1:18459` | 독립 Python·CUDA 개발 환경, 토큰 인증 |
| Vision worker | 별도 포트 없음 | CUDA 환경 확인, 상태 기록; 검증된 모델 연결 대기 |
| MediaMTX SRT | `127.0.0.1:18890/UDP` | 샌드박스 내부 SRT 수신 |
| HLS | `127.0.0.1:18888` | 샘플 영상 재생 경로 |
| 녹화 재생 | `127.0.0.1:18999` | 녹화 조회 |
| 미디어 관리·지표 | `127.0.0.1:18497`, `127.0.0.1:18498` | 내부 개발 상태 확인 |

JupyterLab과 운영 프로세스는 별도 컨테이너로 실행됩니다. 노트북을 실행하지 않아도 API·DB·미디어 프로세스가 유지됩니다. Vision worker는 아직 추론 모델·영상 프레임 파이프라인이 연결되지 않은 준비 프로세스입니다. 탐지 성능과 5fps 추론 목표를 달성한 것으로 간주하지 않습니다.

## 분리 범위

기존 프로젝트·학교 JupyterLab·Conda 환경을 컨테이너에 연결하지 않습니다. 코드·패키지·DB·로그·Docker 데이터와 런타임은 이 샌드박스 아래에 둡니다. GPU 장치와 필요한 NVIDIA 드라이버 라이브러리만 연결합니다.

이 구성은 VM 수준의 보안 격리가 아닙니다. 컨테이너는 호스트 커널과 GPU를 공유하며, 기존 방화벽·라우팅을 변경하지 않기 위해 호스트 네트워크를 공유합니다. 서비스는 전부 loopback에 바인딩합니다. 전용 Docker 엔진은 root로 동작하며 전용 systemd unit 링크 2개가 호스트에 추가됩니다. GPU 메모리의 독점 할당은 없습니다.

기존 호스트 패키지·NVIDIA 드라이버·SSH 설정·방화벽은 변경하지 않습니다. 자원 제한은 컨테이너별로 적용합니다.

## 시작·중지

서버에서:

```bash
cd /home/se/sandboxes/drone-server
scripts/stack.sh ps
scripts/stack.sh up -d
scripts/stack.sh stop
scripts/stack.sh logs --tail=100 api vision media
```

`stack.sh`는 전용 Docker 소켓과 Compose 프로젝트만 사용합니다. `sudo` 비밀번호가 필요할 수 있습니다. `docker system prune`, `compose down -v`, DB·영상 데이터 삭제를 운영 절차로 사용하지 않습니다.

컨테이너는 `unless-stopped`, 전용 엔진은 systemd로 자동 재시작하도록 설정합니다. 사용자가 명시적으로 중지한 컨테이너는 자동 재개하지 않습니다. 서비스 재시작은 비행 임무를 시작하지 않습니다.

## 로컬 접속

개발 PC에서:

```bash
ssh -p 7540 -N -L 18400:localhost:18400 -L 18459:localhost:18459 -L 18888:localhost:18888 -L 18999:localhost:18999 se@<SERVER_HOST>
```

브라우저:

- 환경 상태: `http://localhost:18400`
- API 문서: `http://localhost:18400/docs`
- 새 JupyterLab: `http://localhost:18459/lab`

샌드박스 JupyterLab에는 별도의 랜덤 토큰을 생성합니다. 서버에서 아래 명령으로 확인하고 로그인 화면에 입력합니다. 토큰을 Git이나 문서에 붙여넣지 마세요.

```bash
cat /home/se/sandboxes/drone-server/secrets/jupyter-token
```

학교 JupyterLab의 `8359` 포트는 이 환경과 별개입니다.

## 저장

임무 저장 트리:

```text
data/missions/<mission_id>/
  video/
  metadata/
  crops/
  results/
  logs/
```

새 임무 디렉터리 생성:

```bash
scripts/stack.sh exec -T api python scripts/mission_dirs.py example-mission
```

원본 녹화는 fMP4 구간으로 저장하고 자동 삭제를 끕니다. Pi의 업로드·해시 대조·영구 저장 확인 프로토콜은 아직 구현하지 않았습니다. 저장소 전체 용량과 가용량은 `evidence`에 기록하지만, 학교의 5TB 사용자 할당이나 재생성 후 영속성을 증명하지 않습니다. 현재 디렉터리는 호스트 `/` 파일시스템에 있습니다.

## 검증과 버전 기록

`evidence/verification.json`에 Ubuntu 버전, GPU 텐서 연산, PostGIS 공간정보 연산, API 준비 상태, Jupyter 인증, 샘플 SRT 녹화·디코딩 결과를 기록합니다. 합성 영상 시험은 실제 Pi 링크·모바일 회선·탐지 모델 시험을 대체하지 않습니다.

Python 패키지는 설치 후 `requirements.lock`, OS 패키지는 `os-packages.lock`, 컨테이너 이미지는 digest와 ID를 기록합니다. 다시 구축할 때 검증된 버전을 사용하도록 유지하세요. GPU 드라이버는 호스트 제공 버전입니다.

## 현장 배포 전 남은 항목

- 학교 관리자: 외부 HTTPS/WSS와 SRT UDP 허용 경로·TLS·저장소 영속성 확인
- 앱 구현: 별도 운영자 계정·로그인, 제어권, 상태·명령 검증, 장애 감시·재개 승인
- 영상 처리: 촬영 시각·자세 sidecar, 추론 모델, 크롭·분석 결과, 복구 업로드
- Pi/FC: 실제 장비 연결, 영상 코덱·MAVLink, RC 보호 및 비행 전 시험

현재 웹은 내부 개발용 상태 페이지입니다. 모바일 관제 웹이나 비행 가능한 완성 시스템으로 사용하지 않습니다.
