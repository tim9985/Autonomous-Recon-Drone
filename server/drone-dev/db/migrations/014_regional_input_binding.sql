-- Keep the original spatial release immutable; register the newer building and
-- algorithm binding independently. The API can read it, never rewrite it.
DO $$ BEGIN
 IF current_database()<>'drone_dev' AND current_database() NOT LIKE 'regional_verify_%' THEN
  RAISE EXCEPTION 'DEV migration refused in this database';
 END IF;
END $$;
SET LOCAL ROLE drone_schema_owner;
CREATE TABLE drone.regional_input_binding (
 package_id text NOT NULL CHECK(package_id ~ '^[0-9a-f]{64}$'),
 adapter_hash text NOT NULL CHECK(adapter_hash ~ '^[0-9a-f]{64}$'),
 release_id text NOT NULL REFERENCES drone.spatial_release(release_id),
 building_activity_version text NOT NULL,
 display_sha256 text NOT NULL CHECK(display_sha256 ~ '^[0-9a-f]{64}$'),
 preview_version text NOT NULL,
 registered_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(package_id,adapter_hash,preview_version)
);
REVOKE ALL ON drone.regional_input_binding FROM PUBLIC;
GRANT SELECT ON drone.regional_input_binding TO drone_api;
