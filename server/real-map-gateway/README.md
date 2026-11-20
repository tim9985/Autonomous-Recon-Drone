# 실지도 게이트웨이 (지상 Pi → 관제 웹)

지상 Raspberry Pi가 기체 텔레메트리와 카메라 영상을 **실지도 관제 웹**(`capstone1_project`, 기본 `https://localhost:18443`)으로 보낸다. 서버 쪽 규격은 관제 웹 저장소의 `docs/실기체-게이트웨이.md`다(프로토콜 v1: `sessions` → 1초마다 `exchange`).

| 파일 | 역할 |
|---|---|
| `real_map_gateway.py` | 텔레메트리 브리지 — 지상 무선 모듈의 MAVLink를 **읽기만** 해서 위치·상대고도·속도·배터리·무장·비행 여부를 1초마다 전송 |
| `real-map-gateway.service` | 위 브리지의 systemd 서비스 (`gateway` 계정 · 부팅 자동 시작) |
| `real-map-camera.service` | 관제 웹 저장소의 `tools/ground_camera_publish.py`로 영상 송출 (분배기 출력 5606) |
| `install.sh` | Pi 설치 (sudo) — 파일 배치 · 키 권한 · 분배기에 5606 추가 · 서비스 시작 · 점검 |
| `fake_fc.py` | 기체 없이 시험·리허설용 가짜 FC (가상 시리얼에 합성 MAVLink) |
| `test_real_map_gateway.py` | 오프라인 단위 시험 (`python3 -m unittest test_real_map_gateway.py`) |

## 안전 원칙

- 시리얼은 **읽기 전용**으로 연다. FC에는 아무것도 쓰지 않는다 (`request_streams_hz`를 켠 경우에만 텔레메트리 주기 요청 `MAV_CMD_SET_MESSAGE_INTERVAL`을 보낸다).
- `remote_control_allowed`는 항상 `false` → 서버가 대기(HOLD)·복귀(RETURN_HOME)를 보내지 않는다. 혹시 오면 `REJECTED`.
- 예상 경로(`ROUTE_PREVIEW`)는 `/var/lib/real-map-gateway/route-preview.json`에 보관만 한다 (`execution_enabled: false`).
- 등록 키는 `/etc/drone-gateway/real-map-key` (root:gateway 0640). 저장소·채팅·로그에 남기지 않는다.

## 설치 (Pi)

1. 관제 웹 **실지도 → 실기체 상태 → 게이트웨이 등록**으로 장치 주소와 키를 받는다. 서버와 Pi가 SSH 터널(`pi-capstone-tunnel`)로 이어져 있으면 장치 주소의 호스트는 `https://localhost:18443`이다.
2. 설치 폴더(`~/real-map-gateway-install`)에 이 폴더의 파일, `ground_camera_publish.py`, 아래 두 설정 파일, 키 파일 `real-map-key`(0600)를 둔다.
   - `real-map.json` — `device_url` · `ca_file` · `key_file` · `serial` · `baud` · `mavlink_module` · `request_streams_hz`
   - `real-map-camera.env` — `DEVICE_URL=<장치 주소>` · `CAMERA_ARGS=--copy-hevc --payload-type 97` (RunCam WiFiLink 2 · OpenIPC = H.265 · RTP 97 · 11-11 수신 기록)
3. `sudo bash ~/real-map-gateway-install/install.sh` → 마지막의 `--check`가 `OK`이고 두 서비스가 `active (running)`이면 끝.

## 운영

```sh
journalctl -u real-map-gateway -u real-map-camera -f        # 상태 변화만 기록
cat /var/lib/real-map-gateway/status.json                    # 최근 교환 · 수신 메시지 수
sudo systemctl stop real-map-gateway                          # 시리얼을 다른 프로그램에 넘길 때
python3 /opt/real-map-gateway/real_map_gateway.py --config /etc/drone-gateway/real-map.json --probe 10
                                                              # (서비스 멈춘 뒤) 10초 동안 받은 MAVLink 종류·주기
```

- 실지도에서 **게이트웨이 대기** = Pi→서버 교환 끊김, **기체 신호 대기** = Pi는 살아 있는데 FC HEARTBEAT가 3초 넘게 없음.
- `status.json`의 `fc`: GPS 고정 종류 · 위성 수 · HDOP · 배터리 전압 · FC 경고 문구(STATUSTEXT, 예: `PreArm: GPS 1: Bad fix`) — 지도에 위치·배터리가 안 나올 때 먼저 본다 (전류 센서가 없어 잔량 %는 FC가 −1로 보냄 → 지도에는 빈칸).
- 위치가 안 나오고 `messages`에 `HEARTBEAT`만 보이면 FC가 그 무선 포트로 데이터를 안 보내는 것 — FC의 `MAVn_*` 송신 주기(11-20 판독값 전부 0)를 올리거나, `real-map.json`의 `request_streams_hz`를 `2`로 (11-20 현재 Pi는 `2`로 켜 둠 · FC 파라미터 적용 뒤 `0`으로).
- 영상: 카메라 RTP(H.265 · 4K · 페이로드 97)를 변환 없이 보낸다(`--copy-hevc`, Pi 4는 4K 변환 불가). 페이로드 번호가 다르면 ffmpeg가 `dimensions not set`으로 계속 재시작한다. 1080p 송출을 권장한다.
- 영상이 없을 때 순서: `journalctl -u drone-camera-rx`의 `PKT` 값이 0이면 공중 수신이 없음(카메라 송신 확인) → 카메라는 유선(eth0, NetworkManager 프로필 `drone-camera-wired` ↔ 카메라 OpenIPC 기본 주소)으로 핑·RTSP 554·`/image.jpg`를 확인할 수 있다. RTSP가 닫혀 있고 스냅샷이 비면 카메라의 영상 프로그램이 멈춘 것이다.
- 되돌리기: `sudo systemctl disable --now real-map-gateway real-map-camera` · 분배기는 `/opt/drone-camera/pi_camera_relay.py.orig-real-map`으로 복원.

## 기체 없이 시험·리허설

```sh
python3 fake_fc.py --mavlink-module /opt/drone-gateway/live_mavlink.py --scenario ground:30,fly:120 &
#   첫 줄에 출력된 /dev/pts/N 을 --serial 로
sudo systemctl stop real-map-gateway
python3 real_map_gateway.py --config /etc/drone-gateway/real-map.json --serial /dev/pts/N --state-dir /tmp/rmg
```

## 검증 기록 (2026-11-20, 로컬 서버)

- 실제 관제 웹(`capstone-school-web`)에 `real-admin` 링크를 등록하고 가짜 FC → 브리지 → 서버로 10개 항목 통과: 지상(무장 해제·위치), 상태 요청 → `APPLIED`, 서버의 HOLD 거부(원격 제어 불허), 비행(무장·비행 중·고도 16 m·3 m/s), 무선 끊김 → 기체 신호 대기 · 마지막 위치 유지, 복구, 브리지 종료 10초 뒤 게이트웨이 대기, 지상국 HEARTBEAT(255/190) 무시.
- 단위 시험 5개: 필드 변환 · 3D 고정 없을 때 위치 생략 · 무선 끊김 · 경로 보관과 비행 명령 거절 · 수신 확인 재전송과 세션 교체.
- 실제 FC·카메라를 연결한 시험은 기체 전원을 켠 뒤 따로 기록한다.
