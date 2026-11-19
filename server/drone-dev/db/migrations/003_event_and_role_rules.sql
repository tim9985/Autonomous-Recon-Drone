SET LOCAL ROLE drone_schema_owner;
SET LOCAL search_path = drone, public, pg_catalog;

-- ponytail: one short global commit lock; change the cursor contract if measured contention requires per-mission locks.
CREATE FUNCTION drone.lock_writes() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(20261005,1);
  RETURN NEW;
END $$;

CREATE FUNCTION drone.validate_relationships() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE k text; v jsonb := to_jsonb(NEW); expected text; actual text;
        frame drone.video_frame; observation drone.detection_observation; started drone.mission_event;
        parent uuid; cycle_found boolean;
BEGIN
  -- Relationship identities remain fixed; corrections insert a new revision/result.
  IF TG_OP='UPDATE' THEN
    FOR k IN SELECT key FROM jsonb_each(v) LOOP
      IF (k = TG_ARGV[0] OR k IN ('mission_id','drone_id','mission_revision','revision','grid_version','kind'))
         AND v->k IS DISTINCT FROM to_jsonb(OLD)->k THEN
        RAISE EXCEPTION 'immutable relationship: %.%',TG_TABLE_NAME,k USING ERRCODE='23514';
      END IF;
    END LOOP;
  END IF;
  FOR k IN SELECT key FROM jsonb_each(v) WHERE key LIKE '%\_config\_id' ESCAPE '\' LOOP
    IF v->>k IS NOT NULL THEN
      expected := upper(split_part(k,'_',1));
      SELECT kind INTO actual FROM drone.config_version WHERE config_id=(v->>k)::uuid;
      IF actual IS DISTINCT FROM expected THEN
        RAISE EXCEPTION 'wrong config kind for %: expected %',k,expected USING ERRCODE='23514';
      END IF;
    END IF;
  END LOOP;
  IF TG_TABLE_NAME='person_candidate' THEN
    SELECT * INTO frame FROM drone.video_frame WHERE frame_id=NEW.first_frame_id;
    IF frame.mission_id IS DISTINCT FROM NEW.mission_id THEN
      RAISE EXCEPTION 'candidate/frame mission mismatch' USING ERRCODE='23514';
    END IF;
  ELSIF TG_TABLE_NAME='detection_observation' THEN
    SELECT * INTO frame FROM drone.video_frame WHERE frame_id=NEW.frame_id;
    IF frame.mission_id IS DISTINCT FROM (SELECT mission_id FROM drone.person_candidate WHERE candidate_id=NEW.candidate_id) THEN
      RAISE EXCEPTION 'observation/frame/candidate mission mismatch' USING ERRCODE='23514';
    END IF;
    IF NOT coalesce(NEW.bbox->>'convention'='PIXEL_XYXY'
        AND (NEW.bbox->>'source_width')::integer=frame.width
        AND (NEW.bbox->>'source_height')::integer=frame.height
        AND (NEW.bbox->>'x1')::float8>=0 AND (NEW.bbox->>'x1')::float8<(NEW.bbox->>'x2')::float8
        AND (NEW.bbox->>'x2')::float8<=frame.width
        AND (NEW.bbox->>'y1')::float8>=0 AND (NEW.bbox->>'y1')::float8<(NEW.bbox->>'y2')::float8
        AND (NEW.bbox->>'y2')::float8<=frame.height,false) THEN
      RAISE EXCEPTION 'invalid original-pixel bbox' USING ERRCODE='23514';
    END IF;
    SELECT * INTO started FROM drone.mission_event WHERE event_type='ANALYSIS_STARTED'
      AND payload->>'analysis_run_id'=NEW.association_evidence->>'analysis_run_id';
    IF started.event_id IS NULL OR started.mission_id IS DISTINCT FROM frame.mission_id
      OR started.payload->>'frame_id' IS DISTINCT FROM NEW.frame_id::text
      OR started.payload->>'analysis_revision' IS DISTINCT FROM NEW.association_evidence->>'analysis_revision'
      OR started.payload->>'job_hash' IS DISTINCT FROM NEW.association_evidence->>'job_hash'
      OR started.payload->>'model_config_id' IS DISTINCT FROM NEW.model_config_id::text THEN
      RAISE EXCEPTION 'observation does not match analysis ledger' USING ERRCODE='23514';
    END IF;
  ELSIF TG_TABLE_NAME='media_asset' THEN
    IF NEW.frame_id IS NOT NULL AND NEW.mission_id IS DISTINCT FROM (SELECT mission_id FROM drone.video_frame WHERE frame_id=NEW.frame_id) THEN
      RAISE EXCEPTION 'asset/frame mission mismatch' USING ERRCODE='23514';
    END IF;
    IF NEW.candidate_id IS NOT NULL AND NEW.mission_id IS DISTINCT FROM (SELECT mission_id FROM drone.person_candidate WHERE candidate_id=NEW.candidate_id) THEN
      RAISE EXCEPTION 'asset/candidate mission mismatch' USING ERRCODE='23514';
    END IF;
    IF NEW.observation_id IS NOT NULL THEN
      SELECT * INTO observation FROM drone.detection_observation WHERE observation_id=NEW.observation_id;
      IF NEW.mission_id IS DISTINCT FROM (SELECT mission_id FROM drone.video_frame WHERE frame_id=observation.frame_id)
        OR (NEW.frame_id IS NOT NULL AND NEW.frame_id<>observation.frame_id)
        OR (NEW.candidate_id IS NOT NULL AND NEW.candidate_id<>observation.candidate_id) THEN
        RAISE EXCEPTION 'asset/observation mismatch' USING ERRCODE='23514';
      END IF;
    END IF;
  END IF;
  -- Recursive self references are limited to this fixed table/column allowlist.
  FOR k IN SELECT key FROM jsonb_each(v) WHERE key IN ('parent_id','parent_plan_id','supersedes_plan_id','source_asset_id','supersedes_id') LOOP
    parent := (v->>k)::uuid;
    IF parent IS NOT NULL THEN
      EXECUTE format('WITH RECURSIVE chain(id,path) AS (
        SELECT %I, ARRAY[%I] FROM drone.%I WHERE %I=$1
        UNION ALL SELECT t.%I,c.path||t.%I FROM drone.%I t JOIN chain c ON t.%I=c.id WHERE NOT t.%I=ANY(c.path))
        SELECT EXISTS(SELECT 1 FROM chain WHERE id=$2)',k,k,TG_TABLE_NAME,TG_ARGV[0],k,k,TG_TABLE_NAME,TG_ARGV[0],k)
        INTO cycle_found USING parent,(v->>TG_ARGV[0])::uuid;
      IF cycle_found THEN RAISE EXCEPTION 'cyclic %',k USING ERRCODE='23514'; END IF;
      IF TG_TABLE_NAME='config_version' AND (SELECT kind FROM drone.config_version WHERE config_id=parent) IS DISTINCT FROM v->>'kind' THEN
        RAISE EXCEPTION 'parent configuration kind mismatch' USING ERRCODE='23514';
      END IF;
    END IF;
  END LOOP;
  RETURN NEW;
END $$;

CREATE FUNCTION drone.immutable_record() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME='mission_revision' AND to_jsonb(OLD)->>'approved_at' IS NULL THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME='config_version' AND to_jsonb(OLD)->>'status' NOT IN ('APPROVED','RETIRED') THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME='config_version' AND (to_jsonb(NEW)-'status')=(to_jsonb(OLD)-'status') AND to_jsonb(NEW)->>'status'='RETIRED' THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME='flight_command' AND
    (to_jsonb(NEW)-ARRAY['state','status_revision','reason_code','last_evidence_at','execution_deadline']) =
    (to_jsonb(OLD)-ARRAY['state','status_revision','reason_code','last_evidence_at','execution_deadline']) THEN
    IF NEW.status_revision <= OLD.status_revision THEN
      RAISE EXCEPTION 'command status revision must increase' USING ERRCODE='23514';
    END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'immutable % history',TG_TABLE_NAME USING ERRCODE='23514';
END $$;

CREATE FUNCTION drone.event_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE frame drone.video_frame; started drone.mission_event;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'event history is immutable' USING ERRCODE='23514'; END IF;
  PERFORM pg_advisory_xact_lock(20261005,1);
  IF TG_OP='UPDATE' THEN
    IF (to_jsonb(NEW)-ARRAY['publish_state','published_at']) IS DISTINCT FROM
       (to_jsonb(OLD)-ARRAY['publish_state','published_at'])
       OR OLD.publish_state='PUBLISHED' THEN
      RAISE EXCEPTION 'event contents/publication are immutable' USING ERRCODE='23514';
    END IF;
    RETURN NEW;
  END IF;
  SELECT coalesce(max(event_seq),0)+1 INTO NEW.event_seq FROM drone.mission_event;
  IF NEW.event_type LIKE 'ANALYSIS\_%' ESCAPE '\' THEN
    SELECT * INTO frame FROM drone.video_frame WHERE frame_id=(NEW.payload->>'frame_id')::uuid;
    IF frame.frame_id IS NULL OR frame.mission_id IS DISTINCT FROM NEW.mission_id
      OR frame.drone_id IS DISTINCT FROM NEW.drone_id THEN
      RAISE EXCEPTION 'analysis frame/mission/drone mismatch' USING ERRCODE='23514';
    END IF;
    IF NEW.event_type='ANALYSIS_STARTED' THEN
      IF NEW.payload->>'model_config_id' IS NULL OR NOT EXISTS(
        SELECT 1 FROM drone.config_version WHERE config_id=(NEW.payload->>'model_config_id')::uuid AND kind='MODEL') THEN
        RAISE EXCEPTION 'analysis model reference is required' USING ERRCODE='23514';
      END IF;
    ELSE
      SELECT * INTO started FROM drone.mission_event WHERE event_type='ANALYSIS_STARTED'
        AND payload->>'analysis_run_id'=NEW.payload->>'analysis_run_id';
      IF started.event_id IS NULL OR started.mission_id IS DISTINCT FROM NEW.mission_id
        OR started.payload->>'frame_id' IS DISTINCT FROM NEW.payload->>'frame_id'
        OR started.payload->>'analysis_revision' IS DISTINCT FROM NEW.payload->>'analysis_revision'
        OR started.payload->>'job_hash' IS DISTINCT FROM NEW.payload->>'job_hash' THEN
        RAISE EXCEPTION 'analysis result does not match started ledger' USING ERRCODE='23514';
      END IF;
      IF NEW.event_type IN ('ANALYSIS_ATTEMPT_STARTED','ANALYSIS_ATTEMPT_FAILED') AND EXISTS(
        SELECT 1 FROM drone.mission_event WHERE event_type IN ('ANALYSIS_COMPLETED','ANALYSIS_FAILED')
        AND payload->>'analysis_run_id'=NEW.payload->>'analysis_run_id') THEN
        RAISE EXCEPTION 'analysis is already terminal' USING ERRCODE='23514';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE t text; idcol text;
BEGIN
  FOR t,idcol IN SELECT table_name,column_name FROM information_schema.columns
      WHERE table_schema='drone' AND ordinal_position=1 AND table_name NOT IN ('schema_migration','mission_event') LOOP
    EXECUTE format('CREATE TRIGGER a_commit_lock BEFORE INSERT OR UPDATE ON drone.%I FOR EACH ROW EXECUTE FUNCTION drone.lock_writes()',t);
    EXECUTE format('CREATE TRIGGER b_relationships BEFORE INSERT OR UPDATE ON drone.%I FOR EACH ROW EXECUTE FUNCTION drone.validate_relationships(%L)',t,idcol);
  END LOOP;
END $$;
CREATE TRIGGER event_rules BEFORE INSERT OR UPDATE OR DELETE ON drone.mission_event FOR EACH ROW EXECUTE FUNCTION drone.event_guard();
CREATE TRIGGER immutable_revision BEFORE UPDATE ON drone.mission_revision FOR EACH ROW EXECUTE FUNCTION drone.immutable_record();
CREATE TRIGGER immutable_config BEFORE UPDATE ON drone.config_version FOR EACH ROW EXECUTE FUNCTION drone.immutable_record();
CREATE TRIGGER immutable_observation BEFORE UPDATE ON drone.detection_observation FOR EACH ROW EXECUTE FUNCTION drone.immutable_record();
CREATE TRIGGER immutable_command BEFORE UPDATE ON drone.flight_command FOR EACH ROW EXECUTE FUNCTION drone.immutable_record();

CREATE FUNCTION drone.record_event(envelope jsonb) RETURNS drone.mission_event
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,drone,pg_temp AS $$
DECLARE e drone.mission_event; previous drone.mission_event;
BEGIN
  PERFORM pg_advisory_xact_lock(20261005,1);
  e := jsonb_populate_record(NULL::drone.mission_event,envelope);
  IF e.event_type LIKE 'ANALYSIS\_%' ESCAPE '\' OR e.event_type='OBS_GROUP_APPLIED' THEN
    RAISE EXCEPTION 'analysis/aggregate API not implemented; generic event writes are denied' USING ERRCODE='42501';
  END IF;
  e.event_seq:=1; e.stored_at:=CURRENT_TIMESTAMP; e.publish_state:='PENDING'; e.published_at:=NULL;
  SELECT * INTO previous FROM drone.mission_event WHERE event_id=e.event_id;
  IF previous.event_id IS NOT NULL THEN
    IF (to_jsonb(previous)-ARRAY['event_seq','stored_at','publish_state','published_at']) IS DISTINCT FROM
       (to_jsonb(e)-ARRAY['event_seq','stored_at','publish_state','published_at']) THEN
      RAISE EXCEPTION 'ID_CONFLICT' USING ERRCODE='23514';
    END IF;
    RETURN previous;
  END IF;
  INSERT INTO drone.mission_event SELECT e.* RETURNING * INTO e;
  RETURN e;
END $$;

CREATE FUNCTION drone.mark_event_published(id uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,drone,pg_temp AS $$
  UPDATE drone.mission_event SET publish_state='PUBLISHED',published_at=CURRENT_TIMESTAMP
    WHERE event_id=id AND publish_state='PENDING';
$$;

REVOKE ALL ON SCHEMA drone FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA drone FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA drone FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA drone REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA drone REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
GRANT USAGE ON SCHEMA drone TO drone_api,drone_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA drone TO drone_api;
REVOKE ALL ON drone.schema_migration FROM drone_api;
-- Business mutators stay disabled until service transactions and input contracts are implemented.
GRANT EXECUTE ON FUNCTION drone.record_event(jsonb),drone.mark_event_published(uuid) TO drone_api;
CREATE VIEW drone.user_account_safe AS SELECT user_id,login_id,permissions,status,created_at FROM drone.user_account;
CREATE VIEW drone.user_session_safe AS SELECT session_id,user_id,issued_at,expires_at,revoked_at FROM drone.user_session;
GRANT SELECT ON drone.user_account_safe,drone.user_session_safe TO drone_reader;
-- JSON payloads can contain sensitive evidence, so the reader has no broad table grants.
RESET ROLE;
