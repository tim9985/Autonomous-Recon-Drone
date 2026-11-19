CREATE TABLE `search_region` (
	`region_id`	CHAR(36)	NOT NULL	COMMENT '영역 식별자 | 원형: uuid | 원문 조건: PK',
	`mission_id`	CHAR(36)	NOT NULL	COMMENT '분할 기준 임무·격자 버전 | 원형: uuid | 원문 조건: DB-05 복합 FK; NN',
	`mission_revision`	INT	NOT NULL	COMMENT '분할 기준 임무·격자 버전 | 원형: integer | 원문 조건: DB-05 복합 FK; NN',
	`grid_version`	TEXT	NOT NULL	COMMENT '분할 기준 임무·격자 버전 | 원형: text | 원문 조건: DB-05 복합 FK; NN',
	`region_type`	TEXT	NOT NULL	COMMENT '시설/통로/건물주변/미분류와 출처 | 원형: text | 원문 조건: NN',
	`source_features`	JSON	NOT NULL	COMMENT '시설/통로/건물주변/미분류와 출처 | 원형: jsonb | 원문 조건: NN',
	`region_geom`	GEOMETRY	NOT NULL	COMMENT '실제 수색 경계와 순서 계산용 대표점 | 원형: geometry(MultiPolygon,4326) | 원문 조건: NN',
	`representative_point`	GEOMETRY	NOT NULL	COMMENT '실제 수색 경계와 순서 계산용 대표점 | 원형: geometry(Point,4326) | 원문 조건: NN',
	`total_area_m2`	DOUBLE	NOT NULL	COMMENT '셀 증거 합집합에서 집계 | 원형: double precision | 원문 조건: NN; 0<=remain<=total',
	`remaining_area_m2`	DOUBLE	NOT NULL	COMMENT '셀 증거 합집합에서 집계 | 원형: double precision | 원문 조건: NN; 0<=remain<=total',
	`state`	TEXT	NOT NULL	COMMENT 'PENDING/ACTIVE/PARTIAL/SATISFIED/DEFERRED/BLOCKED | 원형: text | 원문 조건: NN; 시간 NULL 또는>0',
	`pass_index`	INT	NOT NULL	COMMENT 'PENDING/ACTIVE/PARTIAL/SATISFIED/DEFERRED/BLOCKED | 원형: integer | 원문 조건: NN; 시간 NULL 또는>0',
	`service_estimate_s`	DOUBLE	NULL	COMMENT 'PENDING/ACTIVE/PARTIAL/SATISFIED/DEFERRED/BLOCKED | 원형: double precision | 원문 조건: NN; 시간 NULL 또는>0',
	`reason`	TEXT	NULL	COMMENT '보류/미해결 사유와 동시성 버전 | 원형: text | 원문 조건: NULL, NN',
	`row_version`	BIGINT	NOT NULL	COMMENT '보류/미해결 사유와 동시성 버전 | 원형: bigint | 원문 조건: NULL, NN'
);

CREATE TABLE `spatial_context` (
	`context_id`	CHAR(36)	NOT NULL	COMMENT '공간 기준 버전 | 원형: uuid | 원문 조건: PK',
	`source_crs`	TEXT	NOT NULL	COMMENT '원본 및 내부 탐색 좌표계 표기 | 원형: text | 원문 조건: NOT NULL',
	`internal_crs`	TEXT	NOT NULL	COMMENT '원본 및 내부 탐색 좌표계 표기 | 원형: text | 원문 조건: NOT NULL',
	`origin_wgs84`	GEOMETRY	NOT NULL	COMMENT '내부 원점 | 원형: geometry(Point,4326) | 원문 조건: NOT NULL',
	`axis_unit_spec`	JSON	NOT NULL	COMMENT '좌표 축 방향, 선형·각도 단위 | 원형: jsonb | 원문 조건: NOT NULL',
	`altitude_reference`	JSON	NOT NULL	COMMENT '해발·상대·지면 기준과 변환 가능 여부 | 원형: jsonb | 원문 조건: NOT NULL',
	`transform_parameters`	JSON	NOT NULL	COMMENT '좌표 정합·시뮬레이터 변환 파라미터 | 원형: jsonb | 원문 조건: NOT NULL',
	`source_version`	TEXT	NOT NULL	COMMENT '자료 출처·버전·생성 시각 | 원형: text | 원문 조건: NOT NULL',
	`created_at`	DATETIME	NOT NULL	COMMENT '자료 출처·버전·생성 시각 | 원형: timestamptz | 원문 조건: NOT NULL'
);

CREATE TABLE `field_segment` (
	`segment_id`	CHAR(36)	NOT NULL	COMMENT '현장 영상 조각의 고유 ID | 원형: uuid | 원문 조건: PK',
	`mission_id`	CHAR(36)	NULL	COMMENT '수집 임무·기체·세션 | 원형: uuid | 원문 조건: DB-04 NULL; DB-29FK',
	`drone_id`	TEXT	NULL	COMMENT '수집 임무·기체·세션 | 원형: text | 원문 조건: DB-04 NULL; DB-29FK',
	`gateway_session_id`	CHAR(36)	NULL	COMMENT '수집 임무·기체·세션 | 원형: uuid | 원문 조건: DB-04 NULL; DB-29FK',
	`epoch_id`	CHAR(36)	NULL	COMMENT '영상 epoch와 표현; 다중 프레임 구간은manifest로 연결 | 원형: uuid | 원문 조건: DB-31 FK; DB-32 선택',
	`representation_id`	CHAR(36)	NULL	COMMENT '영상 epoch와 표현; 다중 프레임 구간은manifest로 연결 | 원형: uuid | 원문 조건: DB-31 FK; DB-32 선택',
	`time_start`	DATETIME	NOT NULL	COMMENT '촬영/수신 시각 범위를 명시 | 원형: timestamptz | 원문 조건: NN',
	`time_end`	DATETIME	NOT NULL	COMMENT '촬영/수신 시각 범위를 명시 | 원형: timestamptz | 원문 조건: NN',
	`time_basis`	TEXT	NOT NULL	COMMENT '촬영/수신 시각 범위를 명시 | 원형: text | 원문 조건: NN',
	`local_path`	TEXT	NULL	COMMENT '바이트 단위 확정 파일 참조 | 원형: text | 원문 조건: SEALED 이후 NN',
	`size_bytes`	BIGINT	NULL	COMMENT '바이트 단위 확정 파일 참조 | 원형: bigint | 원문 조건: SEALED 이후 NN',
	`content_hash`	TEXT	NULL	COMMENT '바이트 단위 확정 파일 참조 | 원형: text | 원문 조건: SEALED 이후 NN',
	`state`	TEXT	NOT NULL	COMMENT 'WRITING/SEALED/UPLOADING/PERSISTED; 보존 모드 | 원형: text | 원문 조건: CHECK; NN',
	`retention_profile`	TEXT	NOT NULL	COMMENT 'WRITING/SEALED/UPLOADING/PERSISTED; 보존 모드 | 원형: text | 원문 조건: CHECK; NN',
	`video_status`	TEXT	NOT NULL	COMMENT '영상과 sidecar 보관 상태를 구분 | 원형: text | 원문 조건: NN',
	`metadata_status`	TEXT	NOT NULL	COMMENT '영상과 sidecar 보관 상태를 구분 | 원형: text | 원문 조건: NN',
	`manifest_id`	CHAR(36)	NULL	COMMENT '보존 묶음·후보 전후 보호 한도 | 원형: uuid | 원문 조건: DB-47 FK NULL; 보호NULL',
	`protected_until`	DATETIME	NULL	COMMENT '보존 묶음·후보 전후 보호 한도 | 원형: timestamptz | 원문 조건: DB-47 FK NULL; 보호NULL',
	`evicted_at`	DATETIME	NULL	COMMENT '미회수 삭제 시 EVICTED_UNPERSISTED | 원형: timestamptz | 원문 조건: NULL 허용',
	`eviction_reason`	TEXT	NULL	COMMENT '미회수 삭제 시 EVICTED_UNPERSISTED | 원형: text | 원문 조건: NULL 허용'
);

CREATE TABLE `frame_representation` (
	`representation_id`	CHAR(36)	NOT NULL	COMMENT '프레임 표현 ID | 원형: uuid | 원문 조건: PK',
	`frame_id`	CHAR(36)	NULL	COMMENT '동일한 실제 프레임과 변환 출처 | 원형: uuid | 원문 조건: DB-12; 자기 FK NULL',
	`parent_representation_id`	CHAR(36)	NULL	COMMENT '동일한 실제 프레임과 변환 출처 | 원형: uuid | 원문 조건: DB-12; 자기 FK NULL',
	`video_profile_id`	TEXT	NOT NULL	COMMENT '기본/연구 프로파일·코덱 세션 | 원형: text | 원문 조건: DB-53 FK NULL; NN',
	`codec_session_id`	CHAR(36)	NULL	COMMENT '기본/연구 프로파일·코덱 세션 | 원형: uuid | 원문 조건: DB-53 FK NULL; NN',
	`asset_id`	CHAR(36)	NULL	COMMENT '파일 참조·resize/crop/letterbox 역변환 | 원형: uuid | 원문 조건: DB-13 FK NULL; NN',
	`transform_spec`	JSON	NOT NULL	COMMENT '파일 참조·resize/crop/letterbox 역변환 | 원형: jsonb | 원문 조건: DB-13 FK NULL; NN',
	`packet_receipt`	TEXT	NOT NULL	COMMENT 'FULL/PARTIAL/NONE, 디코딩·참조 상태별도 | 원형: text | 원문 조건: NN',
	`decode_status`	TEXT	NOT NULL	COMMENT 'FULL/PARTIAL/NONE, 디코딩·참조 상태별도 | 원형: text | 원문 조건: NN',
	`reference_status`	TEXT	NOT NULL	COMMENT 'FULL/PARTIAL/NONE, 디코딩·참조 상태별도 | 원형: text | 원문 조건: NN',
	`task_quality_status`	TEXT	NOT NULL	COMMENT '업무 허용/보류와 실제 사용 패킷 비율 | 원형: text | 원문 조건: NN; ratio NULL 또는0,1',
	`used_packet_ratio`	DOUBLE	NULL	COMMENT '업무 허용/보류와 실제 사용 패킷 비율 | 원형: double precision | 원문 조건: NN; ratio NULL 또는0,1',
	`source_quality_status`	TEXT	NOT NULL	COMMENT '상위 입력 손상 이력·디코딩 시각 | 원형: text | 원문 조건: NN; decoded NULL',
	`decoded_at`	DATETIME	NULL	COMMENT '상위 입력 손상 이력·디코딩 시각 | 원형: timestamptz | 원문 조건: NN; decoded NULL'
);

CREATE TABLE `stream_event_gap` (
	`gap_id`	CHAR(36)	NOT NULL	COMMENT '손실/공백 사건 | 원형: uuid | 원문 조건: PK',
	`mission_id`	CHAR(36)	NULL	COMMENT '관측 구간 | 원형: uuid | 원문 조건: DB-04/31 FK; 임무NULL',
	`epoch_id`	CHAR(36)	NULL	COMMENT '관측 구간 | 원형: uuid | 원문 조건: DB-04/31 FK; 임무NULL',
	`boundary`	TEXT	NOT NULL	COMMENT 'AIR_LINK/WAN/DECODE/ANALYSIS/ARCHIVE | 원형: text | 원문 조건: NN',
	`event_kind`	TEXT	NOT NULL	COMMENT 'AIR_LINK/WAN/DECODE/ANALYSIS/ARCHIVE | 원형: text | 원문 조건: NN',
	`seq_start`	BIGINT	NULL	COMMENT '확인 가능한 범위만 기록 | 원형: bigint | 원문 조건: 미확정 NULL',
	`seq_end`	BIGINT	NULL	COMMENT '확인 가능한 범위만 기록 | 원형: bigint | 원문 조건: 미확정 NULL',
	`time_start`	DATETIME	NULL	COMMENT '확인 가능한 범위만 기록 | 원형: timestamptz | 원문 조건: 미확정 NULL',
	`time_end`	DATETIME	NULL	COMMENT '확인 가능한 범위만 기록 | 원형: timestamptz | 원문 조건: 미확정 NULL',
	`identity_scope`	TEXT	NOT NULL	COMMENT '분모와 관측 경계 | 원형: text | 원문 조건: NN',
	`denominator_verified`	BOOLEAN	NOT NULL	COMMENT '분모와 관측 경계 | 원형: boolean | 원문 조건: NN',
	`reason`	TEXT	NOT NULL	COMMENT 'LOST/UNVERIFIED/RECOVERABLE/IRRECOVERABLE | 원형: text | 원문 조건: NN; 참조 NULL',
	`recoverability`	TEXT	NOT NULL	COMMENT 'LOST/UNVERIFIED/RECOVERABLE/IRRECOVERABLE | 원형: text | 원문 조건: NN; 참조 NULL',
	`recovery_ref`	CHAR(36)	NULL	COMMENT 'LOST/UNVERIFIED/RECOVERABLE/IRRECOVERABLE | 원형: uuid | 원문 조건: NN; 참조 NULL'
);

CREATE TABLE `frame_pose_binding` (
	`binding_id`	CHAR(36)	NOT NULL	COMMENT '프레임-자세 결합 결과 버전 | 원형: uuid | 원문 조건: PK',
	`frame_id`	CHAR(36)	NOT NULL	COMMENT '원관측과 계산 기준 | 원형: uuid | 원문 조건: DB-12/27 FK; NN',
	`coordinate_id`	CHAR(36)	NOT NULL	COMMENT '원관측과 계산 기준 | 원형: uuid | 원문 조건: DB-12/27 FK; NN',
	`gnss_before_id`	CHAR(36)	NULL	COMMENT '위치 양측 표본 | 원형: uuid | 원문 조건: DB-10 FK NULL',
	`gnss_after_id`	CHAR(36)	NULL	COMMENT '위치 양측 표본 | 원형: uuid | 원문 조건: DB-10 FK NULL',
	`attitude_before_id`	CHAR(36)	NULL	COMMENT '기체 자세 양측 표본 | 원형: uuid | 원문 조건: DB-10 FK NULL',
	`attitude_after_id`	CHAR(36)	NULL	COMMENT '기체 자세 양측 표본 | 원형: uuid | 원문 조건: DB-10 FK NULL',
	`gimbal_before_id`	CHAR(36)	NULL	COMMENT '지원되는 경우 실제 짐벌 표본 | 원형: uuid | 원문 조건: DB-10 FK NULL',
	`gimbal_after_id`	CHAR(36)	NULL	COMMENT '지원되는 경우 실제 짐벌 표본 | 원형: uuid | 원문 조건: DB-10 FK NULL',
	`interpolation_spec`	JSON	NOT NULL	COMMENT '방식·최대 간격·시각 불확실도·오차 | 원형: jsonb | 원문 조건: NN; covariance NULL',
	`pose_covariance`	JSON	NULL	COMMENT '방식·최대 간격·시각 불확실도·오차 | 원형: jsonb | 원문 조건: NN; covariance NULL',
	`resolved_pose`	JSON	NULL	COMMENT 'BOUND / PENDING / INVALID | 원형: jsonb | 원문 조건: pose/reason NULL;status NN',
	`status`	TEXT	NOT NULL	COMMENT 'BOUND / PENDING / INVALID | 원형: text | 원문 조건: pose/reason NULL;status NN',
	`reason`	TEXT	NULL	COMMENT 'BOUND / PENDING / INVALID | 원형: text | 원문 조건: pose/reason NULL;status NN'
);

CREATE TABLE `observation_group` (
	`group_id`	CHAR(36)	NOT NULL	COMMENT '관측 묶음 ID | 원형: uuid | 원문 조건: PK',
	`mission_id`	CHAR(36)	NOT NULL	COMMENT '임무와 연속 영상 구간 | 원형: uuid | 원문 조건: DB-04/31 FK; NN',
	`epoch_id`	CHAR(36)	NOT NULL	COMMENT '임무와 연속 영상 구간 | 원형: uuid | 원문 조건: DB-04/31 FK; NN',
	`grouping_policy_version`	TEXT	NOT NULL	COMMENT '시간·시선·이동 차이의 묶음 규칙 | 원형: text | 원문 조건: NN',
	`start_at`	DATETIME	NULL	COMMENT '실제로 유효성이 확인된 구간 | 원형: timestamptz | 원문 조건: 시간 NULL; duration>=0',
	`end_at`	DATETIME	NULL	COMMENT '실제로 유효성이 확인된 구간 | 원형: timestamptz | 원문 조건: 시간 NULL; duration>=0',
	`verified_duration_s`	DOUBLE	NULL	COMMENT '실제로 유효성이 확인된 구간 | 원형: double precision | 원문 조건: 시간 NULL; duration>=0',
	`view_signature`	JSON	NOT NULL	COMMENT '카메라 위치/방향·공통 가림·품질 | 원형: jsonb | 원문 조건: NN',
	`quality_summary`	JSON	NOT NULL	COMMENT '카메라 위치/방향·공통 가림·품질 | 원형: jsonb | 원문 조건: NN',
	`state`	TEXT	NOT NULL	COMMENT 'OPEN / SEALED / REVISED; 갱신 버전 | 원형: text | 원문 조건: NN',
	`revision`	BIGINT	NOT NULL	COMMENT 'OPEN / SEALED / REVISED; 갱신 버전 | 원형: bigint | 원문 조건: NN'
);

CREATE TABLE `likelihood_model` (
	`likelihood_id`	CHAR(36)	NOT NULL	COMMENT '관측 성능 보정 모델 | 원형: uuid | 원문 조건: PK',
	`model_artifact_id`	CHAR(36)	NOT NULL	COMMENT '탐지기·광학/장착 조건 | 원형: uuid | 원문 조건: DB-46/26 FK; NN',
	`calibration_id`	CHAR(36)	NOT NULL	COMMENT '탐지기·광학/장착 조건 | 원형: uuid | 원문 조건: DB-46/26 FK; NN',
	`event_definition`	JSON	NOT NULL	COMMENT '양성 사건과 상관 처리 단위 | 원형: jsonb | 원문 조건: NN',
	`grouping_policy_version`	TEXT	NOT NULL	COMMENT '양성 사건과 상관 처리 단위 | 원형: text | 원문 조건: NN',
	`valid_domain`	JSON	NOT NULL	COMMENT '거리·픽셀 크기·가림·조도·압축 조건별 탐지·오탐률 | 원형: jsonb | 원문 조건: NN',
	`d_model`	JSON	NOT NULL	COMMENT '거리·픽셀 크기·가림·조도·압축 조건별 탐지·오탐률 | 원형: jsonb | 원문 조건: NN',
	`f_model`	JSON	NOT NULL	COMMENT '거리·픽셀 크기·가림·조도·압축 조건별 탐지·오탐률 | 원형: jsonb | 원문 조건: NN',
	`evaluation_asset_id`	CHAR(36)	NULL	COMMENT '반복 시험 자료·버전 | 원형: uuid | 원문 조건: DB-13 FK NULL; NN',
	`version`	TEXT	NOT NULL	COMMENT '반복 시험 자료·버전 | 원형: text | 원문 조건: DB-13 FK NULL; NN',
	`status`	TEXT	NOT NULL	COMMENT 'UNMEASURED / CALIBRATED /RETIRED | 원형: text | 원문 조건: NN',
	`created_at`	DATETIME	NOT NULL	COMMENT 'UNMEASURED / CALIBRATED /RETIRED | 원형: timestamptz | 원문 조건: NN'
);

CREATE TABLE `region_cell_membership` (
	`region_id`	CHAR(36)	NOT NULL	COMMENT '영역과 셀 버전 | 원형: uuid | 원문 조건: 복합 PK; DB-34/17 FK',
	`mission_id`	CHAR(36)	NOT NULL	COMMENT '영역과 셀 버전 | 원형: uuid | 원문 조건: 복합 PK; DB-34/17 FK',
	`grid_version`	VARCHAR(255)	NOT NULL	COMMENT '영역과 셀 버전 | 원형: text | 원문 조건: 복합 PK; DB-34/17 FK',
	`cell_id`	VARCHAR(255)	NOT NULL	COMMENT '영역과 셀 버전 | 원형: text | 원문 조건: 복합 PK; DB-34/17 FK',
	`allocated_geom`	GEOMETRY	NOT NULL	COMMENT '영역∩셀의 실제 할당 부분 | 원형: geometry(MultiPolygon,4326) | 원문 조건: NN',
	`allocated_area_m2`	DOUBLE	NOT NULL	COMMENT '미터 기반 면적 | 원형: double precision | 원문 조건: NN; >0',
	`partition_version`	TEXT	NOT NULL	COMMENT '영역 분할 방식과 생성 시각 | 원형: text | 원문 조건: NN',
	`created_at`	DATETIME	NOT NULL	COMMENT '영역 분할 방식과 생성 시각 | 원형: timestamptz | 원문 조건: NN'
);

CREATE TABLE `flight_command` (
	`command_id`	CHAR(36)	NOT NULL	COMMENT '고정된 요청 ID와 정규화 본문의 해시 | 원형: uuid | 원문 조건: PK; NN',
	`request_hash`	TEXT	NOT NULL	COMMENT '고정된 요청 ID와 정규화 본문의 해시 | 원형: text | 원문 조건: PK; NN',
	`mission_id`	CHAR(36)	NULL	COMMENT '비행/안전 동작별 임무 연결 | 원형: uuid | 원문 조건: DB-04/05/07 FK;조건부 NULL',
	`mission_revision`	INT	NULL	COMMENT '비행/안전 동작별 임무 연결 | 원형: integer | 원문 조건: DB-04/05/07 FK;조건부 NULL',
	`plan_id`	CHAR(36)	NULL	COMMENT '비행/안전 동작별 임무 연결 | 원형: uuid | 원문 조건: DB-04/05/07 FK;조건부 NULL',
	`segment_id`	CHAR(36)	NULL	COMMENT '지역 실행 구간과 영역 작업 | 원형: uuid | 원문 조건: DB-39/37 FK NULL',
	`region_task_id`	CHAR(36)	NULL	COMMENT '지역 실행 구간과 영역 작업 | 원형: uuid | 원문 조건: DB-39/37 FK NULL',
	`drone_id`	TEXT	NOT NULL	COMMENT '기체와 명령 수락 Pi 세션 | 원형: text | 원문 조건: NN; DB-29 FK',
	`gateway_session_id`	CHAR(36)	NOT NULL	COMMENT '기체와 명령 수락 Pi 세션 | 원형: uuid | 원문 조건: NN; DB-29 FK',
	`lease_id`	CHAR(36)	NOT NULL	COMMENT 'Pi 실행 권한과 세대·요청 순서 | 원형: uuid | 원문 조건: DB-30 FK; NN',
	`control_epoch`	BIGINT	NOT NULL	COMMENT 'Pi 실행 권한과 세대·요청 순서 | 원형: bigint | 원문 조건: DB-30 FK; NN',
	`sequence`	BIGINT	NOT NULL	COMMENT 'Pi 실행 권한과 세대·요청 순서 | 원형: bigint | 원문 조건: DB-30 FK; NN',
	`issued_at`	DATETIME	NOT NULL	COMMENT '새 송신·재송신 가능 기한 | 원형: timestamptz | 원문 조건: NN; expires > issued',
	`expires_at`	DATETIME	NOT NULL	COMMENT '새 송신·재송신 가능 기한 | 원형: timestamptz | 원문 조건: NN; expires > issued',
	`schema_version`	TEXT	NOT NULL	COMMENT '통신 스키마 1.3 및 Pi 승인 정책 | 원형: text | 원문 조건: NN',
	`policy_version`	TEXT	NOT NULL	COMMENT '통신 스키마 1.3 및 Pi 승인 정책 | 원형: text | 원문 조건: NN',
	`coordinate_id`	CHAR(36)	NULL	COMMENT '고수준 동작·위치·고도 기준·속도·방향·체류 | 원형: uuid | 원문 조건: DB-27 FK 조건부; NN',
	`requester`	JSON	NOT NULL	COMMENT '고수준 동작·위치·고도 기준·속도·방향·체류 | 원형: jsonb | 원문 조건: DB-27 FK 조건부; NN',
	`action`	TEXT	NOT NULL	COMMENT '고수준 동작·위치·고도 기준·속도·방향·체류 | 원형: text | 원문 조건: DB-27 FK 조건부; NN',
	`payload`	JSON	NOT NULL	COMMENT '고수준 동작·위치·고도 기준·속도·방향·체류 | 원형: jsonb | 원문 조건: DB-27 FK 조건부; NN',
	`state`	TEXT	NOT NULL	COMMENT '현재 처리 상태와 역행 방지 revision | 원형: text | 원문 조건: NN; 시각 NULL',
	`status_revision`	BIGINT	NOT NULL	COMMENT '현재 처리 상태와 역행 방지 revision | 원형: bigint | 원문 조건: NN; 시각 NULL',
	`last_evidence_at`	DATETIME	NULL	COMMENT '현재 처리 상태와 역행 방지 revision | 원형: timestamptz | 원문 조건: NN; 시각 NULL',
	`execution_deadline`	DATETIME	NULL	COMMENT '전송 TTL과 다른 실제 작업 기한·완료 조건 | 원형: timestamptz | 원문 조건: 동작별 조건부',
	`completion_policy`	JSON	NULL	COMMENT '전송 TTL과 다른 실제 작업 기한·완료 조건 | 원형: jsonb | 원문 조건: 동작별 조건부'
);

CREATE TABLE `command_transition` (
	`transition_id`	CHAR(36)	NOT NULL	COMMENT '불변 명령 상태 사건 | 원형: uuid | 원문 조건: PK',
	`command_id`	CHAR(36)	NOT NULL	COMMENT '원 요청 | 원형: uuid | 원문 조건: FK DB-19; NN',
	`status_revision`	BIGINT	NOT NULL	COMMENT '같은 명령의 단조 증가 결과 revision | 원형: bigint | 원문 조건: UQ(command_id,revision); NN',
	`from_state`	TEXT	NULL	COMMENT 'RECEIVED부터 COMPLETED/UNCONFIRMED 등 | 원형: text | 원문 조건: from NULL; to NN',
	`to_state`	TEXT	NOT NULL	COMMENT 'RECEIVED부터 COMPLETED/UNCONFIRMED 등 | 원형: text | 원문 조건: from NULL; to NN',
	`source_node`	TEXT	NOT NULL	COMMENT '서버/Pi/FC 근거의 생성 주체 | 원형: text | 원문 조건: NN',
	`producer_session_id`	CHAR(36)	NOT NULL	COMMENT '서버/Pi/FC 근거의 생성 주체 | 원형: uuid | 원문 조건: NN',
	`occurred_at`	DATETIME	NULL	COMMENT '관측 시각과 수신 시각 | 원형: timestamptz | 원문 조건: occurred NULL;received NN',
	`received_at`	DATETIME	NOT NULL	COMMENT '관측 시각과 수신 시각 | 원형: timestamptz | 원문 조건: occurred NULL;received NN',
	`evidence`	JSON	NOT NULL	COMMENT 'ACK·모드·속도·도착·착륙 근거 | 원형: jsonb | 원문 조건: NN; reason NULL',
	`reason_code`	TEXT	NULL	COMMENT 'ACK·모드·속도·도착·착륙 근거 | 원형: text | 원문 조건: NN; reason NULL',
	`transport_attempt`	INT	NULL	COMMENT '앱 재시도와 FC 프로토콜 전송 시도 구분 | 원형: integer | 원문 조건: NULL; >=0'
);

CREATE TABLE `observation_cell` (
	`grid_version`	VARCHAR(255)	NOT NULL	COMMENT '격자 변경과 셀 ID 재사용 충돌 방지 | 원형: text | 원문 조건: 복합 PK; DB-04 FK',
	`cell_id`	VARCHAR(255)	NOT NULL	COMMENT '격자 변경과 셀 ID 재사용 충돌 방지 | 원형: text | 원문 조건: 복합 PK; DB-04 FK',
	`mission_id`	CHAR(36)	NOT NULL	COMMENT '격자 변경과 셀 ID 재사용 충돌 방지 | 원형: uuid | 원문 조건: 복합 PK; DB-04 FK',
	`context_id`	CHAR(36)	NOT NULL	COMMENT '면적 계산·좌표 기준 | 원형: uuid | 원문 조건: FK DB-08; NN',
	`cell_geom`	GEOMETRY	NOT NULL	COMMENT '경계와 교차한 셀; 5m는 초기 제안값 | 원형: geometry(MultiPolygon,4326) | 원문 조건: NN; area >0',
	`cell_area_m2`	DOUBLE	NOT NULL	COMMENT '경계와 교차한 셀; 5m는 초기 제안값 | 원형: double precision | 원문 조건: NN; area >0',
	`state`	TEXT	NOT NULL	COMMENT 'UNOBSERVED / VALID /LOW_QUALITY / OCCLUDED_UNKNOWN / RESTRICTED | 원형: text | 원문 조건: CHECK; NN',
	`valid_union_geom`	GEOMETRY	NULL	COMMENT '실제 유효 관측 영역의 합집합 | 원형: geometry(MultiPolygon,4326) | 원문 조건: NULL, NN; >=0',
	`valid_area_m2`	DOUBLE	NOT NULL	COMMENT '실제 유효 관측 영역의 합집합 | 원형: double precision | 원문 조건: NULL, NN; >=0',
	`valid_count`	INT	NOT NULL	COMMENT '프레임 수와 관측 묶음 수를 구분 | 원형: integer | 원문 조건: NN; >=0',
	`valid_group_count`	INT	NOT NULL	COMMENT '프레임 수와 관측 묶음 수를 구분 | 원형: integer | 원문 조건: NN; >=0',
	`valid_duration_s`	DOUBLE	NOT NULL	COMMENT '겹친 시간 구간을 한 번만 합산한 관측 시간 | 원형: double precision | 원문 조건: NN >=0; 시간 NULL',
	`last_valid_at`	DATETIME	NULL	COMMENT '겹친 시간 구간을 한 번만 합산한 관측 시간 | 원형: timestamptz | 원문 조건: NN >=0; 시간 NULL',
	`excluded_reasons`	JSON	NOT NULL	COMMENT '가림·품질·운용 제한과 동시 갱신 버전 | 원형: jsonb | 원문 조건: NN',
	`row_version`	BIGINT	NOT NULL	COMMENT '가림·품질·운용 제한과 동시 갱신 버전 | 원형: bigint | 원문 조건: NN'
);

CREATE TABLE `mission_revision` (
	`revision`	INT	NOT NULL	COMMENT '임무별 단조 증가 개정 | 원형: integer | 원문 조건: 복합 PK; FK → DB-04',
	`mission_id`	CHAR(36)	NOT NULL	COMMENT '임무별 단조 증가 개정 | 원형: uuid | 원문 조건: 복합 PK; FK → DB-04',
	`context_id`	CHAR(36)	NULL	COMMENT '좌표·고도·변환 기준 | 원형: uuid | 원문 조건: FK → DB-08',
	`area_geom`	GEOMETRY	NOT NULL	COMMENT '전체 임무구역; 표시용 WGS84 | 원형: geometry(MultiPolygon,4326) | 원문 조건: NOT NULL',
	`priority_geom`	GEOMETRY	NULL	COMMENT '유효 범위 내 우선구역 | 원형: geometry(MultiPolygon,4326) | 원문 조건: NULL 허용',
	`conditions`	JSON	NOT NULL	COMMENT '고도 기준·속도·복귀 조건·임무 방식 계약 | 원형: jsonb | 원문 조건: NOT NULL',
	`area_denominators`	JSON	NOT NULL	COMMENT '시작 시 전체/관측가능 면적과 산정 버전 | 원형: jsonb | 원문 조건: NOT NULL',
	`created_at`	DATETIME	NULL	COMMENT '편집 생성·실행 승인 시각 | 원형: timestamptz | 원문 조건: 승인 전 NULL',
	`approved_at`	DATETIME	NULL	COMMENT '편집 생성·실행 승인 시각 | 원형: timestamptz | 원문 조건: 승인 전 NULL',
	`configuration_id`	CHAR(36)	NULL	COMMENT '실행 시 고정할 정책·좌표 묶음 | 원형: uuid | 원문 조건: DB-28/27 FK; 조건부NN',
	`coordinate_id`	CHAR(36)	NULL	COMMENT '실행 시 고정할 정책·좌표 묶음 | 원형: uuid | 원문 조건: DB-28/27 FK; 조건부NN',
	`global_mode`	TEXT	NOT NULL	COMMENT '전역 방문·지역 관측·확률 모델 분리 | 원형: text | 원문 조건: NN',
	`local_mode`	TEXT	NOT NULL	COMMENT '전역 방문·지역 관측·확률 모델 분리 | 원형: text | 원문 조건: NN',
	`target_model`	TEXT	NOT NULL	COMMENT '전역 방문·지역 관측·확률 모델 분리 | 원형: text | 원문 조건: NN',
	`grid_version`	TEXT	NOT NULL	COMMENT '격자/완료 조건·고정 분모 산정 근거 | 원형: text | 원문 조건: NN',
	`coverage_policy`	JSON	NOT NULL	COMMENT '격자/완료 조건·고정 분모 산정 근거 | 원형: jsonb | 원문 조건: NN'
);

CREATE TABLE `codec_session` (
	`codec_session_id`	CHAR(36)	NOT NULL	COMMENT '코덱 재시작 시 새 ID | 원형: uuid | 원문 조건: PK',
	`epoch_id`	CHAR(36)	NOT NULL	COMMENT '영상 연속 구간·프로파일 | 원형: uuid | 원문 조건: DB-31 FK; NN',
	`video_profile_id`	TEXT	NOT NULL	COMMENT '영상 연속 구간·프로파일 | 원형: text | 원문 조건: DB-31 FK; NN',
	`model_hash`	TEXT	NOT NULL	COMMENT '양단 일치가 필요한 버전 | 원형: text | 원문 조건: NN',
	`packetization_version`	TEXT	NOT NULL	COMMENT '양단 일치가 필요한 버전 | 원형: text | 원문 조건: NN',
	`encoder_runtime`	JSON	NOT NULL	COMMENT '현장/서버 실제 연산 환경 | 원형: jsonb | 원문 조건: NN',
	`decoder_runtime`	JSON	NOT NULL	COMMENT '현장/서버 실제 연산 환경 | 원형: jsonb | 원문 조건: NN',
	`reference_generation`	BIGINT	NOT NULL	COMMENT 'SYNCED/OPTIMISTIC/RESYNCING/UNVERIFIED | 원형: bigint | 원문 조건: NN',
	`reference_status`	TEXT	NOT NULL	COMMENT 'SYNCED/OPTIMISTIC/RESYNCING/UNVERIFIED | 원형: text | 원문 조건: NN',
	`initial_reference_ref`	TEXT	NULL	COMMENT '시작 기준 프레임·feedback 순서 | 원형: text | 원문 조건: NULL 허용',
	`last_feedback_seq`	BIGINT	NULL	COMMENT '시작 기준 프레임·feedback 순서 | 원형: bigint | 원문 조건: NULL 허용',
	`limits`	JSON	NOT NULL	COMMENT 'deadline/캐시/패킷 상한·협상/활성/실패 | 원형: jsonb | 원문 조건: NN; 이유 NULL',
	`state`	TEXT	NOT NULL	COMMENT 'deadline/캐시/패킷 상한·협상/활성/실패 | 원형: text | 원문 조건: NN; 이유 NULL',
	`ended_reason`	TEXT	NULL	COMMENT 'deadline/캐시/패킷 상한·협상/활성/실패 | 원형: text | 원문 조건: NN; 이유 NULL'
);

CREATE TABLE `execution_report` (
	`report_id`	CHAR(36)	NOT NULL	COMMENT '결과 event ID | 원형: uuid | 원문 조건: PK',
	`command_id`	CHAR(36)	NULL	COMMENT '각 단계가 연관된 실행 단위 | 원형: uuid | 원문 조건: DB-19/39/37 FK;조건부 NULL',
	`segment_id`	CHAR(36)	NULL	COMMENT '각 단계가 연관된 실행 단위 | 원형: uuid | 원문 조건: DB-19/39/37 FK;조건부 NULL',
	`task_id`	CHAR(36)	NULL	COMMENT '각 단계가 연관된 실행 단위 | 원형: uuid | 원문 조건: DB-19/39/37 FK;조건부 NULL',
	`producer_session_id`	CHAR(36)	NOT NULL	COMMENT '생성 세션과 해당 실행 범위 revision | 원형: uuid | 원문 조건: NN',
	`status_revision`	BIGINT	NOT NULL	COMMENT '생성 세션과 해당 실행 범위 revision | 원형: bigint | 원문 조건: NN',
	`stage`	TEXT	NOT NULL	COMMENT 'ACCEPTED/ARRIVED/CAPTURED/RECEIVED/ANALYZED/APPLIED 등 | 원형: text | 원문 조건: stage/received NN',
	`observed_at`	DATETIME	NULL	COMMENT 'ACCEPTED/ARRIVED/CAPTURED/RECEIVED/ANALYZED/APPLIED 등 | 원형: timestamptz | 원문 조건: stage/received NN',
	`received_at`	DATETIME	NOT NULL	COMMENT 'ACCEPTED/ARRIVED/CAPTURED/RECEIVED/ANALYZED/APPLIED 등 | 원형: timestamptz | 원문 조건: stage/received NN',
	`actual_pose`	JSON	NOT NULL	COMMENT '실제 기체/영상/관측 근거 | 원형: jsonb | 원문 조건: NN',
	`actual_route`	JSON	NOT NULL	COMMENT '실제 기체/영상/관측 근거 | 원형: jsonb | 원문 조건: NN',
	`evidence_refs`	JSON	NOT NULL	COMMENT '실제 기체/영상/관측 근거 | 원형: jsonb | 원문 조건: NN',
	`outcome`	TEXT	NOT NULL	COMMENT '성공/부분/불명/실패·과거 결과 | 원형: text | 원문 조건: NN; 이유 NULL',
	`reason`	TEXT	NULL	COMMENT '성공/부분/불명/실패·과거 결과 | 원형: text | 원문 조건: NN; 이유 NULL',
	`historical`	BOOLEAN	NOT NULL	COMMENT '성공/부분/불명/실패·과거 결과 | 원형: boolean | 원문 조건: NN; 이유 NULL'
);

CREATE TABLE `user_session` (
	`session_id`	CHAR(36)	NOT NULL	COMMENT '추측 불가능한 세션 키 | 원형: uuid | 원문 조건: PK',
	`user_id`	CHAR(36)	NULL	COMMENT '계정 참조 | 원형: uuid | 원문 조건: FK → DB-01',
	`issued_at`	DATETIME	NOT NULL	COMMENT '발급·만료 시각 | 원형: timestamptz | 원문 조건: NOT NULL',
	`expires_at`	DATETIME	NOT NULL	COMMENT '발급·만료 시각 | 원형: timestamptz | 원문 조건: NOT NULL',
	`revoked_at`	DATETIME	NULL	COMMENT '명시적 로그아웃/폐기 시각 | 원형: timestamptz | 원문 조건: NULL 허용',
	`token_digest`	VARCHAR(255)	NULL	COMMENT '세션 토큰 검증용 해시 | 원형: text | 원문 조건: UNIQUE'
);

CREATE TABLE `camera_calibration` (
	`calibration_id`	CHAR(36)	NOT NULL	COMMENT '보정 버전 ID | 원형: uuid | 원문 조건: PK',
	`camera_id`	TEXT	NOT NULL	COMMENT 'FIXED / MEASURED_GIMBAL /VERIFIED_WORLD_POSE | 원형: text | 원문 조건: NN',
	`lens_id`	TEXT	NOT NULL	COMMENT 'FIXED / MEASURED_GIMBAL /VERIFIED_WORLD_POSE | 원형: text | 원문 조건: NN',
	`mount_mode`	TEXT	NOT NULL	COMMENT 'FIXED / MEASURED_GIMBAL /VERIFIED_WORLD_POSE | 원형: text | 원문 조건: NN',
	`image_width`	INT	NOT NULL	COMMENT 'K, 왜곡 모델·계수·유효 crop | 원형: integer | 원문 조건: NN',
	`image_height`	INT	NOT NULL	COMMENT 'K, 왜곡 모델·계수·유효 crop | 원형: integer | 원문 조건: NN',
	`intrinsics`	JSON	NOT NULL	COMMENT 'K, 왜곡 모델·계수·유효 crop | 원형: jsonb | 원문 조건: NN',
	`body_from_camera`	JSON	NULL	COMMENT '고정 외부 회전·이동; 축/단위 포함 | 원형: jsonb | 원문 조건: 조건부 NN',
	`nominal_down_angle_deg`	DOUBLE	NULL	COMMENT '장착 목표와 실측 오차를 구분 | 원형: double precision | 원문 조건: NULL 허용',
	`angle_uncertainty_deg`	DOUBLE	NULL	COMMENT '장착 목표와 실측 오차를 구분 | 원형: double precision | 원문 조건: NULL 허용',
	`calibration_asset_id`	CHAR(36)	NULL	COMMENT '보정 보고서/원자료와 시각 | 원형: uuid | 원문 조건: DB-13 FK NULL; NN',
	`created_at`	DATETIME	NOT NULL	COMMENT '보정 보고서/원자료와 시각 | 원형: timestamptz | 원문 조건: DB-13 FK NULL; NN',
	`validation_status`	TEXT	NOT NULL	COMMENT 'PROVISIONAL / VALIDATED / RETIRED | 원형: text | 원문 조건: NN',
	`content_hash`	TEXT	NOT NULL	COMMENT 'PROVISIONAL / VALIDATED / RETIRED | 원형: text | 원문 조건: NN'
);

CREATE TABLE `control_lease` (
	`drone_id`	VARCHAR(255)	NOT NULL	COMMENT '등록된 운용 기체 ID | 원형: text | 원문 조건: PK',
	`holder_user_id`	CHAR(36)	NULL	COMMENT '웹 제어권 보유 사용자 | 원형: uuid | 원문 조건: FK DB-01; NULL',
	`session_id`	CHAR(36)	NULL	COMMENT '해당 웹 세션. 자동 실행 lease와 다르다. | 원형: uuid | 원문 조건: FK DB-02; NULL',
	`web_revision`	BIGINT	NOT NULL	COMMENT '웹 제어권 동시 갱신용 버전 | 원형: bigint | 원문 조건: NN; >=0',
	`acquired_at`	DATETIME	NULL	COMMENT '웹 제어권 확보·만료 시각 | 원형: timestamptz | 원문 조건: NULL 허용',
	`expires_at`	DATETIME	NULL	COMMENT '웹 제어권 확보·만료 시각 | 원형: timestamptz | 원문 조건: NULL 허용',
	`gateway_session_id`	CHAR(36)	NULL	COMMENT '마지막 확인한 현장 세션 | 원형: uuid | 원문 조건: FK DB-29; NULL',
	`observed_control_epoch`	BIGINT	NULL	COMMENT 'Pi가 발급한 실행 세대의 조회값 | 원형: bigint | 원문 조건: NULL; >=0'
);

CREATE TABLE `cell_belief` (
	`mission_id`	CHAR(36)	NOT NULL	COMMENT '대상 셀 | 원형: uuid | 원문 조건: 복합 PK; DB-17 FK',
	`grid_version`	VARCHAR(255)	NOT NULL	COMMENT '대상 셀 | 원형: text | 원문 조건: 복합 PK; DB-17 FK',
	`cell_id`	VARCHAR(255)	NOT NULL	COMMENT '대상 셀 | 원형: text | 원문 조건: 복합 PK; DB-17 FK',
	`belief_revision_id`	CHAR(36)	NOT NULL	COMMENT '현재 전체 존재 가능성 스냅샷 | 원형: uuid | 원문 조건: DB-43 FK; NN',
	`model_kind`	TEXT	NOT NULL	COMMENT 'single_target_categorical /multi_target_occupancy | 원형: text | 원문 조건: CHECK; NN',
	`prior_value`	DOUBLE	NOT NULL	COMMENT '셀 확률 질량 또는 점유 확률 | 원형: double precision | 원문 조건: NN; 0,1',
	`posterior_value`	DOUBLE	NOT NULL	COMMENT '셀 확률 질량 또는 점유 확률 | 원형: double precision | 원문 조건: NN; 0,1',
	`last_valid_group_id`	CHAR(36)	NULL	COMMENT '마지막 유효 관측 그룹 | 원형: uuid | 원문 조건: DB-40 FK NULL',
	`updated_at`	DATETIME	NOT NULL	COMMENT '불확실성·출처·시간 | 원형: timestamptz | 원문 조건: NN',
	`uncertainty`	JSON	NOT NULL	COMMENT '불확실성·출처·시간 | 원형: jsonb | 원문 조건: NN',
	`evidence_refs`	JSON	NOT NULL	COMMENT '불확실성·출처·시간 | 원형: jsonb | 원문 조건: NN'
);

CREATE TABLE `search_plan` (
	`plan_id`	CHAR(36)	NOT NULL	COMMENT '전역 또는 지역 계획 ID | 원형: uuid | 원문 조건: PK',
	`mission_id`	CHAR(36)	NULL	COMMENT '임무별 단조 증가 계획 번호 | 원형: uuid | 원문 조건: FK DB-04; UQ 쌍',
	`plan_version`	INT	NULL	COMMENT '임무별 단조 증가 계획 번호 | 원형: integer | 원문 조건: FK DB-04; UQ 쌍',
	`mission_revision`	INT	NULL	COMMENT '불변 실행 개정 | 원형: integer | 원문 조건: mission_id와 복합 FKDB-05',
	`plan_kind`	TEXT	NOT NULL	COMMENT 'GLOBAL_VISIT / LOCAL_OBSERVATION / PRECISION / TRACKING | 원형: text | 원문 조건: CHECK; NN',
	`parent_plan_id`	CHAR(36)	NULL	COMMENT '지역 계획이 속한 전역 계획 | 원형: uuid | 원문 조건: 자기 FK; NULL',
	`input_versions`	JSON	NOT NULL	COMMENT 'map/grid/belief/coordinate/policy와기체 표본 참조 | 원형: jsonb | 원문 조건: NN',
	`objective_mode`	TEXT	NOT NULL	COMMENT 'VISIT_ALL_BASELINE 또는LOCAL_FIND_GAIN 등 목적 구분 | 원형: text | 원문 조건: NN',
	`generated_at`	DATETIME	NOT NULL	COMMENT '계획 유효 시간. 명령 TTL과 별개 | 원형: timestamptz | 원문 조건: NN; expires >generated',
	`expires_at`	DATETIME	NOT NULL	COMMENT '계획 유효 시간. 명령 TTL과 별개 | 원형: timestamptz | 원문 조건: NN; expires >generated',
	`supersedes_plan_id`	CHAR(36)	NULL	COMMENT '이전 계획, PROPOSED/ACTIVE/SUPERSEDED/EXPIRED/UNRESOLVED | 원형: uuid | 원문 조건: 자기 FK NULL; CHECK',
	`status`	TEXT	NULL	COMMENT '이전 계획, PROPOSED/ACTIVE/SUPERSEDED/EXPIRED/UNRESOLVED | 원형: text | 원문 조건: 자기 FK NULL; CHECK',
	`summary`	JSON	NOT NULL	COMMENT '비용·보류/제외 사유·마감 초과 등 재현자료 | 원형: jsonb | 원문 조건: NN',
	`decision_log`	JSON	NOT NULL	COMMENT '비용·보류/제외 사유·마감 초과 등 재현자료 | 원형: jsonb | 원문 조건: NN'
);

CREATE TABLE `belief_revision` (
	`belief_revision_id`	CHAR(36)	NOT NULL	COMMENT '존재 가능성 스냅샷 | 원형: uuid | 원문 조건: PK',
	`mission_id`	CHAR(36)	NULL	COMMENT '단조 증가 버전 | 원형: uuid | 원문 조건: DB-04 FK; UQ 쌍',
	`revision`	BIGINT	NULL	COMMENT '단조 증가 버전 | 원형: bigint | 원문 조건: DB-04 FK; UQ 쌍',
	`model_kind`	TEXT	NULL	COMMENT '확률 표현과 영역 밖 가설 | 원형: text | 원문 조건: single일 때 p_out NN0,1',
	`p_out`	DOUBLE	NULL	COMMENT '확률 표현과 영역 밖 가설 | 원형: double precision | 원문 조건: single일 때 p_out NN0,1',
	`parent_revision_id`	CHAR(36)	NULL	COMMENT '이전 버전·업데이트 원인 | 원형: uuid | 원문 조건: 자기/DB-40 FK NULL',
	`source_group_id`	CHAR(36)	NULL	COMMENT '이전 버전·업데이트 원인 | 원형: uuid | 원문 조건: 자기/DB-40 FK NULL',
	`normalization_sum`	DOUBLE	NOT NULL	COMMENT 'single 합계 검증·실제 갱신 유효성 | 원형: double precision | 원문 조건: NN',
	`validation_status`	TEXT	NOT NULL	COMMENT 'single 합계 검증·실제 갱신 유효성 | 원형: text | 원문 조건: NN',
	`created_at`	DATETIME	NOT NULL	COMMENT '갱신/이동 전이/보정 정책 | 원형: timestamptz | 원문 조건: NN',
	`policy_version`	TEXT	NOT NULL	COMMENT '갱신/이동 전이/보정 정책 | 원형: text | 원문 조건: NN'
);

CREATE TABLE `region_task` (
	`task_id`	CHAR(36)	NOT NULL	COMMENT '중복 방지 영역 요청 ID | 원형: uuid | 원문 조건: PK',
	`mission_id`	CHAR(36)	NOT NULL	COMMENT '현재 임무·전역 계획·영역 | 원형: uuid | 원문 조건: DB-04/07/34 FK; NN',
	`global_plan_id`	CHAR(36)	NOT NULL	COMMENT '현재 임무·전역 계획·영역 | 원형: uuid | 원문 조건: DB-04/07/34 FK; NN',
	`region_id`	CHAR(36)	NOT NULL	COMMENT '현재 임무·전역 계획·영역 | 원형: uuid | 원문 조건: DB-04/07/34 FK; NN',
	`requested_cells`	JSON	NOT NULL	COMMENT '남은 셀/부분면적·시간/에너지 배정 | 원형: jsonb | 원문 조건: NN',
	`budget`	JSON	NOT NULL	COMMENT '남은 셀/부분면적·시간/에너지 배정 | 원형: jsonb | 원문 조건: NN',
	`request_hash`	TEXT	NOT NULL	COMMENT '고정된 요청 및 작업 상태 | 원형: text | 원문 조건: NN',
	`state`	TEXT	NOT NULL	COMMENT '고정된 요청 및 작업 상태 | 원형: text | 원문 조건: NN',
	`status_revision`	BIGINT	NOT NULL	COMMENT '고정된 요청 및 작업 상태 | 원형: bigint | 원문 조건: NN',
	`created_at`	DATETIME	NULL	COMMENT '발행·작업 기한·종료 | 원형: timestamptz | 원문 조건: finish NULL',
	`deadline_at`	DATETIME	NULL	COMMENT '발행·작업 기한·종료 | 원형: timestamptz | 원문 조건: finish NULL',
	`finished_at`	DATETIME	NULL	COMMENT '발행·작업 기한·종료 | 원형: timestamptz | 원문 조건: finish NULL',
	`result_refs`	JSON	NOT NULL	COMMENT '실제 증거·소요시간·최종 기체 상태 | 원형: jsonb | 원문 조건: NN; 시간 NULL',
	`actual_duration_s`	DOUBLE	NULL	COMMENT '실제 증거·소요시간·최종 기체 상태 | 원형: double precision | 원문 조건: NN; 시간 NULL',
	`cancel_request_id`	CHAR(36)	NULL	COMMENT '취소/중단 확인 및 처리 불가 사유 | 원형: uuid | 원문 조건: NULL 허용',
	`failure_reason`	TEXT	NULL	COMMENT '취소/중단 확인 및 처리 불가 사유 | 원형: text | 원문 조건: NULL 허용'
);

CREATE TABLE `analysis_job` (
	`analysis_job_id`	CHAR(36)	NOT NULL	COMMENT '분석 실행 ID | 원형: uuid | 원문 조건: PK',
	`frame_id`	CHAR(36)	NOT NULL	COMMENT '입력 원천과 실행 모델 | 원형: uuid | 원문 조건: DB-12/32/46 FK; NN',
	`representation_id`	CHAR(36)	NOT NULL	COMMENT '입력 원천과 실행 모델 | 원형: uuid | 원문 조건: DB-12/32/46 FK; NN',
	`model_artifact_id`	CHAR(36)	NOT NULL	COMMENT '입력 원천과 실행 모델 | 원형: uuid | 원문 조건: DB-12/32/46 FK; NN',
	`mode`	VARCHAR(255)	NOT NULL	COMMENT 'LIVE / HISTORICAL / RESEARCH;파이프라인 버전 | 원형: text | 원문 조건: NN',
	`pipeline_version`	VARCHAR(255)	NOT NULL	COMMENT 'LIVE / HISTORICAL / RESEARCH;파이프라인 버전 | 원형: text | 원문 조건: NN',
	`state`	TEXT	NOT NULL	COMMENT 'QUEUED/RUNNING/SUCCEEDED/FAILED/SKIPPED | 원형: text | 원문 조건: NN; 이유 NULL',
	`reason`	TEXT	NULL	COMMENT 'QUEUED/RUNNING/SUCCEEDED/FAILED/SKIPPED | 원형: text | 원문 조건: NN; 이유 NULL',
	`selected_at`	DATETIME	NULL	COMMENT '실제 처리 지연 측정 | 원형: timestamptz | 원문 조건: 조건부 NULL',
	`started_at`	DATETIME	NULL	COMMENT '실제 처리 지연 측정 | 원형: timestamptz | 원문 조건: 조건부 NULL',
	`completed_at`	DATETIME	NULL	COMMENT '실제 처리 지연 측정 | 원형: timestamptz | 원문 조건: 조건부 NULL',
	`pre_ms`	DOUBLE	NULL	COMMENT '측정 경계별 처리시간 | 원형: double precision | 원문 조건: NULL 또는 >=0',
	`inference_ms`	DOUBLE	NULL	COMMENT '측정 경계별 처리시간 | 원형: double precision | 원문 조건: NULL 또는 >=0',
	`post_ms`	DOUBLE	NULL	COMMENT '측정 경계별 처리시간 | 원형: double precision | 원문 조건: NULL 또는 >=0',
	`result_ref`	TEXT	NULL	COMMENT '탐지/좌표/관측 사용 허용 범위 | 원형: text | 원문 조건: NULL, NN',
	`task_quality_status`	TEXT	NOT NULL	COMMENT '탐지/좌표/관측 사용 허용 범위 | 원형: text | 원문 조건: NULL, NN'
);

CREATE TABLE `video_frame` (
	`frame_id`	CHAR(36)	NOT NULL	COMMENT '하나의 실제 관측 프레임 ID | 원형: uuid | 원문 조건: PK',
	`mission_id`	CHAR(36)	NULL	COMMENT '관측 소속 임무·기체 | 원형: uuid | 원문 조건: DB-04 FK NULL;drone NN',
	`drone_id`	TEXT	NOT NULL	COMMENT '관측 소속 임무·기체 | 원형: text | 원문 조건: DB-04 FK NULL;drone NN',
	`epoch_id`	CHAR(36)	NOT NULL	COMMENT 'stream_id/stream_epoch/생성 세션 참조 | 원형: uuid | 원문 조건: FK DB-31; NN',
	`video_frame_seq`	BIGINT	NOT NULL	COMMENT '해당 epoch에서의 프레임 순번 | 원형: bigint | 원문 조건: NN; >=0',
	`identity_scope`	VARCHAR(255)	NOT NULL	COMMENT 'source / gateway_received | 원형: text | 원문 조건: CHECK; NN',
	`capture_at`	DATETIME	NULL	COMMENT '검증된 촬영 시각과 Pi 수신 시각 구분 | 원형: timestamptz | 원문 조건: capture NULL;received NN',
	`received_at`	DATETIME	NOT NULL	COMMENT '검증된 촬영 시각과 Pi 수신 시각 구분 | 원형: timestamptz | 원문 조건: capture NULL;received NN',
	`capture_time_verified`	BOOLEAN	NOT NULL	COMMENT '원시 PTS, clock domain, 추정방법·불확실도 | 원형: boolean | 원문 조건: NN',
	`time_evidence`	JSON	NOT NULL	COMMENT '원시 PTS, clock domain, 추정방법·불확실도 | 원형: jsonb | 원문 조건: NN',
	`width`	INT	NOT NULL	COMMENT '카메라 출력 좌표계의 크기와 코덱 | 원형: integer | 원문 조건: NN; 크기 >0',
	`height`	INT	NOT NULL	COMMENT '카메라 출력 좌표계의 크기와 코덱 | 원형: integer | 원문 조건: NN; 크기 >0',
	`format`	TEXT	NOT NULL	COMMENT '카메라 출력 좌표계의 크기와 코덱 | 원형: text | 원문 조건: NN; 크기 >0',
	`source_quality_status`	TEXT	NOT NULL	COMMENT 'NORMAL / CONCEALED / CORRUPT /UNVERIFIED | 원형: text | 원문 조건: NN',
	`metadata_state`	TEXT	NOT NULL	COMMENT 'BOUND / PENDING / INVALID. 영상추론 성공과 별개 | 원형: text | 원문 조건: NN'
);

CREATE TABLE `detection_observation` (
	`observation_id`	CHAR(36)	NOT NULL	COMMENT '모델별 탐지 관측 ID | 원형: uuid | 원문 조건: PK',
	`candidate_id`	CHAR(36)	NULL	COMMENT '연결 전 탐지도 보관 가능 | 원형: uuid | 원문 조건: FK DB-14; NULL 허용',
	`frame_id`	CHAR(36)	NOT NULL	COMMENT '실제 원관측과 사용 영상 표현 | 원형: uuid | 원문 조건: FK DB-12/32; NN',
	`representation_id`	CHAR(36)	NOT NULL	COMMENT '실제 원관측과 사용 영상 표현 | 원형: uuid | 원문 조건: FK DB-12/32; NN',
	`analysis_job_id`	CHAR(36)	NULL	COMMENT '분석 실행 내 검출 순서. 재처리 중복 방지 | 원형: uuid | 원문 조건: DB-45 FK; UQ 쌍',
	`detection_index`	INT	NULL	COMMENT '분석 실행 내 검출 순서. 재처리 중복 방지 | 원형: integer | 원문 조건: DB-45 FK; UQ 쌍',
	`bbox`	JSON	NOT NULL	COMMENT '원본 픽셀 경계상자, 검출 점수, person | 원형: jsonb | 원문 조건: NN; 0<=conf<=1',
	`confidence`	DOUBLE	NOT NULL	COMMENT '원본 픽셀 경계상자, 검출 점수, person | 원형: double precision | 원문 조건: NN; 0<=conf<=1',
	`class_name`	TEXT	NOT NULL	COMMENT '원본 픽셀 경계상자, 검출 점수, person | 원형: text | 원문 조건: NN; 0<=conf<=1',
	`observation_kind`	TEXT	NULL	COMMENT 'DETECTION / TRACK_ONLY 및 독립성묶음 | 원형: text | 원문 조건: CHECK; DB-40 FKNULL',
	`group_id`	CHAR(36)	NULL	COMMENT 'DETECTION / TRACK_ONLY 및 독립성묶음 | 원형: uuid | 원문 조건: CHECK; DB-40 FKNULL',
	`model_artifact_id`	CHAR(36)	NULL	COMMENT '모델·좌표 계산의 불변 참조 | 원형: uuid | 원문 조건: DB-46/27 FK; 좌표NULL',
	`coordinate_id`	CHAR(36)	NULL	COMMENT '모델·좌표 계산의 불변 참조 | 원형: uuid | 원문 조건: DB-46/27 FK; 좌표NULL',
	`association_evidence`	JSON	NOT NULL	COMMENT '연결 근거, 좌표/보류·오차·사용 표본 | 원형: jsonb | 원문 조건: NN',
	`geo_result`	JSON	NOT NULL	COMMENT '연결 근거, 좌표/보류·오차·사용 표본 | 원형: jsonb | 원문 조건: NN',
	`historical`	BOOLEAN	NOT NULL	COMMENT '후도착 원본 재분석의 과거 결과 보완 | 원형: boolean | 원문 조건: NN; 자기 FK NULL',
	`supersedes_id`	CHAR(36)	NULL	COMMENT '후도착 원본 재분석의 과거 결과 보완 | 원형: uuid | 원문 조건: NN; 자기 FK NULL'
);

CREATE TABLE `belief_update` (
	`update_id`	CHAR(36)	NOT NULL	COMMENT '갱신 사건 | 원형: uuid | 원문 조건: PK',
	`belief_revision_id`	CHAR(36)	NOT NULL	COMMENT '대상 존재 가능성 버전과 관측 묶음 | 원형: uuid | 원문 조건: DB-43/40 FK; NN',
	`group_id`	CHAR(36)	NOT NULL	COMMENT '대상 존재 가능성 버전과 관측 묶음 | 원형: uuid | 원문 조건: DB-43/40 FK; NN',
	`mission_id`	CHAR(36)	NOT NULL	COMMENT '변경 셀 | 원형: uuid | 원문 조건: DB-17 복합 FK; NN',
	`grid_version`	VARCHAR(255)	NOT NULL	COMMENT '변경 셀 | 원형: text | 원문 조건: DB-17 복합 FK; NN',
	`cell_id`	VARCHAR(255)	NOT NULL	COMMENT '변경 셀 | 원형: text | 원문 조건: DB-17 복합 FK; NN',
	`likelihood_id`	CHAR(36)	NOT NULL	COMMENT '양성/음성/시간 예측 종류 | 원형: uuid | 원문 조건: DB-54 FK; NN',
	`event_kind`	TEXT	NOT NULL	COMMENT '양성/음성/시간 예측 종류 | 원형: text | 원문 조건: DB-54 FK; NN',
	`prior_value`	DOUBLE	NULL	COMMENT '적용 전후 확률과 보정된 탐지·오탐률 | 원형: double precision | 원문 조건: NULL 규칙 명시; 0,1',
	`posterior_value`	DOUBLE	NULL	COMMENT '적용 전후 확률과 보정된 탐지·오탐률 | 원형: double precision | 원문 조건: NULL 규칙 명시; 0,1',
	`d`	DOUBLE	NULL	COMMENT '적용 전후 확률과 보정된 탐지·오탐률 | 원형: double precision | 원문 조건: NULL 규칙 명시; 0,1',
	`f`	DOUBLE	NULL	COMMENT '적용 전후 확률과 보정된 탐지·오탐률 | 원형: double precision | 원문 조건: NULL 규칙 명시; 0,1',
	`policy_version`	VARCHAR(255)	NOT NULL	COMMENT '적용 정책과 대체 증거 버전 | 원형: text | 원문 조건: NN',
	`evidence_revision`	BIGINT	NOT NULL	COMMENT '적용 정책과 대체 증거 버전 | 원형: bigint | 원문 조건: NN',
	`created_at`	DATETIME	NOT NULL	COMMENT '기록 시각·이전 변경 보완 | 원형: timestamptz | 원문 조건: NN; 자기 FK NULL',
	`supersedes_id`	CHAR(36)	NULL	COMMENT '기록 시각·이전 변경 보완 | 원형: uuid | 원문 조건: NN; 자기 FK NULL'
);

CREATE TABLE `reobservation_request` (
	`request_id`	CHAR(36)	NOT NULL	COMMENT '후보 정밀 관측 요청 | 원형: uuid | 원문 조건: PK',
	`candidate_id`	CHAR(36)	NOT NULL	COMMENT '임무 내 후보 | 원형: uuid | 원문 조건: DB-14/04 FK; NN',
	`mission_id`	CHAR(36)	NOT NULL	COMMENT '임무 내 후보 | 원형: uuid | 원문 조건: DB-14/04 FK; NN',
	`requester_kind`	TEXT	NULL	COMMENT '사용자 또는 규칙 기반 자동 요청 | 원형: text | 원문 조건: SYSTEM/USER;DB-01 FK NULL',
	`requested_by`	CHAR(36)	NULL	COMMENT '사용자 또는 규칙 기반 자동 요청 | 원형: uuid | 원문 조건: SYSTEM/USER;DB-01 FK NULL',
	`requested_at`	DATETIME	NOT NULL	COMMENT 'QUEUED/PLANNED/EXECUTING/SATISFIED/DEFERRED/FAILED/CANCELLED | 원형: timestamptz | 원문 조건: NN; CHECK',
	`status`	TEXT	NOT NULL	COMMENT 'QUEUED/PLANNED/EXECUTING/SATISFIED/DEFERRED/FAILED/CANCELLED | 원형: text | 원문 조건: NN; CHECK',
	`plan_id`	CHAR(36)	NULL	COMMENT '생성된 지역 계획과 전역 작업 연결 | 원형: uuid | 원문 조건: DB-07/37 FK NULL',
	`region_task_id`	CHAR(36)	NULL	COMMENT '생성된 지역 계획과 전역 작업 연결 | 원형: uuid | 원문 조건: DB-07/37 FK NULL',
	`hypothesis`	JSON	NOT NULL	COMMENT '사람 여부·위치 불확실성 및 필요한 다른방향 | 원형: jsonb | 원문 조건: NN',
	`desired_view`	JSON	NOT NULL	COMMENT '사람 여부·위치 불확실성 및 필요한 다른방향 | 원형: jsonb | 원문 조건: NN',
	`max_time_s`	DOUBLE	NULL	COMMENT '한 후보의 무한 반복을 제한하는 승인된예산 | 원형: double precision | 원문 조건: 실행 전 NN; >0',
	`max_attempts`	INT	NULL	COMMENT '한 후보의 무한 반복을 제한하는 승인된예산 | 원형: integer | 원문 조건: 실행 전 NN; >0',
	`used_time_s`	DOUBLE	NOT NULL	COMMENT '실제 소요·시도·일반 접수 순서 | 원형: double precision | 원문 조건: NN; >=0',
	`attempts`	INT	NOT NULL	COMMENT '실제 소요·시도·일반 접수 순서 | 원형: integer | 원문 조건: NN; >=0',
	`queue_order`	BIGINT	NOT NULL	COMMENT '실제 소요·시도·일반 접수 순서 | 원형: bigint | 원문 조건: NN; >=0',
	`result_evidence`	JSON	NOT NULL	COMMENT '유효 관측/관측 불가·예산 종료 근거 | 원형: jsonb | 원문 조건: NN; 사유 NULL',
	`deferred_reason`	TEXT	NULL	COMMENT '유효 관측/관측 불가·예산 종료 근거 | 원형: text | 원문 조건: NN; 사유 NULL'
);

CREATE TABLE `person_candidate` (
	`candidate_id`	CHAR(36)	NOT NULL	COMMENT '임무 내 사람 후보 ID | 원형: uuid | 원문 조건: PK',
	`mission_id`	CHAR(36)	NOT NULL	COMMENT '후보의 임무 | 원형: uuid | 원문 조건: FK DB-04; NN',
	`first_frame_id`	CHAR(36)	NULL	COMMENT '최초 탐지·스냅샷 저장 결과 | 원형: uuid | 원문 조건: DB-12/13 FK; assetNULL',
	`first_asset_id`	CHAR(36)	NULL	COMMENT '최초 탐지·스냅샷 저장 결과 | 원형: uuid | 원문 조건: DB-12/13 FK; assetNULL',
	`first_seen`	DATETIME	NULL	COMMENT '검증된 원관측 시각. 미확정 시 수신 시각별도 기록 | 원형: timestamptz | 원문 조건: NULL 허용',
	`last_seen`	DATETIME	NULL	COMMENT '검증된 원관측 시각. 미확정 시 수신 시각별도 기록 | 원형: timestamptz | 원문 조건: NULL 허용',
	`association_state`	TEXT	NOT NULL	COMMENT '동일 대상 연결 상태와 유효 탐지 수 | 원형: text | 원문 조건: NN; count >=0',
	`evidence_count`	INT	NOT NULL	COMMENT '동일 대상 연결 상태와 유효 탐지 수 | 원형: integer | 원문 조건: NN; count >=0',
	`valid_group_count`	INT	NOT NULL	COMMENT '서로 구분된 유효 관측 묶음 수 | 원형: integer | 원문 조건: NN; >=0',
	`latest_position`	GEOMETRY	NULL	COMMENT 'VALID / PENDING / INVALID | 원형: geometry(Point,4326) | 원문 조건: 위치 NULL; CHECK',
	`geo_status`	TEXT	NULL	COMMENT 'VALID / PENDING / INVALID | 원형: text | 원문 조건: 위치 NULL; CHECK',
	`geo_reason`	TEXT	NULL	COMMENT '좌표보류 사유·1σ 타원/오차 모델·계산 버전 | 원형: text | 원문 조건: NULL; DB-27 FK',
	`ellipse`	JSON	NULL	COMMENT '좌표보류 사유·1σ 타원/오차 모델·계산 버전 | 원형: jsonb | 원문 조건: NULL; DB-27 FK',
	`coordinate_id`	CHAR(36)	NULL	COMMENT '좌표보류 사유·1σ 타원/오차 모델·계산 버전 | 원형: uuid | 원문 조건: NULL; DB-27 FK',
	`appearance`	JSON	NOT NULL	COMMENT '상의 top2·품질과 운영자 판정/근거 | 원형: jsonb | 원문 조건: NN',
	`judgement`	JSON	NOT NULL	COMMENT '상의 top2·품질과 운영자 판정/근거 | 원형: jsonb | 원문 조건: NN',
	`latest_observation_id`	CHAR(36)	NULL	COMMENT '현재 표시 근거와 동시성 버전 | 원형: uuid | 원문 조건: DB-15 FK NULL; NN',
	`row_version`	BIGINT	NOT NULL	COMMENT '현재 표시 근거와 동시성 버전 | 원형: bigint | 원문 조건: DB-15 FK NULL; NN'
);

CREATE TABLE `view_candidate` (
	`view_id`	CHAR(36)	NOT NULL	COMMENT '후보 관측 행동 ID | 원형: uuid | 원문 조건: PK',
	`local_plan_id`	CHAR(36)	NOT NULL	COMMENT '지역 계획·전역 작업 | 원형: uuid | 원문 조건: DB-07/37/34 FK; NN',
	`task_id`	CHAR(36)	NOT NULL	COMMENT '지역 계획·전역 작업 | 원형: uuid | 원문 조건: DB-07/37/34 FK; NN',
	`region_id`	CHAR(36)	NOT NULL	COMMENT '지역 계획·전역 작업 | 원형: uuid | 원문 조건: DB-07/37/34 FK; NN',
	`position_local`	JSON	NOT NULL	COMMENT '미터 기반 xyz와 가능한 시선·장착 모드 | 원형: jsonb | 원문 조건: NN',
	`body_yaw_rad`	DOUBLE	NOT NULL	COMMENT '미터 기반 xyz와 가능한 시선·장착 모드 | 원형: double precision | 원문 조건: NN',
	`camera_pose`	JSON	NOT NULL	COMMENT '미터 기반 xyz와 가능한 시선·장착 모드 | 원형: jsonb | 원문 조건: NN',
	`observe_duration_s`	DOUBLE	NOT NULL	COMMENT 'BASELINE/NEW_SURFACE/OCCLUSION/RECONFIRM/RETURN | 원형: double precision | 원문 조건: NN; >0',
	`candidate_kind`	TEXT	NOT NULL	COMMENT 'BASELINE/NEW_SURFACE/OCCLUSION/RECONFIRM/RETURN | 원형: text | 원문 조건: NN; >0',
	`visible_cells`	JSON	NOT NULL	COMMENT '가시 부분과 셀별 q=v*d. q는 조건부보정값 | 원형: jsonb | 원문 조건: NN',
	`q_values`	JSON	NOT NULL	COMMENT '가시 부분과 셀별 q=v*d. q는 조건부보정값 | 원형: jsonb | 원문 조건: NN',
	`likelihood_id`	CHAR(36)	NULL	COMMENT '사용한 관측모델·존재 가능성 스냅샷 | 원형: uuid | 원문 조건: DB-54/43 FK; 조건부NULL',
	`belief_revision_id`	CHAR(36)	NULL	COMMENT '사용한 관측모델·존재 가능성 스냅샷 | 원형: uuid | 원문 조건: DB-54/43 FK; 조건부NULL',
	`gain`	JSON	NOT NULL	COMMENT '발견 이득·시간·에너지·강제 제약 | 원형: jsonb | 원문 조건: NN',
	`cost`	JSON	NOT NULL	COMMENT '발견 이득·시간·에너지·강제 제약 | 원형: jsonb | 원문 조건: NN',
	`feasibility`	JSON	NOT NULL	COMMENT '발견 이득·시간·에너지·강제 제약 | 원형: jsonb | 원문 조건: NN',
	`selected`	BOOLEAN	NOT NULL	COMMENT '선택 및 제외 사유 | 원형: boolean | 원문 조건: NN; 사유 NULL',
	`rejection_reason`	TEXT	NULL	COMMENT '선택 및 제외 사유 | 원형: text | 원문 조건: NN; 사유 NULL'
);

CREATE TABLE `prior_evidence` (
	`prior_evidence_id`	CHAR(36)	NOT NULL	COMMENT '단서 식별자 | 원형: uuid | 원문 조건: PK',
	`mission_id`	CHAR(36)	NULL	COMMENT '임무와 입력 주체 | 원형: uuid | 원문 조건: DB-04/01 FK; 사용자NULL',
	`created_by`	CHAR(36)	NULL	COMMENT '임무와 입력 주체 | 원형: uuid | 원문 조건: DB-04/01 FK; 사용자NULL',
	`source_type`	TEXT	NOT NULL	COMMENT 'LAST_SEEN / FIELD_REPORT /BASE_UNIFORM | 원형: text | 원문 조건: NN',
	`source_ref`	TEXT	NOT NULL	COMMENT 'LAST_SEEN / FIELD_REPORT /BASE_UNIFORM | 원형: text | 원문 조건: NN',
	`area_geom`	GEOMETRY	NULL	COMMENT '단서 범위·발생 시각 | 원형: geometry(MultiPolygon,4326) | 원문 조건: 조건부 NULL',
	`observed_at`	DATETIME	NULL	COMMENT '단서 범위·발생 시각 | 원형: timestamptz | 원문 조건: 조건부 NULL',
	`confidence_basis`	JSON	NOT NULL	COMMENT '근거와 혼합 α | 원형: jsonb | 원문 조건: NN; weight 0,1',
	`mixture_weight`	DOUBLE	NOT NULL	COMMENT '근거와 혼합 α | 원형: double precision | 원문 조건: NN; weight 0,1',
	`status`	TEXT	NOT NULL	COMMENT 'VALIDATED / UNVERIFIED / RETIRED | 원형: text | 원문 조건: NN; 만료 NULL',
	`expires_at`	DATETIME	NULL	COMMENT 'VALIDATED / UNVERIFIED / RETIRED | 원형: timestamptz | 원문 조건: NN; 만료 NULL',
	`model_kind`	TEXT	NOT NULL	COMMENT '단일/다중 표적 모델에 맞는 적용 방식 | 원형: text | 원문 조건: NN',
	`normalization_spec`	JSON	NOT NULL	COMMENT '단일/다중 표적 모델에 맞는 적용 방식 | 원형: jsonb | 원문 조건: NN'
);

CREATE TABLE `region_visit` (
	`visit_order`	INT	NOT NULL	COMMENT 'GLOBAL_VISIT 계획 내 순서 | 원형: integer | 원문 조건: 복합 PK; DB-07 FK',
	`plan_id`	CHAR(36)	NOT NULL	COMMENT 'GLOBAL_VISIT 계획 내 순서 | 원형: uuid | 원문 조건: 복합 PK; DB-07 FK',
	`region_id`	CHAR(36)	NULL	COMMENT '방문 대상 영역 | 원형: uuid | 원문 조건: DB-34 FK; UQ(plan,region)',
	`selected`	BOOLEAN	NOT NULL	COMMENT '예산 내 prefix 선택 여부 | 원형: boolean | 원문 조건: NN; reason NULL',
	`deferred_reason`	TEXT	NULL	COMMENT '예산 내 prefix 선택 여부 | 원형: text | 원문 조건: NN; reason NULL',
	`incoming_cost_s`	DOUBLE	NULL	COMMENT '전이/영역 내부 처리 비용을 분리 | 원형: double precision | 원문 조건: NULL 또는 >=0',
	`service_cost_s`	DOUBLE	NULL	COMMENT '전이/영역 내부 처리 비용을 분리 | 원형: double precision | 원문 조건: NULL 또는 >=0',
	`return_cost_s`	DOUBLE	NULL	COMMENT '해당 prefix 끝점에서 복귀·예비 | 원형: double precision | 원문 조건: NULL 또는 >=0',
	`reserve_s`	DOUBLE	NULL	COMMENT '해당 prefix 끝점에서 복귀·예비 | 원형: double precision | 원문 조건: NULL 또는 >=0',
	`cost_source`	TEXT	NOT NULL	COMMENT 'MOCK / ROUTE_ESTIMATE /MEASURED | 원형: text | 원문 조건: NN',
	`cost_version`	TEXT	NOT NULL	COMMENT 'MOCK / ROUTE_ESTIMATE /MEASURED | 원형: text | 원문 조건: NN',
	`estimated_entry`	JSON	NULL	COMMENT '지역 모듈이 제공한 진입/종료 상태 | 원형: jsonb | 원문 조건: NULL 허용',
	`estimated_exit`	JSON	NULL	COMMENT '지역 모듈이 제공한 진입/종료 상태 | 원형: jsonb | 원문 조건: NULL 허용'
);

CREATE TABLE `user_account` (
	`user_id`	CHAR(36)	NOT NULL	COMMENT '등록 계정 식별자 | 원형: uuid | 원문 조건: PK',
	`login_id`	VARCHAR(255)	NOT NULL	COMMENT '로그인 계정명 | 원형: text | 원문 조건: UNIQUE / NOT NULL',
	`credential_hash`	TEXT	NOT NULL	COMMENT '비밀번호 해시 | 원형: text | 원문 조건: NOT NULL',
	`permissions`	JSON	NOT NULL	COMMENT '조회·편집·제어 요청 권한 목록 | 원형: jsonb | 원문 조건: NOT NULL',
	`status`	TEXT	NULL	COMMENT '활성·비활성 상태 | 원형: text | 원문 조건: CHECK',
	`created_at`	DATETIME	NOT NULL	COMMENT '계정 등록 시각 | 원형: timestamptz | 원문 조건: NOT NULL'
);

CREATE TABLE `mission_event` (
	`event_id`	CHAR(36)	NOT NULL	COMMENT '영속 이벤트 식별자 | 원형: uuid | 원문 조건: PK',
	`event_seq`	BIGINT	NOT NULL	COMMENT '서버 내 단조 증가 재전송 커서 | 원형: bigint | 원문 조건: UNIQUE / NOT NULL',
	`mission_id`	CHAR(36)	NULL	COMMENT '임무·기체 | 원형: uuid | 원문 조건: FK → DB-04 /missionNULL',
	`drone_id`	TEXT	NULL	COMMENT '임무·기체 | 원형: text | 원문 조건: FK → DB-04 /missionNULL',
	`event_type`	VARCHAR(255)	NOT NULL	COMMENT '이벤트 종류·기원 UC; 시스템 공통 사건은별도 종류 | 원형: text | 원문 조건: NOT NULL',
	`use_case_id`	TEXT	NOT NULL	COMMENT '이벤트 종류·기원 UC; 시스템 공통 사건은별도 종류 | 원형: text | 원문 조건: NOT NULL',
	`source_time`	DATETIME	NOT NULL	COMMENT '발생 기준·저장 시각 | 원형: timestamptz | 원문 조건: NOT NULL',
	`stored_at`	DATETIME	NOT NULL	COMMENT '발생 기준·저장 시각 | 원형: timestamptz | 원문 조건: NOT NULL',
	`source_epoch`	BIGINT	NOT NULL	COMMENT '연결 세대 및 요청/처리 연결 키 | 원형: bigint | 원문 조건: NOT NULL',
	`correlation_id`	CHAR(36)	NOT NULL	COMMENT '연결 세대 및 요청/처리 연결 키 | 원형: uuid | 원문 조건: NOT NULL',
	`payload`	JSON	NOT NULL	COMMENT '계약 버전·상태·후보/명령/파일 등 연관참조 | 원형: jsonb | 원문 조건: NOT NULL',
	`refs`	JSON	NOT NULL	COMMENT '계약 버전·상태·후보/명령/파일 등 연관참조 | 원형: jsonb | 원문 조건: NOT NULL',
	`producer_id`	VARCHAR(255)	NOT NULL	COMMENT '생성 주체별 중복/재전송 검증 | 원형: text | 원문 조건: NN; UQ 3개+event_type',
	`producer_session_id`	CHAR(36)	NOT NULL	COMMENT '생성 주체별 중복/재전송 검증 | 원형: uuid | 원문 조건: NN; UQ 3개+event_type',
	`sequence`	BIGINT	NOT NULL	COMMENT '생성 주체별 중복/재전송 검증 | 원형: bigint | 원문 조건: NN; UQ 3개+event_type',
	`publish_state`	TEXT	NOT NULL	COMMENT 'PENDING/SENT, 트랜잭션 outbox 상태 | 원형: text | 원문 조건: NN; 시각 NULL',
	`published_at`	DATETIME	NULL	COMMENT 'PENDING/SENT, 트랜잭션 outbox 상태 | 원형: timestamptz | 원문 조건: NN; 시각 NULL'
);

CREATE TABLE `configuration_bundle` (
	`config_id`	CHAR(36)	NOT NULL	COMMENT '불변 설정 ID | 원형: uuid | 원문 조건: PK',
	`kind`	VARCHAR(255)	NOT NULL	COMMENT 'MISSION / GUARD / OBSERVATION /CODEC 등 | 원형: text | 원문 조건: UQ(kind,version); NN',
	`version`	VARCHAR(255)	NOT NULL	COMMENT 'MISSION / GUARD / OBSERVATION /CODEC 등 | 원형: text | 원문 조건: UQ(kind,version); NN',
	`schema_version`	TEXT	NOT NULL	COMMENT 'MISSION / GUARD / OBSERVATION /CODEC 등 | 원형: text | 원문 조건: UQ(kind,version); NN',
	`payload`	JSON	NOT NULL	COMMENT '설정 본문과 해시 | 원형: jsonb | 원문 조건: NN',
	`content_hash`	TEXT	NOT NULL	COMMENT '설정 본문과 해시 | 원형: text | 원문 조건: NN',
	`status`	TEXT	NULL	COMMENT 'DRAFT / APPROVED / RETIRED | 원형: text | 원문 조건: CHECK; DB-01 FKNULL',
	`approved_by`	CHAR(36)	NULL	COMMENT 'DRAFT / APPROVED / RETIRED | 원형: uuid | 원문 조건: CHECK; DB-01 FKNULL',
	`created_at`	DATETIME	NULL	COMMENT '작성·승인 시각 | 원형: timestamptz | 원문 조건: approved NULL',
	`approved_at`	DATETIME	NULL	COMMENT '작성·승인 시각 | 원형: timestamptz | 원문 조건: approved NULL',
	`validation_report_ref`	TEXT	NULL	COMMENT '시험 증거 참조. 미수행은 명시 | 원형: text | 원문 조건: NULL'
);

CREATE TABLE `link_state` (
	`drone_id`	VARCHAR(255)	NOT NULL	COMMENT '기체와 링크 구간 | 원형: text | 원문 조건: 복합 PK',
	`link_id`	VARCHAR(255)	NOT NULL	COMMENT '기체와 링크 구간 | 원형: text | 원문 조건: 복합 PK',
	`connection_epoch`	BIGINT	NOT NULL	COMMENT '재접속 때 증가하는 연결 세대 | 원형: bigint | 원문 조건: NOT NULL',
	`last_ok_at`	DATETIME	NULL	COMMENT '마지막 정상·장애 감지 시각 | 원형: timestamptz | 원문 조건: NULL 허용',
	`detected_at`	DATETIME	NULL	COMMENT '마지막 정상·장애 감지 시각 | 원형: timestamptz | 원문 조건: NULL 허용',
	`state`	TEXT	NOT NULL	COMMENT '정상·단절·미확인 및 사유 | 원형: text | 원문 조건: NOT NULL',
	`reason`	TEXT	NOT NULL	COMMENT '정상·단절·미확인 및 사유 | 원형: text | 원문 조건: NOT NULL',
	`metrics`	JSON	NOT NULL	COMMENT '가능한 수신량·결손·지연 지표와 측정 범위 | 원형: jsonb | 원문 조건: NOT NULL'
);

CREATE TABLE `execution_lease` (
	`lease_id`	CHAR(36)	NOT NULL	COMMENT 'Pi가 발급한 lease ID | 원형: uuid | 원문 조건: PK',
	`gateway_session_id`	CHAR(36)	NOT NULL	COMMENT '현장 세션·기체 | 원형: uuid | 원문 조건: DB-29 FK; NN',
	`drone_id`	TEXT	NOT NULL	COMMENT '현장 세션·기체 | 원형: text | 원문 조건: DB-29 FK; NN',
	`controller_id`	TEXT	NOT NULL	COMMENT 'MISSION_EXECUTOR /WEB_OPERATOR | 원형: text | 원문 조건: NN',
	`controller_kind`	TEXT	NOT NULL	COMMENT 'MISSION_EXECUTOR /WEB_OPERATOR | 원형: text | 원문 조건: NN',
	`control_epoch`	BIGINT	NOT NULL	COMMENT 'Pi가 승인한 제어 세대 | 원형: bigint | 원문 조건: NN; >=0',
	`grant_id`	CHAR(36)	NULL	COMMENT '자동이면 grant, 수동 웹이면 session | 원형: uuid | 원문 조건: DB-06/02 FK NULL',
	`user_session_id`	CHAR(36)	NULL	COMMENT '자동이면 grant, 수동 웹이면 session | 원형: uuid | 원문 조건: DB-06/02 FK NULL',
	`last_renewal_seq`	BIGINT	NOT NULL	COMMENT '유효 heartbeat 순번·서버 표시용 만료추정 | 원형: bigint | 원문 조건: NN',
	`expires_at`	DATETIME	NOT NULL	COMMENT '유효 heartbeat 순번·서버 표시용 만료추정 | 원형: timestamptz | 원문 조건: NN',
	`state`	TEXT	NULL	COMMENT 'ACTIVE / EXPIRED / INVALIDATED | 원형: text | 원문 조건: CHECK; reason NULL',
	`invalidated_reason`	TEXT	NULL	COMMENT 'ACTIVE / EXPIRED / INVALIDATED | 원형: text | 원문 조건: CHECK; reason NULL'
);

CREATE TABLE `candidate_snapshot` (
	`candidate_id`	CHAR(36)	NOT NULL	COMMENT '후보와 파일 자산 | 원형: uuid | 원문 조건: 복합 PK; DB-14/13 FK',
	`asset_id`	CHAR(36)	NOT NULL	COMMENT '후보와 파일 자산 | 원형: uuid | 원문 조건: 복합 PK; DB-14/13 FK',
	`observation_id`	CHAR(36)	NOT NULL	COMMENT '실제 탐지 근거 | 원형: uuid | 원문 조건: DB-15/12 FK; NN',
	`frame_id`	CHAR(36)	NOT NULL	COMMENT '실제 탐지 근거 | 원형: uuid | 원문 조건: DB-15/12 FK; NN',
	`snapshot_kind`	TEXT	NOT NULL	COMMENT 'FULL_FRAME / CROP /REOBSERVATION | 원형: text | 원문 조건: NN',
	`quality_status`	TEXT	NOT NULL	COMMENT 'FULL_FRAME / CROP /REOBSERVATION | 원형: text | 원문 조건: NN',
	`captured_at`	DATETIME	NULL	COMMENT '원관측 시각·파일 생성 시각 | 원형: timestamptz | 원문 조건: capture NULL;created NN',
	`created_at`	DATETIME	NOT NULL	COMMENT '원관측 시각·파일 생성 시각 | 원형: timestamptz | 원문 조건: capture NULL;created NN',
	`historical`	BOOLEAN	NOT NULL	COMMENT '과거/대체 관계 | 원형: boolean | 원문 조건: NN; DB-13 FK NULL',
	`supersedes_asset_id`	CHAR(36)	NULL	COMMENT '과거/대체 관계 | 원형: uuid | 원문 조건: NN; DB-13 FK NULL'
);

CREATE TABLE `archive_transfer` (
	`transfer_id`	CHAR(36)	NOT NULL	COMMENT '전송 시도 ID | 원형: uuid | 원문 조건: PK',
	`manifest_id`	CHAR(36)	NOT NULL	COMMENT '회수할 보존 묶음 | 원형: uuid | 원문 조건: DB-47 FK; NN',
	`attempt_no`	INT	NOT NULL	COMMENT '시도와 서버가 확인한 이어받기 위치 | 원형: integer | 원문 조건: NN; >=0',
	`acknowledged_bytes`	BIGINT	NOT NULL	COMMENT '시도와 서버가 확인한 이어받기 위치 | 원형: bigint | 원문 조건: NN; >=0',
	`started_at`	DATETIME	NOT NULL	COMMENT '전송 시각 | 원형: timestamptz | 원문 조건: NN',
	`updated_at`	DATETIME	NOT NULL	COMMENT '전송 시각 | 원형: timestamptz | 원문 조건: NN',
	`state`	TEXT	NOT NULL	COMMENT 'UPLOADING/PAUSED/VERIFIED/FAILED | 원형: text | 원문 조건: NN; 오류 NULL',
	`error_code`	TEXT	NULL	COMMENT 'UPLOADING/PAUSED/VERIFIED/FAILED | 원형: text | 원문 조건: NN; 오류 NULL',
	`server_hash`	TEXT	NULL	COMMENT '최종 전체 해시·저장 완료 응답 | 원형: text | 원문 조건: 완료 전 NULL',
	`durable_ack_id`	CHAR(36)	NULL	COMMENT '최종 전체 해시·저장 완료 응답 | 원형: uuid | 원문 조건: 완료 전 NULL',
	`byte_budget`	JSON	NOT NULL	COMMENT '현재 링크 잔여 용량·P4 | 원형: jsonb | 원문 조건: NN',
	`priority_class`	TEXT	NOT NULL	COMMENT '현재 링크 잔여 용량·P4 | 원형: text | 원문 조건: NN'
);

CREATE TABLE `telemetry_sample` (
	`sample_id`	CHAR(36)	NOT NULL	COMMENT '원래 측정 표본 ID | 원형: uuid | 원문 조건: PK',
	`mission_id`	CHAR(36)	NULL	COMMENT '임무 전 준비 상태도 기록 | 원형: uuid | 원문 조건: DB-04 FK NULL;drone NN',
	`drone_id`	TEXT	NOT NULL	COMMENT '임무 전 준비 상태도 기록 | 원형: text | 원문 조건: DB-04 FK NULL;drone NN',
	`producer_id`	VARCHAR(255)	NOT NULL	COMMENT 'FC/게이트웨이 표본 생성 주체와 세션 | 원형: text | 원문 조건: NN',
	`producer_session_id`	CHAR(36)	NOT NULL	COMMENT 'FC/게이트웨이 표본 생성 주체와 세션 | 원형: uuid | 원문 조건: NN',
	`sample_kind`	VARCHAR(255)	NOT NULL	COMMENT 'GNSS / ATTITUDE / GIMBAL /FLIGHT_STATE 등 | 원형: text | 원문 조건: NN; sequence >=0',
	`sequence`	BIGINT	NOT NULL	COMMENT 'GNSS / ATTITUDE / GIMBAL /FLIGHT_STATE 등 | 원형: bigint | 원문 조건: NN; sequence >=0',
	`sample_time_raw`	BIGINT	NULL	COMMENT '원시 표본 시각(ns 등)과 명시된 시계 영역 | 원형: bigint | 원문 조건: NULL, NN',
	`clock_domain`	TEXT	NOT NULL	COMMENT '원시 표본 시각(ns 등)과 명시된 시계 영역 | 원형: text | 원문 조건: NULL, NN',
	`source_time_utc`	DATETIME	NULL	COMMENT '검증된 시각 대응이 있을 때만 채움 | 원형: timestamptz | 원문 조건: NULL 허용',
	`received_at`	DATETIME	NOT NULL	COMMENT '수신 시각, clock mapping·불확실도·동기상태 | 원형: timestamptz | 원문 조건: NN',
	`time_evidence`	JSON	NOT NULL	COMMENT '수신 시각, clock mapping·불확실도·동기상태 | 원형: jsonb | 원문 조건: NN',
	`pose`	JSON	NOT NULL	COMMENT '좌표/축/고도 기준·단위·필드별 품질 | 원형: jsonb | 원문 조건: NN',
	`flight_state`	JSON	NOT NULL	COMMENT '좌표/축/고도 기준·단위·필드별 품질 | 원형: jsonb | 원문 조건: NN',
	`validity`	JSON	NOT NULL	COMMENT '좌표/축/고도 기준·단위·필드별 품질 | 원형: jsonb | 원문 조건: NN'
);

CREATE TABLE `coordinate_config` (
	`coordinate_id`	CHAR(36)	NOT NULL	COMMENT '통신 coordinate_version의 내부 식별자 | 원형: uuid | 원문 조건: PK',
	`context_id`	CHAR(36)	NOT NULL	COMMENT '좌표 및 카메라 기준 | 원형: uuid | 원문 조건: DB-08/26 FK; NN',
	`calibration_id`	CHAR(36)	NOT NULL	COMMENT '좌표 및 카메라 기준 | 원형: uuid | 원문 조건: DB-08/26 FK; NN',
	`time_mapping_version`	TEXT	NOT NULL	COMMENT '시간 대응 방식과 DEM/기준면 출처 | 원형: text | 원문 조건: NN',
	`terrain_version`	TEXT	NOT NULL	COMMENT '시간 대응 방식과 DEM/기준면 출처 | 원형: text | 원문 조건: NN',
	`altitude_datum`	TEXT	NOT NULL	COMMENT 'AGL/REL_HOME/AMSL/ELLIPSOID,TRUE/MAG/UNKNOWN | 원형: text | 원문 조건: NN',
	`heading_reference`	TEXT	NOT NULL	COMMENT 'AGL/REL_HOME/AMSL/ELLIPSOID,TRUE/MAG/UNKNOWN | 원형: text | 원문 조건: NN',
	`conversion_spec`	JSON	NOT NULL	COMMENT 'ENU↔NED/FRD, 지오이드 등 지원변환·사용 조건 | 원형: jsonb | 원문 조건: NN',
	`quality_policy`	JSON	NOT NULL	COMMENT 'ENU↔NED/FRD, 지오이드 등 지원변환·사용 조건 | 원형: jsonb | 원문 조건: NN',
	`created_at`	DATETIME	NOT NULL	COMMENT '불변 설정 묶음·검증 상태 | 원형: timestamptz | 원문 조건: NN',
	`content_hash`	TEXT	NOT NULL	COMMENT '불변 설정 묶음·검증 상태 | 원형: text | 원문 조건: NN',
	`status`	TEXT	NOT NULL	COMMENT '불변 설정 묶음·검증 상태 | 원형: text | 원문 조건: NN'
);

CREATE TABLE `mission` (
	`mission_id`	CHAR(36)	NOT NULL	COMMENT '임무 식별자 | 원형: uuid | 원문 조건: PK',
	`drone_id`	TEXT	NOT NULL	COMMENT '운용 기체 설정 참조 | 원형: text | 원문 조건: NOT NULL',
	`creator_user_id`	CHAR(36)	NULL	COMMENT '생성 운영자 | 원형: uuid | 원문 조건: FK → DB-01',
	`draft_revision`	INT	NULL	COMMENT '편집 개정과 실행 승인 개정 | 원형: integer | 원문 조건: active NULL 허용',
	`active_revision`	INT	NULL	COMMENT '편집 개정과 실행 승인 개정 | 원형: integer | 원문 조건: active NULL 허용',
	`state`	TEXT	NOT NULL	COMMENT '기체에서 확인한 임무 상태와 판정 자료 | 원형: text | 원문 조건: NOT NULL',
	`state_evidence`	JSON	NOT NULL	COMMENT '기체에서 확인한 임무 상태와 판정 자료 | 원형: jsonb | 원문 조건: NOT NULL',
	`started_at`	DATETIME	NULL	COMMENT '실제 시작·종료 확인 시각 | 원형: timestamptz | 원문 조건: NULL 허용',
	`ended_at`	DATETIME	NULL	COMMENT '실제 시작·종료 확인 시각 | 원형: timestamptz | 원문 조건: NULL 허용',
	`termination_reason`	TEXT	NULL	COMMENT '달성·시간·전원·운영자·안전·미확인 사유 | 원형: text | 원문 조건: NULL 허용'
);

CREATE TABLE `spatial_feature` (
	`feature_id`	CHAR(36)	NOT NULL	COMMENT '공간객체 식별자 | 원형: uuid | 원문 조건: PK',
	`context_id`	CHAR(36)	NULL	COMMENT '출처와 정합 기준 | 원형: uuid | 원문 조건: FK → DB-08',
	`source_id`	TEXT	NOT NULL	COMMENT '외부 객체 ID와 건물 등 종류 | 원형: text | 원문 조건: NOT NULL',
	`feature_type`	TEXT	NOT NULL	COMMENT '외부 객체 ID와 건물 등 종류 | 원형: text | 원문 조건: NOT NULL',
	`geom`	GEOMETRY	NOT NULL	COMMENT '표시·검색용 지오메트리 | 원형: geometry(Geometry,4326) | 원문 조건: NOT NULL',
	`height_value`	DOUBLE	NULL	COMMENT '건물 높이와 기준; 미확인 별도 | 원형: double precision | 원문 조건: NULL 허용',
	`height_ref`	TEXT	NULL	COMMENT '건물 높이와 기준; 미확인 별도 | 원형: text | 원문 조건: NULL 허용',
	`quality`	JSON	NOT NULL	COMMENT '누락·최신성·캐시 여부 및 조회 시각 | 원형: jsonb | 원문 조건: NOT NULL',
	`fetched_at`	DATETIME	NOT NULL	COMMENT '누락·최신성·캐시 여부 및 조회 시각 | 원형: timestamptz | 원문 조건: NOT NULL'
);

CREATE TABLE `video_stream_epoch` (
	`epoch_id`	CHAR(36)	NOT NULL	COMMENT '내부 epoch 식별자 | 원형: uuid | 원문 조건: PK',
	`stream_id`	CHAR(36)	NOT NULL	COMMENT '논리 스트림과 연속 구간 번호 | 원형: uuid | 원문 조건: UQ 쌍; NN',
	`stream_epoch`	BIGINT	NOT NULL	COMMENT '논리 스트림과 연속 구간 번호 | 원형: bigint | 원문 조건: UQ 쌍; NN',
	`producer_session_id`	CHAR(36)	NOT NULL	COMMENT '실제 생성·중계 세션 | 원형: uuid | 원문 조건: DB-29 FK; NN',
	`gateway_session_id`	CHAR(36)	NOT NULL	COMMENT '실제 생성·중계 세션 | 원형: uuid | 원문 조건: DB-29 FK; NN',
	`calibration_id`	CHAR(36)	NULL	COMMENT '초기 보정이 없으면 좌표 사용 보류 | 원형: uuid | 원문 조건: DB-26/27 FK; NULL허용',
	`coordinate_id`	CHAR(36)	NULL	COMMENT '초기 보정이 없으면 좌표 사용 보류 | 원형: uuid | 원문 조건: DB-26/27 FK; NULL허용',
	`video_profile_id`	TEXT	NOT NULL	COMMENT 'BASELINE_SRT 등과 실제 코덱 | 원형: text | 원문 조건: NN',
	`codec_name`	TEXT	NOT NULL	COMMENT 'BASELINE_SRT 등과 실제 코덱 | 원형: text | 원문 조건: NN',
	`started_at`	DATETIME	NULL	COMMENT '불연속 경계·원인 | 원형: timestamptz | 원문 조건: ended/reason NULL',
	`ended_at`	DATETIME	NULL	COMMENT '불연속 경계·원인 | 원형: timestamptz | 원문 조건: ended/reason NULL',
	`reset_reason`	TEXT	NULL	COMMENT '불연속 경계·원인 | 원형: text | 원문 조건: ended/reason NULL'
);

CREATE TABLE `group_frame` (
	`group_id`	CHAR(36)	NOT NULL	COMMENT '묶음의 원관측/분석 결과 | 원형: uuid | 원문 조건: 복합 PK; DB-40/12/45 FK',
	`frame_id`	CHAR(36)	NOT NULL	COMMENT '묶음의 원관측/분석 결과 | 원형: uuid | 원문 조건: 복합 PK; DB-40/12/45 FK',
	`analysis_job_id`	CHAR(36)	NOT NULL	COMMENT '묶음의 원관측/분석 결과 | 원형: uuid | 원문 조건: 복합 PK; DB-40/12/45 FK',
	`representation_id`	CHAR(36)	NOT NULL	COMMENT '사용된 영상 표현 | 원형: uuid | 원문 조건: DB-32 FK; NN',
	`contributes_detection`	BOOLEAN	NOT NULL	COMMENT '업무 게이트별 사용 승인 | 원형: boolean | 원문 조건: NN',
	`contributes_coverage`	BOOLEAN	NOT NULL	COMMENT '업무 게이트별 사용 승인 | 원형: boolean | 원문 조건: NN',
	`accepted_interval`	JSON	NULL	COMMENT '프레임 사이 유효 구간·제외 사유 | 원형: jsonb | 원문 조건: NULL 허용',
	`exclusion_reason`	TEXT	NULL	COMMENT '프레임 사이 유효 구간·제외 사유 | 원형: text | 원문 조건: NULL 허용'
);

CREATE TABLE `gateway_session` (
	`gateway_session_id`	CHAR(36)	NOT NULL	COMMENT '가드 재시작 시 신규 발급 | 원형: uuid | 원문 조건: PK',
	`gateway_id`	TEXT	NOT NULL	COMMENT '안정된 장치 ID·실행 프로세스 ID | 원형: text | 원문 조건: NN',
	`drone_id`	TEXT	NOT NULL	COMMENT '안정된 장치 ID·실행 프로세스 ID | 원형: text | 원문 조건: NN',
	`producer_session_id`	CHAR(36)	NOT NULL	COMMENT '안정된 장치 ID·실행 프로세스 ID | 원형: uuid | 원문 조건: NN',
	`started_at`	DATETIME	NULL	COMMENT '세션 시작/종료 | 원형: timestamptz | 원문 조건: ended NULL',
	`ended_at`	DATETIME	NULL	COMMENT '세션 시작/종료 | 원형: timestamptz | 원문 조건: ended NULL',
	`policy_version`	TEXT	NOT NULL	COMMENT '허용 명령·한계와 소프트웨어 버전 | 원형: text | 원문 조건: NN',
	`software_version`	TEXT	NOT NULL	COMMENT '허용 명령·한계와 소프트웨어 버전 | 원형: text | 원문 조건: NN',
	`clock_status`	JSON	NOT NULL	COMMENT '시각 오차 경계·실제 지원 기능 | 원형: jsonb | 원문 조건: NN',
	`capabilities`	JSON	NOT NULL	COMMENT '시각 오차 경계·실제 지원 기능 | 원형: jsonb | 원문 조건: NN',
	`authority_state`	TEXT	NOT NULL	COMMENT 'LOCKED/REMOTE_READY/RECOVERY_LOCKED/LOCAL_OVERRIDE | 원형: text | 원문 조건: NN',
	`last_control_epoch`	BIGINT	NOT NULL	COMMENT 'LOCKED/REMOTE_READY/RECOVERY_LOCKED/LOCAL_OVERRIDE | 원형: bigint | 원문 조건: NN'
);

CREATE TABLE `plan_segment` (
	`segment_id`	CHAR(36)	NOT NULL	COMMENT '실행 구간 ID | 원형: uuid | 원문 조건: PK',
	`plan_id`	CHAR(36)	NOT NULL	COMMENT '지역 계획/영역 작업/관측 행동 | 원형: uuid | 원문 조건: DB-07/37/38 FK; NN',
	`task_id`	CHAR(36)	NOT NULL	COMMENT '지역 계획/영역 작업/관측 행동 | 원형: uuid | 원문 조건: DB-07/37/38 FK; NN',
	`view_id`	CHAR(36)	NOT NULL	COMMENT '지역 계획/영역 작업/관측 행동 | 원형: uuid | 원문 조건: DB-07/37/38 FK; NN',
	`segment_order`	INT	NOT NULL	COMMENT '좌표·고도 기준·속도·yaw가 있는 경로 | 원형: integer | 원문 조건: UQ(plan,order); NN',
	`route`	JSON	NOT NULL	COMMENT '좌표·고도 기준·속도·yaw가 있는 경로 | 원형: jsonb | 원문 조건: UQ(plan,order); NN',
	`map_version`	TEXT	NOT NULL	COMMENT '계획 당시 지도·좌표 기준 | 원형: text | 원문 조건: DB-27 FK; NN',
	`coordinate_id`	CHAR(36)	NOT NULL	COMMENT '계획 당시 지도·좌표 기준 | 원형: uuid | 원문 조건: DB-27 FK; NN',
	`expected_cost`	JSON	NOT NULL	COMMENT '이동·관측·끝점 복귀 시간/Wh | 원형: jsonb | 원문 조건: NN',
	`endpoint_return_cost`	JSON	NOT NULL	COMMENT '이동·관측·끝점 복귀 시간/Wh | 원형: jsonb | 원문 조건: NN',
	`created_at`	DATETIME	NOT NULL	COMMENT '구간 유효기간과 실행 상태 | 원형: timestamptz | 원문 조건: NN',
	`expires_at`	DATETIME	NOT NULL	COMMENT '구간 유효기간과 실행 상태 | 원형: timestamptz | 원문 조건: NN',
	`state`	TEXT	NOT NULL	COMMENT '구간 유효기간과 실행 상태 | 원형: text | 원문 조건: NN',
	`execution_profile`	TEXT	NOT NULL	COMMENT 'BASE_GIS_FC / FUTURE_ONBOARD.기본은 후자 비활성 | 원형: text | 원문 조건: NN; 이유 NULL',
	`rejection_reason`	TEXT	NULL	COMMENT 'BASE_GIS_FC / FUTURE_ONBOARD.기본은 후자 비활성 | 원형: text | 원문 조건: NN; 이유 NULL'
);

CREATE TABLE `safety_event` (
	`safety_event_id`	CHAR(36)	NOT NULL	COMMENT '안전 사건 식별자 | 원형: uuid | 원문 조건: PK',
	`mission_id`	CHAR(36)	NULL	COMMENT '대상 임무·기체 | 원형: uuid | 원문 조건: FK → DB-04 /missionNULL',
	`drone_id`	TEXT	NULL	COMMENT '대상 임무·기체 | 원형: text | 원문 조건: FK → DB-04 /missionNULL',
	`exception_code`	TEXT	NULL	COMMENT '원문 EX-01~EX-15 중 해당 코드와 실제장애 | 원형: text | 원문 조건: EX 참조',
	`fault_type`	TEXT	NULL	COMMENT '원문 EX-01~EX-15 중 해당 코드와 실제장애 | 원형: text | 원문 조건: EX 참조',
	`detected_at`	DATETIME	NOT NULL	COMMENT '감지 시각 및 감지 구간 | 원형: timestamptz | 원문 조건: NOT NULL',
	`source_node`	TEXT	NOT NULL	COMMENT '감지 시각 및 감지 구간 | 원형: text | 원문 조건: NOT NULL',
	`state_evidence`	JSON	NOT NULL	COMMENT '링크·위치·전원·모드 및 승인된 보호 설정 | 원형: jsonb | 원문 조건: NOT NULL',
	`policy_version`	TEXT	NOT NULL	COMMENT '링크·위치·전원·모드 및 승인된 보호 설정 | 원형: text | 원문 조건: NOT NULL',
	`protection_action`	TEXT	NOT NULL	COMMENT '요청한 보호 동작과 실제 가능·미확인 결과 | 원형: text | 원문 조건: NOT NULL',
	`result`	JSON	NOT NULL	COMMENT '요청한 보호 동작과 실제 가능·미확인 결과 | 원형: jsonb | 원문 조건: NOT NULL'
);

CREATE TABLE `media_asset` (
	`asset_id`	CHAR(36)	NOT NULL	COMMENT '영상 자산 식별자 | 원형: uuid | 원문 조건: PK',
	`mission_id`	CHAR(36)	NULL	COMMENT '임무와 스냅샷 근거 프레임 | 원형: uuid | 원문 조건: FK → DB-04, DB-12;frame NULL',
	`frame_id`	CHAR(36)	NULL	COMMENT '임무와 스냅샷 근거 프레임 | 원형: uuid | 원문 조건: FK → DB-04, DB-12;frame NULL',
	`asset_type`	TEXT	NULL	COMMENT '원본 프레임·대상 크롭·녹화·결과 파일 | 원형: text | 원문 조건: CHECK',
	`storage_uri`	TEXT	NOT NULL	COMMENT '내부 파일 위치와 무결성 검증값 | 원형: text | 원문 조건: NOT NULL',
	`content_hash`	TEXT	NOT NULL	COMMENT '내부 파일 위치와 무결성 검증값 | 원형: text | 원문 조건: NOT NULL',
	`time_start`	DATETIME	NULL	COMMENT '녹화 구간 또는 촬영 시각 | 원형: timestamptz | 원문 조건: NULL 허용',
	`time_end`	DATETIME	NULL	COMMENT '녹화 구간 또는 촬영 시각 | 원형: timestamptz | 원문 조건: NULL 허용',
	`state`	TEXT	NOT NULL	COMMENT '저장 완료·실패·삭제·누락 구간 | 원형: text | 원문 조건: NOT NULL',
	`gaps`	JSON	NOT NULL	COMMENT '저장 완료·실패·삭제·누락 구간 | 원형: jsonb | 원문 조건: NOT NULL',
	`retained_until`	DATETIME	NULL	COMMENT '보존 정책 적용 만료 시각 | 원형: timestamptz | 원문 조건: NULL 허용',
	`representation_kind`	TEXT	NOT NULL	COMMENT '기본 압축 원본/파생/sidecar 구분 | 원형: text | 원문 조건: NN; 자기 FK NULL',
	`source_asset_id`	CHAR(36)	NULL	COMMENT '기본 압축 원본/파생/sidecar 구분 | 원형: uuid | 원문 조건: NN; 자기 FK NULL',
	`storage_policy_id`	CHAR(36)	NULL	COMMENT '보존/삭제 정책과 손실 표시 | 원형: uuid | 원문 조건: DB-28 FK NULL; 이유NULL',
	`deletion_reason`	TEXT	NULL	COMMENT '보존/삭제 정책과 손실 표시 | 원형: text | 원문 조건: DB-28 FK NULL; 이유NULL'
);

CREATE TABLE `model_artifact` (
	`model_artifact_id`	CHAR(36)	NOT NULL	COMMENT '학습 가중치 또는 엔진 버전 | 원형: uuid | 원문 조건: PK',
	`model_name`	TEXT	NOT NULL	COMMENT 'soup_v7r2; PT/ENGINE; 실제 파일 해시 | 원형: text | 원문 조건: NN',
	`artifact_kind`	TEXT	NOT NULL	COMMENT 'soup_v7r2; PT/ENGINE; 실제 파일 해시 | 원형: text | 원문 조건: NN',
	`content_hash`	TEXT	NOT NULL	COMMENT 'soup_v7r2; PT/ENGINE; 실제 파일 해시 | 원형: text | 원문 조건: NN',
	`parent_model_id`	CHAR(36)	NULL	COMMENT '.pt→.engine의 출처와 저장 참조 | 원형: uuid | 원문 조건: 자기 FK NULL; DB-13FK',
	`asset_id`	CHAR(36)	NULL	COMMENT '.pt→.engine의 출처와 저장 참조 | 원형: uuid | 원문 조건: 자기 FK NULL; DB-13FK',
	`architecture`	TEXT	NOT NULL	COMMENT 'YOLO11m, 4타일/letterbox, FP16 | 원형: text | 원문 조건: NN',
	`input_spec`	JSON	NOT NULL	COMMENT 'YOLO11m, 4타일/letterbox, FP16 | 원형: jsonb | 원문 조건: NN',
	`precision`	TEXT	NOT NULL	COMMENT 'YOLO11m, 4타일/letterbox, FP16 | 원형: text | 원문 조건: NN',
	`runtime_spec`	JSON	NOT NULL	COMMENT 'TensorRT/드라이버/GPU 실제 버전 | 원형: jsonb | 원문 조건: NN',
	`target_device`	JSON	NOT NULL	COMMENT 'TensorRT/드라이버/GPU 실제 버전 | 원형: jsonb | 원문 조건: NN',
	`thresholds`	JSON	NOT NULL	COMMENT 'conf .15, NMS .6; 장소 분리 결과·출처 | 원형: jsonb | 원문 조건: NN',
	`evaluation_summary`	JSON	NOT NULL	COMMENT 'conf .15, NMS .6; 장소 분리 결과·출처 | 원형: jsonb | 원문 조건: NN',
	`validation_status`	TEXT	NOT NULL	COMMENT 'REPORTED / REPRODUCED /DEPLOYMENT_VALIDATED | 원형: text | 원문 조건: NN',
	`created_at`	DATETIME	NOT NULL	COMMENT 'REPORTED / REPRODUCED /DEPLOYMENT_VALIDATED | 원형: timestamptz | 원문 조건: NN'
);

CREATE TABLE `alert` (
	`alert_id`	CHAR(36)	NOT NULL	COMMENT '알림 식별자 | 원형: uuid | 원문 조건: PK',
	`mission_id`	CHAR(36)	NULL	COMMENT '임무·발생 원인 이벤트 | 원형: uuid | 원문 조건: FK → DB-04, DB-25',
	`source_event_id`	CHAR(36)	NULL	COMMENT '임무·발생 원인 이벤트 | 원형: uuid | 원문 조건: FK → DB-04, DB-25',
	`dedup_key`	VARCHAR(255)	NULL	COMMENT '중복 알림을 억제하는 사건 기준 키 | 원형: text | 원문 조건: UNIQUE',
	`type`	TEXT	NOT NULL	COMMENT '종류·중요도·발생 시각 | 원형: text | 원문 조건: NOT NULL',
	`priority`	INT	NOT NULL	COMMENT '종류·중요도·발생 시각 | 원형: integer | 원문 조건: NOT NULL',
	`raised_at`	DATETIME	NOT NULL	COMMENT '종류·중요도·발생 시각 | 원형: timestamptz | 원문 조건: NOT NULL',
	`evidence_refs`	JSON	NOT NULL	COMMENT '후보·명령·스냅샷·안전 사건 참조 | 원형: jsonb | 원문 조건: NOT NULL',
	`ack_user_id`	CHAR(36)	NULL	COMMENT '확인한 운영자와 시각 | 원형: uuid | 원문 조건: FK → DB-01 / NULL',
	`acknowledged_at`	DATETIME	NULL	COMMENT '확인한 운영자와 시각 | 원형: timestamptz | 원문 조건: FK → DB-01 / NULL'
);

CREATE TABLE `operator_action` (
	`action_id`	CHAR(36)	NOT NULL	COMMENT '조치 식별자 | 원형: uuid | 원문 조건: PK',
	`mission_id`	CHAR(36)	NULL	COMMENT '대상 임무·조치 주체 | 원형: uuid | 원문 조건: FK → DB-04, DB-01',
	`user_id`	CHAR(36)	NULL	COMMENT '대상 임무·조치 주체 | 원형: uuid | 원문 조건: FK → DB-04, DB-01',
	`use_case_id`	TEXT	NOT NULL	COMMENT '원문 UC 식별자와 요청 동작 | 원형: text | 원문 조건: NOT NULL',
	`action_type`	TEXT	NOT NULL	COMMENT '원문 UC 식별자와 요청 동작 | 원형: text | 원문 조건: NOT NULL',
	`request_id`	CHAR(36)	NOT NULL	COMMENT '요청 중복 방지 키와 대상 식별자 | 원형: uuid | 원문 조건: NOT NULL',
	`target_refs`	JSON	NOT NULL	COMMENT '요청 중복 방지 키와 대상 식별자 | 원형: jsonb | 원문 조건: NOT NULL',
	`occurred_at`	DATETIME	NOT NULL	COMMENT '발생 시각·허용/거부/미확인 | 원형: timestamptz | 원문 조건: NOT NULL',
	`outcome`	TEXT	NOT NULL	COMMENT '발생 시각·허용/거부/미확인 | 원형: text | 원문 조건: NOT NULL',
	`before_after`	JSON	NOT NULL	COMMENT '변경 전후·사유·실제 기체 결과와의 구분 | 원형: jsonb | 원문 조건: NOT NULL',
	`reason`	TEXT	NOT NULL	COMMENT '변경 전후·사유·실제 기체 결과와의 구분 | 원형: text | 원문 조건: NOT NULL'
);

CREATE TABLE `archive_manifest` (
	`manifest_id`	CHAR(36)	NOT NULL	COMMENT '현장 확정 조각 | 원형: uuid | 원문 조건: PK; DB-24 FK UQ',
	`segment_id`	CHAR(36)	NULL	COMMENT '현장 확정 조각 | 원형: uuid | 원문 조건: PK; DB-24 FK UQ',
	`video_asset_id`	CHAR(36)	NULL	COMMENT '서버 보관 영상·sidecar | 원형: uuid | 원문 조건: DB-13 FK NULL',
	`metadata_asset_id`	CHAR(36)	NULL	COMMENT '서버 보관 영상·sidecar | 원형: uuid | 원문 조건: DB-13 FK NULL',
	`file_entries`	JSON	NOT NULL	COMMENT '필요 파일별 크기·sha256·representation·의존 조각 | 원형: jsonb | 원문 조건: NN',
	`identity_scope`	TEXT	NOT NULL	COMMENT 'source 또는 Pi 수신 범위; 미확정 번호는NULL | 원형: text | 원문 조건: NN; range NULL',
	`verified_frame_range`	JSON	NULL	COMMENT 'source 또는 Pi 수신 범위; 미확정 번호는NULL | 원형: jsonb | 원문 조건: NN; range NULL',
	`epoch_id`	CHAR(36)	NULL	COMMENT '시간/보정 재현 정보 | 원형: uuid | 원문 조건: DB-31/26 FK; 보정NULL',
	`calibration_id`	CHAR(36)	NULL	COMMENT '시간/보정 재현 정보 | 원형: uuid | 원문 조건: DB-31/26 FK; 보정NULL',
	`state`	TEXT	NOT NULL	COMMENT 'SEALED/VIDEO_ONLY/PERSISTED/CONFLICT | 원형: text | 원문 조건: NN; 시각 NULL',
	`persisted_at`	DATETIME	NULL	COMMENT 'SEALED/VIDEO_ONLY/PERSISTED/CONFLICT | 원형: timestamptz | 원문 조건: NN; 시각 NULL',
	`manifest_hash`	TEXT	NOT NULL	COMMENT 'manifest 무결성과 서버 저장 확인 | 원형: text | 원문 조건: NN; ACK NULL',
	`durable_ack_id`	CHAR(36)	NULL	COMMENT 'manifest 무결성과 서버 저장 확인 | 원형: uuid | 원문 조건: NN; ACK NULL'
);

CREATE TABLE `mission_execution_grant` (
	`grant_id`	CHAR(36)	NOT NULL	COMMENT '승인된 임무 실행 권한 | 원형: uuid | 원문 조건: PK',
	`mission_id`	CHAR(36)	NOT NULL	COMMENT '승인된 불변 실행 개정 | 원형: uuid | 원문 조건: 복합 FK DB-05; NN',
	`revision`	INT	NOT NULL	COMMENT '승인된 불변 실행 개정 | 원형: integer | 원문 조건: 복합 FK DB-05; NN',
	`approved_by`	CHAR(36)	NOT NULL	COMMENT '최초 승인 운영자 | 원형: uuid | 원문 조건: FK DB-01; NN',
	`status`	TEXT	NOT NULL	COMMENT 'ACTIVE / SUSPENDED / REVOKED | 원형: text | 원문 조건: CHECK; NN',
	`issued_at`	DATETIME	NULL	COMMENT '발급·철회 시각 | 원형: timestamptz | 원문 조건: revoked_at NULL',
	`revoked_at`	DATETIME	NULL	COMMENT '발급·철회 시각 | 원형: timestamptz | 원문 조건: revoked_at NULL',
	`last_lease_id`	CHAR(36)	NULL	COMMENT '현재/최근 Pi 실행 lease. 권한 자체와 분리 | 원형: uuid | 원문 조건: FK DB-30; NULL'
);

CREATE TABLE `observation_evidence` (
	`evidence_id`	CHAR(36)	NOT NULL	COMMENT '실제 관측 영역 근거 | 원형: uuid | 원문 조건: PK',
	`mission_id`	CHAR(36)	NOT NULL	COMMENT '증거가 적용되는 셀 버전 | 원형: uuid | 원문 조건: 복합 FK DB-17; NN',
	`grid_version`	VARCHAR(255)	NOT NULL	COMMENT '증거가 적용되는 셀 버전 | 원형: text | 원문 조건: 복합 FK DB-17; NN',
	`cell_id`	VARCHAR(255)	NOT NULL	COMMENT '증거가 적용되는 셀 버전 | 원형: text | 원문 조건: 복합 FK DB-17; NN',
	`frame_id`	CHAR(36)	NOT NULL	COMMENT '사용한 실제 분석 프레임·표현 | 원형: uuid | 원문 조건: DB-12/32 FK; NN',
	`representation_id`	CHAR(36)	NOT NULL	COMMENT '사용한 실제 분석 프레임·표현 | 원형: uuid | 원문 조건: DB-12/32 FK; NN',
	`analysis_job_id`	CHAR(36)	NOT NULL	COMMENT '추론 완료와 상관 관측 묶음 | 원형: uuid | 원문 조건: DB-45/40 FK; NN',
	`group_id`	CHAR(36)	NOT NULL	COMMENT '추론 완료와 상관 관측 묶음 | 원형: uuid | 원문 조건: DB-45/40 FK; NN',
	`binding_id`	CHAR(36)	NOT NULL	COMMENT '촬영 자세·좌표/보정 근거 | 원형: uuid | 원문 조건: DB-33/27 FK; NN',
	`coordinate_id`	CHAR(36)	NOT NULL	COMMENT '촬영 자세·좌표/보정 근거 | 원형: uuid | 원문 조건: DB-33/27 FK; NN',
	`visible_geom`	GEOMETRY	NULL	COMMENT '실제 가시 부분과 검증된 시작/종료 시각 | 원형: geometry(MultiPolygon,4326) | 원문 조건: NULL 허용',
	`observed_interval`	JSON	NULL	COMMENT '실제 가시 부분과 검증된 시작/종료 시각 | 원형: jsonb | 원문 조건: NULL 허용',
	`quality_decision`	JSON	NOT NULL	COMMENT 'POSITIVE / NEGATIVE / UNUSABLE.탐지 결과 포함 | 원형: jsonb | 원문 조건: NN',
	`evidence_kind`	TEXT	NOT NULL	COMMENT 'POSITIVE / NEGATIVE / UNUSABLE.탐지 결과 포함 | 원형: text | 원문 조건: NN',
	`created_at`	DATETIME	NULL	COMMENT '저장·원자적 적용 시각 | 원형: timestamptz | 원문 조건: applied NULL',
	`applied_at`	DATETIME	NULL	COMMENT '저장·원자적 적용 시각 | 원형: timestamptz | 원문 조건: applied NULL',
	`supersedes_id`	CHAR(36)	NULL	COMMENT '더 좋은 원본/보정으로 대체한 과거 근거 | 원형: uuid | 원문 조건: 자기 FK NULL'
);

ALTER TABLE `search_region` ADD CONSTRAINT `PK_SEARCH_REGION` PRIMARY KEY (
	`region_id`
);

ALTER TABLE `spatial_context` ADD CONSTRAINT `PK_SPATIAL_CONTEXT` PRIMARY KEY (
	`context_id`
);

ALTER TABLE `field_segment` ADD CONSTRAINT `PK_FIELD_SEGMENT` PRIMARY KEY (
	`segment_id`
);

ALTER TABLE `frame_representation` ADD CONSTRAINT `PK_FRAME_REPRESENTATION` PRIMARY KEY (
	`representation_id`
);

ALTER TABLE `stream_event_gap` ADD CONSTRAINT `PK_STREAM_EVENT_GAP` PRIMARY KEY (
	`gap_id`
);

ALTER TABLE `frame_pose_binding` ADD CONSTRAINT `PK_FRAME_POSE_BINDING` PRIMARY KEY (
	`binding_id`
);

ALTER TABLE `observation_group` ADD CONSTRAINT `PK_OBSERVATION_GROUP` PRIMARY KEY (
	`group_id`
);

ALTER TABLE `likelihood_model` ADD CONSTRAINT `PK_LIKELIHOOD_MODEL` PRIMARY KEY (
	`likelihood_id`
);

ALTER TABLE `region_cell_membership` ADD CONSTRAINT `PK_REGION_CELL_MEMBERSHIP` PRIMARY KEY (
	`region_id`,
	`mission_id`,
	`grid_version`,
	`cell_id`
);

ALTER TABLE `flight_command` ADD CONSTRAINT `PK_FLIGHT_COMMAND` PRIMARY KEY (
	`command_id`
);

ALTER TABLE `command_transition` ADD CONSTRAINT `PK_COMMAND_TRANSITION` PRIMARY KEY (
	`transition_id`
);

ALTER TABLE `observation_cell` ADD CONSTRAINT `PK_OBSERVATION_CELL` PRIMARY KEY (
	`grid_version`,
	`cell_id`,
	`mission_id`
);

ALTER TABLE `mission_revision` ADD CONSTRAINT `PK_MISSION_REVISION` PRIMARY KEY (
	`revision`,
	`mission_id`
);

ALTER TABLE `codec_session` ADD CONSTRAINT `PK_CODEC_SESSION` PRIMARY KEY (
	`codec_session_id`
);

ALTER TABLE `execution_report` ADD CONSTRAINT `PK_EXECUTION_REPORT` PRIMARY KEY (
	`report_id`
);

ALTER TABLE `user_session` ADD CONSTRAINT `PK_USER_SESSION` PRIMARY KEY (
	`session_id`
);

ALTER TABLE `camera_calibration` ADD CONSTRAINT `PK_CAMERA_CALIBRATION` PRIMARY KEY (
	`calibration_id`
);

ALTER TABLE `control_lease` ADD CONSTRAINT `PK_CONTROL_LEASE` PRIMARY KEY (
	`drone_id`
);

ALTER TABLE `cell_belief` ADD CONSTRAINT `PK_CELL_BELIEF` PRIMARY KEY (
	`mission_id`,
	`grid_version`,
	`cell_id`
);

ALTER TABLE `search_plan` ADD CONSTRAINT `PK_SEARCH_PLAN` PRIMARY KEY (
	`plan_id`
);

ALTER TABLE `belief_revision` ADD CONSTRAINT `PK_BELIEF_REVISION` PRIMARY KEY (
	`belief_revision_id`
);

ALTER TABLE `region_task` ADD CONSTRAINT `PK_REGION_TASK` PRIMARY KEY (
	`task_id`
);

ALTER TABLE `analysis_job` ADD CONSTRAINT `PK_ANALYSIS_JOB` PRIMARY KEY (
	`analysis_job_id`
);

ALTER TABLE `video_frame` ADD CONSTRAINT `PK_VIDEO_FRAME` PRIMARY KEY (
	`frame_id`
);

ALTER TABLE `detection_observation` ADD CONSTRAINT `PK_DETECTION_OBSERVATION` PRIMARY KEY (
	`observation_id`
);

ALTER TABLE `belief_update` ADD CONSTRAINT `PK_BELIEF_UPDATE` PRIMARY KEY (
	`update_id`
);

ALTER TABLE `reobservation_request` ADD CONSTRAINT `PK_REOBSERVATION_REQUEST` PRIMARY KEY (
	`request_id`
);

ALTER TABLE `person_candidate` ADD CONSTRAINT `PK_PERSON_CANDIDATE` PRIMARY KEY (
	`candidate_id`
);

ALTER TABLE `view_candidate` ADD CONSTRAINT `PK_VIEW_CANDIDATE` PRIMARY KEY (
	`view_id`
);

ALTER TABLE `prior_evidence` ADD CONSTRAINT `PK_PRIOR_EVIDENCE` PRIMARY KEY (
	`prior_evidence_id`
);

ALTER TABLE `region_visit` ADD CONSTRAINT `PK_REGION_VISIT` PRIMARY KEY (
	`visit_order`,
	`plan_id`
);

ALTER TABLE `user_account` ADD CONSTRAINT `PK_USER_ACCOUNT` PRIMARY KEY (
	`user_id`
);

ALTER TABLE `mission_event` ADD CONSTRAINT `PK_MISSION_EVENT` PRIMARY KEY (
	`event_id`
);

ALTER TABLE `configuration_bundle` ADD CONSTRAINT `PK_CONFIGURATION_BUNDLE` PRIMARY KEY (
	`config_id`
);

ALTER TABLE `link_state` ADD CONSTRAINT `PK_LINK_STATE` PRIMARY KEY (
	`drone_id`,
	`link_id`
);

ALTER TABLE `execution_lease` ADD CONSTRAINT `PK_EXECUTION_LEASE` PRIMARY KEY (
	`lease_id`
);

ALTER TABLE `candidate_snapshot` ADD CONSTRAINT `PK_CANDIDATE_SNAPSHOT` PRIMARY KEY (
	`candidate_id`,
	`asset_id`
);

ALTER TABLE `archive_transfer` ADD CONSTRAINT `PK_ARCHIVE_TRANSFER` PRIMARY KEY (
	`transfer_id`
);

ALTER TABLE `telemetry_sample` ADD CONSTRAINT `PK_TELEMETRY_SAMPLE` PRIMARY KEY (
	`sample_id`
);

ALTER TABLE `coordinate_config` ADD CONSTRAINT `PK_COORDINATE_CONFIG` PRIMARY KEY (
	`coordinate_id`
);

ALTER TABLE `mission` ADD CONSTRAINT `PK_MISSION` PRIMARY KEY (
	`mission_id`
);

ALTER TABLE `spatial_feature` ADD CONSTRAINT `PK_SPATIAL_FEATURE` PRIMARY KEY (
	`feature_id`
);

ALTER TABLE `video_stream_epoch` ADD CONSTRAINT `PK_VIDEO_STREAM_EPOCH` PRIMARY KEY (
	`epoch_id`
);

ALTER TABLE `group_frame` ADD CONSTRAINT `PK_GROUP_FRAME` PRIMARY KEY (
	`group_id`,
	`frame_id`,
	`analysis_job_id`
);

ALTER TABLE `gateway_session` ADD CONSTRAINT `PK_GATEWAY_SESSION` PRIMARY KEY (
	`gateway_session_id`
);

ALTER TABLE `plan_segment` ADD CONSTRAINT `PK_PLAN_SEGMENT` PRIMARY KEY (
	`segment_id`
);

ALTER TABLE `safety_event` ADD CONSTRAINT `PK_SAFETY_EVENT` PRIMARY KEY (
	`safety_event_id`
);

ALTER TABLE `media_asset` ADD CONSTRAINT `PK_MEDIA_ASSET` PRIMARY KEY (
	`asset_id`
);

ALTER TABLE `model_artifact` ADD CONSTRAINT `PK_MODEL_ARTIFACT` PRIMARY KEY (
	`model_artifact_id`
);

ALTER TABLE `alert` ADD CONSTRAINT `PK_ALERT` PRIMARY KEY (
	`alert_id`
);

ALTER TABLE `operator_action` ADD CONSTRAINT `PK_OPERATOR_ACTION` PRIMARY KEY (
	`action_id`
);

ALTER TABLE `archive_manifest` ADD CONSTRAINT `PK_ARCHIVE_MANIFEST` PRIMARY KEY (
	`manifest_id`
);

ALTER TABLE `mission_execution_grant` ADD CONSTRAINT `PK_MISSION_EXECUTION_GRANT` PRIMARY KEY (
	`grant_id`
);

ALTER TABLE `observation_evidence` ADD CONSTRAINT `PK_OBSERVATION_EVIDENCE` PRIMARY KEY (
	`evidence_id`
);

ALTER TABLE `region_cell_membership` ADD CONSTRAINT `FK_search_region_TO_region_cell_membership_1` FOREIGN KEY (
	`region_id`
)
REFERENCES `search_region` (
	`region_id`
);

ALTER TABLE `region_cell_membership` ADD CONSTRAINT `FK_search_region_TO_region_cell_membership_2` FOREIGN KEY (
	`mission_id`
)
REFERENCES `search_region` (
	`mission_id`
);

ALTER TABLE `region_cell_membership` ADD CONSTRAINT `FK_observation_cell_TO_region_cell_membership_1` FOREIGN KEY (
	`grid_version`
)
REFERENCES `observation_cell` (
	`grid_version`
);

ALTER TABLE `region_cell_membership` ADD CONSTRAINT `FK_observation_cell_TO_region_cell_membership_2` FOREIGN KEY (
	`cell_id`
)
REFERENCES `observation_cell` (
	`cell_id`
);

ALTER TABLE `observation_cell` ADD CONSTRAINT `FK_mission_TO_observation_cell_1` FOREIGN KEY (
	`mission_id`
)
REFERENCES `mission` (
	`mission_id`
);

ALTER TABLE `mission_revision` ADD CONSTRAINT `FK_mission_TO_mission_revision_1` FOREIGN KEY (
	`mission_id`
)
REFERENCES `mission` (
	`mission_id`
);

ALTER TABLE `cell_belief` ADD CONSTRAINT `FK_observation_group_TO_cell_belief_1` FOREIGN KEY (
	`mission_id`
)
REFERENCES `observation_group` (
	`mission_id`
);

ALTER TABLE `cell_belief` ADD CONSTRAINT `FK_observation_cell_TO_cell_belief_1` FOREIGN KEY (
	`grid_version`
)
REFERENCES `observation_cell` (
	`grid_version`
);

ALTER TABLE `cell_belief` ADD CONSTRAINT `FK_observation_cell_TO_cell_belief_2` FOREIGN KEY (
	`cell_id`
)
REFERENCES `observation_cell` (
	`cell_id`
);

ALTER TABLE `region_visit` ADD CONSTRAINT `FK_search_plan_TO_region_visit_1` FOREIGN KEY (
	`plan_id`
)
REFERENCES `search_plan` (
	`plan_id`
);

ALTER TABLE `candidate_snapshot` ADD CONSTRAINT `FK_person_candidate_TO_candidate_snapshot_1` FOREIGN KEY (
	`candidate_id`
)
REFERENCES `person_candidate` (
	`candidate_id`
);

ALTER TABLE `candidate_snapshot` ADD CONSTRAINT `FK_media_asset_TO_candidate_snapshot_1` FOREIGN KEY (
	`asset_id`
)
REFERENCES `media_asset` (
	`asset_id`
);

ALTER TABLE `mission` ADD CONSTRAINT `FK_mission_revision_TO_mission_1` FOREIGN KEY (
	`mission_id`
)
REFERENCES `mission_revision` (
	`mission_id`
);

ALTER TABLE `group_frame` ADD CONSTRAINT `FK_observation_group_TO_group_frame_1` FOREIGN KEY (
	`group_id`
)
REFERENCES `observation_group` (
	`group_id`
);

ALTER TABLE `group_frame` ADD CONSTRAINT `FK_video_frame_TO_group_frame_1` FOREIGN KEY (
	`frame_id`
)
REFERENCES `video_frame` (
	`frame_id`
);

ALTER TABLE `group_frame` ADD CONSTRAINT `FK_analysis_job_TO_group_frame_1` FOREIGN KEY (
	`analysis_job_id`
)
REFERENCES `analysis_job` (
	`analysis_job_id`
);

