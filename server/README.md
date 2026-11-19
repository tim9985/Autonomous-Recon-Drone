# 중앙서버 (sandbox) — 새 컴퓨터에 다시 세우기

학교 서버 `/home/se/sandboxes/` 에서 돌던 관제 · 업무 API · DB · 비전 worker 를 다른 컴퓨터로 옮기는 틀이다. 2026-11-19 서버 보안 강화로 이전.

- 이 폴더 = 서버 실행본 **사본** — 비밀 · DB · 미디어 · 엔진 저장소는 뺐다. 내부 주소 · 시험 계정 비밀번호는 `<SERVER_HOST>` · `<REDACTED>` 로 가렸다
- 서버에 있던 그대로의 사본 · DB · 이미지 · 비밀은 **전송 꾸러미**에 있다 → [`../MIGRATION.md`](../MIGRATION.md)
- ⚠ 이 절차는 서버에서 확인한 구성을 바탕으로 썼다. 새 컴퓨터에서 처음부터 끝까지 해 본 것은 아니다

## 1. 구성 한눈에

| 환경 | 역할 | 컨테이너 | DB | 서버에서 열던 곳 (모두 127.0.0.1) |
|---|---|---|---|---|
| `drone-server` | 공용 Docker 엔진 · 초기 API · Jupyter · 영상 (MediaMTX) | database · api · vision(v0) · jupyter · media | `drone` | API 18400 · DB 18432 · Jupyter 18459 · RTSP 18554 · HLS 18888 |
| `drone-dev` | 개발 · **SIM 관제 웹** · 업무 API · 지도 · PC SIM 연동 · 경로 계산 | database · backend · vision(SIM) · web · gateway · map · egress · device-tunnel · city-planner | `drone_dev` | 관제 HTTPS/WSS 18443 (relay) |
| `drone-real` | **실기체** 상태 · 비전 · 미디어 · 명령 증거 | database · backend · vision(REAL) · gateway | `drone_real` | 관제 19443 · 기체 mTLS 19444 (relay) |

호스트 프로세스 (컨테이너 밖 · systemd)

| 이름 | 하는 일 | 파일 |
|---|---|---|
| `drone-sandbox-engine` | 전용 dockerd (root) | `drone-server/scripts/start-engine.sh` · 서버에선 `runtime/` 의 정적 바이너리 |
| `drone-services-relay` | 18443 → dev gateway 소켓 | `drone-dev/scripts/tunnel_proxy.py` |
| `drone-real-relay` | 19443 · 19444 → REAL gateway · backend 소켓 | `drone-real/tools/real_relay.py` |
| `drone-real-camera-stream` | 기체 카메라 수신 (19560) | `drone-real/camera-live/school_camera_receiver.py` |
| (수동) 지상 모터 시험 웹 | 19800 · Pi 역방향 SSH 터널 경유 | [`ground-control/`](ground-control/) |

- 컨테이너는 거의 모두 `network_mode: none` — **Unix 소켓 + mTLS** 로만 통신 (zero-trust · `drone-server/docs/service_architecture_zero_trust_v1.2.md`)
- 컨테이너마다 고정 UID — dev 2101~2108 · REAL 2201~2205 · postgres 999 · sandbox 1001. 비밀 · 데이터 폴더도 이 숫자로 소유 → 풀 때 `tar --numeric-owner -p`
- 경로가 `/home/se/sandboxes/...` 로 박혀 있다 (`scripts/stack.sh` · relay · systemd) → **새 컴퓨터에서도 같은 경로**로 두는 게 가장 덜 고친다

## 2. 이미지 (8종) — [`images/IMAGES.md`](images/IMAGES.md)

| 이미지 | 쓰는 곳 | 다시 만들기 |
|---|---|---|
| `drone-sandbox:20261003` (= `sha256:27ee4624…`) | server api · jupyter · dev backend · web · gateway · egress · device-tunnel · REAL backend · gateway | `images/00_drone-sandbox.Dockerfile` |
| `drone-real-vision:20261007` | vision 기반 | `images/01_…` |
| `drone-vision:v12-20261014` | REAL · SIM vision | `images/02_…` |
| `drone-vision:v12-school-pc-20261104` | SIM vision (PC SIM 판) | `images/03_…` |
| `drone-school-map:20261007` | dev map | `images/04_…` |
| `drone-regional-planner:20261022` | city-planner · regional-* | `images/05_…` (기반 `drone-regional-base` 는 저장본에서) |
| `postgis/postgis:16-3.5@sha256:94146ac3…` | DB 3개 | Docker Hub 에서 digest 로 받기 |
| `bluenviron/mediamtx:1.21.1@sha256:5ce2a948…` | server media | Docker Hub |

- 가장 확실한 길 = 꾸러미의 `00_root/images/images.tar.zst` 를 `docker load` (서버 이미지 그대로)
- compose 가 이미지를 **ID (`sha256:27ee…`) 로** 부르는 곳이 있다 → load 뒤 `images-manifest.tsv` 대로 태그를 붙이거나 compose 를 태그 이름으로 바꾼다

## 3. 새 컴퓨터 준비

| 항목 | 기준 (학교 서버) | 메모 |
|---|---|---|
| OS | Ubuntu 24.04 | Windows 는 **WSL2 Ubuntu 24.04** 안에서 (Docker Desktop 보다 WSL 안 Docker Engine 이 경로 · UID 문제 적음) |
| GPU · 드라이버 | RTX 3090 · 580.178.04 · CUDA 13.0 | 이미지 안 torch 2.8.0+cu128 · TensorRT 11.3 (cu12) → 드라이버 **570 이상** |
| Docker | 전용 dockerd 28.x + compose | 일반 Docker Engine + compose plugin 이면 된다 |
| GPU 연결 | 장치 + 드라이버 라이브러리 **직접 마운트** (`libcuda.so.580.178.04` 등) | **드라이버 판이 다르면 그대로는 안 뜬다** → 4-⑤ |
| 디스크 | — | 이미지 ≈ 15 GB · 데이터 · DB 수 GB |

## 4. 복원 순서

```bash
# ① 꾸러미 확인
cd <꾸러미 폴더> && sha256sum -c SHA256SUMS && (cd 00_root && sha256sum -c SHA256SUMS)

# ② sandbox 3개 풀기 (서버 그대로 · root 소유 · UID 숫자 보존)
sudo mkdir -p /home/se/sandboxes/{drone-server,drone-dev,drone-real}
for e in drone-server drone-dev drone-real; do
  sudo tar --numeric-owner -xpf 00_root/data/sandbox_$e.tar -C /home/se/sandboxes/$e
done
#    sudo 스크립트를 못 돌렸으면: 09_server_readable.tar (읽을 수 있던 부분만) + 이 저장소의 server/

# ③ 비밀 (서버의 CA · 서비스 인증서 · 토큰 · DB 비밀번호 · 운영자 계정)
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in 00_root/secrets.tar.gz.enc | sudo tar -xzp -C /root/sec-restore
#    → <env>-secrets.tar · <env>-certs.tar 를 각 /home/se/sandboxes/<env>/ 에서 sudo tar --numeric-owner -xpf
#    인증서 만료: 내부 2027-01-02 · CA 2027-01-03 (발표까지 그대로 써도 된다)

# ④ 이미지
zstd -dc 00_root/images/images.tar.zst | sudo docker load
#    태그 없는 것 → images-manifest.tsv 의 ID 로 docker tag · postgis · mediamtx 는 docker pull <이름>@<digest> 로도 된다

# ⑤ GPU 마운트 고치기 (드라이버 판이 다를 때) — 3곳
#    drone-server/compose.gpu.yml · drone-dev/compose.vision.json · drone-real/compose.json 의 vision
#    방법 A (권장): NVIDIA Container Toolkit 설치 → 라이브러리 마운트 줄 지우고
#                  "deploy": {"resources": {"reservations": {"devices": [{"driver": "nvidia", "count": 1, "capabilities": ["gpu"]}]}}}
#                  ⚠ network_mode none · read_only 는 그대로 둔다
#    방법 B: 마운트 줄의 580.178.04 를 새 드라이버 판으로 (ls /lib/x86_64-linux-gnu/libcuda.so.*)

# ⑥ Docker 소켓 — 서버는 전용 엔진 (runtime/docker.sock) 을 썼다
#    일반 Docker 를 쓰면 각 scripts/stack.sh · drone-server/scripts/docker.sh 의 엔진 경로를 지우고 `docker compose ...` 로

# ⑦ DB — 빈 DB 로 띄운 뒤 덤프를 넣는다 (data/postgres 는 꾸러미에 없다 · 999 소유 빈 폴더)
sudo install -d -o 999 -g 999 -m 700 /home/se/sandboxes/drone-dev/data/postgres   # real · server 도 같게
cd /home/se/sandboxes/drone-dev && scripts/stack.sh up -d database       # init.sh 가 역할 · DB 생성 (비밀 필요)
#    역할 먼저: 비밀 묶음의 drone_dev.globals.sql (이미 있는 역할 오류는 무시)
#    그다음: docker exec -i <db 컨테이너> pg_restore -h /var/run/postgresql -U drone_owner -d drone_dev --clean --if-exists < 00_root/db/drone_dev.dump
#    REAL = drone_real.dump · server = drone.dump (-h 127.0.0.1 -p 18432 -U drone -d drone)

# ⑧ 서비스 올리기
cd /home/se/sandboxes/drone-server && scripts/stack.sh up -d
cd /home/se/sandboxes/drone-dev    && scripts/stack.sh up -d
cd /home/se/sandboxes/drone-real   && scripts/stack.sh up -d
sudo cp 00_root/meta/drone-*.service /etc/systemd/system/ && sudo systemctl daemon-reload \
  && sudo systemctl enable --now drone-services-relay drone-real-relay drone-real-camera-stream
```

## 5. 비전 worker — 새 GPU 에서 꼭 할 일

- 모델 폴더 `data/models/` (꾸러미 sandbox tar 안 · 원본 `01_models_deploy.tar` 의 `_pack_v12w_real` · `_pack_v12w_sim`)
- worker 는 **해시를 엄격하게** 본다 (`app/vision_ingest.py` `load_detector`) — `model.json` 에 엔진이 적혀 있고 `VISION_TRT=1` 이면 엔진 파일 해시가 맞아야 뜬다 · 백엔드에 등록된 모델 설정의 `engine_sha256` 도 맞아야 한다
- TensorRT 엔진은 **GPU 마다 다르다** — 서버 것은 RTX 3090 (`best_trt11.3.0.99_RTX3090.engine`) · 동료 PC (RTX 4070 등) 에선 못 쓴다

| 순서 | 할 일 | 어디 |
|---|---|---|
| 1 | 새 GPU 에서 엔진 만들기 (`imgsz=[736,1280]` · FP16) | `drone_yolo/deploy/vision_worker/app/tools/build_engine.py` |
| 2 | `model.json` 의 `engine.file` · `engine.sha256` 갱신 | `drone_yolo/deploy/vision_worker/tools/make_model_pack.py` |
| 3 | 백엔드에 모델 설정 새로 등록 → `active.json` 의 `model_config_id` 교체 | `POST /api/v1/configs/models` · `drone-real/docs/vision_backend_handoff_v1.0.md` · `drone-dev/docs/vision_integration_handoff_v1.3.md` |
| 4 | 인수 검증 — test_v2 AP50 ≈ 0.64 (경계 합치기) | `python -m app.tools.verify_detector --data <05_eval_sets 의 test_v2> --weights … --expect 0.64` |

- 급하면 `VISION_TRT=0` (PyTorch FP16 · 한 장 ≈ 40 ms · 5 FPS 는 된다) — 단, 등록된 설정에 엔진 해시가 있으면 3 은 해야 한다

## 6. 바깥 연결 — 새 주소로 바꿀 것

| 연결 | 학교 서버에서 | 바꿀 사람 |
|---|---|---|
| 관제 접속 (PC · 휴대폰) | SSH 7540 터널 → localhost 18443 · 19443 | 통합 담당 |
| 기체 게이트웨이 (Pi) | Pi → 서버 **역방향 SSH 터널** · mTLS 19444 · 카메라 19560 | 게이트웨이 담당 — Pi 의 터널 대상 주소 · known_hosts |
| PC SIM 연결기 | `Start-SchoolPC.ps1` · SSH 18443/18444 | 통합 담당 — PC 설치본의 서버 주소 |
| VWorld 지도 | egress 컨테이너 (비밀 `vworld-server.json`) · 도메인 등록 | 키의 등록 도메인 확인 |

## 7. 폴더

| 폴더 | 내용 |
|---|---|
| `drone-server/` · `drone-dev/` · `drone-real/` | 서버 실행본 사본 (compose · app · backend · school · web 빌드 · db migration · scripts · docs) |
| `ground-control/` | 지상 모터 시험 CLI · 웹 (키 · 결과 제외) |
| `images/` | Dockerfile 계보 |
| `env/` | 연구 환경 목록 (conda · pip freeze · GPU) |
| `SANDBOXES_README.md` | 서버 `sandboxes/` 원래 안내 |

- 서버 문서 원본: `drone-server/docs/server_file_structure_services_v1.2.md` (폴더 구조) · `service_architecture_zero_trust_v1.2.md` (구조) · `service_db_dataset_structure_v1.2.md` (DB)
- 관제 웹 `drone-dev/web/` 은 **빌드 결과물**이다 — 프론트 원본은 통합 담당 PC 에 있다
