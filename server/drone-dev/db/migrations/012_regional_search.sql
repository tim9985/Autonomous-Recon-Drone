-- Additive DEV-only planning jobs. Forecasts never update observation_cell.
DO $$ BEGIN
 IF current_database()<>'drone_dev' AND current_database() NOT LIKE 'regional_verify_%' THEN RAISE EXCEPTION 'DEV migration refused in this database'; END IF;
END $$;
SET LOCAL ROLE drone_schema_owner;
SET LOCAL search_path=pg_catalog,drone,public,pg_temp;

CREATE TABLE drone.regional_search_job (
 job_id uuid PRIMARY KEY,
 mission_id uuid NOT NULL,
 mission_revision integer NOT NULL,
 region_id uuid NOT NULL REFERENCES drone.search_region(region_id),
 creator_user_id uuid NOT NULL REFERENCES drone.user_account(user_id),
 request_hash text NOT NULL CHECK(request_hash ~ '^[0-9a-f]{64}$'),
 package_id text NOT NULL CHECK(package_id ~ '^[0-9a-f]{64}$'),
 request jsonb NOT NULL CHECK(jsonb_typeof(request)='object'),
 state text NOT NULL DEFAULT 'QUEUED' CHECK(state IN ('QUEUED','RUNNING','READY','INCOMPLETE','FAILED','INVALIDATED')),
 result_hash text CHECK(result_hash ~ '^[0-9a-f]{64}$'),
 plan_id uuid UNIQUE REFERENCES drone.search_plan(plan_id),
 result jsonb,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 finished_at timestamptz,
 FOREIGN KEY(mission_id,mission_revision) REFERENCES drone.mission_revision(mission_id,revision)
);
CREATE INDEX regional_search_pending ON drone.regional_search_job(created_at) WHERE state IN ('QUEUED','RUNNING');
REVOKE ALL ON drone.regional_search_job FROM PUBLIC;
GRANT SELECT ON drone.regional_search_job TO drone_api;

CREATE FUNCTION drone.regional_search_write(action_name text,p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,drone,public,pg_temp AS $$
DECLARE j drone.regional_search_job; rg drone.search_region; m drone.mission;
 seq integer; v_result jsonb; pid uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(20261005,1);
 PERFORM pg_advisory_xact_lock(20261022,12);
 SELECT * INTO j FROM drone.regional_search_job WHERE job_id=(p->>'job_id')::uuid FOR UPDATE;
 IF action_name='create' THEN
  IF FOUND THEN
   IF j.request_hash<>p->>'request_hash' OR j.mission_id<>(p->>'mission_id')::uuid THEN RAISE EXCEPTION 'ID_CONFLICT'; END IF;
   RETURN to_jsonb(j);
  END IF;
  SELECT * INTO rg FROM drone.search_region WHERE region_id=(p->>'region_id')::uuid;
  SELECT * INTO m FROM drone.mission WHERE mission_id=(p->>'mission_id')::uuid;
  IF rg.region_id IS NULL OR m.mission_id IS NULL OR rg.mission_id<>m.mission_id
    OR rg.mission_revision<>(p->>'mission_revision')::integer OR (m.test_conditions->>'environment') IS DISTINCT FROM 'SIM'
    OR rg.mission_revision<>m.draft_revision THEN RAISE EXCEPTION 'REVISION_CONFLICT'; END IF;
  INSERT INTO drone.regional_search_job(job_id,mission_id,mission_revision,region_id,creator_user_id,request_hash,package_id,request)
   VALUES((p->>'job_id')::uuid,m.mission_id,rg.mission_revision,rg.region_id,(p->>'creator_user_id')::uuid,p->>'request_hash',p->>'package_id',p->'request') RETURNING * INTO j;
 ELSIF action_name='finish' THEN
  IF j.job_id IS NULL THEN RAISE EXCEPTION 'RESOURCE_NOT_FOUND'; END IF;
  IF j.request_hash<>p->>'request_hash' THEN RAISE EXCEPTION 'ID_CONFLICT'; END IF;
  IF j.result_hash IS NOT NULL THEN
   IF j.result_hash<>p->>'result_hash' THEN RAISE EXCEPTION 'ID_CONFLICT'; END IF;
   RETURN to_jsonb(j);
  END IF;
  v_result=p->'result';
  IF (v_result->>'packageId') IS DISTINCT FROM j.package_id OR coalesce(v_result->>'state','') NOT IN ('READY','INCOMPLETE','FAILED')
    OR (v_result->>'predictedOnly') IS DISTINCT FROM 'true' OR (v_result->>'actualEvidenceWrites') IS DISTINCT FROM '0'
    OR (v_result->>'realExecutable') IS DISTINCT FROM 'false'
    OR (v_result->>'regionId') IS DISTINCT FROM (j.request->>'regionId') THEN RAISE EXCEPTION 'INVALID_RESULT'; END IF;
  SELECT * INTO m FROM drone.mission WHERE mission_id=j.mission_id FOR UPDATE;
  IF m.draft_revision<>j.mission_revision THEN
   UPDATE drone.regional_search_job SET state='INVALIDATED',result_hash=p->>'result_hash',result=v_result,finished_at=clock_timestamp() WHERE job_id=j.job_id RETURNING * INTO j;
   RETURN to_jsonb(j);
  END IF;
  IF v_result->>'state' IN ('READY','INCOMPLETE') THEN
   pid=(p->>'plan_id')::uuid;
   SELECT coalesce(max(plan_version),0)+1 INTO seq FROM drone.search_plan WHERE mission_id=j.mission_id;
   PERFORM drone.backend_add_search_plan(jsonb_build_object(
    'plan_id',pid,'mission_id',j.mission_id,'mission_revision',j.mission_revision,'plan_version',seq,
    'plan_kind','LOCAL','region_id',j.region_id,'input_versions',jsonb_build_object('environment','SIM','packageId',j.package_id,'jobId',j.job_id,'request_hash',j.request_hash),
    'objective_mode','COVERAGE','task',j.request,'route',coalesce(v_result->'execution','{}'::jsonb),'status','DRAFT',
    'summary',v_result-'execution'-'plan','decision_log',jsonb_build_object('real_executable',false,'predicted_only',true,'planner','research_fused+candidate/VIEW_TRACKING')));
  END IF;
  UPDATE drone.regional_search_job SET state=v_result->>'state',result_hash=p->>'result_hash',result=v_result,
    plan_id=pid,finished_at=clock_timestamp() WHERE job_id=j.job_id RETURNING * INTO j;
 ELSE RAISE EXCEPTION 'INVALID_ACTION';
 END IF;
 RETURN to_jsonb(j);
END $$;
REVOKE ALL ON FUNCTION drone.regional_search_write(text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION drone.regional_search_write(text,jsonb) TO drone_api;
