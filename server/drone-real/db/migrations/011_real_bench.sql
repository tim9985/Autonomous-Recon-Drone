DO $$ BEGIN
 IF current_database() <> 'drone_real' AND current_database() NOT LIKE 'real_verify_%' THEN
  RAISE EXCEPTION 'REAL bench requires a REAL database';
 END IF;
END $$;
SET LOCAL ROLE drone_schema_owner;

CREATE TABLE drone.real_bench_gateway (
 drone_id varchar(255) PRIMARY KEY REFERENCES drone.drone(drone_id),
 session_id uuid NOT NULL,
 mode text NOT NULL CHECK (mode IN ('MOCK', 'FC_OBSERVE')),
 seen_at timestamptz NOT NULL
);
CREATE TABLE drone.real_bench_job (
 job_id uuid PRIMARY KEY,
 mission_id uuid NOT NULL REFERENCES drone.mission(mission_id),
 drone_id varchar(255) NOT NULL REFERENCES drone.drone(drone_id),
 session_id uuid NOT NULL,
 requested_by uuid NOT NULL REFERENCES drone.user_account(user_id),
 mode text NOT NULL CHECK (mode IN ('MOCK', 'FC_OBSERVE')),
 waypoint jsonb NOT NULL CHECK (jsonb_typeof(waypoint)='object'),
 expires_at timestamptz NOT NULL,
 result jsonb CHECK (jsonb_typeof(result)='object'),
 reported_at timestamptz,
 CHECK ((result IS NULL) = (reported_at IS NULL))
);
CREATE INDEX real_bench_jobs_drone ON drone.real_bench_job (drone_id, expires_at DESC);
REVOKE ALL ON drone.real_bench_gateway, drone.real_bench_job FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON drone.real_bench_gateway TO drone_api;
GRANT SELECT, INSERT ON drone.real_bench_job TO drone_api;
GRANT UPDATE(result,reported_at) ON drone.real_bench_job TO drone_api;
RESET ROLE;
