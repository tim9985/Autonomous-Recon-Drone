"""Document only this sandbox's public filenames; never traverse private data."""
import datetime, pathlib
ROOT=pathlib.Path('/home/se/sandboxes/drone-dev')
assert str(ROOT)=='/home/se/sandboxes/drone-dev'
lines=['# 학교 서버 서비스 파일 구조도 — 2026-10-05','',
       '확인 시각(UTC): '+datetime.datetime.now(datetime.timezone.utc).isoformat(),'',
       '새 환경의 디렉터리와 공개 코드 파일명을 직접 확인한 기록이다. secrets·DB 내부 데이터·모델 내용은 조회하지 않는다. 기존 /home 전체 개요는 [기존 서버 파일 구조](server_file_structure.md)를 따른다.','',
       '```text','/home/se/',
       '├── JupyterLAB/                   # 기존 학교·학습 환경, 신규 서비스에 마운트하지 않음',
       '├── miniconda3/                   # 기존 환경 유지',
       '├── repos/                        # 기존 환경 유지',
       '└── sandboxes/',
       '    ├── drone-server-20261003/     # 기존 DB·Jupyter·미디어 개발 환경 유지',
       '    └── drone-services-20261005/   # 신규 환경, 호스트 디렉터리 0700',]
for path in sorted(ROOT.iterdir()):
    if path.name.startswith('.'):continue
    lines.append('        ├── '+path.name+('/' if path.is_dir() else ''))
    if path.is_dir():
        for child in sorted(path.iterdir()):
            if child.name=='__pycache__':continue
            if path.name=='secrets':
                lines.append('        │   ├── '+child.name+('/ [내용 비공개]' if child.is_dir() else ' [값 비공개]'))
            elif path.name=='data':
                lines.append('        │   ├── '+child.name+'/ [내부 데이터 생략]')
            elif path.name=='sockets':
                lines.append('        │   ├── '+child.name+'/ [연결 소켓]')
            else:
                lines.append('        │   ├── '+child.name+('/' if child.is_dir() else ''))
lines+=['```','',
        '## 실제 서비스 연결·저장소 경계','',
        '| 서비스 | UID:GID | 연결 경로 | 데이터 마운트 |',
        '|---|---|---|---|',
        '| database | 999:999 | database 소켓만 생성, TCP 없음 | data/postgres 전용 |',
        '| backend | 2101:2101 | backend 소켓 생성, database 소켓 접속 | data/backend 전용 |',
        '| vision | 2102:2102 | backend 소켓 접속 | data/models 읽기 전용, data/vision 작업 공간 |',
        '| web | 2103:2103 | web 소켓 생성 | 정적 Web 코드만 읽기 전용 |',
        '| gateway | 2104:2104 | gateway 소켓 생성, backend/web 소켓 접속 | 임무·DB 저장소 없음 |',
        '| verifier | 2105:2105 | backend/gateway 소켓 접속, 기본 실행 제외 | 관리자 시험 신원만 |','',
        '모든 실행 컨테이너는 network_mode=none, read_only root filesystem, cap_drop=ALL이다. 호스트 loopback 127.0.0.1:18443만 systemd TLS 중계가 연다. backend·vision·web·gateway의 서비스 인증 정보는 자기 secrets 디렉터리만 마운트한다. backend registry는 요청 검증에 필요한 서비스 token/인증서 지문만 포함하며 다른 서비스의 개인키는 포함하지 않는다.','',
        'DB 업무 스키마 18개는 미배포다. integration.probe는 명시적 SIM 데이터 교환 시험용이다. model_loaded=false, flight_enabled=false를 유지한다. GPU 장치는 신규 vision에 연결하지 않았다. 호스트 관리자·커널·물리 자원은 공유한다.','',
        '## 개발 접속과 문서','',
        '- SSH 터널: localhost:18443 → 학교 서버 127.0.0.1:18443.',
        '- HTTPS 개발 관제 주소: https://localhost:18443. 별도 개발 계정과 개발 CA 필요.',
        '- 아키텍처: [서비스 아키텍처 v1.0](service_architecture_zero_trust_v1.0.md).',
        '- 비밀 값은 문서에 기록하지 않는다. 개발 CA 인증서만 공개할 수 있으며 CA 개인키를 배포하지 않는다.',
        '- 이 목록은 신규 샌드박스 상세이며 /home의 다른 사용자·패키지·캐시 전수 조사가 아니다.','']
out=ROOT/'docs'/'server_file_structure_services_20261005.md'
out.parent.mkdir(exist_ok=True)
out.write_text('\n'.join(lines))
print('Wrote server_file_structure_services_20261005.md without secret/data contents')
