# 로컬 PC 중앙서버 (2026-11-20 ~)

학교 서버(RTX 3090)가 11-20 차단된 뒤, 팀원 PC(Windows 11 · WSL2 Ubuntu 24.04 `Capstone-Pipeline` · RTX 4080 SUPER)에 중앙서버를 다시 세운 스크립트의 사본이다. 운영 설명은 [`local/README.md`](local/README.md).

## 작업 폴더 구성

스크립트는 아래 배치를 가정한다 (상대 경로가 박혀 있음).

```
<작업 폴더>/
  Connect-Gateway.ps1  Start-Real.ps1      ← 이 폴더의 두 파일
  local/                                   ← 이 폴더의 local/
  restored/                                ← 이 저장소 (tim9985/Autonomous-Recon-Drone)
  web-source/                              ← 관제 웹 저장소 (won11794-bit/capstone1_project, 비공개)
  10_essential_models/ 11_server_essential/ 12_eval_test_v2/ 13_mission_extras/   ← 전송 꾸러미 (Drive)
```

| 구성 | 실행 위치 | 포트 |
|---|---|---|
| 새 관제 웹 (SIM · 실지도) `capstone-school-web` | `/home/se/sandboxes/capstone-school-web` (`local/deploy-school-web.py`) | 18443 |
| 옛 REAL 스택 (업무 API · 장치 API · 카메라 수신 · REAL 비전) | `/home/se/sandboxes/drone-real` (`local/setup-real.py` · `Start-Real.ps1`) | 19443 · 19444 · 19560 |
| Pi 터널 수신 SSH (Tailscale 전용) | WSL `sshd` (`local/real-sshd.conf`) | 7540 |
| Pi 게이트웨이 | [`../real-map-gateway`](../real-map-gateway/README.md) | Pi → 18443 |

## 저장소에 넣지 않은 것

- 인증서 · 호스트 키 · 공개키 파일 (`school-web-ca.crt`, `capstone-server-known-hosts`, `pi-capstone-tunnel.pub`) — 작업 폴더에만 있다.
- 비밀값 (계정 비밀번호 · 장치 인증서 · 토큰 · 게이트웨이 키) — WSL `/home/se/sandboxes/*/secrets`, 관제 웹 백엔드 볼륨.
- 내부 주소 — `Connect-Gateway.ps1`은 `-HostKeyAlias`로 known_hosts 항목 이름을 받는다.
