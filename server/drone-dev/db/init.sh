#!/usr/bin/env bash
set -euo pipefail
api_password=$(cat /run/identity/db-api-password)
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set=ON_ERROR_STOP=1 --set=api_password="$api_password" <<'SQL'
BEGIN;
CREATE EXTENSION postgis;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON DATABASE drone_dev FROM PUBLIC;
REVOKE CONNECT ON DATABASE postgres FROM PUBLIC;
CREATE ROLE drone_api LOGIN PASSWORD :'api_password' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
GRANT CONNECT ON DATABASE drone_dev TO drone_api;
CREATE SCHEMA integration AUTHORIZATION drone_owner;
REVOKE ALL ON SCHEMA integration FROM PUBLIC;
CREATE TABLE integration.probe (
  msg_id uuid PRIMARY KEY,
  subject text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('TELEMETRY','VISION_HEARTBEAT','SIM_VISION_RESULT')),
  content_hash text NOT NULL CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload)='object'),
  stored_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
GRANT USAGE ON SCHEMA integration TO drone_api;
GRANT SELECT, INSERT ON integration.probe TO drone_api;
ALTER DEFAULT PRIVILEGES IN SCHEMA integration REVOKE ALL ON TABLES FROM PUBLIC;
COMMIT;
SQL

