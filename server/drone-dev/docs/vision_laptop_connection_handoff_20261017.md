# 비전 게이밍 노트북 연결 안내 (2026-10-17)

## 요청 항목 답변

1. **최신 소스**: 현재 NET_SITL 작업본의 연결기와 관련 파일을 함께 묶은 소스 스냅샷을 전달한다. GitHub main은 `1eefbc2396f3844f2f4076c4ba7fdb6e7a17fcbd`이며, 최신 연결기 파일은 아직 로컬 작업본에 있으므로 GitHub clone만으로 이번 연결기가 제공되지는 않는다. ZIP의 SOURCE-MANIFEST.json으로 파일 해시를 확인할 수 있다. 기존 runtime·가상환경·신원 파일을 다른 PC에서 복사하지 않는다.
2. **노트북 신원**: `sim-worker-04`, 표시명 `Vision gaming laptop`을 신규 발급·활성화했다. SIM 전용 `business.simulator` 권한이며 관제 운영자 권한은 없다. 인증서 만료는 **2026-11-16 11:46 KST**다. 신원 ZIP은 소스 ZIP과 별도로 전달한다.
3. **VisionEval/기존 UE**: 현재 simulation-lab 맵 선택은 TestField/Kumoh뿐이다. API world와 Start.ps1도 같은 허용 목록을 사용한다. VisionEval의 Vision_S1·S4·S5는 아직 선택/자동 실행할 수 없다. 이미 띄운 UE에 붙이는 것은 NET_SITL의 Start.ps1으로 띄운 지원 환경에서 가능하다. 임의의 VisionEval 프로젝트에는 현재 연결기를 그대로 붙일 수 없다. 맵/레벨 허용 목록과 실행 메타데이터 검증을 확장해야 한다. 검사를 피하려고 processes.json이나 world 이름을 위조하지 않는다.
4. **ComputerVision CAPTURE**: 현재는 지원하지 않는다. 연결기는 MultirotorClient와 `Copter` 차량을 요구하며 CAPTURE에서도 getMultirotorState로 상태·GPS·자세를 읽는다. 영상 업로더도 이 상태를 프레임 pose에 사용한다. CAPTURE라는 이름이 ComputerVision 모드 지원을 뜻하지 않는다. 지금은 SimpleFlight의 CAPTURE를 사용하고, ComputerVision은 이미지/카메라 pose 수집 경로와 결측 pose 처리를 별도로 구현해야 한다. 부족한 GPS·지면 기준을 만들어 채우지 않으며 공식 좌표는 PENDING으로 둔다.

## 노트북에서 지원되는 실행 순서

Windows + UE 5.5.4 + Cosys-AirSim 5.5-v3.3 기준이다. 엔진·플러그인 바이너리와 WSL 설치물은 소스 ZIP에 포함하지 않는다. 플러그인은 기존 Setup.ps1이 고정된 체크섬으로 준비한다. 처음 설치할 때는 README의 준비 사항을 갖춘 뒤 프로젝트 루트에서 실행한다.

```powershell
.\Setup.ps1
New-Item -ItemType Directory -Force .\runtime\server-identities | Out-Null
Expand-Archive -LiteralPath '<별도로 받은 sim-worker-04-private.zip>' `
  -DestinationPath .\runtime\server-identities
```

압축 해제 후 `runtime/server-identities/sim-worker-04/`에 ca.crt, client.crt, client.key, token 네 파일이 있어야 한다. 이 신원은 해당 노트북 한 대에만 사용한다. 개인키·토큰을 Git이나 공개 공유 폴더에 올리지 않는다. 학교 서버 SSH 접속 권한과 관제 로그인 계정은 이 worker 신원과 별개다.

서로 다른 터미널에서 아래 SSH 연결을 유지한다. 이미 같은 로컬 포트를 쓰는 터널이 있다면 중복으로 열지 않는다. 서버 인바운드 포트를 추가하지 않는다. 아래의 관제/연결기 분리는 개발 접속 구성 권고이며, 실 LTE/Cloudflare 안전성 검증을 뜻하지 않는다.

```powershell
# 터미널 1: 관제
ssh -p 7540 -N -L 18443:127.0.0.1:18443 se@<SERVER_HOST>
# 터미널 2: 노트북 연결기
ssh -p 7540 -N -L 18444:127.0.0.1:18444 se@<SERVER_HOST>
```

UE를 먼저 띄우고 연결기를 붙이는 지원 절차:

```powershell
# 프로젝트 루트에서: 지원 맵을 먼저 실행
.\Start.ps1 -Profile SimpleFlight -World TestField

# 다른 터미널에서 같은 프로젝트 루트로 이동한 뒤 실행
.\.venv\Scripts\python.exe -X utf8 scripts\server_simulation_bridge.py `
  --identity runtime\server-identities\sim-worker-04 `
  --execute --profile SimpleFlight
```

위 연결기는 UE를 새로 띄우지 않고 기존 실행에 연결한다. RPC 127.0.0.1:41451, Copter 차량, runtime/processes.json, profile/world, settings.json 해시가 일치해야 한다. `--start-simulator`를 추가하면 RPC가 없는 경우 지원 환경을 자동 시작할 수 있다. 기존 UE의 레벨을 원격으로 전환하는 기능은 아니다. 노트북 한 대에 연결기는 하나만 실행한다.

관제 `https://localhost:18443/simulation-lab`에 운영자 계정으로 로그인하고 `Vision gaming laptop (sim-worker-04)`과 같은 world를 선택한다. worker 목록은 등록 정보이며 온라인 상태를 보장하지 않는다.

## 주의: 기본 CAPTURE 버튼은 영상 분석 요청이 아님

현재 simulation-lab.js는 요청에 pipeline_config를 넣지 않는다. 따라서 기본 CAPTURE는 상태 측정이며, 버튼만 눌러서는 이미지 업로더가 생성되지 않는다. 이미지 → 비전 → DB 왕복을 원하면 관제 권한의 API 호출로 임무와 모델을 지정해야 한다. 아래는 요청 필드 예시이며 UUID 자리표시자를 실제 값으로 바꿔야 한다.

```json
{
  "run_id": "<새 실행 UUID>",
  "worker_id": "sim-worker-04",
  "scenario": "CAPTURE",
  "world": "TestField",
  "duration_s": 60,
  "simulator_version": "NET_SITL/UE5.5.4/Cosys5.5-v3.3",
  "pipeline_config": {
    "mission_id": "<sim-pi-01 소유의 실제 SIM 임무 UUID>",
    "model_config_id": "9e223e9c-bff2-5775-84bf-05b7e93818e2",
    "camera_name": "0",
    "interval_s": 0.5,
    "image_format": "JPEG"
  }
}
```

엔드포인트는 `POST /api/v1/simulations/runs`이며, 관제 세션·CSRF 인증을 사용한다. worker 토큰으로 임무를 생성하거나 관제 요청을 발행할 수 없다. 임무/실행 요청은 관제 담당자가 준비한다. 모델 ID는 현재 APPROVED·SIM·artifact_ready인 등록을 확인했으며 향후 모델 교체 시 다시 확인한다.

처음에는 2fps(`interval_s=0.5`)로 왕복 저장을 점검한다. 현재 HDD 환경에서 5fps 지속 처리는 미달이고, 2fps도 일부 반복에서 종료 뒤 추가 대기가 있었다. 2fps 설정이 실시간성을 보장하는 것은 아니다. 촬영 수·업로드 수·생략 수·미전송 수는 실행 폴더의 frame-metrics.json으로 확인한다. 미전송 저널을 지우거나 같은 worker를 여러 PC에서 공유하지 않는다.

## 이번에 확인한 범위

- 소스 연결기 오프라인 검사 6개 그룹 및 경로 입력 검사 통과.
- 신규 신원으로 자신의 대기열 200, 다른 worker 실행 접근 404, 운영자 API 접근 403, 잘못된 토큰 401 확인.
- 기존 worker 등록과 REAL 신원 등록을 보존했고 서비스 재시작은 하지 않았다.
- 신규 노트북의 UE 실행·프레임 왕복, VisionEval 레벨과 ComputerVision 모드는 NOT_RUN/미구현이다. 프론트의 맵 선택이나 서버 계약을 이번 답변 작업에서 확장하지 않았다.
