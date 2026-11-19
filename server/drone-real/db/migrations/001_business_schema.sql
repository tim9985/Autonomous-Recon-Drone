-- DB spec v1.1: exactly 18 business tables and 298 columns.

CREATE SCHEMA drone AUTHORIZATION drone_schema_owner;

SET LOCAL ROLE drone_schema_owner;

SET LOCAL search_path = drone, public, pg_catalog;

CREATE TABLE drone.schema_migration(version text PRIMARY KEY, checksum text NOT NULL CHECK(checksum ~ '^[0-9a-f]{64}$'), applied_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP);

CREATE TABLE drone.user_account (
  user_id uuid NOT NULL,
  login_id varchar(255) NOT NULL,
  credential_hash text NOT NULL,
  permissions jsonb NOT NULL CHECK (permissions IS NULL OR jsonb_typeof(permissions)='array'),
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id)
);

CREATE TABLE drone.user_session (
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  token_digest varchar(255) NOT NULL,
  issued_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  PRIMARY KEY (session_id)
);

CREATE TABLE drone.drone (
  drone_id varchar(255) NOT NULL,
  name text NOT NULL,
  gateway_id text,
  camera_config_id uuid,
  control_user_id uuid,
  control_session_id uuid,
  control_revision bigint NOT NULL DEFAULT 0 CHECK (control_revision >= 0),
  control_acquired_at timestamptz,
  control_expires_at timestamptz,
  control_epoch bigint NOT NULL DEFAULT 0 CHECK (control_epoch >= 0),
  gateway_state jsonb NOT NULL CHECK (gateway_state IS NULL OR jsonb_typeof(gateway_state)='object'),
  link_state jsonb NOT NULL CHECK (link_state IS NULL OR jsonb_typeof(link_state)='object'),
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (drone_id)
);

CREATE TABLE drone.telemetry_sample (
  sample_id uuid NOT NULL,
  mission_id uuid,
  drone_id varchar(255) NOT NULL,
  producer_id text NOT NULL,
  producer_session_id varchar(255) NOT NULL,
  sample_kind varchar(255) NOT NULL,
  sequence bigint NOT NULL CHECK (sequence >= 0),
  sample_time_raw bigint CHECK (sample_time_raw >= 0),
  clock_domain text NOT NULL,
  source_time_utc timestamptz,
  received_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  time_evidence jsonb NOT NULL CHECK (time_evidence IS NULL OR jsonb_typeof(time_evidence)='object'),
  pose jsonb CHECK (pose IS NULL OR jsonb_typeof(pose)='object'),
  flight_state jsonb CHECK (flight_state IS NULL OR jsonb_typeof(flight_state)='object'),
  validity jsonb NOT NULL CHECK (validity IS NULL OR jsonb_typeof(validity)='object'),
  PRIMARY KEY (sample_id)
);

CREATE TABLE drone.config_version (
  config_id uuid NOT NULL,
  kind varchar(255) NOT NULL,
  version varchar(255) NOT NULL,
  schema_version text NOT NULL,
  payload jsonb NOT NULL CHECK (payload IS NULL OR jsonb_typeof(payload)='object'),
  content_hash text NOT NULL CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  parent_id uuid,
  asset_id uuid,
  status text NOT NULL,
  validation_report jsonb CHECK (validation_report IS NULL OR jsonb_typeof(validation_report)='object'),
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_at timestamptz,
  PRIMARY KEY (config_id)
);

CREATE TABLE drone.mission (
  mission_id uuid NOT NULL,
  drone_id varchar(255) NOT NULL,
  creator_user_id uuid NOT NULL,
  draft_revision integer CHECK (draft_revision >= 1),
  active_revision integer CHECK (active_revision >= 1),
  state text NOT NULL,
  state_evidence jsonb NOT NULL CHECK (state_evidence IS NULL OR jsonb_typeof(state_evidence)='object'),
  readiness jsonb NOT NULL CHECK (readiness IS NULL OR jsonb_typeof(readiness)='object'),
  appearance_query jsonb CHECK (appearance_query IS NULL OR jsonb_typeof(appearance_query)='object'),
  test_conditions jsonb NOT NULL CHECK (test_conditions IS NULL OR jsonb_typeof(test_conditions)='object'),
  grant_status text NOT NULL,
  approved_by uuid,
  approved_at timestamptz,
  grant_revoked_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  termination_reason text,
  PRIMARY KEY (mission_id)
);

CREATE TABLE drone.mission_revision (
  mission_id uuid NOT NULL,
  revision integer NOT NULL CHECK (revision >= 1),
  area_geom geometry(MultiPolygon,4326) CHECK (NOT ST_IsEmpty(area_geom) AND ST_IsValid(area_geom) AND ST_XMin(Box3D(area_geom)) >= -180 AND ST_XMax(Box3D(area_geom)) <= 180 AND ST_YMin(Box3D(area_geom)) >= -90 AND ST_YMax(Box3D(area_geom)) <= 90),
  priority_geom geometry(MultiPolygon,4326) CHECK (NOT ST_IsEmpty(priority_geom) AND ST_IsValid(priority_geom) AND ST_XMin(Box3D(priority_geom)) >= -180 AND ST_XMax(Box3D(priority_geom)) <= 180 AND ST_YMin(Box3D(priority_geom)) >= -90 AND ST_YMax(Box3D(priority_geom)) <= 90),
  priority_sources jsonb NOT NULL CHECK (priority_sources IS NULL OR jsonb_typeof(priority_sources)='array'),
  conditions jsonb NOT NULL CHECK (conditions IS NULL OR jsonb_typeof(conditions)='object'),
  area_denominators jsonb CHECK (area_denominators IS NULL OR jsonb_typeof(area_denominators)='object'),
  spatial_config_id uuid,
  coordinate_config_id uuid,
  policy_config_id uuid,
  model_config_id uuid,
  planner_modes jsonb NOT NULL CHECK (planner_modes IS NULL OR jsonb_typeof(planner_modes)='object'),
  grid_version text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_at timestamptz,
  PRIMARY KEY (mission_id,revision)
);

CREATE TABLE drone.search_plan (
  plan_id uuid NOT NULL,
  mission_id uuid NOT NULL,
  mission_revision integer NOT NULL CHECK (mission_revision >= 1),
  plan_version integer NOT NULL CHECK (plan_version >= 1),
  plan_kind text NOT NULL,
  parent_plan_id uuid,
  supersedes_plan_id uuid,
  region_id uuid,
  input_versions jsonb NOT NULL CHECK (input_versions IS NULL OR jsonb_typeof(input_versions)='object'),
  objective_mode text NOT NULL,
  visit_order jsonb NOT NULL CHECK (visit_order IS NULL OR jsonb_typeof(visit_order)='array'),
  task jsonb NOT NULL CHECK (task IS NULL OR jsonb_typeof(task)='object'),
  candidates jsonb NOT NULL CHECK (candidates IS NULL OR jsonb_typeof(candidates)='array'),
  route jsonb NOT NULL CHECK (route IS NULL OR jsonb_typeof(route)='object'),
  status text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at timestamptz,
  summary jsonb NOT NULL CHECK (summary IS NULL OR jsonb_typeof(summary)='object'),
  decision_log jsonb NOT NULL CHECK (decision_log IS NULL OR jsonb_typeof(decision_log)='object'),
  PRIMARY KEY (plan_id)
);

CREATE TABLE drone.search_region (
  region_id uuid NOT NULL,
  mission_id uuid NOT NULL,
  mission_revision integer NOT NULL CHECK (mission_revision >= 1),
  grid_version text NOT NULL,
  region_type text NOT NULL,
  source_features jsonb NOT NULL CHECK (source_features IS NULL OR jsonb_typeof(source_features)='object'),
  region_geom geometry(MultiPolygon,4326) NOT NULL CHECK (NOT ST_IsEmpty(region_geom) AND ST_IsValid(region_geom) AND ST_XMin(Box3D(region_geom)) >= -180 AND ST_XMax(Box3D(region_geom)) <= 180 AND ST_YMin(Box3D(region_geom)) >= -90 AND ST_YMax(Box3D(region_geom)) <= 90),
  representative_point geometry(Point,4326) NOT NULL CHECK (NOT ST_IsEmpty(representative_point) AND ST_IsValid(representative_point) AND ST_XMin(Box3D(representative_point)) >= -180 AND ST_XMax(Box3D(representative_point)) <= 180 AND ST_YMin(Box3D(representative_point)) >= -90 AND ST_YMax(Box3D(representative_point)) <= 90),
  total_area_m2 double precision NOT NULL CHECK (total_area_m2 > '-Infinity'::float8 AND total_area_m2 < 'Infinity'::float8 AND total_area_m2 >= 0),
  remaining_area_m2 double precision NOT NULL CHECK (remaining_area_m2 > '-Infinity'::float8 AND remaining_area_m2 < 'Infinity'::float8 AND remaining_area_m2 >= 0),
  state text NOT NULL,
  pass_index integer NOT NULL DEFAULT 0 CHECK (pass_index >= 0),
  service_estimate_s double precision CHECK (service_estimate_s > '-Infinity'::float8 AND service_estimate_s < 'Infinity'::float8 AND service_estimate_s >= 0),
  reason text,
  row_version bigint NOT NULL DEFAULT 0 CHECK (row_version >= 0),
  PRIMARY KEY (region_id)
);

CREATE TABLE drone.reobservation_request (
  request_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  mission_id uuid NOT NULL,
  requester_kind text NOT NULL,
  requested_by uuid,
  requested_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status text NOT NULL,
  queue_order integer CHECK (queue_order >= 0),
  plan_id uuid,
  hypothesis jsonb NOT NULL CHECK (hypothesis IS NULL OR jsonb_typeof(hypothesis)='object'),
  desired_view jsonb NOT NULL CHECK (desired_view IS NULL OR jsonb_typeof(desired_view)='object'),
  limits jsonb NOT NULL CHECK (limits IS NULL OR jsonb_typeof(limits)='object'),
  usage jsonb NOT NULL CHECK (usage IS NULL OR jsonb_typeof(usage)='object'),
  result_evidence jsonb CHECK (result_evidence IS NULL OR jsonb_typeof(result_evidence)='object'),
  deferred_reason text,
  PRIMARY KEY (request_id)
);

CREATE TABLE drone.video_frame (
  frame_id uuid NOT NULL,
  mission_id uuid,
  drone_id varchar(255) NOT NULL,
  stream_id varchar(255) NOT NULL,
  stream_epoch integer NOT NULL CHECK (stream_epoch >= 0),
  frame_seq bigint NOT NULL CHECK (frame_seq >= 0),
  identity_scope text NOT NULL,
  capture_at timestamptz,
  gateway_received_at timestamptz,
  received_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  capture_time_verified boolean NOT NULL DEFAULT false,
  time_evidence jsonb NOT NULL CHECK (time_evidence IS NULL OR jsonb_typeof(time_evidence)='object'),
  width integer NOT NULL CHECK (width >= 1),
  height integer NOT NULL CHECK (height >= 1),
  format text NOT NULL,
  source_quality_status text NOT NULL,
  metadata_state text NOT NULL,
  coordinate_config_id uuid,
  pose jsonb CHECK (pose IS NULL OR jsonb_typeof(pose)='object'),
  pose_status text NOT NULL,
  pose_reason text,
  footprint_geom geometry(MultiPolygon,4326) CHECK (NOT ST_IsEmpty(footprint_geom) AND ST_IsValid(footprint_geom) AND ST_XMin(Box3D(footprint_geom)) >= -180 AND ST_XMax(Box3D(footprint_geom)) <= 180 AND ST_YMin(Box3D(footprint_geom)) >= -90 AND ST_YMax(Box3D(footprint_geom)) <= 90),
  visible_geom geometry(MultiPolygon,4326) CHECK (NOT ST_IsEmpty(visible_geom) AND ST_IsValid(visible_geom) AND ST_XMin(Box3D(visible_geom)) >= -180 AND ST_XMax(Box3D(visible_geom)) <= 180 AND ST_YMin(Box3D(visible_geom)) >= -90 AND ST_YMax(Box3D(visible_geom)) <= 90),
  coverage jsonb NOT NULL CHECK (coverage IS NULL OR jsonb_typeof(coverage)='object'),
  obs_group text,
  plan_id uuid,
  analysis_mode text,
  analysis_state text NOT NULL,
  skip_reason text,
  model_config_id uuid,
  pipeline_version text,
  analysis_times jsonb NOT NULL CHECK (analysis_times IS NULL OR jsonb_typeof(analysis_times)='object'),
  pre_ms double precision CHECK (pre_ms > '-Infinity'::float8 AND pre_ms < 'Infinity'::float8 AND pre_ms >= 0),
  infer_ms double precision CHECK (infer_ms > '-Infinity'::float8 AND infer_ms < 'Infinity'::float8 AND infer_ms >= 0),
  post_ms double precision CHECK (post_ms > '-Infinity'::float8 AND post_ms < 'Infinity'::float8 AND post_ms >= 0),
  task_quality_status text NOT NULL,
  PRIMARY KEY (frame_id)
);

CREATE TABLE drone.media_asset (
  asset_id uuid NOT NULL,
  mission_id uuid,
  frame_id uuid,
  candidate_id uuid,
  observation_id uuid,
  asset_type text NOT NULL,
  storage_uri text NOT NULL,
  content_hash text CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  time_start timestamptz,
  time_end timestamptz,
  state text NOT NULL,
  gaps jsonb NOT NULL CHECK (gaps IS NULL OR jsonb_typeof(gaps)='array'),
  quality_status text NOT NULL,
  historical boolean NOT NULL,
  retention_class text NOT NULL,
  retained_until timestamptz,
  source_asset_id uuid,
  meta jsonb NOT NULL CHECK (meta IS NULL OR jsonb_typeof(meta)='object'),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (asset_id)
);

CREATE TABLE drone.person_candidate (
  candidate_id uuid NOT NULL,
  mission_id uuid NOT NULL,
  first_frame_id uuid NOT NULL,
  first_asset_id uuid,
  first_seen timestamptz,
  last_seen timestamptz,
  association_state text NOT NULL,
  evidence_count integer NOT NULL DEFAULT 0 CHECK (evidence_count >= 0),
  valid_group_count integer NOT NULL DEFAULT 0 CHECK (valid_group_count >= 0),
  latest_position geometry(Point,4326) CHECK (NOT ST_IsEmpty(latest_position) AND ST_IsValid(latest_position) AND ST_XMin(Box3D(latest_position)) >= -180 AND ST_XMax(Box3D(latest_position)) <= 180 AND ST_YMin(Box3D(latest_position)) >= -90 AND ST_YMax(Box3D(latest_position)) <= 90),
  geo_status text NOT NULL,
  geo_reason text,
  ellipse jsonb CHECK (ellipse IS NULL OR jsonb_typeof(ellipse)='object'),
  coordinate_config_id uuid,
  appearance jsonb CHECK (appearance IS NULL OR jsonb_typeof(appearance)='object'),
  judgement jsonb CHECK (judgement IS NULL OR jsonb_typeof(judgement)='object'),
  tracking jsonb CHECK (tracking IS NULL OR jsonb_typeof(tracking)='object'),
  latest_observation_id uuid,
  row_version bigint NOT NULL DEFAULT 0 CHECK (row_version >= 0),
  PRIMARY KEY (candidate_id)
);

CREATE TABLE drone.detection_observation (
  observation_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  frame_id uuid NOT NULL,
  analysis_mode varchar(255) NOT NULL,
  detection_index integer NOT NULL CHECK (detection_index >= 0),
  track_id text,
  bbox jsonb NOT NULL CHECK (bbox IS NULL OR jsonb_typeof(bbox)='object'),
  confidence double precision NOT NULL CHECK (confidence > '-Infinity'::float8 AND confidence < 'Infinity'::float8 AND confidence >= 0 AND confidence <= 1),
  class_name text NOT NULL,
  observation_kind text NOT NULL,
  model_config_id uuid NOT NULL,
  coordinate_config_id uuid,
  association_evidence jsonb NOT NULL CHECK (association_evidence IS NULL OR jsonb_typeof(association_evidence)='object'),
  geo_result jsonb NOT NULL CHECK (geo_result IS NULL OR jsonb_typeof(geo_result)='object'),
  historical boolean NOT NULL,
  supersedes_id uuid,
  PRIMARY KEY (observation_id)
);

CREATE TABLE drone.observation_cell (
  mission_id uuid NOT NULL,
  grid_version varchar(255) NOT NULL,
  cell_id varchar(255) NOT NULL,
  region_id uuid,
  region_allocations jsonb NOT NULL CHECK (region_allocations IS NULL OR jsonb_typeof(region_allocations)='array'),
  spatial_config_id uuid NOT NULL,
  cell_geom geometry(MultiPolygon,4326) NOT NULL CHECK (NOT ST_IsEmpty(cell_geom) AND ST_IsValid(cell_geom) AND ST_XMin(Box3D(cell_geom)) >= -180 AND ST_XMax(Box3D(cell_geom)) <= 180 AND ST_YMin(Box3D(cell_geom)) >= -90 AND ST_YMax(Box3D(cell_geom)) <= 90),
  cell_area_m2 double precision NOT NULL CHECK (cell_area_m2 > '-Infinity'::float8 AND cell_area_m2 < 'Infinity'::float8 AND cell_area_m2 >= 0),
  state text NOT NULL,
  valid_union_geom geometry(MultiPolygon,4326) CHECK (NOT ST_IsEmpty(valid_union_geom) AND ST_IsValid(valid_union_geom) AND ST_XMin(Box3D(valid_union_geom)) >= -180 AND ST_XMax(Box3D(valid_union_geom)) <= 180 AND ST_YMin(Box3D(valid_union_geom)) >= -90 AND ST_YMax(Box3D(valid_union_geom)) <= 90),
  valid_area_m2 double precision NOT NULL DEFAULT 0 CHECK (valid_area_m2 > '-Infinity'::float8 AND valid_area_m2 < 'Infinity'::float8 AND valid_area_m2 >= 0),
  valid_count integer NOT NULL DEFAULT 0 CHECK (valid_count >= 0),
  valid_group_count integer NOT NULL DEFAULT 0 CHECK (valid_group_count >= 0),
  valid_duration_s double precision NOT NULL DEFAULT 0 CHECK (valid_duration_s > '-Infinity'::float8 AND valid_duration_s < 'Infinity'::float8 AND valid_duration_s >= 0),
  last_valid_at timestamptz,
  excluded_reasons jsonb NOT NULL CHECK (excluded_reasons IS NULL OR jsonb_typeof(excluded_reasons)='array'),
  priority double precision NOT NULL CHECK (priority > '-Infinity'::float8 AND priority < 'Infinity'::float8),
  belief double precision NOT NULL CHECK (belief > '-Infinity'::float8 AND belief < 'Infinity'::float8 AND belief >= 0 AND belief <= 1),
  belief_detail jsonb NOT NULL CHECK (belief_detail IS NULL OR jsonb_typeof(belief_detail)='object'),
  row_version bigint NOT NULL DEFAULT 0 CHECK (row_version >= 0),
  PRIMARY KEY (mission_id,grid_version,cell_id)
);

CREATE TABLE drone.flight_command (
  command_id uuid NOT NULL,
  request_hash varchar(255) NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  mission_id uuid,
  mission_revision integer CHECK (mission_revision >= 1),
  plan_id uuid,
  segment_order integer CHECK (segment_order >= 0),
  drone_id varchar(255) NOT NULL,
  control_epoch bigint NOT NULL DEFAULT 0 CHECK (control_epoch >= 0),
  sequence bigint NOT NULL CHECK (sequence >= 0),
  issued_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  schema_version varchar(255) NOT NULL,
  policy_version text NOT NULL,
  coordinate_config_id uuid NOT NULL,
  requester jsonb NOT NULL CHECK (requester IS NULL OR jsonb_typeof(requester)='object'),
  action text NOT NULL,
  payload jsonb NOT NULL CHECK (payload IS NULL OR jsonb_typeof(payload)='object'),
  state text NOT NULL,
  status_revision integer NOT NULL DEFAULT 0 CHECK (status_revision >= 0),
  reason_code text,
  last_evidence_at timestamptz,
  execution_deadline timestamptz,
  completion_policy jsonb NOT NULL CHECK (completion_policy IS NULL OR jsonb_typeof(completion_policy)='object'),
  PRIMARY KEY (command_id)
);

CREATE TABLE drone.alert (
  alert_id uuid NOT NULL,
  mission_id uuid,
  source_event_id uuid NOT NULL,
  dedup_key varchar(255) NOT NULL,
  type text NOT NULL,
  priority integer NOT NULL CHECK (priority >= 0),
  raised_at timestamptz NOT NULL,
  evidence_refs jsonb NOT NULL CHECK (evidence_refs IS NULL OR jsonb_typeof(evidence_refs)='array'),
  ack_user_id uuid,
  acknowledged_at timestamptz,
  PRIMARY KEY (alert_id)
);

CREATE TABLE drone.mission_event (
  event_id uuid NOT NULL,
  event_seq bigint NOT NULL CHECK (event_seq >= 1),
  mission_id uuid,
  drone_id varchar(255),
  event_type varchar(255) NOT NULL,
  code text NOT NULL,
  use_case_id text,
  actor_user_id uuid,
  ref_table text,
  ref_id text,
  source_time timestamptz,
  stored_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source_epoch text,
  correlation_id text,
  payload jsonb NOT NULL CHECK (payload IS NULL OR jsonb_typeof(payload)='object'),
  refs jsonb NOT NULL CHECK (refs IS NULL OR jsonb_typeof(refs)='array'),
  producer_id varchar(255) NOT NULL,
  producer_session_id varchar(255) NOT NULL,
  sequence bigint NOT NULL CHECK (sequence >= 0),
  publish_state text NOT NULL,
  published_at timestamptz,
  PRIMARY KEY (event_id)
);

RESET ROLE;
