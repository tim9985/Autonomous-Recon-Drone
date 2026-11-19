# sandboxes 폴더 안내

```text
/home/se/sandboxes/
├── README.md                         # 각 폴더의 역할을 설명하는 이 안내서
├── drone-server/                     # 초기 개발 서비스 + 세 환경의 전용 Docker 실행 기반
│   ├── runtime/                      # Docker 바이너리·설정·소켓·현재 엔진 저장소
│   ├── app/                          # 초기 상태 API·비전 대기 프로세스 코드
│   ├── config/                       # 초기 Jupyter·미디어 설정
│   ├── compose.yml                   # 초기 서비스 실행 설정
│   ├── compose.gpu.yml               # 초기 GPU 장치·라이브러리 연결 설정
│   ├── db/                           # 초기 DB 생성 SQL
│   ├── data/                         # 초기 DB·Jupyter 작업·임무 파일
│   ├── workspace/                    # 초기 컨테이너가 읽는 실제 작업 코드·설정
│   ├── scripts/                      # Docker 엔진·초기 서비스 관리 도구
│   ├── secrets/                      # 초기 DB·Jupyter 자격증명, 공유 금지
│   ├── logs/                         # 초기 기동·운영 로그
│   ├── docs/                         # 전체 파일 구조도 v1.2와 초기 환경 문서
│   ├── evidence/                     # 비밀 값 없는 검증 결과
│   │   └── maintenance/              # 경로 이관·서비스 검증·보관 위치 변경 증거
│   └── backups/                      # 복구 자료
│       └── maintenance/              # 이전 설정·DB 덤프·오프라인 엔진 사본, 관리자 전용
├── drone-dev/                        # 개발·SIM 관제·백엔드·개발 DB·지도·GPU 비전 환경
│   ├── app/                          # 서비스 진입점·인증·HTTPS/WSS 중계·GPU 비전 워커
│   ├── backend/                      # 개발 업무 API·검증 코드
│   ├── school/                       # 학교 지도·장치 터널·시뮬·통신 확장 코드
│   ├── web/                          # 배포된 관제 화면 빌드
│   ├── web-allowlist.json             # 제공 가능한 화면 파일 목록
│   ├── compose.yml                   # 개발 기본 서비스 설정
│   ├── compose.vision.json          # SIM CUDA 이미지·GPU 장치·추론 자원 설정
│   ├── compose.school.yml            # 지도·외부 조회·장치 터널 확장 설정
│   ├── db/                           # 개발 DB 스키마·마이그레이션·관리 도구
│   ├── data/                         # 개발 DB·미디어·지도·서비스별 영속 데이터
│   │   ├── postgres/                 # drone_dev DB 내부 파일, 직접 수정 금지
│   │   ├── backend/                  # 개발 업무 미디어·임무 저장소
│   │   ├── spatial/                  # 등록된 캠퍼스·구미 지도 조회 자료
│   │   ├── models/                   # 개발 비전 모델용 위치
│   │   ├── vision/                   # 개발 비전 작업 공간
│   │   └── communication/            # 서비스별 통신 기록 작업 공간
│   ├── scripts/                      # 개발 서비스 운영·점검 도구
│   ├── secrets/                      # 개발용 계정·DB·서비스 인증 자료, 공유 금지
│   ├── certs/                        # 인증서 관련 파일
│   ├── sockets/                      # 허용된 서비스 간 Unix 소켓
│   ├── docs/                         # 개발 API·연동·운영 문서
│   ├── evidence/                     # 개발 검증·배포 기록
│   ├── backups/                      # 개발 DB·앱·Web의 복구 사본
│   └── archives/                     # 과거 배포 준비·일회성 도구·전달 묶음·진단 로그
└── drone-real/                       # 별도 실기체 형식 데이터 저장·조회 환경
    ├── app/                          # REAL 서비스 진입점·인증·비전 결과 전송 코드
    ├── drone_backend/                # REAL FastAPI 업무 API
    ├── compose.json                  # REAL 전용 서비스 설정
    ├── db/                           # REAL DB 생성·마이그레이션
    ├── data/                         # REAL 전용 영속 데이터
    │   ├── postgres/                 # drone_real DB 내부 파일, 직접 수정 금지
    │   ├── backend/                  # REAL 업무 미디어·임무 저장소
    │   ├── models/                   # 검증된 REAL 비전 모델용 위치
    │   └── vision/                   # REAL 비전 결과·재전송 작업 공간
    ├── scripts/                      # REAL Compose 실행 도구
    ├── tools/                        # REAL 배포·TLS 중계·점검 도구
    ├── tests/                        # REAL 계약·저장·인증 검증
    ├── secrets/                      # REAL 전용 계정·DB·서비스 인증 자료, 공유 금지
    ├── sockets/                      # REAL 전용 DB·backend·gateway 소켓
    ├── docs/                         # REAL 구축·비전·프론트 연동 안내
    ├── evidence/                     # REAL 검증·배포 기록
    ├── backups/                      # REAL 복구 사본
    ├── export/                       # 전달용 공개 산출물
    └── openapi-real.json              # REAL API 목록·입출력 규격
```
