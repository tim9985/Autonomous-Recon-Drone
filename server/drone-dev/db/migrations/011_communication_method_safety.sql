SET LOCAL ROLE drone_schema_owner;
ALTER TABLE observability.communication_log DROP CONSTRAINT communication_log_method_check;
ALTER TABLE observability.communication_log ADD CONSTRAINT communication_log_method_check
  CHECK (method IN ('GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS','WS','OTHER'));
RESET ROLE;
