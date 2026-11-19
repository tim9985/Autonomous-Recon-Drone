SET LOCAL ROLE drone_schema_owner;

-- Legacy shared operators retain their existing view of legacy missions.
-- A personal account can only see its own records in either direction.
CREATE FUNCTION drone.school_owner_visible(viewer uuid, owner_id uuid)
RETURNS boolean LANGUAGE sql STABLE STRICT PARALLEL SAFE
SET search_path=pg_catalog,drone AS $$
 SELECT viewer = owner_id OR NOT EXISTS (
   SELECT 1 FROM drone.user_account WHERE user_id IN (viewer, owner_id)
     AND permissions @> '[{"drone_id":"sim-pi-01","scopes":["personal_workspace"]}]'::jsonb
 );
$$;
REVOKE ALL ON FUNCTION drone.school_owner_visible(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION drone.school_owner_visible(uuid,uuid) TO drone_api;

-- Separate physical simulator PCs have separate motion and recovery boundaries.
CREATE FUNCTION drone.school_flight_domain(worker text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
 SELECT CASE WHEN worker LIKE 'school-pc-%' THEN worker ELSE 'legacy-shared' END;
$$;
GRANT EXECUTE ON FUNCTION drone.school_flight_domain(text) TO drone_api;
DROP INDEX drone.regional_one_flight;
CREATE UNIQUE INDEX regional_one_flight ON drone.regional_execution(drone.school_flight_domain(worker_id))
 WHERE state IN ('QUEUED','RUNNING','STOP_REQUESTED','UNCONFIRMED');

CREATE OR REPLACE FUNCTION drone.regional_legacy_mutex() RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path=pg_catalog,drone,public,pg_temp AS $$
DECLARE domain text := 'legacy-shared'; paired uuid; owner_id uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(20261005,1);
 IF TG_TABLE_SCHEMA='simulation' THEN
   domain := drone.school_flight_domain(NEW.worker_id);
   paired := (NEW.request->>'regional_execution_id')::uuid;
   owner_id := NEW.creator_user_id;
   IF paired IS NOT NULL AND NOT EXISTS (
     SELECT 1 FROM drone.regional_execution e WHERE e.execution_id=paired AND e.worker_id=NEW.worker_id
       AND e.creator_user_id=owner_id AND e.state IN ('QUEUED','RUNNING')
   ) THEN RAISE EXCEPTION 'REGIONAL_EXECUTION_MISMATCH'; END IF;
 ELSIF NEW.drone_id <> 'sim-pi-01' THEN RETURN NEW;
 END IF;
 IF EXISTS (SELECT 1 FROM drone.regional_execution e
   WHERE drone.school_flight_domain(e.worker_id)=domain AND e.state IN ('QUEUED','RUNNING','STOP_REQUESTED','UNCONFIRMED')
   AND e.execution_id IS DISTINCT FROM paired) THEN RAISE EXCEPTION 'REGIONAL_EXECUTION_ACTIVE'; END IF;
 RETURN NEW;
END $$;
