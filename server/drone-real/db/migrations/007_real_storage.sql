-- Apply only to a new REAL database or its disposable verification database.
DO $$ BEGIN
 IF current_database()<>'drone_real' AND current_database() NOT LIKE 'real_verify_%' THEN
  RAISE EXCEPTION 'REAL migration cannot modify the existing development database';
 END IF;
END $$;
SET LOCAL ROLE drone_schema_owner;
SET LOCAL search_path=pg_catalog,drone,public,pg_temp;

CREATE TABLE drone.ingest_receipt (
 message_id uuid PRIMARY KEY,
 producer_id text NOT NULL,
 producer_session_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('VISION_RESULT','COMMAND_OBSERVATION')),
 sequence bigint NOT NULL CHECK(sequence>=0),
 mission_id uuid NOT NULL REFERENCES drone.mission(mission_id),
 content_hash text NOT NULL CHECK(content_hash ~ '^[0-9a-f]{64}$'),
 body jsonb NOT NULL CHECK(jsonb_typeof(body)='object'),
 received_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(producer_id,producer_session_id,kind,sequence)
);
CREATE TRIGGER receipt_immutable BEFORE UPDATE OR DELETE ON drone.ingest_receipt
 FOR EACH ROW EXECUTE FUNCTION drone.immutable_record();
REVOKE ALL ON drone.ingest_receipt FROM PUBLIC;
GRANT SELECT ON drone.ingest_receipt TO drone_api;

CREATE FUNCTION drone.real_store(action text,r jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,drone,public,pg_temp AS $$
DECLARE v jsonb; BEGIN
 PERFORM pg_advisory_xact_lock(20261005,1);
 IF action='mission' THEN
  IF r->>'environment' IS DISTINCT FROM 'REAL' THEN RAISE EXCEPTION 'REAL input required' USING ERRCODE='23514'; END IF;
  INSERT INTO drone.mission(mission_id,drone_id,creator_user_id,state,state_evidence,readiness,test_conditions,grant_status)
  VALUES((r->>'mission_id')::uuid,r->>'drone_id',(r->>'creator_user_id')::uuid,'DRAFT','{}',
   '{"flight_enabled":false,"storage_only":true}','{"environment":"REAL"}','DENIED') RETURNING to_jsonb(mission.*) INTO v;
 ELSIF action='session' THEN
  UPDATE drone.drone SET gateway_state=jsonb_build_object('environment','REAL','session_id',r->>'session_id','rc_taken',true,'flight_enabled',false),
   control_epoch=(r->>'control_epoch')::bigint,updated_at=CURRENT_TIMESTAMP
  WHERE drone_id=r->>'drone_id' AND control_epoch<(r->>'control_epoch')::bigint RETURNING to_jsonb(drone.*) INTO v;
  IF v IS NULL THEN RAISE EXCEPTION 'old session epoch' USING ERRCODE='23514'; END IF;
 ELSIF action='model' THEN
  INSERT INTO drone.config_version(config_id,kind,version,schema_version,payload,content_hash,status,validation_report)
  VALUES((r->>'config_id')::uuid,'MODEL',r->>'version','model-provenance/1.0',r->'payload',r->>'content_hash','DRAFT','{"artifact_loaded":false,"provenance_only":true}') RETURNING to_jsonb(config_version.*) INTO v;
 ELSIF action='receipt' THEN
  IF NOT EXISTS(SELECT 1 FROM drone.mission WHERE mission_id=(r->>'mission_id')::uuid AND test_conditions->>'environment'='REAL') THEN RAISE EXCEPTION 'REAL mission required' USING ERRCODE='23514'; END IF;
  INSERT INTO drone.ingest_receipt(message_id,producer_id,producer_session_id,kind,sequence,mission_id,content_hash,body)
  VALUES((r->>'message_id')::uuid,r->>'producer_id',(r->>'producer_session_id')::uuid,r->>'kind',(r->>'sequence')::bigint,(r->>'mission_id')::uuid,r->>'content_hash',r->'body') RETURNING to_jsonb(ingest_receipt.*) INTO v;
 ELSIF action='frame' THEN
  UPDATE drone.video_frame SET analysis_state=r->>'state',model_config_id=(r->>'model_config_id')::uuid,
   pipeline_version=r->>'pipeline_version',analysis_times=r->'selection',skip_reason=r->>'reason',task_quality_status='REAL_STRUCTURAL_ONLY'
   WHERE frame_id=(r->>'frame_id')::uuid AND analysis_state='UNASSIGNED' RETURNING to_jsonb(video_frame.*) INTO v;
  IF v IS NULL THEN RAISE EXCEPTION 'frame already analyzed' USING ERRCODE='23514'; END IF;
 ELSIF action='candidate' THEN
  UPDATE drone.person_candidate SET tracking=r->'tracking',appearance=r->'appearance',association_state='OBSERVED_UNVERIFIED',
   latest_observation_id=(r->>'observation_id')::uuid,last_seen=(r->>'observed_at')::timestamptz,
   evidence_count=(SELECT count(*) FROM drone.detection_observation WHERE candidate_id=(r->>'candidate_id')::uuid AND observation_kind='DETECT'),
   row_version=row_version+1
   WHERE candidate_id=(r->>'candidate_id')::uuid RETURNING to_jsonb(person_candidate.*) INTO v;
 ELSE RAISE EXCEPTION 'unsupported REAL storage action' USING ERRCODE='23514'; END IF;
 RETURN v;
END $$;
REVOKE ALL ON FUNCTION drone.real_store(text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION drone.real_store(text,jsonb) TO drone_api;

CREATE OR REPLACE FUNCTION drone.backend_event(r jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,drone,public,pg_temp AS $$
DECLARE v jsonb; BEGIN
 PERFORM pg_advisory_xact_lock(20261005,1);
 IF r->>'event_type' NOT IN ('SESSION_CREATED','SESSION_REVOKED','CONTROL_RELEASED','MISSION_CREATED','CANDIDATE_JUDGED','REOBSERVATION_REQUESTED','ALERT_ACKNOWLEDGED','DEVICE_CONNECTED','TELEMETRY_RECEIVED','COMMAND_EVIDENCE_RECORDED','BUNDLE_RESERVED','ASSET_STORED','BUNDLE_PERSISTED','BUNDLE_CANCELLED','FRAME_RECEIVED','ANALYSIS_STARTED','ANALYSIS_COMPLETED','ANALYSIS_FAILED') THEN RAISE EXCEPTION 'unsupported REAL storage event' USING ERRCODE='23514'; END IF;
 IF r->>'event_type' LIKE 'ANALYSIS_%' AND r#>>'{payload,environment}' IS DISTINCT FROM 'REAL' THEN RAISE EXCEPTION 'REAL analysis required' USING ERRCODE='23514'; END IF;
 INSERT INTO drone.mission_event(event_id,event_seq,mission_id,drone_id,event_type,code,actor_user_id,payload,refs,producer_id,producer_session_id,sequence,publish_state)
 VALUES((r->>'event_id')::uuid,1,(r->>'mission_id')::uuid,r->>'drone_id',r->>'event_type',r->>'code',(r->>'actor_user_id')::uuid,r->'payload','[]',
 'business-backend','business-v1',(r->>'sequence')::bigint,'PENDING') RETURNING to_jsonb(mission_event.*) INTO v;
 RETURN v;
END $$;
-- The REAL intake account cannot create/dispatch flight commands or grant control.
REVOKE EXECUTE ON FUNCTION drone.backend_add_mission(jsonb),drone.backend_device_state(jsonb),
 drone.backend_add_flight_command(jsonb),drone.backend_command_report(jsonb),drone.backend_control(jsonb),
 drone.backend_mission_state(jsonb),drone.backend_frame_selection(jsonb),drone.backend_candidate_summary(jsonb),
 drone.record_event(jsonb) FROM drone_api;
RESET ROLE;
