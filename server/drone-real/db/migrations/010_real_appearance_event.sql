-- Search-condition metadata only; this grants no mission state or flight mutation.
DO $$ BEGIN
 IF current_database()<>'drone_real' AND current_database() NOT LIKE 'real_verify_%' THEN
  RAISE EXCEPTION 'REAL migration cannot modify the development database';
 END IF;
END $$;
SET LOCAL ROLE drone_schema_owner;
CREATE OR REPLACE FUNCTION drone.backend_event(r jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,drone,public,pg_temp AS $$
DECLARE v jsonb; BEGIN
 PERFORM pg_advisory_xact_lock(20261005,1);
 IF r->>'event_type' NOT IN ('SESSION_CREATED','SESSION_REVOKED','CONTROL_RELEASED','MISSION_CREATED','MISSION_EDITED','CANDIDATE_JUDGED','REOBSERVATION_REQUESTED','ALERT_ACKNOWLEDGED','DEVICE_CONNECTED','TELEMETRY_RECEIVED','COMMAND_EVIDENCE_RECORDED','BUNDLE_RESERVED','ASSET_STORED','BUNDLE_PERSISTED','BUNDLE_CANCELLED','FRAME_RECEIVED','ANALYSIS_STARTED','ANALYSIS_COMPLETED','ANALYSIS_FAILED') THEN RAISE EXCEPTION 'unsupported REAL storage event' USING ERRCODE='23514'; END IF;
 IF r->>'event_type'='MISSION_EDITED' AND (r#>>'{payload,kind}' IS DISTINCT FROM 'APPEARANCE_QUERY' OR jsonb_typeof(r#>'{payload,query}') IS DISTINCT FROM 'object' OR r->>'actor_user_id' IS NULL OR NOT EXISTS(SELECT 1 FROM drone.mission WHERE mission_id=(r->>'mission_id')::uuid AND test_conditions->>'environment'='REAL')) THEN
  RAISE EXCEPTION 'only REAL appearance metadata edits allowed' USING ERRCODE='23514';
 END IF;
 IF r->>'event_type' LIKE 'ANALYSIS_%' AND r#>>'{payload,environment}' IS DISTINCT FROM 'REAL' THEN RAISE EXCEPTION 'REAL analysis required' USING ERRCODE='23514'; END IF;
 INSERT INTO drone.mission_event(event_id,event_seq,mission_id,drone_id,event_type,code,actor_user_id,payload,refs,producer_id,producer_session_id,sequence,publish_state)
 VALUES((r->>'event_id')::uuid,1,(r->>'mission_id')::uuid,r->>'drone_id',r->>'event_type',r->>'code',(r->>'actor_user_id')::uuid,r->'payload','[]',
 'business-backend','business-v1',(r->>'sequence')::bigint,'PENDING') RETURNING to_jsonb(mission_event.*) INTO v;
 RETURN v;
END $$;
RESET ROLE;
