# 로컬 REAL 통합 서버

Windows PC의 `Capstone-Pipeline` WSL2 Ubuntu 24.04에서 REAL 서비스를 실행한다. 복원 기준은 Git 번들 `6c083f2`다. REAL 런타임은 `/home/se/sandboxes/drone-real`에 있다. 원본 배포 기록의 DB 덤프, 인증서, 기존 이미지, RTX 3090 TensorRT 엔진은 제공된 파일에 없어 새 DB와 인증서를 사용한다.

## GitHub 관제 웹

[실지도](https://localhost:18443/local-real-map.html)와 [학교 SIM](https://localhost:18443/)은 GitHub `main`의 `f4bf4ff` 관제 화면 배포본이다. 기존 `19443` 관제 홈에서 실지도로 바로 이동한다. 기존 [REAL 실기체 콘솔](https://localhost:19443/real-console.html)은 전용 주소에서 열린다. [GitHub 배포 커밋](https://github.com/won11794-bit/capstone1_project/commit/f4bf4ff61aecf98f93190fb5bb5f88db783c397b)

- 두 화면에서 `real-admin` 계정과 같은 비밀번호를 사용할 수 있다. 새 웹은 지도 및 개인별 게이트웨이 규격에 맞는 별도 백엔드와 DB를 사용한다.
- 새 웹의 공개 CA는 이 폴더의 `school-web-ca.crt`에 있다. 기존 REAL 콘솔은 아래의 REAL CA를 사용한다.
- 새 웹 배포본은 이 작업 폴더의 `web-source`에서 관리한다. GitHub를 가져온 뒤 WSL에서 `python3 local/deploy-school-web.py --refresh`를 root로 실행해 갱신한다. 처음 배포할 때는 `--maps`를 사용한다.

## 시작 및 접속

PowerShell에서 백업 작업 폴더로 이동해 실행한다.

```powershell
.\Start-Real.ps1
wsl -d Capstone-Pipeline -- docker compose -f /home/se/sandboxes/drone-real/compose.json ps
```

- 기존 REAL 콘솔 주소는 <https://localhost:19443/real-console.html>이다. 브라우저에서 접속하기 전에 아래 WSL 공유 경로에 있는 로컬 CA를 현재 사용자 신뢰 저장소에 등록할 수 있다.
- 운영자 이름은 `real-operator`다. 암호는 WSL의 `/home/se/sandboxes/drone-real/secrets/operator-login.json`에서 확인한다.
- 새 관리자 이름은 `real-admin`이다. 암호는 WSL의 `/home/se/sandboxes/drone-real/secrets/admin-login.json`에서 확인한다.
- 로컬 CA 공개 파일은 `\\wsl.localhost\Capstone-Pipeline\home\se\sandboxes\drone-real\secrets\ca.crt`에 있다.
- 호스트 로그는 Windows의 `%LOCALAPPDATA%\CapstoneLocal`에 있다. 컨테이너 로그는 위 명령의 `ps`를 `logs --tail=50`으로 바꿔 확인한다.
- Windows 재부팅 뒤에는 시작 스크립트를 다시 실행한다.

브라우저에 이 로컬 CA를 신뢰하도록 설정하려면 PowerShell에서 실행한다.

```powershell
$ca = '\\wsl.localhost\Capstone-Pipeline\home\se\sandboxes\drone-real\secrets\ca.crt'
Import-Certificate -FilePath $ca -CertStoreLocation 'Cert:\CurrentUser\Root'
```

## 이미지 및 데이터

Docker 29, Compose, NVIDIA Container Toolkit이 WSL에 설치되어 있다. `local/build-images.sh`는 REAL API와 비전 이미지 계보를 다시 빌드한다. REAL API는 기존 의존성 잠금 파일에서 필요한 패키지를 사용한다. 비전은 RTX 4080 SUPER에서 CUDA 기반 PyTorch FP16 모드로 설정했다.

WSL의 도구 설치는 공식 안내를 따랐다. [Docker Engine Ubuntu 안내](https://docs.docker.com/engine/install/ubuntu/), [NVIDIA Container Toolkit 안내](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html)

```powershell
wsl -d Capstone-Pipeline -- bash local/build-images.sh
wsl -d Capstone-Pipeline -u root -- python3 local/setup-real.py
.\Start-Real.ps1
wsl -d Capstone-Pipeline -u root -- python3 local/register-model.py
wsl -d Capstone-Pipeline -- docker compose -f /home/se/sandboxes/drone-real/compose.json up -d vision
```

`setup-real.py`는 기존 로컬 DB와 발급한 신원을 재사용한다. `register-model.py`는 가중치 해시를 확인하고 관제 API에서 동일 모델 등록을 재시도할 수 있다. 학교의 별도 4K 실시간 분석기는 기존 TensorRT 엔진에 의존한다. 로컬에서 기동하는 카메라 수신기와 REAL 비전 worker의 임무 프레임 분석은 별도 경로다.

지도 및 PC SIM 입력은 `/home/se/sandboxes/drone-dev`에, 인수 평가셋은 `/home/se/drone_yolo/data/test_v2`에 배치했다. 구역 계산기를 재현하려면 백업에 빠진 `drone-regional-base:20261022` 원본 이미지가 필요하다.

## Raspberry Pi 인수

### 다른 인터넷망에서 접속

PC의 WSL2와 Pi를 같은 Tailscale 네트워크에 등록한다. PC 이름은 `capstone-local-server`, Pi 이름은 `capstone-drone-gateway`로 사용한다. 공유기의 포트 전달 설정 없이 Pi의 LAN IP가 바뀌어도 노드 이름으로 접속한다. [Tailscale WSL2 설치](https://tailscale.com/docs/install/windows/wsl2), [Raspberry Pi OS 설치](https://tailscale.com/docs/install/linux)

현재 Pi는 Tailscale 주소 `<Pi Tailscale 주소>`로 등록되어 있고 `pi-capstone-tunnel.service`는 부팅 자동 시작으로 설정되어 있다. 이 PC에서 Tailscale 경유 SSH 로그인을, Pi에서 서버의 실지도 HTTPS 응답을 검증했다. Pi를 관리할 때는 `.\Connect-Gateway.ps1 -Tailnet -Shell`을 사용한다.

작업 폴더의 PowerShell에서 서버 노드를 로그인시키고 사설망의 SSH 전달을 켠다. 처음에는 Tailscale이 안내하는 로그인 주소에서 서버를 승인한다.

```powershell
wsl -d Capstone-Pipeline -u root -- bash local/enable-tailnet-gateway.sh
```

Pi에서 Tailscale을 설치한 후 같은 계정의 네트워크에 등록한다.

```sh
sudo tailscale up --hostname=capstone-drone-gateway --accept-dns=false --accept-routes=false
```

- PC에서 기존 Pi의 SSH 호스트 키와 로그인 키를 그대로 사용해 관리 셸을 열려면 `.\Connect-Gateway.ps1 -Tailnet -Shell`을 실행한다.
- 자동 터널을 끈 상태에서 PC에서 Pi에 수동 터널을 열려면 `.\Connect-Gateway.ps1 -Tailnet`을 실행한다. Pi에서는 실지도 장치 API가 `https://localhost:18443`, 기존 REAL 장치 API가 `127.0.0.1:19444`, 기존 카메라 수신기가 `127.0.0.1:19560`으로 연결된다.
- Pi가 부팅할 때 스스로 서버에 접속하게 하려면 [Pi 터널 서비스](pi-capstone-tunnel.service)를 사용한다. Pi에서 전용 Ed25519 키를 생성해 `/etc/drone-gateway/tailnet-ssh-key`에 두고 `gateway` 계정만 읽도록 설정한다. 서버의 `/etc/drone-real-ssh/authorized_keys`에는 Pi의 공개키를 등록한다. 서버 공개 호스트 키(작업 폴더의 `local/capstone-server-known-hosts`, 저장소에는 넣지 않음)를 Pi의 `/etc/drone-gateway/tailnet_known_hosts`에 설치한다. 기존 터널이 같은 포트를 사용하고 있으면 중지한 후 서비스를 `/etc/systemd/system`에 모드 `0644`로 설치하고 `sudo systemctl daemon-reload`와 `sudo systemctl enable --now pi-capstone-tunnel`을 실행한다.
- 실지도 게이트웨이는 **`real-admin` 계정에 등록**되어 있다 (2026-11-20). 실지도에서 기체·영상을 보려면 `real-admin`으로 로그인한다. Pi는 장치 API 주소의 계정별 경로를 그대로 쓰고, SSH 터널 호스트는 `https://localhost:18443`이다. 이 서비스의 공개 CA는 `local/school-web-ca.crt`에 있다. [실지도 게이트웨이 연결 규격](https://github.com/won11794-bit/capstone1_project/blob/main/docs/실기체-게이트웨이.md)
- Pi 쪽 텔레메트리 브리지와 영상 송출 서비스는 [`server/real-map-gateway`](../../real-map-gateway/README.md)에 있다. 설치 파일과 키는 Pi의 `~/real-map-gateway-install`에 올려 두었고, Pi 셸에서 `sudo bash ~/real-map-gateway-install/install.sh`로 설치한다. 키를 다시 받아야 하면 실지도의 **연결 정보**에서 같은 키를 조회할 수 있다.

### 같은 네트워크에서 접속

Pi 전원이 켜지고 이 PC에서 Pi SSH 접속이 가능한 네트워크에 들어오면 아래 스크립트로 기존 Pi SSH 로그인에 역방향 포워딩을 연다. Pi의 SSH 호스트 키는 기존 등록값과 대조한다. 기존 학교 터널이 Pi에서 같은 로컬 포트를 사용하면 전환 전에 해당 터널을 중지해야 한다.

```powershell
.\Connect-Gateway.ps1
```

기존 `drone-gateway` SSH 별칭의 주소가 바뀌면 검증한 호스트 키와 새 주소를 Windows의 SSH 설정에 반영한다. 역방향 포워딩이 연결된 동안 Pi의 `127.0.0.1:19444`는 이 PC의 REAL 장치 API, `127.0.0.1:19560`은 카메라 수신기를 가리킨다. 서로 다른 인터넷망이면 두 기기가 공유하는 VPN 또는 접근 가능한 SSH 중계가 필요하다.

Pi에는 이 서버에서 새로 발급한 장치용 `ca.crt`, `client.crt`, `client.key`, `token`을 승인된 SSH 연결로 전송한다. 원본은 WSL의 `/home/se/sandboxes/drone-real/secrets/device`에 있다. Pi의 기존 백엔드 TLS 이름은 `backend.internal`을 유지한다.

Pi에 예전 연결 점검기가 설치되어 있으면 이 폴더의 `gateway_link.py`를 배포한다. 이 버전은 새 백엔드가 인증된 연결에 반환하는 HTTP 200과 빈 명령 목록을 정상으로 인식한다. 포워딩과 장치 신원을 전환한 후 Pi에서 `python3 /opt/drone-gateway/gateway_link.py check`를 실행한다. 이 점검은 연결 인증만 확인한다.

피어가 먼저 접속하는 구성이 필요할 때 사용할 전용 SSH 리스너는 WSL의 `127.0.0.1:7540`에 있다. `/etc/drone-real-ssh/authorized_keys`에 Pi 공개키를 등록하고 라우팅을 구성해야 사용할 수 있다. 이 계정이 전달할 수 있는 대상은 장치 API와 카메라 두 포트다.

## 백업

이 PC가 유일한 중앙서버이므로 발표·비행 전후에 백업한다. 서비스는 멈추지 않는다.

```powershell
wsl -d Capstone-Pipeline -- bash local/backup-local.sh
```

- 결과는 WSL의 `~/capstone-backups/<날짜-시각>/` (모드 0700): 새 관제 웹 DB · REAL DB 덤프 · 게이트웨이 등록·임무·비행 기록과 키 시드 묶음 · `SHA256SUMS` · 복구 방법 `RESTORE.txt`
- 묶음에는 게이트웨이 키를 만드는 시드가 들어 있다. 공유하거나 저장소에 올리지 않는다.
- REAL 비전 녹화 상한은 `setup-real.py`가 compose를 만들 때 30,000 MB로 넣는다 (기존 3,000 MB면 4K 기준 약 8분 뒤 녹화가 멈춤). 이미 띄운 서버에 반영하려면 compose의 `VISION_RECORD_MAX_MB`를 고친 뒤 `vision`만 다시 만든다.

## 로컬 검증 결과

- REAL 관제 HTTPS, 운영자 로그인, DB 마이그레이션 11개와 비전 모델 로딩을 확인했다.
- `test_v2` 1,407장 PyTorch FP16 평가에서 AP50 0.6461, 임계값 0.20 기준 재현율 73.64%, 탐지 중앙값 28.0ms를 기록했다.
- 로컬 SSH 경유로 장치 인증서·토큰의 장치 API 응답, 잘못된 토큰 거부, 합성 MPEG-TS 50프레임 디코딩을 확인했다.
- 실제 Pi 접속과 FC·카메라 수신은 Pi 전원과 접속 경로가 확보된 후 검증한다. 현재 REAL API의 `flight_enabled`와 `physical_validation_ready`는 `false`다.
- 2026-11-20: Pi Tailscale 터널 자동 기동 · Pi에서 실지도 HTTPS 200 (서버 CA로 검증). 실지도 게이트웨이를 `real-admin`에 등록하고 가짜 FC → 브리지 → 관제 웹 시험 10개 항목 통과 (지상 · 비행 · 무선 끊김 · 복구 · 종료 · HOLD 거부). 실제 FC·카메라 연결은 기체 전원을 켠 뒤 확인한다.
- FC 텔레메트리 포트의 송신 주기(`MAV2_*` · `MAV3_*`)가 0이라 지상국 요청 없이는 HEARTBEAT만 온다. 변경안은 `DroneProject_Docs/04_실비행/FC_파라미터_변경안_11-20.param`.
