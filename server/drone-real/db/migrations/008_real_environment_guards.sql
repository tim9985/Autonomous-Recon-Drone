DO $$ BEGIN
 IF current_database()<>'drone_real' AND current_database() NOT LIKE 'real_verify_%' THEN
  RAISE EXCEPTION 'REAL migration cannot modify the development database';
 END IF;
END $$;
SET LOCAL ROLE drone_schema_owner;
ALTER TABLE drone.mission ADD CONSTRAINT real_mission_only CHECK(test_conditions->>'environment' IS NOT DISTINCT FROM 'REAL');
ALTER TABLE drone.telemetry_sample ADD CONSTRAINT real_telemetry_only CHECK(sample_kind='REAL_STATE' AND time_evidence->>'environment' IS NOT DISTINCT FROM 'REAL');
ALTER TABLE drone.video_frame ADD CONSTRAINT real_frame_only CHECK(time_evidence->>'environment' IS NOT DISTINCT FROM 'REAL');
ALTER TABLE drone.media_asset ADD CONSTRAINT real_media_only CHECK(meta->>'environment' IS NOT DISTINCT FROM 'REAL');
ALTER TABLE drone.drone ADD CONSTRAINT real_device_only CHECK(gateway_state->>'environment' IS NOT DISTINCT FROM 'REAL');
RESET ROLE;
