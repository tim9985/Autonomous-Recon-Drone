DO $$ BEGIN
 IF current_database()<>'drone_real' AND current_database() NOT LIKE 'real_verify_%' THEN
  RAISE EXCEPTION 'REAL migration cannot modify the development database';
 END IF;
END $$;
SET LOCAL ROLE drone_schema_owner;
CREATE UNIQUE INDEX real_one_active_reobservation ON drone.reobservation_request(candidate_id)
 WHERE status IN ('PENDING','ACCEPTED','EXECUTING');
RESET ROLE;
