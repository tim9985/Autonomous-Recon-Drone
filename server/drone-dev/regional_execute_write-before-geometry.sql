CREATE OR REPLACE FUNCTION drone.regional_execute_write(action_name text, p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'drone', 'public', 'pg_temp'
AS $function$
DECLARE x drone.regional_execution; j drone.regional_search_job; w drone.regional_executor;
 m drone.mission; r drone.mission_revision; old drone.regional_capture; v jsonb; e jsonb; total float8; cid text;
BEGIN
 PERFORM pg_advisory_xact_lock(20261005,1);
 PERFORM pg_advisory_xact_lock(20261022,13);
 IF action_name='heartbeat' THEN
  IF EXISTS(SELECT 1 FROM drone.regional_execution WHERE worker_id=p->>'worker_id'
    AND worker_session<>(p->>'session_id')::uuid AND state IN ('RUNNING','STOP_REQUESTED','UNCONFIRMED')) THEN RAISE EXCEPTION 'EXECUTOR_BUSY'; END IF;
  INSERT INTO drone.regional_executor VALUES(p->>'worker_id',(p->>'session_id')::uuid,clock_timestamp(),p->>'package_id',p->>'adapter_hash',p->>'world_version',p->'capabilities',(p->>'ready')::boolean,p->'diagnostics')
  ON CONFLICT(worker_id) DO UPDATE SET session_id=excluded.session_id,seen_at=excluded.seen_at,package_id=excluded.package_id,
   adapter_hash=excluded.adapter_hash,world_version=excluded.world_version,capabilities=excluded.capabilities,ready=excluded.ready,diagnostics=excluded.diagnostics RETURNING * INTO w;
  RETURN to_jsonb(w);
 END IF;
 SELECT * INTO x FROM drone.regional_execution WHERE execution_id=(p->>'execution_id')::uuid FOR UPDATE;
 IF action_name='start' THEN
  IF FOUND THEN
   IF x.request_hash IS DISTINCT FROM p->>'request_hash' THEN RAISE EXCEPTION 'ID_CONFLICT'; END IF;
   RETURN to_jsonb(x);
  END IF;
  SELECT * INTO j FROM drone.regional_search_job WHERE job_id=(p->>'job_id')::uuid;
  SELECT * INTO m FROM drone.mission WHERE mission_id=j.mission_id;
  SELECT * INTO w FROM drone.regional_executor WHERE worker_id=p->>'worker_id';
  IF j.state IS DISTINCT FROM 'READY' OR m.draft_revision IS DISTINCT FROM j.mission_revision
    OR m.test_conditions->>'environment' IS DISTINCT FROM 'SIM' THEN RAISE EXCEPTION 'PLAN_NOT_CURRENT'; END IF;
  IF w.worker_id IS NULL OR NOT w.ready OR w.seen_at<clock_timestamp()-interval '4 seconds'
    OR w.package_id IS DISTINCT FROM j.package_id OR w.adapter_hash IS DISTINCT FROM j.request->>'adapterHash'
    OR w.world_version IS DISTINCT FROM j.result->>'worldVersion' THEN RAISE EXCEPTION 'SIM_EXECUTOR_NOT_READY'; END IF;
  INSERT INTO drone.regional_execution(execution_id,job_id,worker_id,worker_session,creator_user_id,request_hash,state,expires_at)
   VALUES((p->>'execution_id')::uuid,j.job_id,w.worker_id,w.session_id,(p->>'creator_user_id')::uuid,p->>'request_hash','QUEUED',clock_timestamp()+interval '90 seconds') RETURNING * INTO x;
  RETURN to_jsonb(x);
 END IF;
 IF x.execution_id IS NULL THEN RAISE EXCEPTION 'RESOURCE_NOT_FOUND'; END IF;
 SELECT * INTO j FROM drone.regional_search_job WHERE job_id=x.job_id;
 IF action_name IN ('claim','progress','frames','finish') AND
   (x.worker_id IS DISTINCT FROM p->>'worker_id' OR x.worker_session IS DISTINCT FROM (p->>'worker_session')::uuid) THEN RAISE EXCEPTION 'OLD_WORKER_SESSION'; END IF;
 IF action_name='claim' THEN
  SELECT * INTO m FROM drone.mission WHERE mission_id=j.mission_id;
  IF m.draft_revision<>j.mission_revision THEN RAISE EXCEPTION 'REVISION_CONFLICT'; END IF;
  IF x.state='RUNNING' AND x.lease_until>clock_timestamp() THEN RETURN to_jsonb(x); END IF;
  IF x.state<>'QUEUED' OR x.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'RUN_EXPIRED'; END IF;
  UPDATE drone.regional_execution SET state='RUNNING',expires_at=clock_timestamp()+interval '45 minutes',lease_until=clock_timestamp()+interval '8 seconds' WHERE execution_id=x.execution_id RETURNING * INTO x;
 ELSIF action_name='progress' THEN
  IF x.state NOT IN ('RUNNING','STOP_REQUESTED') OR x.lease_until<clock_timestamp() OR x.expires_at<clock_timestamp() THEN RAISE EXCEPTION 'RUN_EXPIRED'; END IF;
  UPDATE drone.regional_execution SET lease_until=clock_timestamp()+interval '8 seconds',status=p->'status' WHERE execution_id=x.execution_id RETURNING * INTO x;
 ELSIF action_name='stop' THEN
  UPDATE drone.regional_execution SET state=CASE WHEN state='QUEUED' THEN 'CANCELLED' WHEN state='RUNNING' THEN 'STOP_REQUESTED' ELSE state END WHERE execution_id=x.execution_id RETURNING * INTO x;
 ELSIF action_name='expire' THEN
  UPDATE drone.regional_execution SET state=CASE WHEN state='QUEUED' THEN 'CANCELLED' ELSE 'UNCONFIRMED' END WHERE execution_id=x.execution_id
   AND ((state='QUEUED' AND expires_at<clock_timestamp()) OR (state IN ('RUNNING','STOP_REQUESTED') AND lease_until<clock_timestamp())) RETURNING * INTO x;
  SELECT * INTO x FROM drone.regional_execution WHERE execution_id=(p->>'execution_id')::uuid;
 ELSIF action_name='frames' THEN
  IF x.state NOT IN ('RUNNING','STOP_REQUESTED') OR x.lease_until<clock_timestamp() OR x.expires_at<clock_timestamp() THEN RAISE EXCEPTION 'RUN_EXPIRED'; END IF;
  FOR v IN SELECT value FROM jsonb_array_elements(p->'frames') LOOP
   SELECT * INTO old FROM drone.regional_capture WHERE execution_id=x.execution_id AND sequence=(v->>'sequence')::bigint;
   IF FOUND THEN
    IF old.content_hash IS DISTINCT FROM v->>'content_hash' THEN RAISE EXCEPTION 'ID_CONFLICT'; END IF;
    CONTINUE;
   END IF;
   IF (v->>'sequence')::bigint<>x.last_sequence+1 OR v->'packet'->'observation'->>'evidenceOrigin' IS DISTINCT FROM 'CAPTURED_RGB' THEN RAISE EXCEPTION 'INVALID_CAPTURE'; END IF;
   INSERT INTO drone.regional_capture(execution_id,sequence,frame_id,content_hash,packet)
    VALUES(x.execution_id,(v->>'sequence')::bigint,(v->'packet'->'observation'->>'frameId')::bigint,v->>'content_hash',v->'packet');
   x.last_sequence=(v->>'sequence')::bigint;
  END LOOP;
  UPDATE drone.regional_execution SET last_sequence=x.last_sequence WHERE execution_id=x.execution_id;
 ELSIF action_name='finish' THEN
  IF x.state IN ('COMPLETED','FAILED','CANCELLED') THEN RETURN to_jsonb(x); END IF;
  IF p->'status'->>'landedAndDisarmed' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'LANDING_UNCONFIRMED'; END IF;
  IF p->>'state' NOT IN ('COMPLETED','FAILED','CANCELLED') THEN RAISE EXCEPTION 'INVALID_RESULT'; END IF;
  UPDATE drone.regional_execution SET state=p->>'state',status=p->'status',finished_at=clock_timestamp() WHERE execution_id=x.execution_id RETURNING * INTO x;
 ELSIF action_name='observe' THEN
  IF p->>'package_id' IS DISTINCT FROM j.package_id OR p->>'result_hash' IS DISTINCT FROM j.result_hash
    OR (p->>'sequence')::bigint>x.last_sequence OR (p->>'sequence')::bigint<x.applied_sequence THEN RAISE EXCEPTION 'INVALID_RESULT'; END IF;
  SELECT * INTO r FROM drone.mission_revision WHERE mission_id=j.mission_id AND revision=j.mission_revision;
  FOR v IN SELECT value FROM jsonb_array_elements(p->'cells') LOOP
   e=v->'evidence';
   IF e->>'evidenceOrigin' IS DISTINCT FROM 'CAPTURED_RGB' OR coalesce((e->>'distinctFrames')::int,0)<3
     OR coalesce((e->>'durationSeconds')::float8,0)<1 OR NOT EXISTS(SELECT 1 FROM drone.regional_capture WHERE execution_id=x.execution_id AND frame_id=(e->>'lastFrameId')::bigint)
     OR NOT EXISTS(SELECT 1 FROM drone.regional_capture WHERE execution_id=x.execution_id AND frame_id=(e->>'firstFrameId')::bigint) THEN RAISE EXCEPTION 'INVALID_EVIDENCE'; END IF;
   INSERT INTO drone.regional_completion VALUES(x.execution_id,(v->>'index')::int,(v->>'areaM2')::float8,v->'geometry',e) ON CONFLICT DO NOTHING;
   cid='regional:'||j.region_id::text||':'||left(j.package_id,16)||':'||(v->>'index');
   INSERT INTO drone.observation_cell(mission_id,grid_version,cell_id,region_id,region_allocations,spatial_config_id,cell_geom,cell_area_m2,state,valid_union_geom,valid_area_m2,valid_count,valid_group_count,valid_duration_s,last_valid_at,excluded_reasons,priority,belief,belief_detail)
    VALUES(j.mission_id,r.grid_version,cid,j.region_id,'[]',r.spatial_config_id,ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(v->'geometry'),4326)),(v->>'areaM2')::float8,'OBSERVED',ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(v->'geometry'),4326)),(v->>'areaM2')::float8,(e->>'distinctFrames')::int,1,(e->>'durationSeconds')::float8,to_timestamp((e->>'endedAt')::float8),'[]',0,0,jsonb_build_object('model','RGB_PRIOR_MAP','executionId',x.execution_id,'packageId',j.package_id,'evidence',e))
    ON CONFLICT(mission_id,grid_version,cell_id) DO NOTHING;
  END LOOP;
  SELECT coalesce(sum(area_m2),0) INTO total FROM drone.regional_completion WHERE execution_id=x.execution_id;
  IF total>(j.result->>'targetAreaM2')::float8+0.0001 THEN RAISE EXCEPTION 'AREA_OVERFLOW'; END IF;
  UPDATE drone.regional_execution SET applied_sequence=(p->>'sequence')::bigint,
   actual=(p->'actual')||jsonb_build_object('observedAreaM2',total,'percent',100*total/(j.result->>'targetAreaM2')::float8,'evidenceOrigin','CAPTURED_RGB')
   WHERE execution_id=x.execution_id RETURNING * INTO x;
 ELSE RAISE EXCEPTION 'UNKNOWN_ACTION'; END IF;
 RETURN to_jsonb(x);
END $function$

