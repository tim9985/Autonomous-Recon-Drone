# 구축 결과 — 2026-10-03

서버 `<SERVER_HOST>`의 `/home/se/sandboxes/drone-server-20261003`에 독립 개발 환경을 구축했습니다. 사용자의 추가 지시에 따라 컨테이너 OS는 Ubuntu 24.04로 변경했습니다.

## 실제 실행 환경

| 항목 | 확인 결과 |
|---|---|
| 호스트 | Ubuntu 24.04.4 LTS / i9-11900 / RAM 약 62GiB |
| 앱·GPU 컨테이너 | Ubuntu 24.04.5 LTS / Python 3.12.3 |
| GPU | RTX 3090 / 호스트 드라이버 580.173.02 |
| PyTorch | 2.8.0+cu128 / CUDA 런타임 12.8 |
| torchvision | 0.23.0+cu128 |
| JupyterLab | 4.6.4 |
| FastAPI / Uvicorn | 0.142.2 / 0.54.0 |
| OpenCV / NumPy | 4.14.0.94 / 2.5.2 |
| DB | PostgreSQL 16.9 / PostGIS 3.5 |
| 미디어 | MediaMTX 1.21.1 / FFmpeg SRT 지원 |
| 전용 엔진 | Docker 29.8.2 / 샌드박스 내부 데이터·소켓·실행 파일 |

PostGIS·MediaMTX는 각 공급자의 전용 이미지입니다. Ubuntu 24.04는 API·Vision worker·JupyterLab에 적용합니다. 컨테이너는 호스트 커널을 공유합니다.

## 통과한 확인

- RTX 3090 인식 및 실제 CUDA 텐서 연산
- PostGIS 좌표 생성과 SRID 4326 조회
- API 준비 상태 HTTP 200 및 DB·저장소 연결
- JupyterLab 미인증 요청의 로그인 요구, 별도 토큰 로그인, 독립 작업 경로 조회
- 1080p·30fps 합성 영상의 SRT 송신·녹화 및 송신 중 HLS 플레이리스트 HTTP 200
- 저장된 합성 영상 1,458프레임 디코딩
- 전용 Docker 엔진 재시작 후 서비스 복구
- 재시작 후 DB 확인 값 및 녹화 파일 SHA-256 유지
- 모든 쓰기 가능한 컨테이너 마운트가 샌드박스 아래에 위치
- 새 서비스 포트의 localhost 바인딩
- 기존 학교 JupyterLab 및 확인한 기존 Python·MongoDB 프로세스 유지

재시작 후에도 `flight_enabled=false`, `model_loaded=false`입니다. Vision worker는 검증된 모델과 영상 파이프라인 연결을 기다리는 준비 프로세스입니다. 디코딩 처리량은 실제 탐지·추론 속도가 아닙니다.

## 보존과 실행

원본 영상은 `data/missions/<mission_id>/video/`에 구간으로 저장합니다. `metadata`, `crops`, `results`, `logs` 디렉터리 생성 도구를 제공합니다. 자동 녹화 삭제를 껐습니다. DB 데이터와 Jupyter 사용자 설정도 별도 bind mount에 저장합니다.

전용 엔진의 systemd unit을 추가하고 부팅 시 시작하도록 활성화했습니다. 컨테이너는 `unless-stopped` 정책으로 복구합니다. 호스트 재부팅 자체는 수행하지 않았습니다. 호스트에는 이 샌드박스 전용 systemd unit 링크가 추가됐으며, 호스트 패키지·NVIDIA 드라이버·SSH·방화벽 설정은 변경하지 않았습니다.

## 접속

- 환경 페이지: `http://localhost:18400`
- JupyterLab: `http://localhost:18459/lab`
- API 문서: `http://localhost:18400/docs`

로컬 SSH 터널을 연결한 상태에서 사용합니다. 샌드박스 JupyterLab 토큰은 서버의 `secrets/jupyter-token`에 있으며, 문서나 로컬 소스에 복사하지 않았습니다. 기존 학교 JupyterLab `8359`는 별도로 유지합니다.

운영 명령과 터널 재접속 방법은 `README.md`에 정리했습니다. Python 버전은 `requirements.lock`, OS 패키지는 `evidence/os-packages.lock`, 이미지 ID·digest는 `evidence`에 기록했습니다.

## 아직 완료되지 않은 범위

현재는 내부 개발 환경입니다. 운영자 인증·관제 웹·실제 추론 모델·촬영 시각 및 자세 연결·임무/안전 로직·복구 업로드는 앞으로 앱과 장비를 연결해 구현해야 합니다.

학교의 외부 HTTPS/WSS·SRT UDP 허용 경로와 TLS, Pi·영상 장비·FC·RC 연결은 확인되지 않았습니다. 일반 SSH TCP 터널을 SRT UDP 현장 경로로 사용하지 않았습니다.

저장 경로는 호스트 `/` 파일시스템이며 구축 후 가용량은 약 4TiB입니다. 이는 학교의 5TB 개별 할당·호스트 재설치/컨테이너 재생성 후 영속성 정책을 증명하지 않습니다. 확인한 범위는 이 샌드박스 엔진의 재시작 전후 데이터 유지입니다.

상세 검증 결과는 `evidence/verification-after-restart.json`과 마운트·리스너·해시 기록을 확인하세요.
