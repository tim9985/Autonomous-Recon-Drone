# 서버 이전 (2026-11-19)

학교 서버 보안 강화로 SSH 포트 하나만 남았다 → 코드는 **GitHub**, 가중치 · 데이터 · 서버 상태는 **전송 꾸러미**로 옮긴다. 목표 = 동료 PC 에서 **비전 worker + 중앙서버**가 그대로 돈다.

## 어디에 무엇이

| 무엇 | GitHub (이 저장소) | 전송 꾸러미 (서버 `~/migration_20261119/transfer/`) |
|---|---|---|
| 비전 코드 · 볼트 · 수치 | ✅ `drone_yolo/` · `obsidian/` · `drone_yolo/metrics/` | 학습 목록 · 로그 (06) |
| 비전 worker | ✅ `drone_yolo/deploy/vision_worker/` | 모델 꾸러미 (01) |
| 중앙서버 틀 | ✅ [`server/`](server/README.md) — 비밀 · DB · 미디어 빼고 주소 가림 | 서버 그대로 사본 · DB 덤프 · Docker 이미지 · 비밀 (00_root) |
| 가중치 `.pt` | ❌ | 01 · 02 · 04 |
| 평가셋 · 데이터 | ❌ (연구용 약관) | 평가셋 (05) · 원본 1.3 TB 는 따로 (§4) |
| 발표 · 보고서 원본 | md 만 | 07 (hwpx · pptx · 사진) |
| 팀 드라이브 | ❌ | 08 |

## 꾸러미 — 받는 순서

| 순서 | 파일 | 크기 | 내용 | 쓰는 곳 |
|---|---|---|---|---|
| 1 | `00_root/` | 수십 GB | DB 3개 덤프 · sandbox 3개 그대로 (REAL 녹화 포함) · Docker 이미지 · 비밀 (암호화) — **sudo 스크립트로 만든다** | 중앙서버 |
| 2 | `01_models_deploy.tar` | 7.0 GB | 배포 꾸러미 `_pack_v12w_real` · `_pack_v12w_sim` (v12_f91_swa15 · 상의 색 · 자세 · 2차 검증) · 이전 배포 · `weights/` · 기준 COCO 가중치 | worker |
| 3 | `05_eval_sets.tar` | ≈ 15 GB | 평가셋 전부 (test_v2 · test_obl · test_kr · …) · UE level01 | 인수 검증 · 발표 수치 |
| 4 | `07_docs_present.tar` | ≈ 2 GB | 발표자료 · 보고서 원본 · 드론 조립 · 볼트 설정 | 발표 |
| 5 | `02_runs_best_pt.tar` | 7.8 GB | 학습 217회 `best.pt` | 연구 |
| 6 | `03_runs_meta.tar` · `04_runs_posture.tar` · `06_ue_flight_logs_lists.tar` | ≈ 11 GB | 실행 기록 (eval npz · results · dumps) · 자세 모델 · UE 비행 녹화 · 로그 · 학습 목록 | 연구 |
| 7 | `08_team_drive.tar` | 5.3 GB | 팀 드라이브 미러 — 전자서명 · 공문서 (공유 주의) | 보관 |
| — | `09_server_readable.tar` | ≈ 3 GB | sudo 를 못 돌렸을 때의 대비 — 서버 코드 중 읽을 수 있던 부분 | 대비 |

- 정확한 크기 · 해시 = 꾸러미의 `README.md` · `SHA256SUMS` · 안에 든 파일 목록 = `lists/*.txt`

## 1. 서버에서 — sudo 한 번

```bash
sudo bash ~/migration_20261119/collect_root.sh      # 비밀 묶음 암호를 두 번 묻는다 (잊으면 못 연다)
```

- **읽기만** 한다 — 서비스 중지 · 재시작 · 설정 변경 없음 (nice · ionice 낮은 우선순위)
- 실비행 녹화 (`drone-real/data/vision/record`) 가 생긴 날이면 **비행 뒤에** 돌린다
- 옵션: `--no-images` (이미지 빼기 · 다시 빌드하려면 `server/images/`) · `--no-secrets` · `--with-backups` (서버 안 복구 사본까지)

## 2. 내 PC 로 받기 (SSH 7540)

```bash
# Linux · macOS · WSL — 끊겨도 이어받는다
rsync -avP --partial -e "ssh -p 7540" se@<서버 주소>:migration_20261119/transfer/ ./transfer/
# Windows — WinSCP · FileZilla (SFTP · 포트 7540) 로 transfer 폴더 · 또는
scp -P 7540 -r se@<서버 주소>:migration_20261119/transfer .
# 받은 뒤 확인
cd transfer && sha256sum -c SHA256SUMS && (cd 00_root && sha256sum -c SHA256SUMS)
```

- tar 는 압축하지 않았다 (가중치 · 사진은 이미 압축됨) → Windows 는 7-Zip 으로 풀면 한글 이름이 안전하다
- `00_root/` 안 파일은 `se` 만 읽을 수 있다 (비밀 · DB)

## 3. 동료 PC 에 세우기

| 무엇 | 안내 |
|---|---|
| 중앙서버 (관제 · 업무 API · DB · 지도 · vision) | [`server/README.md`](server/README.md) — 이미지 · 비밀 · DB 복원 · GPU 마운트 · **새 GPU 엔진 재빌드 · 모델 재등록** |
| worker 만 (sandbox 없이 시험) | `drone_yolo/deploy/vision_worker/README.md` — 가짜 백엔드 `tools/mock_backend.py` 로 왕복 |
| 연구 환경 | [`server/env/`](server/env/) — conda `drone` (python 3.10 · torch · ultralytics 8.4.102 · TensorRT 11.3) · pip freeze |

## 4. 데이터 원본 — 꾸러미 밖 (1.3 TB)

| 폴더 | 크기 | 다시 얻는 법 |
|---|---|---|
| `data/raw` | 675 GB | `drone_yolo/DATASETS.md` (공개 데이터셋 · AI-Hub 신청) |
| `data/det_v12` | 83 GB | 배포 모델 계열 (v12) 학습 세트 — **다시 학습하려면 이것부터** |
| `data/det*` 나머지 | ≈ 600 GB | 옛 학습 세트 · `make_*_data.py` 로 다시 만든다 |

```bash
rsync -avP --partial -e "ssh -p 7540" se@<서버 주소>:JupyterLAB/Capstone/data/det_v12 ./data/
```

## 5. 저장소

- 새 저장소 `tim9985/Autonomous-Recon-Drone` (**공개**) — 옛 `tim9985/Capstone` 이력 375 커밋을 그대로 옮겼다
- 비밀 · 내부 주소 · 개인 연락처 · 데이터셋 파생 이미지는 올리지 않는다 — 올리기 전 `python3 migration/scan_secrets.py <폴더>`
- 이전 도구: [`migration/`](migration/) — `collect_root.sh` (sudo 수집) · `make_bundle.sh` (꾸러미) · `scrub_stage.py` (공개 사본 가리기)
