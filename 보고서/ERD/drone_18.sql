-- drone_18.sql — 18개 테이블 제안 (SRS v1.7 · SDD v1.2 검증판 · 2026-09-29)
-- 원형 타입은 PostgreSQL + PostGIS (COMMENT '원형:') · DATETIME 은 ERDCloud 표기용 (실제 timestamptz)

CREATE TABLE `user_account` (
	`user_id`	CHAR(36)	NOT NULL	COMMENT '계정 ID | 원형: uuid | 조건: PK',
	`login_id`	VARCHAR(255)	NOT NULL	COMMENT '로그인 ID | 원형: text | 조건: UQ NN',
	`credential_hash`	TEXT	NOT NULL	COMMENT '비밀번호 해시 | 원형: text | 조건: NN',
	`permissions`	JSON	NOT NULL	COMMENT '조회 / 제어 요청 권한 | 원형: jsonb | 조건: NN',
	`status`	TEXT	NOT NULL	COMMENT 'ACTIVE / LOCKED / DISABLED | 원형: text | 조건: NN CHECK',
	`created_at`	DATETIME	NOT NULL	COMMENT '생성 시각 | 원형: timestamptz | 조건: NN'
) COMMENT 'DB-01 user_account · ERD-01 사용자·기체';

CREATE TABLE `user_session` (
	`session_id`	CHAR(36)	NOT NULL	COMMENT '세션 ID | 원형: uuid | 조건: PK',
	`user_id`	CHAR(36)	NOT NULL	COMMENT '사용자 | 원형: uuid | 조건: FK user_account NN',
	`token_digest`	VARCHAR(255)	NOT NULL	COMMENT '토큰 해시 | 원형: text | 조건: UQ NN',
	`issued_at`	DATETIME	NOT NULL	COMMENT '발급 | 원형: timestamptz | 조건: NN',
	`expires_at`	DATETIME	NOT NULL	COMMENT '만료 | 원형: timestamptz | 조건: NN',
	`revoked_at`	DATETIME	NULL	COMMENT '로그아웃·폐기 | 원형: timestamptz | 조건: NULL'
) COMMENT 'DB-02 user_session · ERD-01 사용자·기체';

CREATE TABLE `drone` (
	`drone_id`	VARCHAR(255)	NOT NULL	COMMENT '운용 기체 ID | 원형: text | 조건: PK',
	`name`	TEXT	NOT NULL	COMMENT '표시 이름 [new] | 원형: text | 조건: NN',
	`gateway_id`	TEXT	NULL	COMMENT '짝지은 현장 게이트웨이 [new] | 원형: text | 조건: NULL',
	`camera_config_id`	CHAR(36)	NULL	COMMENT '현재 장착 카메라 보정 [new] | 원형: uuid | 조건: FK config_version NULL',
	`control_user_id`	CHAR(36)	NULL	COMMENT '웹 제어권 보유자 (control_lease.holder_user_id) | 원형: uuid | 조건: FK user_account NULL',
	`control_session_id`	CHAR(36)	NULL	COMMENT '보유 세션 (control_lease.session_id) | 원형: uuid | 조건: FK user_session NULL',
	`control_revision`	BIGINT	NOT NULL	COMMENT '웹 제어권 변경 세대 · 조건부 갱신 (control_lease.web_revision) | 원형: bigint | 조건: NN >=0',
	`control_acquired_at`	DATETIME	NULL	COMMENT '확보 시각 | 원형: timestamptz | 조건: NULL',
	`control_expires_at`	DATETIME	NULL	COMMENT '만료 시각 | 원형: timestamptz | 조건: NULL',
	`control_epoch`	BIGINT	NOT NULL	COMMENT 'Pi 가 확인한 실행 제어 세대 (observed/last_control_epoch) | 원형: bigint | 조건: NN >=0',
	`gateway_state`	JSON	NOT NULL	COMMENT '현재 게이트웨이 세션: id·시작·SW/정책 버전·시계·기능·권한 상태 | 원형: jsonb | 조건: NN',
	`link_state`	JSON	NOT NULL	COMMENT '링크별 {state, reason, connection_epoch, last_ok_at, detected_at, metrics} | 원형: jsonb | 조건: NN',
	`updated_at`	DATETIME	NOT NULL	COMMENT '마지막 갱신 [new] | 원형: timestamptz | 조건: NN'
) COMMENT 'DB-03 drone · ERD-01 사용자·기체';

CREATE TABLE `mission` (
	`mission_id`	CHAR(36)	NOT NULL	COMMENT '임무 ID | 원형: uuid | 조건: PK',
	`drone_id`	VARCHAR(255)	NOT NULL	COMMENT '운용 기체 | 원형: text | 조건: FK drone NN',
	`creator_user_id`	CHAR(36)	NOT NULL	COMMENT '생성 운영자 | 원형: uuid | 조건: FK user_account NN',
	`draft_revision`	INT	NOT NULL	COMMENT '편집 중 개정 | 원형: integer | 조건: NN',
	`active_revision`	INT	NULL	COMMENT '실행 개정 | 원형: integer | 조건: NULL · FK (mission_id, active_revision) DEFERRABLE',
	`state`	TEXT	NOT NULL	COMMENT 'READY / STARTING / RUNNING / PAUSING / PAUSED / RETURNING / LANDING / ENDED / FAILED / UNKNOWN | 원형: text | 조건: NN CHECK',
	`state_evidence`	JSON	NOT NULL	COMMENT '상태 판정 근거 | 원형: jsonb | 조건: NN',
	`readiness`	JSON	NULL	COMMENT '운용 준비·안전 설정 점검 항목별 결과 (UC-0203·1006) [new] | 원형: jsonb | 조건: NULL',
	`appearance_query`	JSON	NULL	COMMENT '상의 색상 조건 (UC-0707) [new] | 원형: jsonb | 조건: NULL',
	`test_conditions`	JSON	NULL	COMMENT '날씨·지형·장비·통신 등 시험 조건 (SRS 1.2·측정 조건) [new] | 원형: jsonb | 조건: NULL',
	`grant_status`	TEXT	NULL	COMMENT '실행 승인 상태 (mission_execution_grant.status) | 원형: text | 조건: NULL CHECK',
	`approved_by`	CHAR(36)	NULL	COMMENT '실행 승인자 | 원형: uuid | 조건: FK user_account NULL',
	`approved_at`	DATETIME	NULL	COMMENT '승인 시각 (grant.issued_at) | 원형: timestamptz | 조건: NULL',
	`grant_revoked_at`	DATETIME	NULL	COMMENT '승인 철회 | 원형: timestamptz | 조건: NULL',
	`started_at`	DATETIME	NULL	COMMENT '시작 | 원형: timestamptz | 조건: NULL',
	`ended_at`	DATETIME	NULL	COMMENT '종료 | 원형: timestamptz | 조건: NULL',
	`termination_reason`	TEXT	NULL	COMMENT '종료 사유 | 원형: text | 조건: NULL'
) COMMENT 'DB-04 mission · ERD-02 임무·설정';

CREATE TABLE `mission_revision` (
	`mission_id`	CHAR(36)	NOT NULL	COMMENT '임무 | 원형: uuid | 조건: PK · FK mission',
	`revision`	INT	NOT NULL	COMMENT '단조 증가 개정 | 원형: integer | 조건: PK',
	`area_geom`	GEOMETRY	NOT NULL	COMMENT '임무구역 | 원형: geometry(MultiPolygon,4326) | 조건: NN',
	`priority_geom`	GEOMETRY	NULL	COMMENT '우선구역 | 원형: geometry(MultiPolygon,4326) | 조건: NULL',
	`priority_sources`	JSON	NULL	COMMENT '사전 제보·가중치 근거 (prior_evidence 흡수) | 원형: jsonb | 조건: NULL',
	`conditions`	JSON	NOT NULL	COMMENT '고도·속도·복귀 조건 | 원형: jsonb | 조건: NN',
	`area_denominators`	JSON	NOT NULL	COMMENT '전체·관측 가능 구역 면적 (시작 시 고정) | 원형: jsonb | 조건: NN',
	`spatial_config_id`	CHAR(36)	NOT NULL	COMMENT '공간 기준 (context_id) | 원형: uuid | 조건: FK config_version NN',
	`coordinate_config_id`	CHAR(36)	NULL	COMMENT '좌표 설정 (coordinate_id) | 원형: uuid | 조건: FK config_version NULL',
	`policy_config_id`	CHAR(36)	NULL	COMMENT '정책 묶음 (configuration_id) | 원형: uuid | 조건: FK config_version NULL',
	`model_config_id`	CHAR(36)	NULL	COMMENT '사용 탐지 모델 [new] | 원형: uuid | 조건: FK config_version NULL',
	`planner_modes`	JSON	NOT NULL	COMMENT 'global_mode · local_mode · target_model · coverage_policy | 원형: jsonb | 조건: NN',
	`grid_version`	TEXT	NOT NULL	COMMENT '관측 격자 버전 | 원형: text | 조건: NN',
	`created_at`	DATETIME	NOT NULL	COMMENT '생성 | 원형: timestamptz | 조건: NN',
	`approved_at`	DATETIME	NULL	COMMENT '확정 | 원형: timestamptz | 조건: NULL'
) COMMENT 'DB-05 mission_revision · ERD-02 임무·설정';

CREATE TABLE `config_version` (
	`config_id`	CHAR(36)	NOT NULL	COMMENT '설정 버전 ID | 원형: uuid | 조건: PK',
	`kind`	VARCHAR(255)	NOT NULL	COMMENT 'SPATIAL / CAMERA / COORDINATE / MODEL / POLICY | 원형: text | 조건: NN CHECK',
	`version`	VARCHAR(255)	NOT NULL	COMMENT '버전 | 원형: text | 조건: NN · UQ(kind, version)',
	`schema_version`	TEXT	NOT NULL	COMMENT 'payload 스키마 버전 | 원형: text | 조건: NN',
	`payload`	JSON	NOT NULL	COMMENT '종류별 내용 (좌표계·원점·보정 K·모델 입력·임계값·탐지율 표 …) | 원형: jsonb | 조건: NN',
	`content_hash`	TEXT	NOT NULL	COMMENT '내용 해시 | 원형: text | 조건: NN',
	`parent_id`	CHAR(36)	NULL	COMMENT '파생 원본 (부모 모델 등) | 원형: uuid | 조건: FK config_version NULL',
	`asset_id`	CHAR(36)	NULL	COMMENT '보정 파일·가중치·엔진·평가 파일 | 원형: uuid | 조건: FK media_asset NULL',
	`status`	TEXT	NOT NULL	COMMENT 'DRAFT / VALIDATED / APPROVED / RETIRED | 원형: text | 조건: NN CHECK',
	`validation_report`	JSON	NULL	COMMENT '검증 결과 (NFR-V05 임계값 변경 기록 포함) | 원형: jsonb | 조건: NULL',
	`approved_by`	CHAR(36)	NULL	COMMENT '승인자 | 원형: uuid | 조건: FK user_account NULL',
	`created_at`	DATETIME	NOT NULL	COMMENT '생성 | 원형: timestamptz | 조건: NN',
	`approved_at`	DATETIME	NULL	COMMENT '승인 | 원형: timestamptz | 조건: NULL'
) COMMENT 'DB-06 config_version · ERD-02 임무·설정';

CREATE TABLE `search_region` (
	`region_id`	CHAR(36)	NOT NULL	COMMENT '수색 영역 | 원형: uuid | 조건: PK',
	`mission_id`	CHAR(36)	NOT NULL	COMMENT '임무 | 원형: uuid | 조건: NN · FK (mission_id, mission_revision)',
	`mission_revision`	INT	NOT NULL	COMMENT '개정 | 원형: integer | 조건: NN',
	`grid_version`	TEXT	NOT NULL	COMMENT '격자 버전 | 원형: text | 조건: NN',
	`region_type`	TEXT	NOT NULL	COMMENT '미관측/오래된 관측/우선구역/후보 주변/시설 … | 원형: text | 조건: NN',
	`source_features`	JSON	NOT NULL	COMMENT '근거 공간 요소 | 원형: jsonb | 조건: NN',
	`region_geom`	GEOMETRY	NOT NULL	COMMENT '영역 경계 | 원형: geometry(MultiPolygon,4326) | 조건: NN',
	`representative_point`	GEOMETRY	NOT NULL	COMMENT '순서 계산 대표점 | 원형: geometry(Point,4326) | 조건: NN',
	`total_area_m2`	DOUBLE	NOT NULL	COMMENT '전체 면적 | 원형: double precision | 조건: NN',
	`remaining_area_m2`	DOUBLE	NOT NULL	COMMENT '남은 면적 | 원형: double precision | 조건: NN · 0<=remain<=total',
	`state`	TEXT	NOT NULL	COMMENT 'PENDING / ACTIVE / PARTIAL / SATISFIED / DEFERRED / BLOCKED | 원형: text | 조건: NN CHECK',
	`pass_index`	INT	NOT NULL	COMMENT '순회 회차 | 원형: integer | 조건: NN',
	`service_estimate_s`	DOUBLE	NULL	COMMENT '처리 시간 추정 | 원형: double precision | 조건: NULL',
	`reason`	TEXT	NULL	COMMENT '보류 사유 | 원형: text | 조건: NULL',
	`row_version`	BIGINT	NOT NULL	COMMENT '동시성 버전 | 원형: bigint | 조건: NN'
) COMMENT 'DB-07 search_region · ERD-03 계획·관측';

CREATE TABLE `observation_cell` (
	`mission_id`	CHAR(36)	NOT NULL	COMMENT '임무 | 원형: uuid | 조건: PK · FK mission',
	`grid_version`	VARCHAR(255)	NOT NULL	COMMENT '격자 버전 | 원형: text | 조건: PK',
	`cell_id`	VARCHAR(255)	NOT NULL	COMMENT '셀 | 원형: text | 조건: PK',
	`region_id`	CHAR(36)	NULL	COMMENT '대표 수색 영역 (membership) | 원형: uuid | 조건: FK search_region NULL',
	`region_allocations`	JSON	NULL	COMMENT '영역별 배정 형상·면적·분할 버전 (region_cell_membership) | 원형: jsonb | 조건: NULL',
	`spatial_config_id`	CHAR(36)	NOT NULL	COMMENT '공간 기준 (context_id) | 원형: uuid | 조건: FK config_version NN',
	`cell_geom`	GEOMETRY	NOT NULL	COMMENT '셀 형상 | 원형: geometry(MultiPolygon,4326) | 조건: NN',
	`cell_area_m2`	DOUBLE	NOT NULL	COMMENT '셀 면적 | 원형: double precision | 조건: NN >0',
	`state`	TEXT	NOT NULL	COMMENT '미관측 / 유효 관측 / 품질 부족 / 가림·미확인 / 운용 제한 | 원형: text | 조건: NN CHECK',
	`valid_union_geom`	GEOMETRY	NULL	COMMENT '유효 관측 합집합 (중복 없는 누적) | 원형: geometry(MultiPolygon,4326) | 조건: NULL',
	`valid_area_m2`	DOUBLE	NOT NULL	COMMENT '유효 면적 | 원형: double precision | 조건: NN >=0',
	`valid_count`	INT	NOT NULL	COMMENT '유효 관측 횟수 | 원형: integer | 조건: NN >=0',
	`valid_group_count`	INT	NOT NULL	COMMENT '유효 관측 묶음 수 (1초 단위) | 원형: integer | 조건: NN >=0',
	`valid_duration_s`	DOUBLE	NOT NULL	COMMENT '유효 관측 시간 | 원형: double precision | 조건: NN >=0',
	`last_valid_at`	DATETIME	NULL	COMMENT '마지막 유효 관측 | 원형: timestamptz | 조건: NULL',
	`excluded_reasons`	JSON	NOT NULL	COMMENT '품질 부족·가림·제한 사유 | 원형: jsonb | 조건: NN',
	`priority`	DOUBLE	NULL	COMMENT '탐색 우선도 (UC-0502·0806) | 원형: double precision | 조건: NULL',
	`belief`	DOUBLE	NULL	COMMENT '존재 가능성 현재값 (cell_belief.posterior) | 원형: double precision | 조건: NULL · [0,1]',
	`belief_detail`	JSON	NULL	COMMENT 'prior·불확실도·모델 종류·마지막 묶음·근거·갱신 시각 | 원형: jsonb | 조건: NULL',
	`row_version`	BIGINT	NOT NULL	COMMENT '동시성 버전 | 원형: bigint | 조건: NN'
) COMMENT 'DB-08 observation_cell · ERD-03 계획·관측';

CREATE TABLE `search_plan` (
	`plan_id`	CHAR(36)	NOT NULL	COMMENT '계획 | 원형: uuid | 조건: PK',
	`mission_id`	CHAR(36)	NOT NULL	COMMENT '임무 | 원형: uuid | 조건: NN · FK (mission_id, mission_revision)',
	`mission_revision`	INT	NOT NULL	COMMENT '개정 | 원형: integer | 조건: NN',
	`plan_version`	INT	NOT NULL	COMMENT '임무별 계획 번호 | 원형: integer | 조건: NN · UQ(mission_id, plan_version)',
	`plan_kind`	TEXT	NOT NULL	COMMENT 'GLOBAL / LOCAL / REOBSERVE / BASELINE | 원형: text | 조건: NN CHECK',
	`parent_plan_id`	CHAR(36)	NULL	COMMENT '상위 (전역) 계획 | 원형: uuid | 조건: FK search_plan NULL',
	`supersedes_plan_id`	CHAR(36)	NULL	COMMENT '대체한 이전 계획 | 원형: uuid | 조건: FK search_plan NULL',
	`region_id`	CHAR(36)	NULL	COMMENT '지역 계획 대상 영역 (region_task.region_id) [승격] | 원형: uuid | 조건: FK search_region NULL',
	`input_versions`	JSON	NOT NULL	COMMENT '입력 버전 | 원형: jsonb | 조건: NN',
	`objective_mode`	TEXT	NOT NULL	COMMENT '목적 모드 | 원형: text | 조건: NN',
	`visit_order`	JSON	NULL	COMMENT '영역 방문 순서·채택/보류·비용 (region_visit) | 원형: jsonb | 조건: NULL',
	`task`	JSON	NULL	COMMENT '영역 작업 계약: 셀·예산·요청 해시·마감·결과·취소 (region_task) | 원형: jsonb | 조건: NULL',
	`candidates`	JSON	NULL	COMMENT '관측 후보·가시 셀·이득·비용·선택/기각 사유 (view_candidate) | 원형: jsonb | 조건: NULL',
	`route`	JSON	NULL	COMMENT '실행 구간 목록·경로·복귀 비용·상태 (plan_segment) | 원형: jsonb | 조건: NULL',
	`status`	TEXT	NOT NULL	COMMENT 'ACTIVE / SUPERSEDED / DONE / CANCELLED / FAILED | 원형: text | 조건: NN CHECK',
	`generated_at`	DATETIME	NOT NULL	COMMENT '생성 | 원형: timestamptz | 조건: NN',
	`expires_at`	DATETIME	NOT NULL	COMMENT '만료 | 원형: timestamptz | 조건: NN · > generated_at',
	`summary`	JSON	NOT NULL	COMMENT '요약 | 원형: jsonb | 조건: NN',
	`decision_log`	JSON	NOT NULL	COMMENT '우선순위·선택 근거 | 원형: jsonb | 조건: NN'
) COMMENT 'DB-09 search_plan · ERD-03 계획·관측';

CREATE TABLE `reobservation_request` (
	`request_id`	CHAR(36)	NOT NULL	COMMENT '요청 | 원형: uuid | 조건: PK',
	`candidate_id`	CHAR(36)	NOT NULL	COMMENT '후보 | 원형: uuid | 조건: FK person_candidate NN · 진행 중 1건 UQ(부분)',
	`mission_id`	CHAR(36)	NOT NULL	COMMENT '임무 | 원형: uuid | 조건: FK mission NN',
	`requester_kind`	TEXT	NOT NULL	COMMENT 'SYSTEM / USER | 원형: text | 조건: NN',
	`requested_by`	CHAR(36)	NULL	COMMENT '요청 운영자 | 원형: uuid | 조건: FK user_account NULL',
	`requested_at`	DATETIME	NOT NULL	COMMENT '요청 시각 | 원형: timestamptz | 조건: NN',
	`status`	TEXT	NOT NULL	COMMENT 'QUEUED / PLANNING / EXECUTING / DONE / DEFERRED / REJECTED | 원형: text | 조건: NN CHECK',
	`queue_order`	INT	NOT NULL	COMMENT '처리 순서 (안전 요청 우선) | 원형: integer | 조건: NN',
	`plan_id`	CHAR(36)	NULL	COMMENT '정밀 관측 계획 | 원형: uuid | 조건: FK search_plan NULL',
	`hypothesis`	JSON	NOT NULL	COMMENT '재관측 가설 | 원형: jsonb | 조건: NN',
	`desired_view`	JSON	NOT NULL	COMMENT '원하는 시점 | 원형: jsonb | 조건: NN',
	`limits`	JSON	NOT NULL	COMMENT 'max_time_s · max_attempts | 원형: jsonb | 조건: NN',
	`usage`	JSON	NOT NULL	COMMENT 'used_time_s · attempts | 원형: jsonb | 조건: NN',
	`result_evidence`	JSON	NOT NULL	COMMENT '추가 관측 결과 | 원형: jsonb | 조건: NN',
	`deferred_reason`	TEXT	NULL	COMMENT '미수행 사유 | 원형: text | 조건: NULL'
) COMMENT 'DB-10 reobservation_request · ERD-03 계획·관측';

CREATE TABLE `telemetry_sample` (
	`sample_id`	CHAR(36)	NOT NULL	COMMENT '표본 | 원형: uuid | 조건: PK',
	`mission_id`	CHAR(36)	NULL	COMMENT '임무 (임무 전 준비 상태 허용) | 원형: uuid | 조건: FK mission NULL',
	`drone_id`	VARCHAR(255)	NOT NULL	COMMENT '기체 | 원형: text | 조건: FK drone NN',
	`producer_id`	TEXT	NOT NULL	COMMENT '생산자 | 원형: text | 조건: NN',
	`producer_session_id`	VARCHAR(255)	NOT NULL	COMMENT '생산 세션 | 원형: text | 조건: NN · UQ(producer_session_id, sample_kind, sequence)',
	`sample_kind`	VARCHAR(255)	NOT NULL	COMMENT 'GNSS / ATTITUDE / GIMBAL / STATUS | 원형: text | 조건: NN',
	`sequence`	BIGINT	NOT NULL	COMMENT '순번 | 원형: bigint | 조건: NN >=0',
	`sample_time_raw`	BIGINT	NULL	COMMENT '원 시각 | 원형: bigint | 조건: NULL',
	`clock_domain`	TEXT	NOT NULL	COMMENT '시계 영역 | 원형: text | 조건: NN',
	`source_time_utc`	DATETIME	NULL	COMMENT '측정 시각 | 원형: timestamptz | 조건: NULL',
	`received_at`	DATETIME	NOT NULL	COMMENT '수신 시각 | 원형: timestamptz | 조건: NN',
	`time_evidence`	JSON	NOT NULL	COMMENT '시각 근거 | 원형: jsonb | 조건: NN',
	`pose`	JSON	NOT NULL	COMMENT '위치·고도·자세 | 원형: jsonb | 조건: NN',
	`flight_state`	JSON	NOT NULL	COMMENT '속도·배터리·모드·RC | 원형: jsonb | 조건: NN',
	`validity`	JSON	NOT NULL	COMMENT '유효성 | 원형: jsonb | 조건: NN'
) COMMENT 'DB-11 telemetry_sample · ERD-04 영상·탐지';

CREATE TABLE `video_frame` (
	`frame_id`	CHAR(36)	NOT NULL	COMMENT '프레임 | 원형: uuid | 조건: PK',
	`mission_id`	CHAR(36)	NULL	COMMENT '임무 | 원형: uuid | 조건: FK mission NULL',
	`drone_id`	VARCHAR(255)	NOT NULL	COMMENT '기체 | 원형: text | 조건: FK drone NN',
	`stream_id`	VARCHAR(255)	NOT NULL	COMMENT '스트림 (video_stream_epoch.stream_id) | 원형: text | 조건: NN',
	`stream_epoch`	INT	NOT NULL	COMMENT 'PTS/코덱 재시작 구간 번호 | 원형: integer | 조건: NN · UQ(stream_id, stream_epoch, frame_seq)',
	`frame_seq`	BIGINT	NOT NULL	COMMENT '프레임 순번 (video_frame_seq) | 원형: bigint | 조건: NN >=0',
	`identity_scope`	TEXT	NOT NULL	COMMENT 'source / gateway_received | 원형: text | 조건: NN CHECK',
	`capture_at`	DATETIME	NULL	COMMENT '촬영 시각 | 원형: timestamptz | 조건: NULL',
	`gateway_received_at`	DATETIME	NULL	COMMENT '게이트웨이 수신 시각 (측정 조건) [new] | 원형: timestamptz | 조건: NULL',
	`received_at`	DATETIME	NOT NULL	COMMENT '서버 수신 시각 | 원형: timestamptz | 조건: NN',
	`capture_time_verified`	BOOLEAN	NOT NULL	COMMENT '촬영 시각 측정/추정 | 원형: boolean | 조건: NN',
	`time_evidence`	JSON	NOT NULL	COMMENT '시각 근거·불확실도 | 원형: jsonb | 조건: NN',
	`width`	INT	NOT NULL	COMMENT '폭 | 원형: integer | 조건: NN >0',
	`height`	INT	NOT NULL	COMMENT '높이 | 원형: integer | 조건: NN >0',
	`format`	TEXT	NOT NULL	COMMENT '형식 | 원형: text | 조건: NN',
	`source_quality_status`	TEXT	NOT NULL	COMMENT '원본 품질 | 원형: text | 조건: NN',
	`metadata_state`	TEXT	NOT NULL	COMMENT '메타데이터 상태 | 원형: text | 조건: NN',
	`coordinate_config_id`	CHAR(36)	NULL	COMMENT '자세 결합 좌표 설정 (binding.coordinate_id) | 원형: uuid | 조건: FK config_version NULL',
	`pose`	JSON	NULL	COMMENT '보간 자세·방법·공분산·앞뒤 표본 ID (frame_pose_binding) | 원형: jsonb | 조건: NULL',
	`pose_status`	TEXT	NOT NULL	COMMENT 'VALID / ESTIMATED / PENDING / INVALID | 원형: text | 조건: NN CHECK',
	`pose_reason`	TEXT	NULL	COMMENT '보류 사유 | 원형: text | 조건: NULL',
	`footprint_geom`	GEOMETRY	NULL	COMMENT '촬영 범위 (UC-0802) [new] | 원형: geometry(MultiPolygon,4326) | 조건: NULL',
	`visible_geom`	GEOMETRY	NULL	COMMENT '가시 영역 (observation_evidence.visible_geom) | 원형: geometry(MultiPolygon,4326) | 조건: NULL',
	`coverage`	JSON	NULL	COMMENT '셀별 유효 관측 판정·구간·반영 시각 (observation_evidence) | 원형: jsonb | 조건: NULL',
	`obs_group`	TEXT	NULL	COMMENT '1초 관측 묶음 키 (observation_group) | 원형: text | 조건: NULL',
	`plan_id`	CHAR(36)	NULL	COMMENT '촬영 당시 계획 (UC-0506 관측 결과 연결) [new] | 원형: uuid | 조건: FK search_plan NULL',
	`analysis_mode`	TEXT	NULL	COMMENT 'LIVE_DETECT / LIVE_TRACK_ONLY / HISTORICAL | 원형: text | 조건: NULL CHECK',
	`analysis_state`	TEXT	NULL	COMMENT 'SELECTED / RUNNING / DONE / DROPPED / SKIPPED / FAILED | 원형: text | 조건: NULL CHECK',
	`skip_reason`	TEXT	NULL	COMMENT '폐기·선택 제외 사유 | 원형: text | 조건: NULL',
	`model_config_id`	CHAR(36)	NULL	COMMENT '분석 모델 | 원형: uuid | 조건: FK config_version NULL',
	`pipeline_version`	TEXT	NULL	COMMENT '파이프라인 버전 | 원형: text | 조건: NULL',
	`analysis_times`	JSON	NULL	COMMENT 'selected · started · completed 시각 | 원형: jsonb | 조건: NULL',
	`pre_ms`	DOUBLE	NULL	COMMENT '전처리 | 원형: double precision | 조건: NULL >=0',
	`infer_ms`	DOUBLE	NULL	COMMENT '추론 (NFR-V01) | 원형: double precision | 조건: NULL >=0',
	`post_ms`	DOUBLE	NULL	COMMENT '후처리 | 원형: double precision | 조건: NULL >=0',
	`task_quality_status`	TEXT	NULL	COMMENT '업무별 사용 조건 판정 | 원형: text | 조건: NULL'
) COMMENT 'DB-12 video_frame · ERD-04 영상·탐지';

CREATE TABLE `media_asset` (
	`asset_id`	CHAR(36)	NOT NULL	COMMENT '파일 참조 | 원형: uuid | 조건: PK',
	`mission_id`	CHAR(36)	NULL	COMMENT '임무 | 원형: uuid | 조건: FK mission NULL',
	`frame_id`	CHAR(36)	NULL	COMMENT '프레임 | 원형: uuid | 조건: FK video_frame NULL',
	`candidate_id`	CHAR(36)	NULL	COMMENT '후보 스냅샷 (candidate_snapshot) | 원형: uuid | 조건: FK person_candidate NULL',
	`observation_id`	CHAR(36)	NULL	COMMENT '근거 탐지 (candidate_snapshot) | 원형: uuid | 조건: FK detection_observation NULL',
	`asset_type`	TEXT	NOT NULL	COMMENT 'RECORDING / SNAPSHOT / CROP / EXPORT_KML / CALIBRATION / MODEL / EVALUATION | 원형: text | 조건: NN CHECK',
	`storage_uri`	TEXT	NOT NULL	COMMENT '경로 | 원형: text | 조건: NN',
	`content_hash`	TEXT	NOT NULL	COMMENT '해시 | 원형: text | 조건: NN',
	`time_start`	DATETIME	NULL	COMMENT '구간 시작 | 원형: timestamptz | 조건: NULL',
	`time_end`	DATETIME	NULL	COMMENT '구간 끝 | 원형: timestamptz | 조건: NULL',
	`state`	TEXT	NOT NULL	COMMENT 'WRITING / STORED / FAILED / DELETED | 원형: text | 조건: NN CHECK',
	`gaps`	JSON	NOT NULL	COMMENT '누락 구간 | 원형: jsonb | 조건: NN',
	`quality_status`	TEXT	NULL	COMMENT '스냅샷 품질 | 원형: text | 조건: NULL',
	`historical`	BOOLEAN	NOT NULL	COMMENT '재관측 등으로 대체됨 | 원형: boolean | 조건: NN',
	`retention_class`	TEXT	NOT NULL	COMMENT 'DEFAULT / FALSE_POSITIVE_KEEP / MODEL (storage_policy_id 대체) | 원형: text | 조건: NN CHECK',
	`retained_until`	DATETIME	NULL	COMMENT '보존 기한 | 원형: timestamptz | 조건: NULL',
	`source_asset_id`	CHAR(36)	NULL	COMMENT '파생 원본 | 원형: uuid | 조건: FK media_asset NULL',
	`meta`	JSON	NULL	COMMENT 'representation_kind · snapshot_kind · captured_at · supersedes · deletion_reason | 원형: jsonb | 조건: NULL',
	`created_at`	DATETIME	NOT NULL	COMMENT '생성 | 원형: timestamptz | 조건: NN'
) COMMENT 'DB-13 media_asset · ERD-04 영상·탐지';

CREATE TABLE `person_candidate` (
	`candidate_id`	CHAR(36)	NOT NULL	COMMENT '후보 | 원형: uuid | 조건: PK',
	`mission_id`	CHAR(36)	NOT NULL	COMMENT '임무 | 원형: uuid | 조건: FK mission NN',
	`first_frame_id`	CHAR(36)	NULL	COMMENT '첫 탐지 프레임 | 원형: uuid | 조건: FK video_frame NULL',
	`first_asset_id`	CHAR(36)	NULL	COMMENT '첫 스냅샷 | 원형: uuid | 조건: FK media_asset NULL',
	`first_seen`	DATETIME	NULL	COMMENT '처음 | 원형: timestamptz | 조건: NULL',
	`last_seen`	DATETIME	NULL	COMMENT '마지막 | 원형: timestamptz | 조건: NULL',
	`association_state`	TEXT	NOT NULL	COMMENT '영상 ID 연결·유실·만료 | 원형: text | 조건: NN CHECK',
	`evidence_count`	INT	NOT NULL	COMMENT '탐지 관측 수 | 원형: integer | 조건: NN >=0',
	`valid_group_count`	INT	NOT NULL	COMMENT '서로 다른 시각 유효 관측 수 (3회↑ 반복 확인) | 원형: integer | 조건: NN >=0',
	`latest_position`	GEOMETRY	NULL	COMMENT 'WGS84 위치 | 원형: geometry(Point,4326) | 조건: NULL',
	`geo_status`	TEXT	NOT NULL	COMMENT 'VALID / PENDING / INVALID | 원형: text | 조건: NN CHECK',
	`geo_reason`	TEXT	NULL	COMMENT '보류 사유 | 원형: text | 조건: NULL',
	`ellipse`	JSON	NULL	COMMENT '오차 타원 | 원형: jsonb | 조건: NULL',
	`coordinate_config_id`	CHAR(36)	NULL	COMMENT '좌표 설정 (coordinate_id) | 원형: uuid | 조건: FK config_version NULL',
	`appearance`	JSON	NOT NULL	COMMENT '상의 색상 1·2순위·확신도·일치 여부 | 원형: jsonb | 조건: NN',
	`judgement`	JSON	NOT NULL	COMMENT '운영자 판단·판단자·시각 | 원형: jsonb | 조건: NN',
	`tracking`	JSON	NULL	COMMENT '개별 추적 진행·위치·유실·종료·마지막 관측 (UC-0708) [new] | 원형: jsonb | 조건: NULL',
	`latest_observation_id`	CHAR(36)	NULL	COMMENT '최근 근거 | 원형: uuid | 조건: FK detection_observation NULL',
	`row_version`	BIGINT	NOT NULL	COMMENT '동시성 버전 | 원형: bigint | 조건: NN'
) COMMENT 'DB-14 person_candidate · ERD-04 영상·탐지';

CREATE TABLE `detection_observation` (
	`observation_id`	CHAR(36)	NOT NULL	COMMENT '탐지 관측 | 원형: uuid | 조건: PK',
	`candidate_id`	CHAR(36)	NULL	COMMENT '연결 후보 | 원형: uuid | 조건: FK person_candidate NULL',
	`frame_id`	CHAR(36)	NOT NULL	COMMENT '프레임 | 원형: uuid | 조건: FK video_frame NN',
	`analysis_mode`	VARCHAR(255)	NOT NULL	COMMENT 'LIVE / HISTORICAL (analysis_job 대체) | 원형: text | 조건: NN · UQ(frame_id, analysis_mode, detection_index)',
	`detection_index`	INT	NOT NULL	COMMENT '프레임 내 번호 | 원형: integer | 조건: NN',
	`track_id`	TEXT	NULL	COMMENT '영상 ID (UC-0703) [승격] | 원형: text | 조건: NULL',
	`bbox`	JSON	NOT NULL	COMMENT '경계 상자 | 원형: jsonb | 조건: NN',
	`confidence`	DOUBLE	NOT NULL	COMMENT '신뢰도 | 원형: double precision | 조건: NN · [0,1]',
	`class_name`	TEXT	NOT NULL	COMMENT 'person | 원형: text | 조건: NN',
	`observation_kind`	TEXT	NOT NULL	COMMENT 'DETECT / TRACK_ONLY | 원형: text | 조건: NN CHECK',
	`model_config_id`	CHAR(36)	NOT NULL	COMMENT '모델 버전 | 원형: uuid | 조건: FK config_version NN',
	`coordinate_config_id`	CHAR(36)	NULL	COMMENT '좌표 설정 | 원형: uuid | 조건: FK config_version NULL',
	`association_evidence`	JSON	NOT NULL	COMMENT '연결 근거 | 원형: jsonb | 조건: NN',
	`geo_result`	JSON	NOT NULL	COMMENT '좌표·오차·보류 사유 | 원형: jsonb | 조건: NN',
	`historical`	BOOLEAN	NOT NULL	COMMENT '대체됨 | 원형: boolean | 조건: NN',
	`supersedes_id`	CHAR(36)	NULL	COMMENT '대체한 관측 | 원형: uuid | 조건: FK detection_observation NULL'
) COMMENT 'DB-15 detection_observation · ERD-04 영상·탐지';

CREATE TABLE `flight_command` (
	`command_id`	CHAR(36)	NOT NULL	COMMENT '명령 | 원형: uuid | 조건: PK',
	`request_hash`	VARCHAR(255)	NOT NULL	COMMENT '중복 방지 키 | 원형: text | 조건: UQ NN',
	`mission_id`	CHAR(36)	NULL	COMMENT '임무 | 원형: uuid | 조건: NULL · FK (mission_id, mission_revision)',
	`mission_revision`	INT	NULL	COMMENT '실행 개정 | 원형: integer | 조건: NULL',
	`plan_id`	CHAR(36)	NULL	COMMENT '계획 (region_task 포함) | 원형: uuid | 조건: FK search_plan NULL',
	`segment_order`	INT	NULL	COMMENT '계획 안 실행 구간 번호 (plan_segment) | 원형: integer | 조건: NULL',
	`drone_id`	VARCHAR(255)	NOT NULL	COMMENT '기체 | 원형: text | 조건: FK drone NN',
	`control_epoch`	BIGINT	NOT NULL	COMMENT '제어 세대 | 원형: bigint | 조건: NN',
	`sequence`	BIGINT	NOT NULL	COMMENT '순번 | 원형: bigint | 조건: NN',
	`issued_at`	DATETIME	NOT NULL	COMMENT '발행 | 원형: timestamptz | 조건: NN',
	`expires_at`	DATETIME	NOT NULL	COMMENT '만료 | 원형: timestamptz | 조건: NN · > issued_at',
	`schema_version`	TEXT	NOT NULL	COMMENT '메시지 스키마 | 원형: text | 조건: NN',
	`policy_version`	TEXT	NOT NULL	COMMENT '정책 버전 | 원형: text | 조건: NN',
	`coordinate_config_id`	CHAR(36)	NULL	COMMENT '좌표 기준 | 원형: uuid | 조건: FK config_version NULL',
	`requester`	JSON	NOT NULL	COMMENT '요청 주체 (사용자/시스템) | 원형: jsonb | 조건: NN',
	`action`	TEXT	NOT NULL	COMMENT '동작 | 원형: text | 조건: NN',
	`payload`	JSON	NOT NULL	COMMENT '목표 원문 | 원형: jsonb | 조건: NN',
	`state`	TEXT	NOT NULL	COMMENT 'REQUESTED / ACCEPTED / REJECTED / EXECUTING / COMPLETED / FAILED / UNCONFIRMED / INVALIDATED | 원형: text | 조건: NN CHECK',
	`status_revision`	INT	NOT NULL	COMMENT '상태 변경 번호 | 원형: integer | 조건: NN',
	`reason_code`	TEXT	NULL	COMMENT '거부·실패 사유 [new] | 원형: text | 조건: NULL',
	`last_evidence_at`	DATETIME	NULL	COMMENT '마지막 근거 시각 | 원형: timestamptz | 조건: NULL',
	`execution_deadline`	DATETIME	NULL	COMMENT '실행 마감 | 원형: timestamptz | 조건: NULL',
	`completion_policy`	JSON	NULL	COMMENT '완료 판정 조건 | 원형: jsonb | 조건: NULL'
) COMMENT 'DB-16 flight_command · ERD-05 명령·이력';

CREATE TABLE `alert` (
	`alert_id`	CHAR(36)	NOT NULL	COMMENT '알림 | 원형: uuid | 조건: PK',
	`mission_id`	CHAR(36)	NULL	COMMENT '임무 | 원형: uuid | 조건: FK mission NULL',
	`source_event_id`	CHAR(36)	NULL	COMMENT '원인 사건 | 원형: uuid | 조건: FK mission_event NULL',
	`dedup_key`	VARCHAR(255)	NOT NULL	COMMENT '반복 알림 억제 키 | 원형: text | 조건: UQ NN',
	`type`	TEXT	NOT NULL	COMMENT '새 후보 / 색상 일치 / 쓰러짐 의심 / ID 유실 / 장애 / 명령 실패 | 원형: text | 조건: NN',
	`priority`	INT	NOT NULL	COMMENT '우선도 | 원형: integer | 조건: NN',
	`raised_at`	DATETIME	NOT NULL	COMMENT '발생 | 원형: timestamptz | 조건: NN',
	`evidence_refs`	JSON	NOT NULL	COMMENT '임무·기체·후보·스냅샷·명령 참조 | 원형: jsonb | 조건: NN',
	`ack_user_id`	CHAR(36)	NULL	COMMENT '확인자 | 원형: uuid | 조건: FK user_account NULL',
	`acknowledged_at`	DATETIME	NULL	COMMENT '확인 시각 | 원형: timestamptz | 조건: NULL'
) COMMENT 'DB-17 alert · ERD-05 명령·이력';

CREATE TABLE `mission_event` (
	`event_id`	CHAR(36)	NOT NULL	COMMENT '사건 | 원형: uuid | 조건: PK',
	`event_seq`	BIGINT	NOT NULL	COMMENT '재동기화 커서 | 원형: bigint | 조건: UQ NN',
	`mission_id`	CHAR(36)	NULL	COMMENT '임무 | 원형: uuid | 조건: FK mission NULL',
	`drone_id`	VARCHAR(255)	NULL	COMMENT '기체 | 원형: text | 조건: FK drone NULL',
	`event_type`	VARCHAR(255)	NOT NULL	COMMENT 'COMMAND_STATE / EXECUTION_REPORT / SAFETY / OPERATOR_ACTION / STREAM_GAP / STREAM_EPOCH / LINK / GATEWAY / CONTROL / MISSION_STATE / OBS_GROUP / BELIEF_UPDATE / READINESS … | 원형: text | 조건: NN CHECK',
	`code`	TEXT	NULL	COMMENT 'EX-xx · 장애 종류 · 사유 코드 [승격] | 원형: text | 조건: NULL',
	`use_case_id`	TEXT	NULL	COMMENT '관련 UC | 원형: text | 조건: NULL',
	`actor_user_id`	CHAR(36)	NULL	COMMENT '수행 운영자 (operator_action.user_id) [승격] | 원형: uuid | 조건: FK user_account NULL',
	`ref_table`	TEXT	NULL	COMMENT '대상 테이블 [new] | 원형: text | 조건: NULL',
	`ref_id`	TEXT	NULL	COMMENT '대상 ID (명령·후보·영역 …) [new] | 원형: text | 조건: NULL',
	`source_time`	DATETIME	NULL	COMMENT '발생 시각 | 원형: timestamptz | 조건: NULL',
	`stored_at`	DATETIME	NOT NULL	COMMENT '저장 시각 | 원형: timestamptz | 조건: NN',
	`source_epoch`	TEXT	NOT NULL	COMMENT '생산 epoch | 원형: text | 조건: NN',
	`correlation_id`	TEXT	NOT NULL	COMMENT '상관 ID | 원형: text | 조건: NN',
	`payload`	JSON	NOT NULL	COMMENT '종류별 내용 | 원형: jsonb | 조건: NN',
	`refs`	JSON	NOT NULL	COMMENT '근거 참조 | 원형: jsonb | 조건: NN',
	`producer_id`	VARCHAR(255)	NOT NULL	COMMENT '생산자 | 원형: text | 조건: NN',
	`producer_session_id`	VARCHAR(255)	NOT NULL	COMMENT '생산 세션 | 원형: text | 조건: NN',
	`sequence`	BIGINT	NOT NULL	COMMENT '생산 순번 | 원형: bigint | 조건: NN · UQ(producer_id, producer_session_id, sequence, event_type)',
	`publish_state`	TEXT	NOT NULL	COMMENT '전파 상태 | 원형: text | 조건: NN',
	`published_at`	DATETIME	NULL	COMMENT '전파 시각 | 원형: timestamptz | 조건: NULL'
) COMMENT 'DB-18 mission_event · ERD-05 명령·이력';

ALTER TABLE `user_account` ADD CONSTRAINT `PK_USER_ACCOUNT` PRIMARY KEY (`user_id`);
ALTER TABLE `user_session` ADD CONSTRAINT `PK_USER_SESSION` PRIMARY KEY (`session_id`);
ALTER TABLE `drone` ADD CONSTRAINT `PK_DRONE` PRIMARY KEY (`drone_id`);
ALTER TABLE `mission` ADD CONSTRAINT `PK_MISSION` PRIMARY KEY (`mission_id`);
ALTER TABLE `mission_revision` ADD CONSTRAINT `PK_MISSION_REVISION` PRIMARY KEY (`mission_id`, `revision`);
ALTER TABLE `config_version` ADD CONSTRAINT `PK_CONFIG_VERSION` PRIMARY KEY (`config_id`);
ALTER TABLE `search_region` ADD CONSTRAINT `PK_SEARCH_REGION` PRIMARY KEY (`region_id`);
ALTER TABLE `observation_cell` ADD CONSTRAINT `PK_OBSERVATION_CELL` PRIMARY KEY (`mission_id`, `grid_version`, `cell_id`);
ALTER TABLE `search_plan` ADD CONSTRAINT `PK_SEARCH_PLAN` PRIMARY KEY (`plan_id`);
ALTER TABLE `reobservation_request` ADD CONSTRAINT `PK_REOBSERVATION_REQUEST` PRIMARY KEY (`request_id`);
ALTER TABLE `telemetry_sample` ADD CONSTRAINT `PK_TELEMETRY_SAMPLE` PRIMARY KEY (`sample_id`);
ALTER TABLE `video_frame` ADD CONSTRAINT `PK_VIDEO_FRAME` PRIMARY KEY (`frame_id`);
ALTER TABLE `media_asset` ADD CONSTRAINT `PK_MEDIA_ASSET` PRIMARY KEY (`asset_id`);
ALTER TABLE `person_candidate` ADD CONSTRAINT `PK_PERSON_CANDIDATE` PRIMARY KEY (`candidate_id`);
ALTER TABLE `detection_observation` ADD CONSTRAINT `PK_DETECTION_OBSERVATION` PRIMARY KEY (`observation_id`);
ALTER TABLE `flight_command` ADD CONSTRAINT `PK_FLIGHT_COMMAND` PRIMARY KEY (`command_id`);
ALTER TABLE `alert` ADD CONSTRAINT `PK_ALERT` PRIMARY KEY (`alert_id`);
ALTER TABLE `mission_event` ADD CONSTRAINT `PK_MISSION_EVENT` PRIMARY KEY (`event_id`);

ALTER TABLE `user_account` ADD CONSTRAINT `UQ_USER_ACCOUNT_LOGIN_ID` UNIQUE (`login_id`);
ALTER TABLE `user_session` ADD CONSTRAINT `UQ_USER_SESSION_TOKEN_DIGEST` UNIQUE (`token_digest`);
ALTER TABLE `config_version` ADD CONSTRAINT `UQ_CONFIG_VERSION_KIND_VERSION` UNIQUE (`kind`, `version`);
ALTER TABLE `search_plan` ADD CONSTRAINT `UQ_SEARCH_PLAN_MISSION_ID_PLAN_VERSION` UNIQUE (`mission_id`, `plan_version`);
ALTER TABLE `telemetry_sample` ADD CONSTRAINT `UQ_TELEMETRY_SAMPLE_PRODUCER_SESSION_ID_SAMPLE_KIND_SEQUENCE` UNIQUE (`producer_session_id`, `sample_kind`, `sequence`);
ALTER TABLE `video_frame` ADD CONSTRAINT `UQ_VIDEO_FRAME_STREAM_ID_STREAM_EPOCH_FRAME_SEQ` UNIQUE (`stream_id`, `stream_epoch`, `frame_seq`);
ALTER TABLE `detection_observation` ADD CONSTRAINT `UQ_DETECTION_OBSERVATION_FRAME_ID_ANALYSIS_MODE_DETECTION_INDEX` UNIQUE (`frame_id`, `analysis_mode`, `detection_index`);
ALTER TABLE `flight_command` ADD CONSTRAINT `UQ_FLIGHT_COMMAND_REQUEST_HASH` UNIQUE (`request_hash`);
ALTER TABLE `alert` ADD CONSTRAINT `UQ_ALERT_DEDUP_KEY` UNIQUE (`dedup_key`);
ALTER TABLE `mission_event` ADD CONSTRAINT `UQ_MISSION_EVENT_EVENT_SEQ` UNIQUE (`event_seq`);
ALTER TABLE `mission_event` ADD CONSTRAINT `UQ_MISSION_EVENT_PRODUCER_ID_PRODUCER_SESSION_ID_SEQUENCE_EVENT_TYPE` UNIQUE (`producer_id`, `producer_session_id`, `sequence`, `event_type`);

ALTER TABLE `user_session` ADD CONSTRAINT `FK_USER_SESSION_USER_ID` FOREIGN KEY (`user_id`) REFERENCES `user_account` (`user_id`);
ALTER TABLE `drone` ADD CONSTRAINT `FK_DRONE_CAMERA_CONFIG_ID` FOREIGN KEY (`camera_config_id`) REFERENCES `config_version` (`config_id`);
ALTER TABLE `drone` ADD CONSTRAINT `FK_DRONE_CONTROL_USER_ID` FOREIGN KEY (`control_user_id`) REFERENCES `user_account` (`user_id`);
ALTER TABLE `drone` ADD CONSTRAINT `FK_DRONE_CONTROL_SESSION_ID` FOREIGN KEY (`control_session_id`) REFERENCES `user_session` (`session_id`);
ALTER TABLE `mission` ADD CONSTRAINT `FK_MISSION_DRONE_ID` FOREIGN KEY (`drone_id`) REFERENCES `drone` (`drone_id`);
ALTER TABLE `mission` ADD CONSTRAINT `FK_MISSION_CREATOR_USER_ID` FOREIGN KEY (`creator_user_id`) REFERENCES `user_account` (`user_id`);
ALTER TABLE `mission` ADD CONSTRAINT `FK_MISSION_ACTIVE_REVISION` FOREIGN KEY (`mission_id`, `active_revision`) REFERENCES `mission_revision` (`mission_id`, `revision`); -- PostgreSQL: DEFERRABLE INITIALLY DEFERRED
ALTER TABLE `mission` ADD CONSTRAINT `FK_MISSION_APPROVED_BY` FOREIGN KEY (`approved_by`) REFERENCES `user_account` (`user_id`);
ALTER TABLE `mission_revision` ADD CONSTRAINT `FK_MISSION_REVISION_MISSION_ID` FOREIGN KEY (`mission_id`) REFERENCES `mission` (`mission_id`);
ALTER TABLE `mission_revision` ADD CONSTRAINT `FK_MISSION_REVISION_SPATIAL_CONFIG_ID` FOREIGN KEY (`spatial_config_id`) REFERENCES `config_version` (`config_id`);
ALTER TABLE `mission_revision` ADD CONSTRAINT `FK_MISSION_REVISION_COORDINATE_CONFIG_ID` FOREIGN KEY (`coordinate_config_id`) REFERENCES `config_version` (`config_id`);
ALTER TABLE `mission_revision` ADD CONSTRAINT `FK_MISSION_REVISION_POLICY_CONFIG_ID` FOREIGN KEY (`policy_config_id`) REFERENCES `config_version` (`config_id`);
ALTER TABLE `mission_revision` ADD CONSTRAINT `FK_MISSION_REVISION_MODEL_CONFIG_ID` FOREIGN KEY (`model_config_id`) REFERENCES `config_version` (`config_id`);
ALTER TABLE `config_version` ADD CONSTRAINT `FK_CONFIG_VERSION_PARENT_ID` FOREIGN KEY (`parent_id`) REFERENCES `config_version` (`config_id`);
ALTER TABLE `config_version` ADD CONSTRAINT `FK_CONFIG_VERSION_ASSET_ID` FOREIGN KEY (`asset_id`) REFERENCES `media_asset` (`asset_id`);
ALTER TABLE `config_version` ADD CONSTRAINT `FK_CONFIG_VERSION_APPROVED_BY` FOREIGN KEY (`approved_by`) REFERENCES `user_account` (`user_id`);
ALTER TABLE `search_region` ADD CONSTRAINT `FK_SEARCH_REGION_MISSION_REVISION` FOREIGN KEY (`mission_id`, `mission_revision`) REFERENCES `mission_revision` (`mission_id`, `revision`);
ALTER TABLE `observation_cell` ADD CONSTRAINT `FK_OBSERVATION_CELL_MISSION_ID` FOREIGN KEY (`mission_id`) REFERENCES `mission` (`mission_id`);
ALTER TABLE `observation_cell` ADD CONSTRAINT `FK_OBSERVATION_CELL_REGION_ID` FOREIGN KEY (`region_id`) REFERENCES `search_region` (`region_id`);
ALTER TABLE `observation_cell` ADD CONSTRAINT `FK_OBSERVATION_CELL_SPATIAL_CONFIG_ID` FOREIGN KEY (`spatial_config_id`) REFERENCES `config_version` (`config_id`);
ALTER TABLE `search_plan` ADD CONSTRAINT `FK_SEARCH_PLAN_MISSION_REVISION` FOREIGN KEY (`mission_id`, `mission_revision`) REFERENCES `mission_revision` (`mission_id`, `revision`);
ALTER TABLE `search_plan` ADD CONSTRAINT `FK_SEARCH_PLAN_PARENT_PLAN_ID` FOREIGN KEY (`parent_plan_id`) REFERENCES `search_plan` (`plan_id`);
ALTER TABLE `search_plan` ADD CONSTRAINT `FK_SEARCH_PLAN_SUPERSEDES_PLAN_ID` FOREIGN KEY (`supersedes_plan_id`) REFERENCES `search_plan` (`plan_id`);
ALTER TABLE `search_plan` ADD CONSTRAINT `FK_SEARCH_PLAN_REGION_ID` FOREIGN KEY (`region_id`) REFERENCES `search_region` (`region_id`);
ALTER TABLE `reobservation_request` ADD CONSTRAINT `FK_REOBSERVATION_REQUEST_CANDIDATE_ID` FOREIGN KEY (`candidate_id`) REFERENCES `person_candidate` (`candidate_id`);
ALTER TABLE `reobservation_request` ADD CONSTRAINT `FK_REOBSERVATION_REQUEST_MISSION_ID` FOREIGN KEY (`mission_id`) REFERENCES `mission` (`mission_id`);
ALTER TABLE `reobservation_request` ADD CONSTRAINT `FK_REOBSERVATION_REQUEST_REQUESTED_BY` FOREIGN KEY (`requested_by`) REFERENCES `user_account` (`user_id`);
ALTER TABLE `reobservation_request` ADD CONSTRAINT `FK_REOBSERVATION_REQUEST_PLAN_ID` FOREIGN KEY (`plan_id`) REFERENCES `search_plan` (`plan_id`);
ALTER TABLE `telemetry_sample` ADD CONSTRAINT `FK_TELEMETRY_SAMPLE_MISSION_ID` FOREIGN KEY (`mission_id`) REFERENCES `mission` (`mission_id`);
ALTER TABLE `telemetry_sample` ADD CONSTRAINT `FK_TELEMETRY_SAMPLE_DRONE_ID` FOREIGN KEY (`drone_id`) REFERENCES `drone` (`drone_id`);
ALTER TABLE `video_frame` ADD CONSTRAINT `FK_VIDEO_FRAME_MISSION_ID` FOREIGN KEY (`mission_id`) REFERENCES `mission` (`mission_id`);
ALTER TABLE `video_frame` ADD CONSTRAINT `FK_VIDEO_FRAME_DRONE_ID` FOREIGN KEY (`drone_id`) REFERENCES `drone` (`drone_id`);
ALTER TABLE `video_frame` ADD CONSTRAINT `FK_VIDEO_FRAME_COORDINATE_CONFIG_ID` FOREIGN KEY (`coordinate_config_id`) REFERENCES `config_version` (`config_id`);
ALTER TABLE `video_frame` ADD CONSTRAINT `FK_VIDEO_FRAME_PLAN_ID` FOREIGN KEY (`plan_id`) REFERENCES `search_plan` (`plan_id`);
ALTER TABLE `video_frame` ADD CONSTRAINT `FK_VIDEO_FRAME_MODEL_CONFIG_ID` FOREIGN KEY (`model_config_id`) REFERENCES `config_version` (`config_id`);
ALTER TABLE `media_asset` ADD CONSTRAINT `FK_MEDIA_ASSET_MISSION_ID` FOREIGN KEY (`mission_id`) REFERENCES `mission` (`mission_id`);
ALTER TABLE `media_asset` ADD CONSTRAINT `FK_MEDIA_ASSET_FRAME_ID` FOREIGN KEY (`frame_id`) REFERENCES `video_frame` (`frame_id`);
ALTER TABLE `media_asset` ADD CONSTRAINT `FK_MEDIA_ASSET_CANDIDATE_ID` FOREIGN KEY (`candidate_id`) REFERENCES `person_candidate` (`candidate_id`);
ALTER TABLE `media_asset` ADD CONSTRAINT `FK_MEDIA_ASSET_OBSERVATION_ID` FOREIGN KEY (`observation_id`) REFERENCES `detection_observation` (`observation_id`);
ALTER TABLE `media_asset` ADD CONSTRAINT `FK_MEDIA_ASSET_SOURCE_ASSET_ID` FOREIGN KEY (`source_asset_id`) REFERENCES `media_asset` (`asset_id`);
ALTER TABLE `person_candidate` ADD CONSTRAINT `FK_PERSON_CANDIDATE_MISSION_ID` FOREIGN KEY (`mission_id`) REFERENCES `mission` (`mission_id`);
ALTER TABLE `person_candidate` ADD CONSTRAINT `FK_PERSON_CANDIDATE_FIRST_FRAME_ID` FOREIGN KEY (`first_frame_id`) REFERENCES `video_frame` (`frame_id`);
ALTER TABLE `person_candidate` ADD CONSTRAINT `FK_PERSON_CANDIDATE_FIRST_ASSET_ID` FOREIGN KEY (`first_asset_id`) REFERENCES `media_asset` (`asset_id`);
ALTER TABLE `person_candidate` ADD CONSTRAINT `FK_PERSON_CANDIDATE_COORDINATE_CONFIG_ID` FOREIGN KEY (`coordinate_config_id`) REFERENCES `config_version` (`config_id`);
ALTER TABLE `person_candidate` ADD CONSTRAINT `FK_PERSON_CANDIDATE_LATEST_OBSERVATION_ID` FOREIGN KEY (`latest_observation_id`) REFERENCES `detection_observation` (`observation_id`);
ALTER TABLE `detection_observation` ADD CONSTRAINT `FK_DETECTION_OBSERVATION_CANDIDATE_ID` FOREIGN KEY (`candidate_id`) REFERENCES `person_candidate` (`candidate_id`);
ALTER TABLE `detection_observation` ADD CONSTRAINT `FK_DETECTION_OBSERVATION_FRAME_ID` FOREIGN KEY (`frame_id`) REFERENCES `video_frame` (`frame_id`);
ALTER TABLE `detection_observation` ADD CONSTRAINT `FK_DETECTION_OBSERVATION_MODEL_CONFIG_ID` FOREIGN KEY (`model_config_id`) REFERENCES `config_version` (`config_id`);
ALTER TABLE `detection_observation` ADD CONSTRAINT `FK_DETECTION_OBSERVATION_COORDINATE_CONFIG_ID` FOREIGN KEY (`coordinate_config_id`) REFERENCES `config_version` (`config_id`);
ALTER TABLE `detection_observation` ADD CONSTRAINT `FK_DETECTION_OBSERVATION_SUPERSEDES_ID` FOREIGN KEY (`supersedes_id`) REFERENCES `detection_observation` (`observation_id`);
ALTER TABLE `flight_command` ADD CONSTRAINT `FK_FLIGHT_COMMAND_MISSION_REVISION` FOREIGN KEY (`mission_id`, `mission_revision`) REFERENCES `mission_revision` (`mission_id`, `revision`);
ALTER TABLE `flight_command` ADD CONSTRAINT `FK_FLIGHT_COMMAND_PLAN_ID` FOREIGN KEY (`plan_id`) REFERENCES `search_plan` (`plan_id`);
ALTER TABLE `flight_command` ADD CONSTRAINT `FK_FLIGHT_COMMAND_DRONE_ID` FOREIGN KEY (`drone_id`) REFERENCES `drone` (`drone_id`);
ALTER TABLE `flight_command` ADD CONSTRAINT `FK_FLIGHT_COMMAND_COORDINATE_CONFIG_ID` FOREIGN KEY (`coordinate_config_id`) REFERENCES `config_version` (`config_id`);
ALTER TABLE `alert` ADD CONSTRAINT `FK_ALERT_MISSION_ID` FOREIGN KEY (`mission_id`) REFERENCES `mission` (`mission_id`);
ALTER TABLE `alert` ADD CONSTRAINT `FK_ALERT_SOURCE_EVENT_ID` FOREIGN KEY (`source_event_id`) REFERENCES `mission_event` (`event_id`);
ALTER TABLE `alert` ADD CONSTRAINT `FK_ALERT_ACK_USER_ID` FOREIGN KEY (`ack_user_id`) REFERENCES `user_account` (`user_id`);
ALTER TABLE `mission_event` ADD CONSTRAINT `FK_MISSION_EVENT_MISSION_ID` FOREIGN KEY (`mission_id`) REFERENCES `mission` (`mission_id`);
ALTER TABLE `mission_event` ADD CONSTRAINT `FK_MISSION_EVENT_DRONE_ID` FOREIGN KEY (`drone_id`) REFERENCES `drone` (`drone_id`);
ALTER TABLE `mission_event` ADD CONSTRAINT `FK_MISSION_EVENT_ACTOR_USER_ID` FOREIGN KEY (`actor_user_id`) REFERENCES `user_account` (`user_id`);

-- PostgreSQL 에서 추가: reobservation_request 진행 중 1건 부분 UNIQUE
-- CREATE UNIQUE INDEX uq_reobs_active ON reobservation_request (candidate_id) WHERE status IN ('QUEUED','PLANNING','EXECUTING');
-- 명령 상태 전이 중복 방지 (옛 command_transition UQ(command_id, status_revision))
-- CREATE UNIQUE INDEX uq_cmd_transition ON mission_event (ref_id, (payload->>'status_revision')) WHERE event_type = 'COMMAND_STATE';
