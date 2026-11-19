-- Local browser sessions last eight hours and renew while in use.
-- No expired/revoked session resurrection, account bypass or control-lease extension.
SET LOCAL ROLE drone_schema_owner;
CREATE OR REPLACE FUNCTION drone.local_refresh_session(digest text)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,drone,pg_temp AS $$
DECLARE expiry timestamptz;
BEGIN
 UPDATE drone.user_session s
 SET expires_at=clock_timestamp()+interval '8 hours'
 FROM drone.user_account u
 WHERE s.user_id=u.user_id AND s.token_digest=digest
   AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp() AND u.status='ACTIVE'
   AND s.expires_at<clock_timestamp()+interval '7 hours'
 RETURNING s.expires_at INTO expiry;
 IF expiry IS NULL THEN
   SELECT s.expires_at INTO expiry FROM drone.user_session s
   JOIN drone.user_account u USING(user_id)
   WHERE s.token_digest=digest AND s.revoked_at IS NULL
     AND s.expires_at>clock_timestamp() AND u.status='ACTIVE';
 END IF;
 RETURN expiry;
END $$;
REVOKE ALL ON FUNCTION drone.local_refresh_session(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION drone.local_refresh_session(text) TO drone_api;
