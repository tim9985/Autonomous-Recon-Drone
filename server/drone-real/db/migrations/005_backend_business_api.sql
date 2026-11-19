SET LOCAL ROLE drone_schema_owner; SET LOCAL search_path=pg_catalog,drone,public,pg_temp;

CREATE FUNCTION drone.backend_add_mission(r jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,drone,public,pg_temp AS $$
DECLARE v jsonb; BEGIN
 PERFORM pg_advisory_xact_lock(20261005,1);
 IF r#>>'{test_conditions,environment}' IS DISTINCT FROM 'SIM' THEN RAISE EXCEPTION 'REAL flight disabled' USING ERRCODE='23514'; END IF;INSERT INTO drone.mission (mission_id,drone_id,creator_user_id,draft_revision,active_revision,state,state_evidence,readiness,appearance_query,test_conditions,grant_status,approved_by,approved_at,grant_revoked_at,started_at,ended_at,termination_reason) VALUES ((r->>'mission_id')::uuid,(r->>'drone_id')::varchar(255),(r->>'creator_user_id')::uuid,(r->>'draft_revision')::integer,(r->>'active_revision')::integer,(r->>'state')::text,coalesce(r->'state_evidence','{}'::jsonb),coalesce(r->'readiness','{}'::jsonb),NULLIF(r->'appearance_query','null'::jsonb),coalesce(r->'test_conditions','{}'::jsonb),(r->>'grant_status')::text,(r->>'approved_by')::uuid,(r->>'approved_at')::timestamptz,(r->>'grant_revoked_at')::timestamptz,(r->>'started_at')::timestamptz,(r->>'ended_at')::timestamptz,(r->>'termination_reason')::text) RETURNING to_jsonb(mission.*) INTO v;
 RETURN v; END $$;

CREATE FUNCTION drone.backend_add_mission_revision(r jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,drone,public,pg_temp AS $$
DECLARE v jsonb; BEGIN
 PERFORM pg_advisory_xact_lock(20261005,1);
 INSERT INTO drone.mission_revision (mission_id,revision,area_geom,priority_geom,priority_sources,conditions,area_denominators,spatial_config_id,coordinate_config_id,policy_config_id,model_config_id,planner_modes,grid_version,created_at,approved_at) VALUES ((r->>'mission_id')::uuid,(r->>'revision')::integer,ST_Multi(CASE WHEN r->>'area_geom' IS NOT NULL THEN ST_SetSRID(ST_GeomFromGeoJSON(r->>'area_geom'),4326) END),ST_Multi(CASE WHEN r->>'priority_geom' IS NOT NULL THEN ST_SetSRID(ST_GeomFromGeoJSON(r->>'priority_geom'),4326) END),coalesce(r->'priority_sources','[]'::jsonb),coalesce(r->'conditions','{}'::jsonb),NULLIF(r->'area_denominators','null'::jsonb),(r->>'spatial_config_id')::uuid,(r->>'coordinate_config_id')::uuid,(r->>'policy_config_id')::uuid,(r->>'model_config_id')::uuid,coalesce(r->'planner_modes','{}'::jsonb),(r->>'grid_version')::text,coalesce((r->>'created_at')::timestamptz,CURRENT_TIMESTAMP),(r->>'approved_at')::timestamptz) RETURNING to_jsonb(mission_revision.*) INTO v;
 RETURN v; END $$;

CREATE FUNCTION drone.backend_add_telemetry_sample(r jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,drone,public,pg_temp AS $$
DECLARE v jsonb; BEGIN
 PERFORM pg_advisory_xact_lock(20261005,1);
 INSERT INTO drone.telemetry_sample (sample_id,mission_id,drone_id,producer_id,producer_session_id,sample_kind,sequence,sample_time_raw,clock_domain,source_time_utc,received_at,time_evidence,pose,flight_state,validity) VALUES ((r->>'sample_id')::uuid,(r->>'mission_id')::uuid,(r->>'drone_id')::varchar(255),(r->>'producer_id')::text,(r->>'producer_session_id')::varchar(255),(r->>'sample_kind')::varchar(255),(r->>'sequence')::bigint,(r->>'sample_time_raw')::bigint,(r->>'clock_domain')::text,(r->>'source_time_utc')::timestamptz,coalesce((r->>'received_at')::timestamptz,CURRENT_TIMESTAMP),coalesce(r->'time_evidence','{}'::jsonb),NULLIF(r->'pose','null'::jsonb),NULLIF(r->'flight_state','null'::jsonb),coalesce(r->'validity','{}'::jsonb)) RETURNING to_jsonb(telemetry_sample.*) INTO v;
 RETURN v; END $$;

CREATE FUNCTION drone.backend_add_video_frame(r jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,drone,public,pg_temp AS $$
DECLARE v jsonb; BEGIN
 PERFORM pg_advisory_xact_lock(20261005,1);
 INSERT INTO drone.video_frame (frame_id,mission_id,drone_id,stream_id,stream_epoch,frame_seq,identity_scope,capture_at,gateway_received_at,received_at,capture_time_verified,time_evidence,width,height,format,source_quality_status,metadata_state,coordinate_config_id,pose,pose_status,pose_reason,footprint_geom,visible_geom,coverage,obs_group,plan_id,analysis_mode,analysis_state,skip_reason,model_config_id,pipeline_version,analysis_times,pre_ms,infer_ms,post_ms,task_quality_status) VALUES ((r->>'frame_id')::uuid,(r->>'mission_id')::uuid,(r->>'drone_id')::varchar(255),(r->>'stream_id')::varchar(255),(r->>'stream_epoch')::integer,(r->>'frame_seq')::bigint,(r->>'identity_scope')::text,(r->>'capture_at')::timestamptz,(r->>'gateway_received_at')::timestamptz,coalesce((r->>'received_at')::timestamptz,CURRENT_TIMESTAMP),(r->>'capture_time_verified')::boolean,coalesce(r->'time_evidence','{}'::jsonb),(r->>'width')::integer,(r->>'height')::integer,(r->>'format')::text,(r->>'source_quality_status')::text,(r->>'metadata_state')::text,(r->>'coordinate_config_id')::uuid,NULLIF(r->'pose','null'::jsonb),(r->>'pose_status')::text,(r->>'pose_reason')::text,ST_Multi(CASE WHEN r->>'footprint_geom' IS NOT NULL THEN ST_SetSRID(ST_GeomFromGeoJSON(r->>'footprint_geom'),4326) END),ST_Multi(CASE WHEN r->>'visible_geom' IS NOT NULL THEN ST_SetSRID(ST_GeomFromGeoJSON(r->>'visible_geom'),4326) END),coalesce(r->'coverage','{}'::jsonb),(r->>'obs_group')::text,(r->>'plan_id')::uuid,(r->>'analysis_mode')::text,(r->>'analysis_state')::text,(r->>'skip_reason')::text,(r->>'model_config_id')::uuid,(r->>'pipeline_version')::text,coalesce(r->'analysis_times','{}'::jsonb),(r->>'pre_ms')::double precision,(r->>'infer_ms')::double precision,(r->>'post_ms')::double precision,(r->>'task_quality_status')::text) RETURNING to_jsonb(video_frame.*) INTO v;
 RETURN v; END $$;

CREATE FUNCTION drone.backend_add_media_asset(r jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,drone,public,pg_temp AS $$
DECLARE v jsonb; BEGIN
 PERFORM pg_advisory_xact_lock(20261005,1);
 INSERT INTO drone.media_asset (asset_id,mission_id,frame_id,candidate_id,observation_id,asset_type,storage_uri,content_hash,time_start,time_end,state,gaps,quality_status,historical,retention_class,retained_until,source_asset_id,meta,created_at) VALUES ((r->>'asset_id')::uuid,(r->>'mission_id')::uuid,(r->>'frame_id')::uuid,(r->>'candidate_id')::uuid,(r->>'observation_id')::uuid,(r->>'asset_type')::text,(r->>'storage_uri')::text,(r->>'content_hash')::text,(r->>'time_start')::timestamptz,(r->>'time_end')::timestamptz,(r->>'state')::text,coalesce(r->'gaps','[]'::jsonb),(r->>'quality_status')::text,(r->>'historical')::boolean,(r->>'retention_class')::text,(r->>'retained_until')::timestamptz,(r->>'source_asset_id')::uuid,coalesce(r->'meta','{}'::jsonb),coalesce((r->>'created_at')::timestamptz,CURRENT_TIMESTAMP)) RETURNING to_jsonb(media_asset.*) INTO v;
 RETURN v; END $$;

CREATE FUNCTION drone.backend_add_flight_command(r jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,drone,public,pg_temp AS $$
DECLARE v jsonb; BEGIN
 PERFORM pg_advisory_xact_lock(20261005,1);
 IF r#>>'{requester,environment}' IS DISTINCT FROM 'SIM' THEN RAISE EXCEPTION 'REAL flight disabled' USING ERRCODE='23514'; END IF;INSERT INTO drone.flight_command (command_id,request_hash,mission_id,mission_revision,plan_id,segment_order,drone_id,control_epoch,sequence,issued_at,expires_at,schema_version,policy_version,coordinate_config_id,requester,action,payload,state,status_revision,reason_code,last_evidence_at,execution_deadline,completion_policy) VALUES ((r->>'command_id')::uuid,(r->>'request_hash')::varchar(255),(r->>'mission_id')::uuid,(r->>'mission_revision')::integer,(r->>'plan_id')::uuid,(r->>'segment_order')::integer,(r->>'drone_id')::varchar(255),coalesce((r->>'control_epoch')::bigint,0),(r->>'sequence')::bigint,(r->>'issued_at')::timestamptz,(r->>'expires_at')::timestamptz,(r->>'schema_version')::varchar(255),(r->>'policy_version')::text,(r->>'coordinate_config_id')::uuid,coalesce(r->'requester','{}'::jsonb),(r->>'action')::text,coalesce(r->'payload','{}'::jsonb),(r->>'state')::text,coalesce((r->>'status_revision')::integer,0),(r->>'reason_code')::text,(r->>'last_evidence_at')::timestamptz,(r->>'execution_deadline')::timestamptz,coalesce(r->'completion_policy','{}'::jsonb)) RETURNING to_jsonb(flight_command.*) INTO v;
 RETURN v; END $$;

CREATE FUNCTION drone.backend_add_reobservation_request(r jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,drone,public,pg_temp AS $$
DECLARE v jsonb; BEGIN
 PERFORM pg_advisory_xact_lock(20261005,1);
 INSERT INTO drone.reobservation_request (request_id,candidate_id,mission_id,requester_kind,requested_by,requested_at,status,queue_order,plan_id,hypothesis,desired_view,limits,usage,result_evidence,deferred_reason) VALUES ((r->>'request_id')::uuid,(r->>'candidate_id')::uuid,(r->>'mission_id')::uuid,(r->>'requester_kind')::text,(r->>'requested_by')::uuid,coalesce((r->>'requested_at')::timestamptz,CURRENT_TIMESTAMP),(r->>'status')::text,(r->>'queue_order')::integer,(r->>'plan_id')::uuid,coalesce(r->'hypothesis','{}'::jsonb),coalesce(r->'desired_view','{}'::jsonb),coalesce(r->'limits','{}'::jsonb),coalesce(r->'usage','{}'::jsonb),NULLIF(r->'result_evidence','null'::jsonb),(r->>'deferred_reason')::text) RETURNING to_jsonb(reobservation_request.*) INTO v;
 RETURN v; END $$;

CREATE FUNCTION drone.backend_add_person_candidate(r jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,drone,public,pg_temp AS $$
DECLARE v jsonb; BEGIN
 PERFORM pg_advisory_xact_lock(20261005,1);
 INSERT INTO drone.person_candidate (candidate_id,mission_id,first_frame_id,first_asset_id,first_seen,last_seen,association_state,evidence_count,valid_group_count,latest_position,geo_status,geo_reason,ellipse,coordinate_config_id,appearance,judgement,tracking,latest_observation_id,row_version) VALUES ((r->>'candidate_id')::uuid,(r->>'mission_id')::uuid,(r->>'first_frame_id')::uuid,(r->>'first_asset_id')::uuid,(r->>'first_seen')::timestamptz,(r->>'last_seen')::timestamptz,(r->>'association_state')::text,coalesce((r->>'evidence_count')::integer,0),coalesce((r->>'valid_group_count')::integer,0),CASE WHEN r->>'latest_position' IS NOT NULL THEN ST_SetSRID(ST_GeomFromGeoJSON(r->>'latest_position'),4326) END,(r->>'geo_status')::text,(r->>'geo_reason')::text,NULLIF(r->'ellipse','null'::jsonb),(r->>'coordinate_config_id')::uuid,NULLIF(r->'appearance','null'::jsonb),NULLIF(r->'judgement','null'::jsonb),NULLIF(r->'tracking','null'::jsonb),(r->>'latest_observation_id')::uuid,coalesce((r->>'row_version')::bigint,0)) RETURNING to_jsonb(person_candidate.*) INTO v;
 RETURN v; END $$;

CREATE FUNCTION drone.backend_add_detection_observation(r jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,drone,public,pg_temp AS $$
DECLARE v jsonb; BEGIN
 PERFORM pg_advisory_xact_lock(20261005,1);
 INSERT INTO drone.detection_observation (observation_id,candidate_id,frame_id,analysis_mode,detection_index,track_id,bbox,confidence,class_name,observation_kind,model_config_id,coordinate_config_id,association_evidence,geo_result,historical,supersedes_id) VALUES ((r->>'observation_id')::uuid,(r->>'candidate_id')::uuid,(r->>'frame_id')::uuid,(r->>'analysis_mode')::varchar(255),(r->>'detection_index')::integer,(r->>'track_id')::text,coalesce(r->'bbox','{}'::jsonb),(r->>'confidence')::double precision,(r->>'class_name')::text,(r->>'observation_kind')::text,(r->>'model_config_id')::uuid,(r->>'coordinate_config_id')::uuid,coalesce(r->'association_evidence','{}'::jsonb),coalesce(r->'geo_result','{}'::jsonb),(r->>'historical')::boolean,(r->>'supersedes_id')::uuid) RETURNING to_jsonb(detection_observation.*) INTO v;
 RETURN v; END $$;

CREATE FUNCTION drone.backend_add_search_plan(r jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,drone,public,pg_temp AS $$
DECLARE v jsonb; BEGIN
 PERFORM pg_advisory_xact_lock(20261005,1);
 INSERT INTO drone.search_plan (plan_id,mission_id,mission_revision,plan_version,plan_kind,parent_plan_id,supersedes_plan_id,region_id,input_versions,objective_mode,visit_order,task,candidates,route,status,generated_at,expires_at,summary,decision_log) VALUES ((r->>'plan_id')::uuid,(r->>'mission_id')::uuid,(r->>'mission_revision')::integer,(r->>'plan_version')::integer,(r->>'plan_kind')::text,(r->>'parent_plan_id')::uuid,(r->>'supersedes_plan_id')::uuid,(r->>'region_id')::uuid,coalesce(r->'input_versions','{}'::jsonb),(r->>'objective_mode')::text,coalesce(r->'visit_order','[]'::jsonb),coalesce(r->'task','{}'::jsonb),coalesce(r->'candidates','[]'::jsonb),coalesce(r->'route','{}'::jsonb),(r->>'status')::text,coalesce((r->>'generated_at')::timestamptz,CURRENT_TIMESTAMP),(r->>'expires_at')::timestamptz,coalesce(r->'summary','{}'::jsonb),coalesce(r->'decision_log','{}'::jsonb)) RETURNING to_jsonb(search_plan.*) INTO v;
 RETURN v; END $$;

CREATE FUNCTION drone.backend_add_search_region(r jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,drone,public,pg_temp AS $$
DECLARE v jsonb; BEGIN
 PERFORM pg_advisory_xact_lock(20261005,1);
 INSERT INTO drone.search_region (region_id,mission_id,mission_revision,grid_version,region_type,source_features,region_geom,representative_point,total_area_m2,remaining_area_m2,state,pass_index,service_estimate_s,reason,row_version) VALUES ((r->>'region_id')::uuid,(r->>'mission_id')::uuid,(r->>'mission_revision')::integer,(r->>'grid_version')::text,(r->>'region_type')::text,coalesce(r->'source_features','{}'::jsonb),ST_Multi(CASE WHEN r->>'region_geom' IS NOT NULL THEN ST_SetSRID(ST_GeomFromGeoJSON(r->>'region_geom'),4326) END),CASE WHEN r->>'representative_point' IS NOT NULL THEN ST_SetSRID(ST_GeomFromGeoJSON(r->>'representative_point'),4326) END,(r->>'total_area_m2')::double precision,(r->>'remaining_area_m2')::double precision,(r->>'state')::text,coalesce((r->>'pass_index')::integer,0),(r->>'service_estimate_s')::double precision,(r->>'reason')::text,coalesce((r->>'row_version')::bigint,0)) RETURNING to_jsonb(search_region.*) INTO v;
 RETURN v; END $$;

CREATE FUNCTION drone.backend_add_observation_cell(r jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,drone,public,pg_temp AS $$
DECLARE v jsonb; BEGIN
 PERFORM pg_advisory_xact_lock(20261005,1);
 INSERT INTO drone.observation_cell (mission_id,grid_version,cell_id,region_id,region_allocations,spatial_config_id,cell_geom,cell_area_m2,state,valid_union_geom,valid_area_m2,valid_count,valid_group_count,valid_duration_s,last_valid_at,excluded_reasons,priority,belief,belief_detail,row_version) VALUES ((r->>'mission_id')::uuid,(r->>'grid_version')::varchar(255),(r->>'cell_id')::varchar(255),(r->>'region_id')::uuid,coalesce(r->'region_allocations','[]'::jsonb),(r->>'spatial_config_id')::uuid,ST_Multi(CASE WHEN r->>'cell_geom' IS NOT NULL THEN ST_SetSRID(ST_GeomFromGeoJSON(r->>'cell_geom'),4326) END),(r->>'cell_area_m2')::double precision,(r->>'state')::text,ST_Multi(CASE WHEN r->>'valid_union_geom' IS NOT NULL THEN ST_SetSRID(ST_GeomFromGeoJSON(r->>'valid_union_geom'),4326) END),coalesce((r->>'valid_area_m2')::double precision,0),coalesce((r->>'valid_count')::integer,0),coalesce((r->>'valid_group_count')::integer,0),coalesce((r->>'valid_duration_s')::double precision,0),(r->>'last_valid_at')::timestamptz,coalesce(r->'excluded_reasons','[]'::jsonb),(r->>'priority')::double precision,(r->>'belief')::double precision,coalesce(r->'belief_detail','{}'::jsonb),coalesce((r->>'row_version')::bigint,0)) RETURNING to_jsonb(observation_cell.*) INTO v;
 RETURN v; END $$;

CREATE FUNCTION drone.backend_session_create(r jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,drone,public,pg_temp AS $$
DECLARE v jsonb; BEGIN
 PERFORM pg_advisory_xact_lock(20261005,1);
 
 IF NOT EXISTS(SELECT 1 FROM drone.user_account WHERE user_id=(r->>'user_id')::uuid AND status='ACTIVE') THEN RAISE EXCEPTION 'inactive user' USING ERRCODE='23514'; END IF;
 INSERT INTO drone.user_session(session_id,user_id,token_digest,issued_at,expires_at)
 VALUES((r->>'session_id')::uuid,(r->>'user_id')::uuid,r->>'token_digest',(r->>'issued_at')::timestamptz,(r->>'expires_at')::timestamptz) RETURNING to_jsonb(user_session.*) INTO v;

 RETURN v; END $$;

CREATE FUNCTION drone.backend_session_revoke(r jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,drone,public,pg_temp AS $$
DECLARE v jsonb; BEGIN
 PERFORM pg_advisory_xact_lock(20261005,1);
 
 UPDATE drone.user_session SET revoked_at=CURRENT_TIMESTAMP WHERE session_id=(r->>'session_id')::uuid AND user_id=(r->>'user_id')::uuid RETURNING to_jsonb(user_session.*) INTO v;
 UPDATE drone.drone SET control_user_id=NULL,control_session_id=NULL,control_acquired_at=NULL,control_expires_at=NULL,control_revision=control_revision+1 WHERE control_session_id=(r->>'session_id')::uuid;

 RETURN v; END $$;

CREATE FUNCTION drone.backend_control(r jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,drone,public,pg_temp AS $$
DECLARE v jsonb; BEGIN
 PERFORM pg_advisory_xact_lock(20261005,1);
 
 IF NOT EXISTS(SELECT 1 FROM drone.user_session s JOIN drone.user_account u USING(user_id) WHERE session_id=(r->>'session_id')::uuid AND s.user_id=(r->>'user_id')::uuid AND revoked_at IS NULL AND expires_at>now() AND u.status='ACTIVE') THEN RAISE EXCEPTION 'inactive session' USING ERRCODE='23514'; END IF;
 UPDATE drone.drone SET control_revision=control_revision+1,
 control_user_id=CASE WHEN (r->>'release')::boolean THEN NULL ELSE (r->>'user_id')::uuid END,
 control_session_id=CASE WHEN (r->>'release')::boolean THEN NULL ELSE (r->>'session_id')::uuid END,
 control_acquired_at=CASE WHEN (r->>'release')::boolean THEN NULL ELSE CURRENT_TIMESTAMP END,
 control_expires_at=CASE WHEN (r->>'release')::boolean THEN NULL ELSE (r->>'expires_at')::timestamptz END
 WHERE drone_id=r->>'drone_id' AND control_revision=(r->>'expected_revision')::bigint
 RETURNING to_jsonb(drone.*) INTO v;
 IF v IS NULL THEN RAISE EXCEPTION 'control revision conflict' USING ERRCODE='23514'; END IF;

 RETURN v; END $$;

CREATE FUNCTION drone.backend_device_state(r jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,drone,public,pg_temp AS $$
DECLARE v jsonb; BEGIN
 PERFORM pg_advisory_xact_lock(20261005,1);
 
 IF r#>>'{gateway_state,environment}' IS DISTINCT FROM 'SIM' THEN RAISE EXCEPTION 'REAL input disabled' USING ERRCODE='23514'; END IF;
 UPDATE drone.drone SET gateway_state=r->'gateway_state',control_epoch=(r->>'control_epoch')::bigint,updated_at=CURRENT_TIMESTAMP
 WHERE drone_id=r->>'drone_id' AND control_epoch<=(r->>'control_epoch')::bigint RETURNING to_jsonb(drone.*) INTO v;
 IF v IS NULL THEN RAISE EXCEPTION 'old epoch' USING ERRCODE='23514'; END IF;

 RETURN v; END $$;

CREATE FUNCTION drone.backend_mission_state(r jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,drone,public,pg_temp AS $$
DECLARE v jsonb; BEGIN
 PERFORM pg_advisory_xact_lock(20261005,1);
 
 IF r->>'mode'='draft' THEN
 UPDATE drone.mission SET draft_revision=(r->>'draft_revision')::integer WHERE mission_id=(r->>'mission_id')::uuid RETURNING to_jsonb(mission.*) INTO v;
 ELSIF r->>'mode'='approve' THEN
 IF NOT EXISTS(SELECT 1 FROM drone.mission WHERE mission_id=(r->>'mission_id')::uuid AND draft_revision=(r->>'revision')::integer AND test_conditions->>'environment'='SIM') THEN RAISE EXCEPTION 'invalid SIM revision' USING ERRCODE='23514'; END IF;
 UPDATE drone.mission_revision SET approved_at=CURRENT_TIMESTAMP,
 area_denominators=jsonb_build_object('total_m2',ST_Area(area_geom::geography),'observable_m2',ST_Area(area_geom::geography),'environment','SIM')
 WHERE mission_id=(r->>'mission_id')::uuid AND revision=(r->>'revision')::integer AND approved_at IS NULL;
 UPDATE drone.mission SET active_revision=(r->>'revision')::integer,approved_by=(r->>'actor')::uuid,
 approved_at=CURRENT_TIMESTAMP,grant_status='GRANTED',state='READY',readiness='{"environment":"SIM","model_loaded":false,"flight_enabled":false}'
 WHERE mission_id=(r->>'mission_id')::uuid RETURNING to_jsonb(mission.*) INTO v;
 ELSE RAISE EXCEPTION 'unknown mission action' USING ERRCODE='23514'; END IF;

 RETURN v; END $$;

CREATE FUNCTION drone.backend_asset_store(r jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,drone,public,pg_temp AS $$
DECLARE v jsonb; BEGIN
 PERFORM pg_advisory_xact_lock(20261005,1);
 
 SELECT to_jsonb(a.*) INTO v FROM drone.media_asset a WHERE asset_id=(r->>'asset_id')::uuid FOR UPDATE;
 IF v->>'state'='STORED' THEN RETURN v; END IF;
 IF v IS NULL OR v->>'state'<>'WRITING' THEN RAISE EXCEPTION 'invalid asset state' USING ERRCODE='23514'; END IF;
 UPDATE drone.media_asset SET state='STORED',meta=r->'meta' WHERE asset_id=(r->>'asset_id')::uuid RETURNING to_jsonb(media_asset.*) INTO v;

 RETURN v; END $$;

CREATE FUNCTION drone.backend_candidate_judgement(r jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,drone,public,pg_temp AS $$
DECLARE v jsonb; BEGIN
 PERFORM pg_advisory_xact_lock(20261005,1);
 
 UPDATE drone.person_candidate SET judgement=NULLIF(r->'judgement','null'::jsonb),row_version=row_version+1
 WHERE candidate_id=(r->>'candidate_id')::uuid AND row_version=(r->>'expected')::bigint RETURNING to_jsonb(person_candidate.*) INTO v;
 IF v IS NULL THEN RAISE EXCEPTION 'candidate revision conflict' USING ERRCODE='23514'; END IF;

 RETURN v; END $$;

CREATE FUNCTION drone.backend_alert_ack(r jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,drone,public,pg_temp AS $$
DECLARE v jsonb; BEGIN
 PERFORM pg_advisory_xact_lock(20261005,1);
 
 UPDATE drone.alert SET ack_user_id=(r->>'user_id')::uuid,acknowledged_at=CURRENT_TIMESTAMP
 WHERE alert_id=(r->>'alert_id')::uuid AND acknowledged_at IS NULL RETURNING to_jsonb(alert.*) INTO v;
 IF v IS NULL THEN SELECT to_jsonb(a.*) INTO v FROM drone.alert a WHERE alert_id=(r->>'alert_id')::uuid; END IF;

 RETURN v; END $$;

CREATE FUNCTION drone.backend_command_report(r jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,drone,public,pg_temp AS $$
DECLARE v jsonb; BEGIN
 PERFORM pg_advisory_xact_lock(20261005,1);
 
 UPDATE drone.flight_command SET state=r->>'state',status_revision=(r->>'status_revision')::integer,last_evidence_at=(r->>'evidence_at')::timestamptz
 WHERE command_id=(r->>'command_id')::uuid AND status_revision<(r->>'status_revision')::integer RETURNING to_jsonb(flight_command.*) INTO v;
 IF v IS NULL THEN RAISE EXCEPTION 'old status revision' USING ERRCODE='23514'; END IF;

 RETURN v; END $$;

CREATE FUNCTION drone.backend_frame_selection(r jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,drone,public,pg_temp AS $$
DECLARE v jsonb; BEGIN
 PERFORM pg_advisory_xact_lock(20261005,1);
 
 UPDATE drone.video_frame SET analysis_state='COMPLETED',analysis_mode=r->>'mode',model_config_id=(r->>'model_config_id')::uuid,
 pipeline_version=r->>'pipeline_version',analysis_times=r->'selection',task_quality_status='SIM_ONLY'
 WHERE frame_id=(r->>'frame_id')::uuid AND coalesce((analysis_times->>'selected_analysis_revision')::integer,0)<(r#>>'{selection,selected_analysis_revision}')::integer
 RETURNING to_jsonb(video_frame.*) INTO v;

 RETURN v; END $$;

CREATE FUNCTION drone.backend_candidate_summary(r jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,drone,public,pg_temp AS $$
DECLARE v jsonb; BEGIN
 PERFORM pg_advisory_xact_lock(20261005,1);
 
 UPDATE drone.person_candidate SET latest_observation_id=(r->>'latest_observation_id')::uuid,evidence_count=(r->>'evidence_count')::integer,
 last_seen=(r->>'last_seen')::timestamptz,first_seen=LEAST(first_seen,(r->>'last_seen')::timestamptz),geo_status=r->>'geo_status',geo_reason=r->>'geo_reason',
 latest_position=CASE WHEN r->>'position' IS NOT NULL THEN ST_SetSRID(ST_GeomFromGeoJSON(r->>'position'),4326) END,
 ellipse=NULLIF(r->'ellipse','null'::jsonb),coordinate_config_id=(r->>'coordinate_config_id')::uuid,row_version=row_version+1
 WHERE candidate_id=(r->>'candidate_id')::uuid RETURNING to_jsonb(person_candidate.*) INTO v;

 RETURN v; END $$;

CREATE FUNCTION drone.backend_event(r jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,drone,public,pg_temp AS $$
DECLARE v jsonb; BEGIN
 PERFORM pg_advisory_xact_lock(20261005,1);
 
 IF r->>'event_type' NOT IN ('SESSION_CREATED','SESSION_REVOKED','CONTROL_ACQUIRED','CONTROL_RELEASED','MISSION_CREATED','MISSION_EDITED','MISSION_APPROVED','CANDIDATE_JUDGED','REOBSERVATION_REQUESTED','ALERT_ACKNOWLEDGED','DEVICE_CONNECTED','TELEMETRY_RECEIVED','COMMAND_REQUESTED','COMMAND_REPORTED','SAFETY_REPORTED','BUNDLE_RESERVED','ASSET_STORED','BUNDLE_PERSISTED','FRAME_RECEIVED','REGION_REGISTERED','PLAN_REGISTERED','CELL_REGISTERED','ANALYSIS_STARTED','ANALYSIS_ATTEMPT_STARTED','ANALYSIS_ATTEMPT_FAILED','ANALYSIS_COMPLETED','ANALYSIS_FAILED') THEN RAISE EXCEPTION 'unsupported business event' USING ERRCODE='23514'; END IF;
 IF r->>'event_type' LIKE 'ANALYSIS_%' AND r#>>'{payload,environment}' IS DISTINCT FROM 'SIM' THEN RAISE EXCEPTION 'REAL analysis disabled' USING ERRCODE='23514'; END IF;
 INSERT INTO drone.mission_event(event_id,event_seq,mission_id,drone_id,event_type,code,actor_user_id,payload,refs,producer_id,producer_session_id,sequence,publish_state)
 VALUES((r->>'event_id')::uuid,1,(r->>'mission_id')::uuid,r->>'drone_id',r->>'event_type',r->>'code',(r->>'actor_user_id')::uuid,r->'payload','[]',
 'business-backend','business-v1',(r->>'sequence')::bigint,'PENDING') RETURNING to_jsonb(mission_event.*) INTO v;

 RETURN v; END $$;

CREATE FUNCTION drone.backend_schema_versions() RETURNS TABLE(version text) LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,drone,pg_temp AS $$ SELECT version FROM drone.schema_migration ORDER BY version $$; REVOKE ALL ON FUNCTION drone.backend_schema_versions() FROM PUBLIC; GRANT EXECUTE ON FUNCTION drone.backend_schema_versions() TO drone_api;

REVOKE ALL ON FUNCTION drone.backend_add_mission(jsonb) FROM PUBLIC; GRANT EXECUTE ON FUNCTION drone.backend_add_mission(jsonb) TO drone_api;

REVOKE ALL ON FUNCTION drone.backend_add_mission_revision(jsonb) FROM PUBLIC; GRANT EXECUTE ON FUNCTION drone.backend_add_mission_revision(jsonb) TO drone_api;

REVOKE ALL ON FUNCTION drone.backend_add_telemetry_sample(jsonb) FROM PUBLIC; GRANT EXECUTE ON FUNCTION drone.backend_add_telemetry_sample(jsonb) TO drone_api;

REVOKE ALL ON FUNCTION drone.backend_add_video_frame(jsonb) FROM PUBLIC; GRANT EXECUTE ON FUNCTION drone.backend_add_video_frame(jsonb) TO drone_api;

REVOKE ALL ON FUNCTION drone.backend_add_media_asset(jsonb) FROM PUBLIC; GRANT EXECUTE ON FUNCTION drone.backend_add_media_asset(jsonb) TO drone_api;

REVOKE ALL ON FUNCTION drone.backend_add_flight_command(jsonb) FROM PUBLIC; GRANT EXECUTE ON FUNCTION drone.backend_add_flight_command(jsonb) TO drone_api;

REVOKE ALL ON FUNCTION drone.backend_add_reobservation_request(jsonb) FROM PUBLIC; GRANT EXECUTE ON FUNCTION drone.backend_add_reobservation_request(jsonb) TO drone_api;

REVOKE ALL ON FUNCTION drone.backend_add_person_candidate(jsonb) FROM PUBLIC; GRANT EXECUTE ON FUNCTION drone.backend_add_person_candidate(jsonb) TO drone_api;

REVOKE ALL ON FUNCTION drone.backend_add_detection_observation(jsonb) FROM PUBLIC; GRANT EXECUTE ON FUNCTION drone.backend_add_detection_observation(jsonb) TO drone_api;

REVOKE ALL ON FUNCTION drone.backend_add_search_plan(jsonb) FROM PUBLIC; GRANT EXECUTE ON FUNCTION drone.backend_add_search_plan(jsonb) TO drone_api;

REVOKE ALL ON FUNCTION drone.backend_add_search_region(jsonb) FROM PUBLIC; GRANT EXECUTE ON FUNCTION drone.backend_add_search_region(jsonb) TO drone_api;

REVOKE ALL ON FUNCTION drone.backend_add_observation_cell(jsonb) FROM PUBLIC; GRANT EXECUTE ON FUNCTION drone.backend_add_observation_cell(jsonb) TO drone_api;

REVOKE ALL ON FUNCTION drone.backend_session_create(jsonb) FROM PUBLIC; GRANT EXECUTE ON FUNCTION drone.backend_session_create(jsonb) TO drone_api;

REVOKE ALL ON FUNCTION drone.backend_session_revoke(jsonb) FROM PUBLIC; GRANT EXECUTE ON FUNCTION drone.backend_session_revoke(jsonb) TO drone_api;

REVOKE ALL ON FUNCTION drone.backend_control(jsonb) FROM PUBLIC; GRANT EXECUTE ON FUNCTION drone.backend_control(jsonb) TO drone_api;

REVOKE ALL ON FUNCTION drone.backend_device_state(jsonb) FROM PUBLIC; GRANT EXECUTE ON FUNCTION drone.backend_device_state(jsonb) TO drone_api;

REVOKE ALL ON FUNCTION drone.backend_mission_state(jsonb) FROM PUBLIC; GRANT EXECUTE ON FUNCTION drone.backend_mission_state(jsonb) TO drone_api;

REVOKE ALL ON FUNCTION drone.backend_asset_store(jsonb) FROM PUBLIC; GRANT EXECUTE ON FUNCTION drone.backend_asset_store(jsonb) TO drone_api;

REVOKE ALL ON FUNCTION drone.backend_candidate_judgement(jsonb) FROM PUBLIC; GRANT EXECUTE ON FUNCTION drone.backend_candidate_judgement(jsonb) TO drone_api;

REVOKE ALL ON FUNCTION drone.backend_alert_ack(jsonb) FROM PUBLIC; GRANT EXECUTE ON FUNCTION drone.backend_alert_ack(jsonb) TO drone_api;

REVOKE ALL ON FUNCTION drone.backend_command_report(jsonb) FROM PUBLIC; GRANT EXECUTE ON FUNCTION drone.backend_command_report(jsonb) TO drone_api;

REVOKE ALL ON FUNCTION drone.backend_frame_selection(jsonb) FROM PUBLIC; GRANT EXECUTE ON FUNCTION drone.backend_frame_selection(jsonb) TO drone_api;

REVOKE ALL ON FUNCTION drone.backend_candidate_summary(jsonb) FROM PUBLIC; GRANT EXECUTE ON FUNCTION drone.backend_candidate_summary(jsonb) TO drone_api;

REVOKE ALL ON FUNCTION drone.backend_event(jsonb) FROM PUBLIC; GRANT EXECUTE ON FUNCTION drone.backend_event(jsonb) TO drone_api;

CREATE FUNCTION drone.backend_lock_mission(id uuid) RETURNS SETOF drone.mission LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,drone,pg_temp AS $$ SELECT * FROM drone.mission WHERE mission_id=id FOR UPDATE $$; REVOKE ALL ON FUNCTION drone.backend_lock_mission(uuid) FROM PUBLIC; GRANT EXECUTE ON FUNCTION drone.backend_lock_mission(uuid) TO drone_api;
CREATE FUNCTION drone.backend_lock_drone(id text) RETURNS SETOF drone.drone LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,drone,pg_temp AS $$ SELECT * FROM drone.drone WHERE drone_id=id FOR UPDATE $$; REVOKE ALL ON FUNCTION drone.backend_lock_drone(text) FROM PUBLIC; GRANT EXECUTE ON FUNCTION drone.backend_lock_drone(text) TO drone_api;
CREATE FUNCTION drone.backend_lock_video_frame(id uuid) RETURNS SETOF drone.video_frame LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,drone,pg_temp AS $$ SELECT * FROM drone.video_frame WHERE frame_id=id FOR UPDATE $$; REVOKE ALL ON FUNCTION drone.backend_lock_video_frame(uuid) FROM PUBLIC; GRANT EXECUTE ON FUNCTION drone.backend_lock_video_frame(uuid) TO drone_api;
CREATE FUNCTION drone.backend_lock_person_candidate(id uuid) RETURNS SETOF drone.person_candidate LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,drone,pg_temp AS $$ SELECT * FROM drone.person_candidate WHERE candidate_id=id FOR UPDATE $$; REVOKE ALL ON FUNCTION drone.backend_lock_person_candidate(uuid) FROM PUBLIC; GRANT EXECUTE ON FUNCTION drone.backend_lock_person_candidate(uuid) TO drone_api;
CREATE FUNCTION drone.backend_lock_flight_command(id uuid) RETURNS SETOF drone.flight_command LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,drone,pg_temp AS $$ SELECT * FROM drone.flight_command WHERE command_id=id FOR UPDATE $$; REVOKE ALL ON FUNCTION drone.backend_lock_flight_command(uuid) FROM PUBLIC; GRANT EXECUTE ON FUNCTION drone.backend_lock_flight_command(uuid) TO drone_api;
RESET ROLE;



