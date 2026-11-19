# 현재 서버 폴더 안내

현재 아키텍처와 DB 구조는 [아키텍처 v1.2](../drone-server/docs/service_architecture_zero_trust_v1.2.md), [서비스·DB·데이터셋 v1.2](../drone-server/docs/service_db_dataset_structure_v1.2.md)를 따른다.

현재 실제 폴더는 drone-server·drone-dev·drone-real이며 날짜 이름 링크와 drone-legacy는 제거했다. 폴더명 안내는 [sandboxes 트리](../README.md), 현재 상세 구조는 [파일 구조·운영 가이드 v1.2](../drone-server/docs/server_file_structure_services_v1.2.md)를 따른다. 정리 복구 자료는 drone-server/backups/maintenance에 보존한다.

# REAL 데이터 서비스

실제 형식의 상태·비전·미디어·외부 명령 증거를 인증해 저장·조회한다. 실제 모델과 기체 비행은 비활성 상태다. 기존 개발·학습 환경을 보존한다.

- 구성: compose.json, drone_backend.real:app, drone_real
- 접속: SSH HTTPS localhost 19443, 기체 mTLS 19444
- [구축 결과](docs/real_backend_deployment_20261006.md)
- [비전 담당자 안내](docs/vision_backend_handoff_v1.0.md)
- [관제 담당자 안내](docs/frontend_real_api_integration_v1.0.md)
- [OpenAPI](openapi-real.json)
- [SIM 설계만 보존](docs/simulation_environment_design_v1.0.md)
