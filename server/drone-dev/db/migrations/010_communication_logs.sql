CREATE SCHEMA observability AUTHORIZATION drone_schema_owner;
SET LOCAL ROLE drone_schema_owner;
CREATE TABLE observability.communication_log (
  event_id uuid PRIMARY KEY,
  event_at timestamptz NOT NULL,
  stored_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  source text NOT NULL CHECK (source IN ('SERVER','CLIENT_REPORTED')),
  service text NOT NULL CHECK (service IN ('backend','gateway','web','net_sitl')),
  kind text NOT NULL CHECK (kind IN ('HTTP','WS_OPEN','WS_SNAPSHOT','WS_CLOSE','CLIENT_HTTP')),
  request_id uuid NOT NULL,
  operation_id uuid,
  run_id uuid,
  principal_id text CHECK (length(principal_id)<=255),
  actor_user_id uuid,
  route text NOT NULL CHECK (length(route)<=255),
  method text NOT NULL CHECK (method IN ('GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS','WS')),
  status integer CHECK (status BETWEEN 100 AND 599),
  duration_ms double precision NOT NULL CHECK (duration_ms>=0 AND duration_ms<'Infinity'::float8),
  bytes_in bigint NOT NULL CHECK (bytes_in>=0),
  bytes_out bigint NOT NULL CHECK (bytes_out>=0),
  timings jsonb NOT NULL CHECK (jsonb_typeof(timings)='object'),
  error_code text CHECK (length(error_code)<=80),
  content_hash text NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$')
);
CREATE INDEX communication_time ON observability.communication_log(event_at DESC,event_id);
CREATE INDEX communication_request ON observability.communication_log(request_id,event_at);
CREATE INDEX communication_worker ON observability.communication_log(principal_id,event_at DESC);
CREATE INDEX communication_run ON observability.communication_log(run_id,event_at);
REVOKE ALL ON SCHEMA observability FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA observability FROM PUBLIC;
GRANT USAGE ON SCHEMA observability TO drone_api,drone_log_writer;
GRANT SELECT ON observability.communication_log TO drone_api;
GRANT INSERT,SELECT ON observability.communication_log TO drone_log_writer;
RESET ROLE;
