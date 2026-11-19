# 학교 서버 파일 구조·운영 가이드 v1.2

기준일: 2026-10-14 (폴더 정리 기준은 2026-10-09, 비전 파일·설정은 2026-10-14 갱신), Asia/Seoul. 학교 서버의 현재 디렉터리·실행 마운트·서비스 상태·DB 메타데이터를 확인한 결과다. 전체 파일 전수 목록이 아닌 역할별 구조도이며, 키·토큰·DB 원시 내용·패키지·Docker 내부 파일은 펼치지 않는다.

관련 문서: [아키텍처 v1.2](service_architecture_zero_trust_v1.2.md), [서비스·DB·데이터셋 구조 v1.2](service_db_dataset_structure_v1.2.md). 세 문서는 같은 현재 경로·서비스·DB 확인 기준을 사용한다.

사용자가 제공한 `01_아키텍처_설계.md`, `02_서비스_DB_데이터셋_구조.md`, `03_파일구조_운영가이드.md`는 2026-10-07 기준의 참고 자료로 읽었다. 문서 안의 운영 절차를 실행 명령으로 취급하지 않았다. 그 문서의 날짜 경로·서비스 수·DB migration·시뮬 연결 설명을 현재 상태와 구분한다. 이번 v1.2는 파일 구조·경로 정리 문서 버전이며 API·지도·모델 버전이 아니다.

## 1. 현재 최상위 경로

```text
/home/se/
├── JupyterLAB/                 # 학교의 기존 Jupyter 환경, 이번 정리 대상 밖
├── miniconda3/                 # 기존 Python 환경, 이번 정리 대상 밖
├── models/                     # 기존 모델 관련 디렉터리, 내용·준비 상태 미검증
├── repos/                      # 기존 저장소, 이번 정리 대상 밖
├── capsim_demo/                # 기존 시뮬 관련 디렉터리, 이번 정리 대상 밖
├── venvs/                      # 기존 Python 가상환경, 이번 정리 대상 밖
├── bin/                        # 기존 홈 실행 도구
├── fix_gpu_backup-20261009-1120/ # 별도 GPU 변경 복구 자료, 이번 정리 대상 밖
└── sandboxes/
    ├── README.md               # 폴더명·역할만 설명하는 트리 안내
    ├── drone-server/           # 초기 서비스 + 모든 환경의 전용 Docker 기반
    ├── drone-dev/              # 개발·SIM 업무·관제·지도·통신 환경
    └── drone-real/             # 별도 REAL 데이터 저장 환경
```

숨김 디렉터리·다른 사용자 홈은 생략했다. `sandboxes` 아래 세 환경은 실제 디렉터리다. 날짜 이름의 이전 경로와 `drone-legacy` 바로가기는 없다. `directory-organization`도 최상위에서 제거했다.

| 환경 | 현재 역할 | 현재 실행 구성 |
|---|---|---|
| `drone-server` | 초기 Jupyter·상태 API·미디어·초기 DB·비전 대기 환경, 공용 전용 Docker 엔진 | 초기 서비스 5개 |
| `drone-dev` | 개발·SIM 관제 Web, 업무 API, 개발 DB, 공간 조회·통신·장치 연결 | 서비스 8개 |
| `drone-real` | 실기체 형식의 상태·비전·미디어·임무·명령 증거 저장·조회, 별도 DB·인증 | 서비스 4개 |

총 17개 실행 컨테이너 외에 이전 일회성 컨테이너 2개가 종료 상태로 보존돼 있다. 컨테이너·Compose 프로젝트 이름의 날짜 문자열은 기존 식별자이며, 디렉터리 이름이 아니다.

## 2. drone-server: 초기 환경과 Docker 기반

```text
/home/se/sandboxes/drone-server/
├── compose.yml                 # 초기 5개 서비스 실행 설정
├── compose.gpu.yml             # 초기 GPU 장치·라이브러리 연결 설정
├── app/                        # 초기 상태 API·worker 등의 관리 원본 코드
├── config/                     # Jupyter·MediaMTX 설정
├── workspace/                  # 초기 컨테이너의 실제 /workspace 마운트 원본
│   ├── app/                    # 컨테이너가 실행하는 코드 사본
│   ├── config/                 # 컨테이너가 읽는 설정 사본
│   ├── scripts/                # 컨테이너용 도구
│   └── data/                   # 작업 경로용 데이터 위치
├── db/init.sql                 # 초기 DB 생성 SQL
├── data/
│   ├── postgres/               # 초기 DB drone의 실제 저장 파일
│   ├── jupyter-home/           # 초기 샌드박스 Jupyter 작업·설정
│   ├── missions/               # 초기 임무·미디어 파일
│   ├── backups/                # 기존 초기 환경의 백업 도구가 만든 사본
│   └── worker-status.json      # 초기 worker 상태 보고
├── runtime/
│   ├── docker/                 # 전용 Docker·containerd 실행 파일
│   ├── client/                 # Compose 등 CLI 플러그인·클라이언트 설정
│   ├── daemon.json             # 전용 dockerd 설정
│   ├── docker.sock             # 현재 엔진 관리 Unix 소켓
│   ├── docker-data/            # 현재 이미지·컨테이너·쓰기 영역, 임의 수정·삭제 금지
│   ├── docker-exec/            # 현재 엔진 임시 실행 상태
│   └── drone-sandbox-engine.service # systemd 엔진 실행 정의
├── scripts/                    # 엔진·초기 Compose·백업·진단 관리
├── secrets/                    # 초기 DB 비밀번호·Jupyter 토큰, 공개 금지
├── logs/                       # 기동·운영 로그
├── docs/                       # 이 구조도와 초기 문서
├── evidence/
│   └── maintenance/            # 공유 가능한 정리·경로 이관·현재 서비스 검증 자료
└── backups/
    └── maintenance/            # 기존 directory-organization의 내용, root 관리자 전용
        ├── engine-root-migration-*/ # 엔진 복구 사본·세 DB 덤프·이전 설정
        ├── canonical-path-migration-*/ # 개발·REAL 경로 이관 전 복구 자료
        ├── original-scripts/   # 첫 폴더 정리 전 관리 스크립트
        ├── original-readmes/   # 첫 폴더 정리 전 README
        └── …                  # 이동·중복 해시·검증·일회성 도구 등의 과거 기록
```

`app/`를 수정했다고 `workspace/app/`에 자동 반영되지는 않는다. 실제 실행 마운트를 먼저 확인하고 해당 환경의 기존 동기화·검증 절차를 따른다. 초기 Jupyter는 학교의 `/home/se/JupyterLAB`과 별개다.

Docker 엔진 경로는 `/home/se/sandboxes/drone-server/runtime/docker-data`다. `drone-dev`와 `drone-real`도 이 엔진을 사용하므로 `drone-server` 전체를 초기 코드 사본으로 생각해 삭제하면 안 된다. [Docker 공식 문서](https://docs.docker.com/engine/daemon/)에서도 엔진 데이터 디렉터리가 이미지·컨테이너·설정 등을 보관한다고 설명한다.

## 3. drone-dev: 개발·관제·지도·통신 환경

```text
/home/se/sandboxes/drone-dev/
├── compose.yml                 # 개발 기본 서비스
├── compose.school.yml          # map·egress·device-tunnel 등 학교 확장
├── app/                        # TLS·인증·gateway·Web·비전 대기·통신·SIM API 진입점
├── backend/
│   ├── drone_backend/          # 업무 API: 임무·개정·계획·상태·미디어·후보·명령
│   └── tests/                  # 배포된 업무 코드 검증
├── school/                     # 지도·공용 SIM 로그인·장치 터널·학교 업무 확장
│   ├── backend.py              # 학교용 업무 라우팅
│   ├── map_service.py          # 등록된 구역·셀·타일·지형 조회
│   ├── egress.py               # 허용된 외부 지도 조회
│   ├── device_tunnel.py        # 장치 연결 경로
│   ├── sim_link.py             # 기존 로컬 연결 연동 코드
│   ├── observability.py        # 통신 기록 처리
│   ├── local_tools/            # 로컬 전달용 도구
│   └── …                      # 계약·응답·서비스 기동·전송 코드
├── web/                        # 현재 배포된 React/Web 빌드, 프론트 원본 저장소가 아님
├── web-allowlist.json           # 제공 가능한 화면 파일 목록
├── db/
│   ├── init.sh                 # 초기 계정·DB 설정
│   ├── migrations/             # 현재 적용 이력 001–011
│   ├── checks/                 # 스키마·권한·입력 검사 SQL
│   └── …                      # 적용·검증·백업 관리 Python
├── data/
│   ├── postgres/               # 개발 DB drone_dev
│   ├── backend/                # 업무 미디어·임무 파일
│   ├── spatial/                # 읽기 전용 지도 파생본
│   ├── models/                 # SIM 모델 사본·환경 manifest·활성 모델 ID
│   ├── vision/                 # 개발 비전 작업·전송 공간
│   └── communication/          # gateway·web 등의 통신 기록 작업 공간
├── secrets/                    # 개발 DB·서비스·SIM 장치·작업자 자격증명
├── certs/                      # 인증서 관련 자료
├── sockets/                    # database·backend·gateway·web·map·egress 연결
├── scripts/                    # 배포된 개발 환경 운영·진단 도구
├── docs/                       # 개발 계약·운영 안내
├── evidence/                   # 배포·검증·학교 공간자료 기록
├── backups/                    # 개발 DB·코드·화면 복구 사본
└── archives/
    ├── staging/                # 이전 업로드·배포 후보, 현재 실행 소스가 아님
    ├── tools/                  # 이전 일회성 수정·진단 도구
    ├── bundles/                # 이전 전달용 압축 묶음
    └── diagnostics/            # 이전 진단 로그
```

현재 실행 서비스는 `database`, `backend`, `vision`, `web`, `gateway`, `map`, `egress`, `device-tunnel`이다. `egress`와 `device-tunnel`은 호스트 네트워크 예외이며 나머지는 `none`이다. `gateway`는 학교 서버 내부 HTTPS 중계이며 현장 드론 게이트웨이와 별개다.

개발 DB의 현재 `drone` 스키마는 migration 이력 테이블을 포함해 23개(업무 22개), `simulation`은 3개, `observability`는 1개, `integration`은 1개다. PostGIS 관리 객체는 업무 테이블 수와 구분한다. 첨부 2026-10-07 문서의 001–008·서비스 7개 설명보다 이후 확장이 포함돼 있다. 이번 정리에서 DB·테이블을 생성하거나 없애지 않았다. 별도 신규 시뮬 전용 DB 분리는 이 문서로 구축 완료를 주장하지 않는다.

`archives`의 일부 동일 파일은 하드 링크로 저장 공간을 공유한다. 수정·재사용할 때 별도 작업 위치로 복사한다. 현재 서비스 코드·DB·개인키는 이 중복 통합 대상이 아니다.

## 4. 지도 저장과 업무 DB를 구분하기

```text
drone-dev/data/spatial/
├── catalog.json                # 등록 파일·내용 해시·릴리스 목록
├── campus-04e1b46514574d45/      # 캠퍼스 지도 파생본
│   ├── manifest.json           # 릴리스 설명
│   ├── regions.sqlite3         # 읽기 전용 구역 조회 인덱스
│   ├── regions.tif             # 구역 라벨 래스터
│   └── …                      # 월드·격자·색상·건물·시설·지형·검증 자료
└── gumi-ae4a5aa18d076a00/        # 구미 지도 파생본
    ├── manifest.json           # 릴리스 설명
    ├── regions.sqlite3         # 읽기 전용 구역 조회 인덱스
    ├── regions.tif             # 구역 라벨 래스터
    └── …                      # 피복·혼합 비율·소속·입력·보정·검증 자료
```

위 두 폴더의 존재와 catalog 경로를 확인했다. 전체 GIS 내용·구역 수·릴리스 해시 재검증은 이번 범위가 아니다. 첨부 문서의 좌표계·버전·셀·대표점 보정 설명은 당시 자료이며 자동으로 현재 검증 결과로 간주하지 않는다.

PostgreSQL은 임무·선택·관측 등의 업무 기록을 저장한다. 지도 SQLite는 저장된 공간자료를 조회하는 인덱스이며 업무 DB를 대체하지 않는다. 지도 의미분할 생성·Unreal/SITL의 실제 실행은 로컬 담당자 환경의 역할이고, 학교 map 서비스가 새 의미분할이나 실제 비행을 실행하는 것은 아니다.

## 5. drone-real: 실기체 형식 데이터 저장 환경

```text
/home/se/sandboxes/drone-real/
├── compose.json                # REAL 서비스 정의
├── app/                        # REAL 서비스 기동·TLS·GPU 탐지·JSONL 전송
├── drone_backend/              # REAL FastAPI API·입력 계약
├── db/
│   ├── init-real.sh            # REAL DB 초기 설정
│   └── migrations/             # REAL 적용 이력 001–010
├── data/
│   ├── postgres/               # 별도 DB drone_real
│   ├── backend/                # REAL 업무 미디어·임무 저장소
│   ├── models/                 # REAL 모델 파일·manifest·활성 모델 ID
│   └── vision/                 # REAL 비전 결과·재전송 공간
├── secrets/                    # REAL 전용 DB·장치·비전·gateway 자격증명
├── sockets/                    # REAL 전용 database·backend·gateway 연결
├── scripts/stack.sh            # REAL Compose 실행 도구
├── tools/                      # 배포·검증·TLS 중계 관리 도구
├── tests/                      # 저장 계약·인증·연동 검사
├── docs/                       # REAL 구축·비전·프론트 계약
├── evidence/                   # REAL 검증 결과
├── backups/                    # REAL 복구 사본
├── export/                     # 전달용 산출물
└── openapi-real.json            # REAL API 목록·입출력 규격
```

현재 실행 서비스는 `database`, `backend`, `vision`, `gateway`이며 모두 네트워크 `none`이다. `drone` 스키마는 업무 19개와 migration 이력 1개로 총 20개이며, 001–010가 적용됐다. `drone-dev`와 업무 DB·계정·개인키·미디어 저장소를 합치지 않는다.

2026-10-14 REAL·SIM vision을 `app.vision_ingest` CUDA 탐지 워커로 전환하고 실행 명령과 Compose 설정을 일치시켰다. DEV의 `compose.vision.json`을 기존 Compose 파일에 함께 적용하며 서버 `scripts/stack.sh`에도 반영했다. 기존 학습 폴더는 사용하지 않고 모델 사본과 신원을 분리했다. 비행은 비활성 상태를 유지한다.

## 6. 로컬 원본·서버 실행본·보관 사본

| 위치 | 역할 |
|---|---|
| `D:\Capstone1\Sever\drone-services` | 이 작업공간의 통합 개발·DB·관리 도구 소스. 전체 최신 학교 확장 소스가 회수됐다는 뜻은 아님 |
| `D:\Capstone1\Backend` | 업무 백엔드·REAL 계약·관리 도구·증거 |
| `D:\Capstone1\Sever\drone-sandbox` | 초기 샌드박스의 로컬 소스·관리 도구 |
| `D:\Capstone1\Sever\docs` | 현재 구조도·설계·이관 문서 |
| `C:\workspace\자율정찰드론관제시스템` | 첨부 문서가 가리키는 별도 담당자 로컬 소스·공간자료·시뮬 환경. 이번에 경로·실행 상태 확인 안 함 |
| 서버의 각 `app`, `backend`, `school`, `web`, `workspace` 마운트 원본 | 현재 컨테이너가 실제 읽는 코드·화면 |
| 각 환경의 `archives`·`backups` | 역사적 준비 사본·복구 자료. 날짜가 최신이어도 실행본이 아님 |

현재 로컬 변경본을 경로 정리 작업에 섞어 새 업무 코드로 배포하지 않았다. 실행본 판정은 Docker 마운트 → 실제 실행 명령·이미지 → 배포 증거·manifest → 필요한 파일 해시 순서로 한다. 과거 `active_stage` 기록은 이동된 역사적 stage를 현재 소스처럼 다루는 근거가 아니다.

## 7. directory-organization 정리 결과

README는 사용자가 읽는 안내서다. 기존 `directory-organization`은 이전 설정·DB 덤프·엔진 전체 복구 사본·이동 목록·중복 해시를 담았으므로 README로 대체할 수 없었다.

내용의 완전 삭제는 하지 않고 같은 파일시스템에서 `drone-server/backups/maintenance`로 이동했다. 하위 항목의 inode·소유자·권한·크기를 대조했으며, 관리자 전용 디렉터리 권한 `0700`을 적용했다. 기존 최상위 경로는 없어졌고 호환 링크도 만들지 않았다. 저장소 위치 정리이며 디스크 공간 확보 작업은 아니다.

공유 가능한 현재 증거는 `drone-server/evidence/maintenance`에 둔다. 전체 컨테이너 정의·DB 덤프·엔진 사본은 비밀 값이 들어갈 수 있어 일반 문서·공유 묶음에 포함하지 않는다. 과거 증거 내부의 이전 경로는 당시 기록으로 보존하며, 복구할 때 현재 위치에 맞춰 경로를 확인한다. 백업은 같은 학교 서버 디스크에 있으므로 외부 백업을 뜻하지 않는다.

## 8. 접속·운영 확인

| 환경 | 현재 서버 loopback 접속 |
|---|---|
| 개발 관제 HTTPS/WSS | `https://localhost:18443` |
| REAL 관제 HTTPS/WSS | `https://localhost:19443` |
| REAL 장치 mTLS | `127.0.0.1:19444`, 인증서·토큰 필요 |
| 초기 상태 화면 | `http://localhost:18400` |
| 초기 샌드박스 Jupyter | `http://localhost:18459`, 별도 샌드박스 토큰 |

외부 PC의 localhost는 SSH 터널로 학교 서버 loopback에 연결한 상태를 뜻한다. 학교 기존 Jupyter 포트는 초기 샌드박스 Jupyter와 별개다. 이번 정리에서 외부 포트를 열거나 Cloudflare Tunnel을 설치하지 않았다.

```bash
cd /home/se/sandboxes/drone-server
scripts/docker.sh info --format '{{.DockerRootDir}}'
scripts/stack.sh ps
cd ../drone-dev
scripts/stack.sh -f compose.school.yml ps
cd ../drone-real
scripts/stack.sh ps
systemctl is-active drone-sandbox-engine drone-services-relay drone-real-relay
```

개발 학교 확장을 재시작·재배포할 때는 `compose.yml`과 `compose.school.yml`의 병합 설정을 함께 검토한다. REAL은 현재 실행 명령과 Compose 차이를 해소하고 모델 준비 상태를 검증하기 전 일괄 재배포하지 않는다. 날짜가 남은 컨테이너 이름만 바꾸려고 새 프로젝트를 만들지 않는다.

`data/postgres`·`runtime/docker-data`를 직접 편집·삭제하지 않는다. 현재 소켓·런타임 상태는 영구 업무 데이터와 구분한다. `down -v`, 엔진 전체 prune, 초기 환경 전체 삭제는 단순 폴더 정리에 포함되지 않는다.

## 9. 검증 범위

- 엔진 저장소 경로 변경 후 기존 19개 컨테이너 ID·이미지·설정·쓰기 영역을 보존했고 17개가 실행 중임을 확인했다. 종료 컨테이너 2개는 이전 상태를 유지했다.
- 초기 상태 API의 live·ready·components, Jupyter의 인증된 API, MediaMTX 관리 조회가 정상이다. Jupyter 커널 수는 검사 시점 0개였다.
- 개발·REAL CA 검증 HTTPS와 미인증 거부, DB 연결·기존 업무 행 수 보존을 확인했다. REAL 인증·mTLS·WSS 검사 12개, 개발 로그인·WSS 검사 7개를 통과했다.
- 세 DB의 보존된 custom dump 목록을 `pg_restore --list`로 읽었다. 이번 작업에서는 전체 복원 시험을 반복하지 않았다.
- 엔진·개발·REAL systemd 유닛이 실행 중이고 설정 재로딩 대기 상태가 없음을 확인했다.
- 폴더 정리의 현재 증거: `drone-server/evidence/maintenance/engine-migration-verification.json`, `maintenance-relocation.json`, `final-layout-check.json`.

2026-10-09 폴더 정리에서는 서버 재부팅, 실제 기체·테더링·영상 송수신·모델 추론·프론트 화면 전체 기능·GIS 전체 해시 검사를 수행하지 않았다. 2026-10-14 GPU 모델 추론·UE 프레임 저장 검증은 아래 보완 절을 따른다. 파일·계정·소켓 격리는 호스트 CPU·GPU·RAM·디스크 및 관리자 권한을 별도 물리 자원으로 나누는 것은 아니다.

## 2026-10-14 비전 파일 보완

```text
drone-dev/
├── compose.vision.json          # CUDA 이미지·GPU 장치/읽기 전용 라이브러리·CPU/RAM 상한
├── app/vision_ingest.py         # 모델 무결성·CUDA 로딩·환경별 워커 기동
├── app/vision_sim.py            # SIM claim·입력 검사·완료 재전송
├── app/vision_core/             # 기존 비전 담당자 탐지·후보·색상 코드
└── data/models/                # active.json + v12_f91_swa/{best.pt,engine,posture.json,model.json}

drone-real/
├── app/vision_ingest.py         # REAL 탐지 워커
├── app/vision_outbox.py         # 기존 JSONL ACK 전송기
├── app/vision_core/             # 비전 담당자 탐지 코드
└── data/models/                # REAL 활성 ID와 환경 manifest, 업로드 모델/엔진
```

신규 배포 후보는 DEV `archives/staging/vision-pose-20261014`에 보관한다. 실제 실행 파일은 app/backend, 실제 모델은 data/models다. REAL `backups/vision-pose-*`는 적용 전 소스·설정 복구 사본이고 현재 실행 경로가 아니다. 최신 연동 계약은 `vision_integration_handoff_v1.2.md`이며 공개 근거는 각 환경 `evidence/vision-pose-verification.json`이다. 서버 README는 기존 폴더 역할 트리로 유지한다.

## 비전 v1.2 파일 보완 (2026-10-14)

활성 모델은 각 환경 data/models/v12_f91_swa이며 posture.json과 엔진도 버전 안에서 해시를 고정한다. 기존 모델은 복구용이다. 신규 이미지 drone-vision:v12-20261014, REAL migration 010_real_appearance_event.sql을 적용했다. 이번 배포 전 소스·설정 백업은 drone-real/backups/vision-v12-20261014T124302Z, 배포 해시 근거는 각 환경 evidence/vision-v12-deployment.json이다. archives/staging/vision-v12-review-20261014 및 vision-v12-final은 검증 작업 사본이며 실행 경로가 아니다. 서버 README의 폴더 안내 역할은 유지한다.
