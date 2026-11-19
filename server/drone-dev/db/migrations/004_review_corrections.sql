-- Forward-only corrections for the 2026-10-05 reproduced review findings.
SET LOCAL ROLE drone_schema_owner;
SET LOCAL search_path=pg_catalog,drone,public,pg_temp;
SELECT pg_advisory_xact_lock(20261005,1);

CREATE OR REPLACE FUNCTION drone.mark_event_published(id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,drone,pg_temp AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(20261005,1);
  UPDATE drone.mission_event SET publish_state='PUBLISHED',published_at=CURRENT_TIMESTAMP
    WHERE event_id=id AND publish_state='PENDING';
END $$;

-- Acquire before row locks, once per statement. Independent identity/ingest writes
-- do not need the event commit lock. Transactions that also emit events must acquire it first.
DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='drone' AND tablename NOT IN ('schema_migration','mission_event') LOOP
    EXECUTE format('DROP TRIGGER a_commit_lock ON drone.%I',t);
    IF t NOT IN ('user_account','user_session','drone','telemetry_sample','video_frame') THEN
      EXECUTE format('CREATE TRIGGER a_commit_lock BEFORE INSERT OR UPDATE OR DELETE ON drone.%I FOR EACH STATEMENT EXECUTE FUNCTION drone.lock_writes()',t);
    END IF;
  END LOOP;
END $$;
CREATE TRIGGER a_commit_lock BEFORE INSERT OR UPDATE OR DELETE ON drone.mission_event
  FOR EACH STATEMENT EXECUTE FUNCTION drone.lock_writes();

ALTER TABLE drone.video_frame ADD CONSTRAINT frame_plan_requires_mission
  CHECK (plan_id IS NULL OR mission_id IS NOT NULL);

CREATE FUNCTION drone.check_alert_mission() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,drone,pg_temp AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM drone.alert a JOIN drone.mission_event e ON e.event_id=a.source_event_id
    WHERE a.alert_id=NEW.alert_id AND a.mission_id IS DISTINCT FROM e.mission_id) THEN
    RAISE EXCEPTION 'alert/source event mission mismatch' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER alert_mission_consistency AFTER INSERT OR UPDATE ON drone.alert
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION drone.check_alert_mission();
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM drone.alert a JOIN drone.mission_event e ON e.event_id=a.source_event_id
    WHERE a.mission_id IS DISTINCT FROM e.mission_id) THEN
    RAISE EXCEPTION 'existing alerts have mismatched missions; manual correction required';
  END IF;
END $$;

CREATE FUNCTION drone.protect_stored_asset() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,drone,pg_temp AS $$
BEGIN
  IF OLD.state='STORED' AND
    (to_jsonb(NEW)-ARRAY['retention_class','retained_until','gaps','quality_status']) IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['retention_class','retained_until','gaps','quality_status']) THEN
    RAISE EXCEPTION 'stored asset identity is immutable; register a new asset' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER stored_asset_identity BEFORE UPDATE ON drone.media_asset
  FOR EACH ROW EXECUTE FUNCTION drone.protect_stored_asset();

-- Geo JSON v1: non-valid positions are absent/null with a reason. Valid positions
-- carry WGS84 numeric coordinates, coordinate config, error ellipse and quality evidence.
CREATE FUNCTION drone.valid_geo_result(g jsonb, coordinate_id uuid) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog,drone,pg_temp AS $$
DECLARE major float8; minor float8; azimuth float8;
BEGIN
  IF jsonb_typeof(g)<>'object' OR g->>'status' IS NULL THEN RETURN false; END IF;
  IF g->>'status' IN ('PENDING','INVALID') THEN
    RETURN coalesce(jsonb_typeof(g->'reason')='string' AND btrim(g->>'reason')<>''
      AND g->>'lon' IS NULL AND g->>'lat' IS NULL,false);
  END IF;
  IF g->>'status'<>'VALID' THEN RETURN false; END IF;
  IF NOT coalesce(coordinate_id IS NOT NULL
    AND jsonb_typeof(g->'lon')='number' AND (g->>'lon')::float8 BETWEEN -180 AND 180
    AND jsonb_typeof(g->'lat')='number' AND (g->>'lat')::float8 BETWEEN -90 AND 90
    AND g->>'time_quality'='VALID' AND g->>'pose_quality'='VALID'
    AND jsonb_typeof(g->'error_ellipse')='object'
    AND jsonb_typeof(g#>'{error_ellipse,major_m}')='number'
    AND jsonb_typeof(g#>'{error_ellipse,minor_m}')='number'
    AND jsonb_typeof(g#>'{error_ellipse,azimuth_deg}')='number',false) THEN RETURN false; END IF;
  major := (g#>>'{error_ellipse,major_m}')::float8;
  minor := (g#>>'{error_ellipse,minor_m}')::float8;
  azimuth := (g#>>'{error_ellipse,azimuth_deg}')::float8;
  RETURN major >= minor AND minor >= 0 AND major < 'Infinity'::float8 AND azimuth >= 0 AND azimuth < 360;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN RETURN false;
END $$;
ALTER TABLE drone.detection_observation ADD CONSTRAINT valid_geo_contract
  CHECK (drone.valid_geo_result(geo_result,coordinate_config_id));

CREATE FUNCTION drone.protect_analysis_result() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,drone,pg_temp AS $$
DECLARE run_id text; n bigint;
BEGIN
  IF TG_TABLE_NAME='detection_observation' THEN
    IF TG_OP='DELETE' THEN run_id := OLD.association_evidence->>'analysis_run_id';
    ELSE run_id := NEW.association_evidence->>'analysis_run_id'; END IF;
    IF EXISTS(SELECT 1 FROM drone.mission_event WHERE event_type IN ('ANALYSIS_COMPLETED','ANALYSIS_FAILED')
        AND payload->>'analysis_run_id'=run_id) THEN
      RAISE EXCEPTION 'terminal analysis result set is immutable; use a new analysis revision' USING ERRCODE='23514';
    END IF;
  ELSIF NEW.event_type IN ('ANALYSIS_COMPLETED','ANALYSIS_FAILED') THEN
    run_id := NEW.payload->>'analysis_run_id';
    -- Preserve the existing UNIQUE error for duplicate/conflicting terminal events.
    IF EXISTS(SELECT 1 FROM drone.mission_event WHERE event_type IN ('ANALYSIS_COMPLETED','ANALYSIS_FAILED')
      AND payload->>'analysis_run_id'=run_id) THEN RETURN NEW; END IF;
    SELECT count(*) INTO n FROM drone.detection_observation WHERE association_evidence->>'analysis_run_id'=run_id;
    IF (NEW.event_type='ANALYSIS_COMPLETED' AND n IS DISTINCT FROM
        CASE WHEN NEW.payload->>'detection_count' ~ '^(0|[1-9][0-9]*)$'
          THEN (NEW.payload->>'detection_count')::numeric END)
      OR (NEW.event_type='ANALYSIS_FAILED' AND n<>0) THEN
      RAISE EXCEPTION 'terminal analysis count does not match stored observations' USING ERRCODE='23514';
    END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER z_analysis_result BEFORE INSERT OR DELETE ON drone.detection_observation
  FOR EACH ROW EXECUTE FUNCTION drone.protect_analysis_result();
CREATE TRIGGER z_analysis_result BEFORE INSERT ON drone.mission_event
  FOR EACH ROW EXECUTE FUNCTION drone.protect_analysis_result();

DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM drone.mission_event e WHERE
    (e.event_type='ANALYSIS_COMPLETED' AND (e.payload->>'detection_count')::numeric IS DISTINCT FROM
      (SELECT count(*) FROM drone.detection_observation d WHERE d.association_evidence->>'analysis_run_id'=e.payload->>'analysis_run_id'))
    OR (e.event_type='ANALYSIS_FAILED' AND EXISTS(SELECT 1 FROM drone.detection_observation d
      WHERE d.association_evidence->>'analysis_run_id'=e.payload->>'analysis_run_id'))) THEN
    RAISE EXCEPTION 'existing analysis results violate terminal count; manual correction required';
  END IF;
END $$;

-- Draft grids may be completed/edited; approved revisions remain protected by immutable_revision.
CREATE OR REPLACE FUNCTION drone.validate_relationships() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE k text; v jsonb := to_jsonb(NEW); expected text; actual text;
        frame drone.video_frame; observation drone.detection_observation; started drone.mission_event;
        parent uuid; cycle_found boolean;
BEGIN
  -- Relationship identities remain fixed; corrections insert a new revision/result.
  IF TG_OP='UPDATE' THEN
    FOR k IN SELECT key FROM jsonb_each(v) LOOP
      IF (k = TG_ARGV[0] OR k IN ('mission_id','drone_id','mission_revision','revision','kind')
         OR (k='grid_version' AND TG_TABLE_NAME<>'mission_revision'))
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


REVOKE ALL ON FUNCTION drone.check_alert_mission(),drone.protect_stored_asset(),
  drone.valid_geo_result(jsonb,uuid),drone.protect_analysis_result() FROM PUBLIC;
RESET ROLE;
