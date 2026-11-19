SET LOCAL ROLE drone_schema_owner;
SET LOCAL search_path=pg_catalog,drone,public,pg_temp;

CREATE FUNCTION drone.invalidate_user_control() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,drone,public,pg_temp AS $$
DECLARE d record; n bigint; BEGIN
 IF NEW.permissions IS DISTINCT FROM OLD.permissions OR NEW.status IS DISTINCT FROM OLD.status THEN
  PERFORM pg_advisory_xact_lock(20261005,1);
  FOR d IN UPDATE drone.drone SET control_user_id=NULL,control_session_id=NULL,
    control_acquired_at=NULL,control_expires_at=NULL,control_revision=control_revision+1
    WHERE control_user_id=OLD.user_id RETURNING drone_id LOOP
   SELECT coalesce(max(sequence),0)+1 INTO n FROM drone.mission_event WHERE producer_id='business-backend';
   PERFORM drone.backend_event(jsonb_build_object('event_id',gen_random_uuid(),'drone_id',d.drone_id,
    'event_type','CONTROL_RELEASED','code','CONTROL_RELEASED','actor_user_id',OLD.user_id,
    'payload',jsonb_build_object('reason','ACCOUNT_AUTHORIZATION_CHANGED'),'sequence',n));
  END LOOP;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION drone.invalidate_user_control() FROM PUBLIC;
CREATE TRIGGER invalidate_user_control BEFORE UPDATE OF permissions,status ON drone.user_account
 FOR EACH ROW EXECUTE FUNCTION drone.invalidate_user_control();

CREATE FUNCTION drone.backend_asset_cancel(r jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,drone,public,pg_temp AS $$
DECLARE v jsonb; BEGIN
 PERFORM pg_advisory_xact_lock(20261005,1);
 SELECT to_jsonb(a.*) INTO v FROM drone.media_asset a WHERE asset_id=(r->>'asset_id')::uuid FOR UPDATE;
 IF v IS NULL OR v->>'asset_type'<>'SEGMENT_BUNDLE' THEN RAISE EXCEPTION 'invalid bundle' USING ERRCODE='23514'; END IF;
 IF v->>'state'='STORED' THEN RAISE EXCEPTION 'stored bundle is protected' USING ERRCODE='23514'; END IF;
 IF v->>'state'='FAILED' THEN RETURN v; END IF;
 UPDATE drone.media_asset SET state='FAILED',meta=meta||jsonb_build_object('cancelled_at',CURRENT_TIMESTAMP,'persistence_status','CANCELLED','cleanup_pending',true)
 WHERE state='WRITING' AND (asset_id=(r->>'asset_id')::uuid OR meta->>'bundle_id'=r->>'asset_id');
 SELECT to_jsonb(a.*) INTO v FROM drone.media_asset a WHERE asset_id=(r->>'asset_id')::uuid;
 RETURN v;
END $$;
REVOKE ALL ON FUNCTION drone.backend_asset_cancel(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION drone.backend_asset_cancel(jsonb) TO drone_api;

CREATE FUNCTION drone.backend_asset_reclaim(r jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,drone,public,pg_temp AS $$
DECLARE v jsonb; BEGIN
 PERFORM pg_advisory_xact_lock(20261005,1);
 UPDATE drone.media_asset SET meta=meta||jsonb_build_object('cleanup_pending',false,'cleanup_completed_at',CURRENT_TIMESTAMP)
 WHERE asset_id=(r->>'asset_id')::uuid AND state='FAILED' AND meta->>'cleanup_pending'='true'
 RETURNING to_jsonb(media_asset.*) INTO v;
 IF v IS NULL THEN RAISE EXCEPTION 'invalid reclaim target' USING ERRCODE='23514'; END IF;
 RETURN v;
END $$;
REVOKE ALL ON FUNCTION drone.backend_asset_reclaim(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION drone.backend_asset_reclaim(jsonb) TO drone_api;

CREATE OR REPLACE FUNCTION drone.backend_event(r jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,drone,public,pg_temp AS $$
DECLARE v jsonb; BEGIN
 PERFORM pg_advisory_xact_lock(20261005,1);
 IF r->>'event_type' NOT IN ('SESSION_CREATED','SESSION_REVOKED','CONTROL_ACQUIRED','CONTROL_RELEASED','MISSION_CREATED','MISSION_EDITED','MISSION_APPROVED','CANDIDATE_JUDGED','REOBSERVATION_REQUESTED','ALERT_ACKNOWLEDGED','DEVICE_CONNECTED','TELEMETRY_RECEIVED','COMMAND_REQUESTED','COMMAND_REPORTED','COMMAND_EVIDENCE_RECORDED','SAFETY_REPORTED','BUNDLE_RESERVED','ASSET_STORED','BUNDLE_PERSISTED','BUNDLE_CANCELLED','FRAME_RECEIVED','REGION_REGISTERED','PLAN_REGISTERED','CELL_REGISTERED','ANALYSIS_STARTED','ANALYSIS_ATTEMPT_STARTED','ANALYSIS_ATTEMPT_FAILED','ANALYSIS_COMPLETED','ANALYSIS_FAILED') THEN RAISE EXCEPTION 'unsupported business event' USING ERRCODE='23514'; END IF;
 IF r->>'event_type' LIKE 'ANALYSIS_%' AND r#>>'{payload,environment}' IS DISTINCT FROM 'SIM' THEN RAISE EXCEPTION 'REAL analysis disabled' USING ERRCODE='23514'; END IF;
 INSERT INTO drone.mission_event(event_id,event_seq,mission_id,drone_id,event_type,code,actor_user_id,payload,refs,producer_id,producer_session_id,sequence,publish_state)
 VALUES((r->>'event_id')::uuid,1,(r->>'mission_id')::uuid,r->>'drone_id',r->>'event_type',r->>'code',(r->>'actor_user_id')::uuid,r->'payload','[]',
 'business-backend','business-v1',(r->>'sequence')::bigint,'PENDING') RETURNING to_jsonb(mission_event.*) INTO v;
 RETURN v;
END $$;
RESET ROLE;
