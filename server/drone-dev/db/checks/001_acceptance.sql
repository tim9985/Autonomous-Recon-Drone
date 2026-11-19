BEGIN;
SET LOCAL search_path=drone,public,pg_catalog;
SET CONSTRAINTS ALL IMMEDIATE;
CREATE FUNCTION pg_temp.expect_error(statement text, expected text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE=expected THEN RETURN; END IF;
    RAISE EXCEPTION 'expected %, got %: %',expected,SQLSTATE,SQLERRM;
  END;
  RAISE EXCEPTION 'invalid input accepted: %',statement;
END $$;

INSERT INTO drone.user_account VALUES ('00000000-0000-0000-0000-000000000001','test-operator','test-only-hash','[]','ACTIVE',CURRENT_TIMESTAMP);
SELECT pg_temp.expect_error($s$INSERT INTO drone.user_account VALUES ('00000000-0000-0000-0000-000000000002','test-operator','x','[]','ACTIVE',now())$s$,'23505');
INSERT INTO drone.user_session VALUES ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','test-only-digest',now(),now()+interval '1 hour',NULL);
SELECT pg_temp.expect_error($s$INSERT INTO drone.user_session VALUES ('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','test-only-digest-2',now(),now(),NULL)$s$,'23514');
INSERT INTO drone.drone(drone_id,name,gateway_state,link_state) VALUES ('schema-test-drone','schema test','{}','{}'),('schema-test-other','other','{}','{}');
SELECT pg_temp.expect_error($s$UPDATE drone.drone SET control_session_id='00000000-0000-0000-0000-000000000003' WHERE drone_id='schema-test-drone'$s$,'23514');
INSERT INTO drone.config_version(config_id,kind,version,schema_version,payload,content_hash,status)
 SELECT ('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,k,'test-1','1.3','{}',repeat('a',64),'DRAFT'
 FROM (VALUES(10,'COORDINATE'),(11,'MODEL'),(12,'SPATIAL'),(13,'POLICY')) x(n,k);
SELECT pg_temp.expect_error($s$UPDATE drone.drone SET camera_config_id='00000000-0000-0000-0000-000000000011' WHERE drone_id='schema-test-drone'$s$,'23514');
INSERT INTO drone.mission(mission_id,drone_id,creator_user_id,state,state_evidence,readiness,test_conditions,grant_status)
 VALUES ('00000000-0000-0000-0000-000000000020','schema-test-drone','00000000-0000-0000-0000-000000000001','DRAFT','{}','{}','{"environment":"SAMPLE"}','NOT_GRANTED');
INSERT INTO drone.mission_revision(mission_id,revision,priority_sources,conditions,planner_modes,grid_version)
 SELECT '00000000-0000-0000-0000-000000000020',n,'[]','{}','{}','test-grid-'||n FROM generate_series(1,2) n;
UPDATE drone.mission SET draft_revision=2 WHERE mission_id='00000000-0000-0000-0000-000000000020';
INSERT INTO drone.search_region(region_id,mission_id,mission_revision,grid_version,region_type,source_features,region_geom,representative_point,total_area_m2,remaining_area_m2,state)
 VALUES ('00000000-0000-0000-0000-000000000030','00000000-0000-0000-0000-000000000020',1,'test-grid-1','SAMPLE','{}',ST_GeomFromText('MULTIPOLYGON(((127 37,127.001 37,127.001 37.001,127 37.001,127 37)))',4326),ST_SetSRID(ST_MakePoint(127.0005,37.0005),4326),100,100,'UNOBSERVED');
SELECT pg_temp.expect_error($s$UPDATE drone.search_region SET remaining_area_m2=101 WHERE region_id='00000000-0000-0000-0000-000000000030'$s$,'23514');
SELECT pg_temp.expect_error($s$UPDATE drone.search_region SET region_geom=ST_GeomFromText('MULTIPOLYGON(((127 37,127.001 37.001,127.001 37,127 37.001,127 37)))',4326) WHERE region_id='00000000-0000-0000-0000-000000000030'$s$,'23514');
SELECT pg_temp.expect_error($s$UPDATE drone.search_region SET representative_point=ST_SetSRID(ST_MakePoint(181,37),4326) WHERE region_id='00000000-0000-0000-0000-000000000030'$s$,'23514');
INSERT INTO drone.search_plan(plan_id,mission_id,mission_revision,plan_version,plan_kind,region_id,input_versions,objective_mode,visit_order,task,candidates,route,status,summary,decision_log)
 VALUES ('00000000-0000-0000-0000-000000000031','00000000-0000-0000-0000-000000000020',1,1,'SAMPLE','00000000-0000-0000-0000-000000000030','{}','SAMPLE','[]','{}','[]','{}','DRAFT','{}','{}');
SELECT pg_temp.expect_error($s$INSERT INTO drone.search_plan SELECT '00000000-0000-0000-0000-000000000032',mission_id,2,2,plan_kind,NULL,NULL,region_id,input_versions,objective_mode,visit_order,task,candidates,route,status,generated_at,expires_at,summary,decision_log FROM drone.search_plan WHERE plan_id='00000000-0000-0000-0000-000000000031'$s$,'23503');
INSERT INTO drone.video_frame(frame_id,mission_id,drone_id,stream_id,stream_epoch,frame_seq,identity_scope,time_evidence,width,height,format,source_quality_status,metadata_state,pose_status,coverage,analysis_state,analysis_times,task_quality_status)
 VALUES ('00000000-0000-0000-0000-000000000040','00000000-0000-0000-0000-000000000020','schema-test-drone','test-stream',0,9223372036854775807,'test-session','{}',1920,1080,'RGB','UNKNOWN','PENDING','PENDING','{}','PENDING','{}','UNKNOWN');
SELECT pg_temp.expect_error($s$UPDATE drone.video_frame SET capture_time_verified=true WHERE frame_id='00000000-0000-0000-0000-000000000040'$s$,'23514');
SELECT pg_temp.expect_error($s$UPDATE drone.video_frame SET infer_ms='NaN'::float8 WHERE frame_id='00000000-0000-0000-0000-000000000040'$s$,'23514');
INSERT INTO drone.person_candidate(candidate_id,mission_id,first_frame_id,association_state,geo_status,geo_reason)
 VALUES ('00000000-0000-0000-0000-000000000050','00000000-0000-0000-0000-000000000020','00000000-0000-0000-0000-000000000040','PENDING','PENDING','no verified pose');
SELECT pg_temp.expect_error($s$UPDATE drone.person_candidate SET geo_status='VALID' WHERE candidate_id='00000000-0000-0000-0000-000000000050'$s$,'23514');

INSERT INTO drone.mission_event(event_id,event_seq,mission_id,drone_id,event_type,code,payload,refs,producer_id,producer_session_id,sequence,publish_state)
 VALUES ('00000000-0000-0000-0000-000000000060',1,'00000000-0000-0000-0000-000000000020','schema-test-drone','ANALYSIS_STARTED','SAMPLE',
 '{"analysis_run_id":"00000000-0000-0000-0000-000000000061","frame_id":"00000000-0000-0000-0000-000000000040","analysis_revision":1,"job_hash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","model_config_id":"00000000-0000-0000-0000-000000000011"}','[]','schema-test','test-session',1,'PENDING');
SELECT pg_temp.expect_error($s$INSERT INTO drone.mission_event SELECT '00000000-0000-0000-0000-000000000062',2,mission_id,drone_id,event_type,code,use_case_id,actor_user_id,ref_table,ref_id,source_time,stored_at,source_epoch,correlation_id,payload,refs,producer_id,producer_session_id,2,publish_state,published_at FROM drone.mission_event WHERE event_id='00000000-0000-0000-0000-000000000060'$s$,'23505');
INSERT INTO drone.detection_observation(observation_id,candidate_id,frame_id,analysis_mode,detection_index,bbox,confidence,class_name,observation_kind,model_config_id,association_evidence,geo_result,historical)
 VALUES ('00000000-0000-0000-0000-000000000070','00000000-0000-0000-0000-000000000050','00000000-0000-0000-0000-000000000040','LIVE_DETECT',0,
 '{"convention":"PIXEL_XYXY","source_width":1920,"source_height":1080,"x1":1,"y1":2,"x2":100,"y2":200}',0.9,'person','DETECTION','00000000-0000-0000-0000-000000000011',
 '{"analysis_run_id":"00000000-0000-0000-0000-000000000061","analysis_revision":1,"job_hash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}','{"status":"PENDING","reason":"no pose"}',false);
UPDATE drone.person_candidate SET latest_observation_id='00000000-0000-0000-0000-000000000070' WHERE candidate_id='00000000-0000-0000-0000-000000000050';
SELECT pg_temp.expect_error($s$UPDATE drone.detection_observation SET confidence=0.8 WHERE observation_id='00000000-0000-0000-0000-000000000070'$s$,'23514');
INSERT INTO drone.mission_event(event_id,event_seq,mission_id,drone_id,event_type,code,payload,refs,producer_id,producer_session_id,sequence,publish_state)
 VALUES ('00000000-0000-0000-0000-000000000080',2,'00000000-0000-0000-0000-000000000020','schema-test-drone','ANALYSIS_COMPLETED','SAMPLE',
 '{"analysis_run_id":"00000000-0000-0000-0000-000000000061","frame_id":"00000000-0000-0000-0000-000000000040","analysis_revision":1,"job_hash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","result_hash":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","detection_count":1}','[]','schema-test','test-session',3,'PENDING');
SELECT pg_temp.expect_error($s$INSERT INTO drone.mission_event SELECT '00000000-0000-0000-0000-000000000081',3,mission_id,drone_id,'ANALYSIS_FAILED',code,use_case_id,actor_user_id,ref_table,ref_id,source_time,stored_at,source_epoch,correlation_id,payload,refs,producer_id,producer_session_id,4,publish_state,published_at FROM drone.mission_event WHERE event_id='00000000-0000-0000-0000-000000000080'$s$,'23505');
SELECT pg_temp.expect_error($s$INSERT INTO drone.mission_event(event_id,event_seq,event_type,code,payload,refs,producer_id,producer_session_id,sequence,publish_state) VALUES ('00000000-0000-0000-0000-000000000082',3,'OBS_GROUP_APPLIED','SAMPLE','{}','[]','schema-test','test-session',5,'PENDING')$s$,'23514');
SELECT pg_temp.expect_error($s$UPDATE drone.mission_event SET code='changed' WHERE event_id='00000000-0000-0000-0000-000000000060'$s$,'23514');
INSERT INTO drone.media_asset(asset_id,asset_type,storage_uri,state,gaps,quality_status,historical,retention_class,meta)
 VALUES ('00000000-0000-0000-0000-000000000090','MODEL','models/test.onnx','WRITING','[]','UNKNOWN',false,'PROTECTED','{}');
SELECT pg_temp.expect_error($s$UPDATE drone.media_asset SET state='STORED' WHERE asset_id='00000000-0000-0000-0000-000000000090'$s$,'23514');
SELECT pg_temp.expect_error($s$UPDATE drone.media_asset SET storage_uri='../escape' WHERE asset_id='00000000-0000-0000-0000-000000000090'$s$,'23514');
SELECT pg_temp.expect_error($s$UPDATE drone.media_asset SET storage_uri='https://outside/file' WHERE asset_id='00000000-0000-0000-0000-000000000090'$s$,'23514');
SELECT pg_temp.expect_error($s$UPDATE drone.config_version SET parent_id=config_id WHERE config_id='00000000-0000-0000-0000-000000000010'$s$,'23514');
INSERT INTO drone.flight_command(command_id,request_hash,mission_id,mission_revision,plan_id,drone_id,control_epoch,sequence,issued_at,expires_at,schema_version,policy_version,coordinate_config_id,requester,action,payload,state,completion_policy)
 VALUES ('00000000-0000-0000-0000-000000000100',repeat('a',64),'00000000-0000-0000-0000-000000000020',1,'00000000-0000-0000-0000-000000000031','schema-test-drone',0,1,now(),now()+interval '1 minute','1.3','test-1','00000000-0000-0000-0000-000000000010','{}','HOLD','{}','REQUESTED','{}');
SELECT pg_temp.expect_error($s$INSERT INTO drone.flight_command SELECT '00000000-0000-0000-0000-000000000101',request_hash,mission_id,2,plan_id,segment_order,drone_id,control_epoch,2,issued_at,expires_at,schema_version,policy_version,coordinate_config_id,requester,action,payload,state,status_revision,reason_code,last_evidence_at,execution_deadline,completion_policy FROM drone.flight_command WHERE command_id='00000000-0000-0000-0000-000000000100'$s$,'23503');
SELECT pg_temp.expect_error($s$INSERT INTO drone.flight_command SELECT '00000000-0000-0000-0000-000000000102',request_hash,NULL,NULL,plan_id,segment_order,drone_id,control_epoch,2,issued_at,expires_at,schema_version,policy_version,coordinate_config_id,requester,action,payload,state,status_revision,reason_code,last_evidence_at,execution_deadline,completion_policy FROM drone.flight_command WHERE command_id='00000000-0000-0000-0000-000000000100'$s$,'23514');
SELECT pg_temp.expect_error($s$UPDATE drone.flight_command SET payload='{"changed":true}' WHERE command_id='00000000-0000-0000-0000-000000000100'$s$,'23514');
SET LOCAL ROLE drone_api;
SELECT count(*) FROM drone.mission;
SELECT pg_temp.expect_error('DELETE FROM drone.mission','42501');
SELECT pg_temp.expect_error('INSERT INTO drone.mission_event(event_id) VALUES (NULL)','42501');
SELECT pg_temp.expect_error('CREATE TABLE drone.forbidden(id int)','42501');
SELECT pg_temp.expect_error('SELECT * FROM drone.schema_migration','42501');
RESET ROLE;
SET LOCAL ROLE drone_reader;
SELECT count(*) FROM drone.user_account_safe;
SELECT pg_temp.expect_error('SELECT credential_hash FROM drone.user_account','42501');
SELECT pg_temp.expect_error('SELECT token_digest FROM drone.user_session','42501');
RESET ROLE;
SELECT 'PASS: structural, uniqueness, geometry, temporal, revision, JSON, ledger, immutability and permission checks';
ROLLBACK;

