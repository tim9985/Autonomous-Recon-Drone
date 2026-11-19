-- Local Unreal experiments are kept out of drone.* and the separate REAL database.
CREATE SCHEMA simulation AUTHORIZATION drone_schema_owner;
SET LOCAL ROLE drone_schema_owner;
REVOKE ALL ON SCHEMA simulation FROM PUBLIC;
SET LOCAL search_path=pg_catalog,simulation,pg_temp;

CREATE TABLE simulation.run (
 run_id uuid PRIMARY KEY, creator_user_id uuid NOT NULL REFERENCES drone.user_account(user_id),
 drone_id text NOT NULL CHECK(drone_id='sim-pi-01'), worker_id text NOT NULL,
 request_hash text NOT NULL CHECK(request_hash ~ '^[0-9a-f]{64}$'),
 scenario text NOT NULL, world text NOT NULL CHECK(world IN ('TestField','Kumoh')),
 simulator_version text NOT NULL, coordinate_frame text NOT NULL CHECK(coordinate_frame='NED_M'),
 seed bigint NOT NULL CHECK(seed>=0), request jsonb NOT NULL CHECK(jsonb_typeof(request)='object'),
 state text NOT NULL DEFAULT 'QUEUED' CHECK(state IN ('QUEUED','RUNNING','COMPLETED','FAILED','CANCELLED')),
 worker_session_id uuid, requested_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 expires_at timestamptz NOT NULL, started_at timestamptz, ended_at timestamptz,
 CHECK(expires_at>requested_at), CHECK((state='QUEUED') OR ended_at IS NOT NULL OR (state='RUNNING' AND worker_session_id IS NOT NULL))
);
CREATE INDEX run_worker_pending ON simulation.run(worker_id,requested_at) WHERE state IN ('QUEUED','RUNNING');

CREATE TABLE simulation.command (
 command_id uuid PRIMARY KEY, run_id uuid NOT NULL REFERENCES simulation.run(run_id),
 sequence bigint NOT NULL CHECK(sequence>=0), action text NOT NULL CHECK(action IN ('START','STOP')),
 request_hash text NOT NULL CHECK(request_hash ~ '^[0-9a-f]{64}$'),
 payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object'),
 state text NOT NULL DEFAULT 'QUEUED' CHECK(state IN ('QUEUED','ACKNOWLEDGED','COMPLETED','FAILED','CANCELLED')),
 issued_at timestamptz NOT NULL DEFAULT clock_timestamp(), expires_at timestamptz NOT NULL,
 UNIQUE(run_id,sequence), UNIQUE(command_id,run_id), CHECK(expires_at>issued_at)
);

CREATE TABLE simulation.sample (
 sample_id uuid PRIMARY KEY, cursor bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
 run_id uuid NOT NULL REFERENCES simulation.run(run_id), worker_id text NOT NULL,
 producer_session_id uuid NOT NULL, sequence bigint NOT NULL CHECK(sequence>=0),
 sim_time_ns bigint CHECK(sim_time_ns>=0), captured_at timestamptz,
 kind text NOT NULL CHECK(kind IN ('TELEMETRY','DETECTION','PLAN','PIPELINE_EVENT','METRIC','COMMAND_REPORT','RUN_STATUS')),
 schema_version text NOT NULL CHECK(schema_version='1'),
 content_hash text NOT NULL CHECK(content_hash ~ '^[0-9a-f]{64}$'),
 data jsonb NOT NULL CHECK(jsonb_typeof(data)='object'),
 received_at timestamptz NOT NULL DEFAULT clock_timestamp(), late boolean NOT NULL,
 UNIQUE(run_id,producer_session_id,sequence)
);
CREATE INDEX sample_run_cursor ON simulation.sample(run_id,cursor);
CREATE INDEX sample_run_kind ON simulation.sample(run_id,kind,cursor);

CREATE FUNCTION simulation.guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' OR TG_TABLE_NAME='sample' THEN RAISE EXCEPTION 'simulation history is append-only' USING ERRCODE='23514'; END IF;
 IF (to_jsonb(NEW)-CASE WHEN TG_TABLE_NAME='run' THEN ARRAY['state','worker_session_id','started_at','ended_at'] ELSE ARRAY['state'] END)
  IS DISTINCT FROM (to_jsonb(OLD)-CASE WHEN TG_TABLE_NAME='run' THEN ARRAY['state','worker_session_id','started_at','ended_at'] ELSE ARRAY['state'] END) THEN
  RAISE EXCEPTION 'simulation input is immutable' USING ERRCODE='23514';
 END IF;
 IF TG_TABLE_NAME='run' AND OLD.state IN ('COMPLETED','FAILED','CANCELLED') AND NEW IS DISTINCT FROM OLD THEN
  RAISE EXCEPTION 'terminal run is immutable' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER immutable_run BEFORE UPDATE OR DELETE ON simulation.run FOR EACH ROW EXECUTE FUNCTION simulation.guard();
CREATE TRIGGER immutable_command BEFORE UPDATE OR DELETE ON simulation.command FOR EACH ROW EXECUTE FUNCTION simulation.guard();
CREATE TRIGGER immutable_sample BEFORE UPDATE OR DELETE ON simulation.sample FOR EACH ROW EXECUTE FUNCTION simulation.guard();

CREATE FUNCTION simulation.write(action_name text,r jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,simulation,pg_temp AS $$
DECLARE v simulation.run; cmd simulation.command; s simulation.sample; rid uuid:=(r->>'run_id')::uuid; n bigint; target text;
BEGIN
 -- shortcut: one writer per run; batch inserts if measured sample throughput requires it.
 PERFORM pg_advisory_xact_lock(20261009,hashtext(rid::text));
 SELECT * INTO v FROM simulation.run WHERE run_id=rid FOR UPDATE;
 IF action_name='create' THEN
  IF v.run_id IS NOT NULL THEN
   IF v.request_hash<>r->>'request_hash' OR v.creator_user_id<>(r->>'creator_user_id')::uuid THEN RAISE EXCEPTION 'ID_CONFLICT' USING ERRCODE='23514'; END IF;
   RETURN to_jsonb(v);
  END IF;
  INSERT INTO simulation.run(run_id,creator_user_id,drone_id,worker_id,request_hash,scenario,world,simulator_version,coordinate_frame,seed,request,expires_at)
   VALUES(rid,(r->>'creator_user_id')::uuid,'sim-pi-01',r->>'worker_id',r->>'request_hash',r#>>'{request,scenario}',r#>>'{request,world}',r#>>'{request,simulator_version}',r#>>'{request,coordinate_frame}',(r#>>'{request,seed}')::bigint,r->'request',(r->>'expires_at')::timestamptz) RETURNING * INTO v;
  INSERT INTO simulation.command(command_id,run_id,sequence,action,request_hash,payload,expires_at)
   VALUES((r->>'command_id')::uuid,rid,0,'START',r->>'request_hash',r->'request',v.expires_at);
  RETURN to_jsonb(v);
 END IF;
 IF v.run_id IS NULL THEN RAISE EXCEPTION 'RUN_NOT_FOUND' USING ERRCODE='23503'; END IF;
 IF action_name='stop' THEN
  SELECT * INTO cmd FROM simulation.command WHERE command_id=(r->>'command_id')::uuid;
  IF cmd.command_id IS NOT NULL THEN
   IF cmd.run_id<>rid OR cmd.action<>'STOP' THEN RAISE EXCEPTION 'ID_CONFLICT' USING ERRCODE='23514'; END IF;
   RETURN to_jsonb(cmd);
  END IF;
  IF v.state NOT IN ('QUEUED','RUNNING') THEN RAISE EXCEPTION 'RUN_TERMINAL' USING ERRCODE='23514'; END IF;
  SELECT coalesce(max(sequence),0)+1 INTO n FROM simulation.command WHERE run_id=rid;
  INSERT INTO simulation.command(command_id,run_id,sequence,action,request_hash,payload,expires_at,state)
   VALUES((r->>'command_id')::uuid,rid,n,'STOP',v.request_hash,'{}',clock_timestamp()+interval '1 day',CASE WHEN v.state='QUEUED' THEN 'COMPLETED' ELSE 'QUEUED' END) RETURNING * INTO cmd;
  IF v.state='QUEUED' THEN
   UPDATE simulation.run SET state='CANCELLED',ended_at=clock_timestamp() WHERE run_id=rid;
   UPDATE simulation.command SET state='CANCELLED' WHERE run_id=rid AND action='START';
  END IF;
  RETURN to_jsonb(cmd);
 END IF;
 IF v.worker_id IS DISTINCT FROM r->>'worker_id' THEN RAISE EXCEPTION 'WORKER_MISMATCH' USING ERRCODE='23514'; END IF;
 IF action_name='claim' THEN
  IF v.state='RUNNING' AND v.worker_session_id=(r->>'producer_session_id')::uuid THEN RETURN to_jsonb(v); END IF;
  IF v.state<>'QUEUED' OR v.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'RUN_NOT_CLAIMABLE' USING ERRCODE='23514'; END IF;
  UPDATE simulation.run SET state='RUNNING',worker_session_id=(r->>'producer_session_id')::uuid,started_at=clock_timestamp() WHERE run_id=rid RETURNING * INTO v;
  RETURN to_jsonb(v);
 END IF;
 IF action_name<>'sample' THEN RAISE EXCEPTION 'UNKNOWN_ACTION' USING ERRCODE='23514'; END IF;
 SELECT * INTO s FROM simulation.sample WHERE sample_id=(r->>'sample_id')::uuid;
 IF s.sample_id IS NOT NULL THEN
  IF s.run_id<>rid OR s.content_hash<>r->>'content_hash' OR s.worker_id<>r->>'worker_id' THEN RAISE EXCEPTION 'ID_CONFLICT' USING ERRCODE='23514'; END IF;
  RETURN jsonb_build_object('stored',true,'duplicate',true,'sample_id',s.sample_id,'cursor',s.cursor::text);
 END IF;
 IF v.worker_session_id IS DISTINCT FROM (r->>'producer_session_id')::uuid THEN RAISE EXCEPTION 'OLD_WORKER_SESSION' USING ERRCODE='23514'; END IF;
 INSERT INTO simulation.sample(sample_id,run_id,worker_id,producer_session_id,sequence,sim_time_ns,captured_at,kind,schema_version,content_hash,data,late)
  VALUES((r->>'sample_id')::uuid,rid,r->>'worker_id',(r->>'producer_session_id')::uuid,(r->>'sequence')::bigint,(r->>'sim_time_ns')::bigint,(r->>'captured_at')::timestamptz,r->>'kind',r->>'schema_version',r->>'content_hash',r->'data',v.state IN ('COMPLETED','FAILED','CANCELLED')) RETURNING * INTO s;
 IF s.kind='RUN_STATUS' THEN
  target=s.data->>'state';
  IF target NOT IN ('COMPLETED','FAILED','CANCELLED') OR target IS NULL OR (v.state<>'RUNNING' AND v.state<>target) THEN RAISE EXCEPTION 'INVALID_RUN_TRANSITION' USING ERRCODE='23514'; END IF;
  IF v.state='RUNNING' THEN UPDATE simulation.run SET state=target,ended_at=clock_timestamp() WHERE run_id=rid; END IF;
 ELSIF s.kind='COMMAND_REPORT' THEN
  SELECT * INTO cmd FROM simulation.command WHERE command_id=(s.data->>'command_id')::uuid AND run_id=rid;
  target=s.data->>'state';
  IF cmd.command_id IS NULL OR target IS NULL OR target NOT IN ('ACKNOWLEDGED','COMPLETED','FAILED','CANCELLED')
   OR (cmd.state IN ('COMPLETED','FAILED','CANCELLED') AND cmd.state<>target)
   OR (cmd.state='ACKNOWLEDGED' AND target='ACKNOWLEDGED' AND v.state<>'RUNNING') THEN RAISE EXCEPTION 'INVALID_COMMAND_TRANSITION' USING ERRCODE='23514'; END IF;
  UPDATE simulation.command SET state=target WHERE command_id=cmd.command_id;
 END IF;
 RETURN jsonb_build_object('stored',true,'duplicate',false,'sample_id',s.sample_id,'cursor',s.cursor::text);
END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA simulation FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA simulation FROM PUBLIC;
GRANT USAGE ON SCHEMA simulation TO drone_api;
GRANT SELECT ON ALL TABLES IN SCHEMA simulation TO drone_api;
GRANT EXECUTE ON FUNCTION simulation.write(text,jsonb) TO drone_api;
RESET ROLE;
