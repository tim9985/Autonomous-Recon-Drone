-- Dedicated shared SIM identity. No usable password and no new database grants.
-- Endpoint is enabled separately by SCHOOL_QUICK_LOGIN=1 in the school backend.
INSERT INTO drone.user_account(user_id,login_id,credential_hash,permissions,status)
VALUES ('89e12df7-1d43-443c-94d8-5ff98047b3bc','school-quick-sim','!quick-session-only',
        '[{"drone_id":"sim-pi-01","scopes":["read","edit","control"]}]','ACTIVE');
