# 서버 파일 구조도

확인 시각: 2026-10-04 16:03:39 KST  
서버: Ubuntu 24.04 / SSH 계정 `se`  
프로젝트 기준 경로: `/home/se/sandboxes/drone-server-20261003`

서버에 SSH로 접속하여 파일명과 디렉터리를 확인한 결과입니다. 파일 내용이나 비밀번호·토큰 값은 수집하지 않았습니다. 다른 사용자 홈은 내부를 조회하지 않았습니다.

이 문서는 **전체 경로의 개요와 드론 샌드박스의 상세 구조**를 표시합니다. 설치 패키지, 캐시, Docker 내부 저장소, PostgreSQL 내부 데이터, 일부 기존 프로젝트의 하위 항목은 `… [내부 생략]`으로 접었습니다. 따라서 /home의 모든 라이브러리 파일을 나열한 전수 목록은 아닙니다. 심볼릭 링크는 대상 경로만 표시하고 따라가지 않았습니다. 실행 중인 서비스가 만드는 상태·로그·녹화 파일은 이후 변경될 수 있습니다.

## /home부터 보는 전체 개요

```text
/home/
├── bz2149/  # 다른 사용자 홈; 내부 미조회
├── se/  # SSH 계정 se의 홈
│   ├── .anaconda/
│   │   └── … [내부 생략]
│   ├── .cache/
│   │   └── … [내부 생략]
│   ├── .claude/
│   │   └── … [내부 생략]
│   ├── .conda/
│   │   └── … [내부 생략]
│   ├── .config/
│   │   └── … [내부 생략]
│   ├── .copilot/
│   │   └── … [내부 생략]
│   ├── .cupy/
│   │   └── … [내부 생략]
│   ├── .dotnet/
│   │   └── … [내부 생략]
│   ├── .fiftyone/
│   │   └── … [내부 생략]
│   ├── .ipython/
│   │   └── … [내부 생략]
│   ├── .jupyter/
│   │   └── … [내부 생략]
│   ├── .local/
│   │   └── … [내부 생략]
│   ├── .npm/
│   │   └── … [내부 생략]
│   ├── .nv/
│   │   └── … [내부 생략]
│   ├── .ssh/
│   │   └── … [내부 생략]
│   ├── .triton/
│   │   └── … [내부 생략]
│   ├── .vscode-server/
│   │   └── … [내부 생략]
│   ├── bin/
│   │   └── aihubshell
│   ├── capsim_demo/  # 기존 데모; 샌드박스와 별도
│   │   └── capsim2/
│   │       ├── .git/
│   │       │   └── … [내부 생략]
│   │       ├── shims/
│   │       │   └── … [내부 생략]
│   │       ├── .gitignore
│   │       ├── index.html
│   │       └── server.py
│   ├── JupyterLAB/  # 기존 학교 Jupyter 환경
│   │   ├── bin/
│   │   │   └── … [내부 생략]
│   │   ├── Capstone/
│   │   │   ├── .git/
│   │   │   │   └── … [내부 생략]
│   │   │   ├── data/
│   │   │   │   └── … [내부 생략]
│   │   │   ├── drone_yolo/
│   │   │   │   └── … [내부 생략]
│   │   │   ├── ERD/
│   │   │   │   └── … [내부 생략]
│   │   │   ├── obsidian/
│   │   │   │   └── … [내부 생략]
│   │   │   ├── 보고서/
│   │   │   │   └── … [내부 생략]
│   │   │   ├── 팀드라이브/
│   │   │   │   └── … [내부 생략]
│   │   │   ├── .gitignore
│   │   │   ├── 04_DL-Object-Detection_정리.html
│   │   │   ├── 05_드론사람탐지_개념정리.html
│   │   │   ├── 3. 설계명세서_서성훈_이시원_정서인_v1.2.hwpx
│   │   │   ├── 3. 설계명세서_서성훈_이시원_정서인_v1.3.hwpx
│   │   │   ├── 3. 설계명세서_서성훈_이시원_정서인_v1.4 (1).hwpx
│   │   │   ├── 3. 설계명세서_서성훈_이시원_정서인_v1.5.hwpx
│   │   │   ├── 3. 설계명세서_서성훈_이시원_정서인_v2.0.hwpx
│   │   │   ├── 3. 설계명세서_서성훈_이시원_정서인_v2.0_관리단위재구성.hwpx
│   │   │   ├── 3. 설계명세서_서성훈_이시원_정서인_v2.1.hwpx
│   │   │   ├── 3. 설계명세서_서성훈_이시원_정서인_v2.1_시험용_GRACE반영전.hwpx
│   │   │   ├── 3. 설계명세서_서성훈_이시원_정서인_v2.1_쪽번호수정.hwpx
│   │   │   ├── 3. 설계명세서_서성훈_이시원_정서인_v2.2.hwpx
│   │   │   ├── 3. 설계명세서_서성훈_이시원_정서인_v2.3.hwpx
│   │   │   ├── hwp5-0.1.0-py3-none-any.whl
│   │   │   ├── README.md
│   │   │   ├── 발표_예상질문_비전.md
│   │   │   └── 설계명세서_서성훈_이시원_정서인_v1.6.hwpx
│   │   ├── etc/
│   │   │   └── … [내부 생략]
│   │   ├── include/
│   │   │   └── … [내부 생략]
│   │   ├── lib/
│   │   │   └── … [내부 생략]
│   │   ├── share/
│   │   │   └── … [내부 생략]
│   │   ├── jupyter.log
│   │   ├── jupyter_info_8359.txt
│   │   ├── jupyter_info_8405.txt
│   │   ├── jupyter_info_8745.txt
│   │   ├── jupyter_info_8964.txt
│   │   ├── jupyter_info_9562.txt
│   │   ├── jupyter_info_9946.txt
│   │   ├── lib64  # 심볼릭 링크 → lib
│   │   └── pyvenv.cfg
│   ├── miniconda3/  # 기존 Conda 설치
│   │   ├── bin/
│   │   │   └── … [내부 생략]
│   │   ├── compiler_compat/
│   │   │   └── … [내부 생략]
│   │   ├── conda-meta/
│   │   │   └── … [내부 생략]
│   │   ├── condabin/
│   │   │   └── … [내부 생략]
│   │   ├── condarc.d/
│   │   │   └── … [내부 생략]
│   │   ├── envs/
│   │   │   └── … [내부 생략]
│   │   ├── etc/
│   │   │   └── … [내부 생략]
│   │   ├── include/
│   │   │   └── … [내부 생략]
│   │   ├── lib/
│   │   │   └── … [내부 생략]
│   │   ├── libexec/
│   │   │   └── … [내부 생략]
│   │   ├── man/
│   │   │   └── … [내부 생략]
│   │   ├── pkgs/
│   │   │   └── … [내부 생략]
│   │   ├── share/
│   │   │   └── … [내부 생략]
│   │   ├── shell/
│   │   │   └── … [내부 생략]
│   │   ├── ssl/
│   │   │   └── … [내부 생략]
│   │   ├── x86_64-conda-linux-gnu/
│   │   │   └── … [내부 생략]
│   │   ├── .condarc
│   │   ├── .nonadmin
│   │   ├── _conda
│   │   ├── LICENSE.txt
│   │   └── uninstall.sh
│   ├── repos/  # 기존 저장소; 샌드박스와 별도
│   │   ├── mappo/
│   │   │   ├── .claude/
│   │   │   │   └── … [내부 생략]
│   │   │   ├── .git/
│   │   │   │   └── … [내부 생략]
│   │   │   ├── checkpoints/
│   │   │   │   └── … [내부 생략]
│   │   │   ├── mappo/
│   │   │   │   └── … [내부 생략]
│   │   │   ├── model/
│   │   │   │   └── … [내부 생략]
│   │   │   ├── onpolicy/
│   │   │   │   └── … [내부 생략]
│   │   │   ├── onpolicy.egg-info/
│   │   │   │   └── … [내부 생략]
│   │   │   ├── scripts/
│   │   │   │   └── … [내부 생략]
│   │   │   ├── wandb/
│   │   │   │   └── … [내부 생략]
│   │   │   ├── .gitignore
│   │   │   ├── environment.yaml
│   │   │   ├── LICENSE
│   │   │   ├── README.md
│   │   │   ├── requirements.txt
│   │   │   ├── setup.py
│   │   │   └── tea_debug.log
│   │   └── scripts/
│   │       └── … [내부 생략]
│   ├── sandboxes/
│   │   └── drone-server-20261003/  # Ubuntu 24.04 드론 개발 샌드박스
│   ├── venvs/  # 기존 Python 가상환경
│   │   └── state/
│   │       └── … [내부 생략]
│   ├── .bash_history
│   ├── .bash_logout
│   ├── .bashrc
│   ├── .claude.json
│   ├── .gitconfig
│   ├── .lesshst
│   ├── .netrc
│   ├── .profile
│   ├── .sudo_as_admin_successful
│   ├── .wget-hsts
│   ├── .Xauthority
│   ├── b
│   ├── echo
│   ├── jupyter_lab_execute.sh  # 학교 Jupyter 실행 스크립트
│   └── Miniconda3-latest-Linux-x86_64.sh
└── swapfile  # 호스트 스왑 파일
```

## 드론 샌드박스 상세 구조

```text
/home/se/sandboxes/drone-server-20261003/
├── app/  # 배포 원본 Python 코드
│   ├── main.py
│   ├── probes.py
│   └── vision_worker.py
├── config/  # 배포 원본 서비스 설정
│   ├── jupyter_config.py
│   └── mediamtx.yml
├── data/  # DB·영상·작업 상태·백업 영속 데이터
│   ├── backups/  # 같은 디스크의 DB·코드/설정 백업
│   │   ├── 20261004T063920Z-2044330/
│   │   │   ├── config.tar
│   │   │   ├── database.dump
│   │   │   ├── restore-catalog.txt
│   │   │   └── SHA256SUMS
│   │   └── pre-settings-20261004-062953/
│   │       ├── config.tar
│   │       ├── database.dump
│   │       └── SHA256SUMS
│   ├── jupyter-home/  # 샌드박스 Jupyter 사용자 설정
│   │   ├── .ipython/
│   │   │   └── … [내부 생략]
│   │   ├── .jupyter/
│   │   │   └── … [내부 생략]
│   │   ├── .local/
│   │   │   └── … [내부 생략]
│   │   └── .nv/
│   │       └── … [내부 생략]
│   ├── missions/  # 임무별 영상·메타데이터·결과
│   │   └── sample/
│   │       ├── crops/
│   │       ├── logs/
│   │       ├── metadata/
│   │       ├── results/
│   │       └── video/
│   │           ├── 2026-10-03_03-25-07-127742.mp4
│   │           ├── 2026-10-03_03-25-36-460323.mp4
│   │           └── 2026-10-03_03-26-28-656497.mp4
│   ├── postgres/  # PostgreSQL 관리 데이터; 내부 생략
│   │   └── … [내부 생략]
│   └── worker-status.json  # Vision 프로세스 상태; 모델 대기 여부 포함
├── db/  # DB 초기화 SQL
│   └── init.sql
├── docs/  # 서버 문서
│   └── server_file_structure.md  # 이 문서
├── evidence/  # 환경 점검·해시·시험 결과
│   ├── 20261004/
│   │   ├── applied-config.json
│   │   ├── checked-at.txt
│   │   ├── components.json
│   │   ├── dockerfile-check.log
│   │   ├── doctor.txt
│   │   ├── engine-boot-enabled.txt
│   │   ├── final-backup-check.txt
│   │   ├── final-backup-path.txt
│   │   ├── gpu-jobs-after.txt
│   │   ├── gpu-jobs-before.txt
│   │   ├── jupyter-login.txt
│   │   ├── listeners.txt
│   │   ├── media-before.json
│   │   ├── probe-fault-test.txt
│   │   ├── recordings-check.txt
│   │   ├── requirements-running.lock
│   │   ├── restore-test.txt
│   │   ├── services-before.json
│   │   ├── services-final.json
│   │   ├── source-hashes.sha256
│   │   └── token-log-check.txt
│   ├── setup-archives/
│   │   ├── docs.tar
│   │   ├── final-sources.tar
│   │   ├── settings-20261004.tar
│   │   ├── settings-docs-20261004.tar
│   │   └── update.tar
│   ├── app-image.txt
│   ├── base-image.txt
│   ├── db-after-restart.txt
│   ├── docker-info.txt
│   ├── docker-version.txt
│   ├── existing-processes-after.txt
│   ├── health-after-restart.json
│   ├── host-services.txt
│   ├── initial-services.json
│   ├── listeners.txt
│   ├── mount-audit.json
│   ├── nvidia-smi.txt
│   ├── os-packages.lock
│   ├── python-version.txt
│   ├── recordings.sha256
│   ├── runtime-downloads.sha256
│   ├── sample.m3u8
│   ├── service-images.txt
│   ├── services-final.json
│   ├── source-transfer.tar
│   ├── storage.txt
│   ├── verification-after-restart.json
│   └── verification.json
├── logs/  # 설치 및 작업 로그
│   ├── deploy.log
│   ├── jupyter-settings-20261004.log
│   ├── media-recreate.log
│   ├── pull.log
│   ├── sample-video.log
│   └── settings-20261004.log
├── runtime/  # 샌드박스 전용 Docker 실행 파일·소켓·저장소
│   ├── client/
│   │   ├── buildx/
│   │   │   └── … [내부 생략]
│   │   ├── cli-plugins/
│   │   │   ├── docker-buildx
│   │   │   └── docker-compose
│   │   ├── .token_seed
│   │   └── .token_seed.lock
│   ├── docker/
│   │   ├── containerd
│   │   ├── containerd-shim-runc-v2
│   │   ├── ctr
│   │   ├── docker
│   │   ├── docker-init
│   │   ├── docker-proxy
│   │   ├── dockerd
│   │   └── runc
│   ├── docker-data/
│   │   └── … [내부 생략]
│   ├── docker-exec/
│   │   └── … [내부 생략]
│   ├── daemon.json
│   ├── docker.pid
│   ├── docker.sock
│   ├── docker.tgz
│   └── drone-sandbox-engine.service
├── scripts/  # 전용 엔진·서비스 관리 및 점검
│   ├── backup.sh
│   ├── bootstrap.sh
│   ├── docker.sh
│   ├── doctor.sh
│   ├── mission_dirs.py
│   ├── sample-video.sh
│   ├── stack.sh
│   ├── start-engine.sh
│   ├── sync-workspace.sh
│   ├── verify-backup.sh
│   └── verify.py
├── secrets/  # 인증 파일; 파일명만 표시
│   ├── db-password  # DB 인증 값; 내용 미기재
│   └── jupyter-token  # 샌드박스 Jupyter 인증 값; 내용 미기재
├── workspace/  # API·Vision·Jupyter가 마운트하는 실행/개발 경로
│   ├── app/
│   │   ├── __pycache__/
│   │   │   └── … [내부 생략]
│   │   ├── main.py
│   │   ├── probes.py
│   │   └── vision_worker.py
│   ├── config/
│   │   ├── jupyter_config.py
│   │   └── mediamtx.yml
│   ├── data/  # 호스트의 마운트 자리; Jupyter 내부에서는 data/가 연결됨
│   └── scripts/
│       ├── backup.sh
│       ├── bootstrap.sh
│       ├── docker.sh
│       ├── doctor.sh
│       ├── mission_dirs.py
│       ├── sample-video.sh
│       ├── stack.sh
│       ├── start-engine.sh
│       ├── sync-workspace.sh
│       ├── verify-backup.sh
│       └── verify.py
├── .dockerignore
├── .env  # DB 접속 환경 변수; 내용 미기재
├── .gitignore
├── bootstrap.log
├── compose.gpu.yml
├── compose.yml
├── DEPLOYMENT.md
├── design-reference.md
├── Dockerfile
├── export.tar
├── README.md
├── requirements.in
├── requirements.lock
├── SETTINGS-20261004.md
└── settings-results-20261004.tar
```

## 주요 경로와 역할

| 서버 경로 | 역할 |
|---|---|
| `/home/se/JupyterLAB` | 기존 학교 Jupyter 환경. 새 샌드박스와 별도 |
| `/home/se/miniconda3` | 기존 호스트 Conda 환경 |
| `/home/se/repos`, `/home/se/capsim_demo`, `/home/se/venvs` | 기존 프로젝트·가상환경 |
| `/home/se/sandboxes/drone-server-20261003/Dockerfile` | Ubuntu 24.04 기반 개발 이미지 정의 |
| `/home/se/sandboxes/drone-server-20261003/compose.yml`, `compose.gpu.yml` | API·DB·Jupyter·Vision·미디어 서비스와 GPU 연결 설정 |
| `/home/se/sandboxes/drone-server-20261003/requirements.lock` | 검증된 Python 패키지 버전 |
| `/home/se/sandboxes/drone-server-20261003/app`, `config`, `scripts` | 배포 원본 코드·설정·관리 스크립트 |
| `/home/se/sandboxes/drone-server-20261003/workspace` | 컨테이너에서 실제로 사용하는 코드 및 Jupyter 개발 폴더 |
| `/home/se/sandboxes/drone-server-20261003/data/postgres` | PostgreSQL의 실제 저장 데이터 |
| `/home/se/sandboxes/drone-server-20261003/data/missions` | 임무 영상·메타데이터·크롭·분석 결과·로그 |
| `/home/se/sandboxes/drone-server-20261003/data/backups` | DB와 코드·설정의 로컬 백업 |
| `/home/se/sandboxes/drone-server-20261003/data/worker-status.json` | Vision 준비 프로세스 상태 |
| `/home/se/sandboxes/drone-server-20261003/secrets` | 인증 파일. 값을 문서에 복사하지 않음 |
| `/home/se/sandboxes/drone-server-20261003/runtime` | 전용 Docker 엔진 및 내부 실행 데이터 |
| `/home/se/sandboxes/drone-server-20261003/evidence` | 환경 검증 기록과 시험 결과 |

### 배포 원본과 실행 경로

`app/`, `config/`, `scripts/`는 배포 원본입니다. 현재 컨테이너는 `workspace/` 아래의 사본을 마운트해 사용합니다. 코드 변경을 반영하려면 서버 프로젝트 루트에서 다음 순서로 실행합니다.

```bash
cd /home/se/sandboxes/drone-server-20261003
scripts/sync-workspace.sh
scripts/stack.sh restart api vision
```

Compose 설정을 변경한 경우에는 `scripts/stack.sh up -d`로 반영합니다. 로컬 PC에서 수정한 파일은 먼저 서버 프로젝트 루트에 배포해야 합니다.

### 컨테이너에서 보이는 경로

| 서버 호스트 경로 | 컨테이너 경로 | 설명 |
|---|---|---|
| `/home/se/sandboxes/drone-server-20261003/workspace` | `/workspace` | API·Vision·Jupyter 작업 공간 |
| `/home/se/sandboxes/drone-server-20261003/data` | `/data` | 서비스 데이터. Jupyter에서는 `/workspace/data`로도 접근 |
| `/home/se/sandboxes/drone-server-20261003/data/postgres` | `/var/lib/postgresql/data` | DB 데이터 |
| `/home/se/sandboxes/drone-server-20261003/secrets/jupyter-token` | `/run/secrets/jupyter-token` | Jupyter 인증 파일 |

컨테이너 내부의 `/opt/venv`, `/usr` 등은 이미지 안의 환경이며 호스트 `/home/se/miniconda3`와 별개입니다.

### 임무 저장 디렉터리 규칙

다음은 새 임무에 적용할 저장 규칙입니다. 상세 구조도의 실제 폴더와 구분되는 템플릿입니다.

```text
data/missions/<mission_id>/
├── video/       # 원본 영상
├── metadata/    # 촬영 시각·자세 등 부가 정보
├── crops/       # 탐지 대상 크롭
├── results/     # 분석 결과
└── logs/        # 임무 기록
```

비전모델은 사용자가 별도로 학습 중입니다. 현재 샌드박스에 학습 완료 모델을 연결한 상태는 아니며, 모델 저장 경로도 아직 확정하지 않았습니다.

학교 Jupyter의 여러 `jupyter_info_*.txt`는 실제 존재하는 안내 파일이며, 파일명만으로 해당 포트가 모두 현재 실행 중이라고 판단하지 않습니다.

## 관리 시 구분할 위치

- 코드 작업: `app/`, `config/`, `scripts/`, Jupyter의 `workspace/`.
- 영속 데이터: `data/`. 백업은 같은 디스크의 DB·코드/설정 백업이며 인증 값과 원본 영상은 포함하지 않습니다.
- Docker 내부: `runtime/`. 서비스 관리는 `scripts/stack.sh`를 사용합니다.
- 호스트의 기존 환경: `JupyterLAB/`, `miniconda3/`, `repos/`, `venvs/` 등은 새 샌드박스와 분리되어 있습니다.

전용 Docker 엔진의 systemd 등록 링크는 `/etc/systemd/system/`에 있으므로 이 /home 구조도 밖에 있습니다. 샌드박스는 호스트 커널·GPU·네트워크를 공유하는 컨테이너 환경입니다.
