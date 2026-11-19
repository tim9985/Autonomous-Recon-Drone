# 비전 통합 수정·검증 기록 — 2026-10-18

## 적용 범위

SIM `/home/se/sandboxes/drone-dev`와 NET_SITL SimpleFlight에 적용했다. REAL 서버·실제 비행에는 적용하지 않았다. 기존 실패 실행·사진·저널을 보존했다. 10-17 DEM 배포 기록은 그대로 보존하며, 이 문서의 설정이 후속 판이다.

## 네 요청의 처리

| 요청 | 수정 | 확인 방식 |
|---|---|---|
| 위치가 사진보다 늦음 | 사진 응답의 카메라 NED 위치와 `getHomeGeoPoint()`로 촬영 시점 위경도·MSL 계산. 늦은 기체 시각은 진단용으로 보존 | 저장된 프레임의 출처·시각, 백엔드 계약, 실제 분석 결과 확인 |
| 실행 중 사람 생성 | AirSim 자산 목록에 SkeletalMesh 추가. `simSpawnObject`가 사람 모델과 전체 자산 경로를 처리. 누락·잘못된 종류의 자산은 오류로 반환 | 실행 중 2명 생성·사진 확인, 잘못된 요청 후 RPC 생존 확인 |
| 착륙 실패로 다음 실행 차단 | LAND 이후에도 접촉 없으면 이륙 지점 위에서 높이에 맞춰 저속 하강. 새 바닥 접촉·정지 3회 확인 후 disarm, Landed 확인 | 공중 중단·지면 근처 중단·접촉 없음·벽·이륙 지점 이탈 검사와 Kumoh 반복 비행 |
| 1 GiB 저장 한도 | SIM 한도 **10 GiB**로 확대. 기존 파일을 지우지 않음 | 1 GiB를 넘긴 상태에서도 새 프레임 저장·분석 성공 확인 |

## 사진과 위치 계약

`frame-pose/1.0`을 유지하고 다음 선택 필드를 추가했다.

- `geographic_source=image_camera_position`
- `geographic_timestamp_ns=source_timestamp_ns`
- `sync_error_ms`: 사진 시각과 위경도를 계산한 근거 시각의 차이. 같은 이미지 응답에서 계산하므로 0이다.
- `body_timestamp_ns`, `body_attitude`: 뒤늦게 받은 기체 정보 그대로 남긴다. 기체와 사진의 차이가 없어졌다고 해석하지 않는다.

SIM·카메라 위치·카메라 자세·동일 이미지 시각이 모두 있어야 새 방식이 허용된다. 기존 생산자의 body/image 오차 검사는 유지한다. 선택 필드를 생략한 이전 프레임의 직렬화·해시가 바뀌지 않도록 해 재전송 호환성을 유지했다.

플러그인의 이미지 시각도 카메라 자세를 잡는 렌더링 시점에 기록한다. 압축·전송 뒤의 기체 GPS를 촬영 위치로 사용하지 않는다. SIM의 UTC 매핑은 여전히 미검증이다.

## SIM 서버 설정

```text
VISION_DEM_DIR=/dem
VISION_MIN_AGL_M=10
VISION_GEO_GROUPING=1
VISION_GEO_CLAIMS=0
VISION_GEO_AGL_FLAT=0
VISION_HFOV_DEG=70
```

내부 후보 묶기만 활성화했다. 공식 좌표는 `PENDING`을 유지한다. 70도는 이번 LN011 카메라의 이미지 투영 설정과 맞춘 값이다. 다른 렌즈를 쓰면 해당 시뮬레이션의 이미지 투영 설정과 다시 맞춰야 한다. 이 값은 실제 카메라 보정 결과가 아니다.

DEM은 UE 캠퍼스와 대응하는 **SIM 전용 타일**이다. REAL에 연결하지 않는다. 실제 비행용 지형과 수직 기준은 별도 검증해야 한다. `model_loaded=true`는 기존 검증 모델의 상태이며 `flight_enabled=false`를 유지한다.

저장 한도는 `/run/identity/business.json`의 `max_storage_bytes=10737418240`이다. 물리 여유 공간은 배포 당시 약 4 TB였다. 기존 1 GiB가 3분 비행 약 7회라는 추정과 같은 조건이면 10 GiB는 약 70회분이지만, 촬영 간격·크기·후보 이미지에 따라 달라진다. 자동 삭제·무기한 보관을 추가하지 않았다. 한도에 닿으면 업로드가 거부되므로 시험 전 사용량과 종료 후 미전송 수를 확인한다. SIM 초기 구성 도구의 기본값도 10 GiB로 맞췄다.

SIM backend·vision만 재생성했다. 백업은 `/home/se/sandboxes/drone-dev/backups/vision-integration-20261017T093933Z`에 있다. 비밀번호·인증서·토큰은 전달 묶음에 포함하지 않는다.

## 노트북 적용

전달 ZIP은 기존 NET_SITL 프로젝트에 적용하는 수정 묶음이다. UE 5.5.4·기존 캠퍼스 자산·가상환경·본인 worker 신원이 필요하다.

1. 실행 중인 비행을 안전하게 종료하고 Unreal을 닫는다. 기존 소스의 작업 내용을 보관한다.
2. ZIP 안의 `NET_SITL/` 내용을 해당 NET_SITL 프로젝트에 반영한다. 기존 수정이 있다면 diff로 병합한다.
3. 프로젝트 루트에서 `./Build.ps1`을 실행한다. **플러그인 재빌드가 필수**이며 다른 PC의 DLL·`plugin-build.json`을 가져오지 않는다.
4. `./Start.ps1 -Profile SimpleFlight -World Kumoh` 후 READY를 기다린다. 새 패치가 빌드 기록에 없으면 시작 단계에서도 재빌드를 요구한다.
5. 본인 신원으로 연결기를 실행한다. 같은 worker 신원을 여러 PC가 공유하지 않는다.

실행 중 사람 생성 예시 — 이번 Kumoh 시작점 기준이며 좌표는 AirSim의 **전역 NED(m)**이다. 지도 원점의 위경도와 혼동하지 않는다. 다른 시작점·다른 지형에서는 발밑 높이를 다시 확인한다.

```powershell
.\.venv\Scripts\python.exe scripts\spawn_sim_person.py --execute --name VisionPerson --north 16 --east 0 --down 1.6
```

현재 지원은 기존 사람 메시를 생성하는 것이다. 걷기·행동 시나리오를 추가하지 않았다.

## 착륙 실패 시 복구

`RECOVERY_REQUIRED`는 불확실한 비행의 재실행을 막는 보호 장치다. 저널 삭제·실패 이력 변경으로 우회하지 않는다.

1. 연결기를 멈추고 해당 Unreal의 기체·접촉 상태를 확인한다. 착륙이 확인되지 않은 상태에서 Unreal을 자동 종료하지 않는다.
2. 같은 SimpleFlight 환경에서 실제 바닥 접촉과 시동 정지를 확인한다. 이번 수정의 `land_verified` 절차는 이륙 지점 위에서만 하강하며, 접촉 불명·벽·지점 이탈 시 성공으로 처리하지 않는다.
3. Landed가 확인된 뒤 프로젝트 루트에서 아래 명령으로 해당 실행의 복구를 확인한다. 같은 비행은 다시 실행하지 않는다.

```powershell
.\.venv\Scripts\python.exe scripts\server_simulation_bridge.py --identity runtime\server-identities\<본인-worker> --execute --ack-recovery <실패-run-UUID>
```

4. 다음 시험은 새 실행 UUID로 요청한다. 기존 실행은 FAILED 이력으로 남긴다.

오래된 미전송 프레임은 원래 이미지·UUID·해시를 유지한다. 실행 유효기간이 지나 서버가 거부하면 저널을 삭제하거나 실행 시각을 위조하지 않는다. 이번 한도 확대가 만료된 실행의 접근 권한을 바꾸지는 않는다.

## 검증 결과

2026-10-18 Kumoh·SimpleFlight·15 m·2 fps에서 세 번 연속 서버 `COMPLETED`, 착륙·시동 정지를 확인했다.

| 실행 UUID | 저장 프레임 | 관측 | 착륙 포함 비행 시간 |
|---|---:|---:|---:|
| `3ed52e1d-189c-4d83-8c04-13f9de5248ec` | 125 | 109 | 60.89 s |
| `08531df9-e7af-4819-a127-28687d179cc4` | 124 | 107 | 60.36 s |
| `4649e553-03ba-4a64-bdd0-e787ed8aa6d6` | 125 | 107 | 60.36 s |

- 새 시험 **374장 촬영·374장 전송**, 미전송 0, 큐 초과 생략 0. 세 번 모두 `requires_recovery=false`.
- 저고도 217장 관측 0, 지형 높이 미확인 0. 순항 관측 323건은 내부 지면 좌표 계산이 가능했고 SYNC 차단 사유가 없었다. 공식 상태는 전부 `PENDING`이다.
- 각 실행에서 사람 두 명이 각각 52~53개 관측을 같은 후보로 유지했다. 별도 단발 후보 1개(3개 관측)는 남았다. 모든 오탐·동일인 재식별 성능이 해결됐다는 뜻은 아니다.
- 사진/위치 근거 시각 차이는 0 ms. 별도 기체 조회의 사진 대비 시각 차이 중앙값은 실행별 약 204 / 198 / 198 ms로 남았으며 진단 필드에 보존했다.
- 현재 저장 예약량은 1,398,895,972 bytes로 종전 1 GiB 한도를 넘은 상태에서 새 저장이 성공했다. 한도는 10 GiB다.
- 개발 중 실패한 두 실행은 FAILED 이력을 보존했다. 만료된 과거 저널의 미전송 **35장**도 원본 그대로 남겼다. 새 세 실행의 미전송은 0장이다.
- 이전 계약 원본과 새 계약의 실제 직렬화·해시 일치를 확인했다. 새 계약 거부 조건, NED 축·단위, 연결기 재전송·복구, 공중 중단·지면 중단·벽·지점 이탈·지지면 불명·Landed 미확인 검사를 통과했다.
- 컨테이너 ID·시작 시각 비교 결과 SIM backend·vision만 바뀌었다. REAL 비전 소스 해시는 유지됐다. Jupyter 등 나머지 컨테이너는 유지했다. 공유 호스트의 CPU/GPU/RAM·디스크는 계속 공유한다.
- 시험용 Unreal은 최종 착륙·시동 정지 확인 뒤 정상 종료했다. 실행 로그와 실패 이력을 남겼다.

검증 파일은 `output/vision-integration-20261018/verification-summary.json`, `flight-evidence.json`, `geometry-checks.json`, `live-verification.json`, `legacy-hash-check.json`, `preservation-checks.json`, `plugin-check.json`이다. 서버 사본은 `drone-dev/evidence/vision-integration-20261018/`에 보관한다.

이번 수정에서는 통신 단절 실험을 새로 수행하지 않았다. 실제 비행·실제 카메라 보정·다른 노트북의 실행 확인은 미검증이다.
