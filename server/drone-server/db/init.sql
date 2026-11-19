CREATE EXTENSION IF NOT EXISTS postgis;
CREATE SCHEMA IF NOT EXISTS drone;
CREATE TABLE IF NOT EXISTS drone.environment_info (
    key text PRIMARY KEY,
    value text NOT NULL
);
INSERT INTO drone.environment_info VALUES ('environment', 'sandbox'), ('flight_enabled', 'false')
ON CONFLICT (key) DO NOTHING;
