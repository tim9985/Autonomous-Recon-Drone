# REAL ground and mission execution — 2026-11-17

Goal: dev-operator can explicitly control the REAL vehicle and upload/read back/start an ArduCopter mission through an authenticated field agent. SIM remains isolated.

1. Reproduce disabled flight and shared gateway cookie faults (done via production HTTPS, no movement).
2. Write failing behavioral tests for operator leases, expiry, deduplication, gateway-session binding, one-flight ownership, upload readback and fake MAVLink command/mission flows.
3. Add a transactional SQLite REAL outbox and permission-checked FastAPI routes. Maintain existing plan constraints. Only a fresh control session can dispatch; no reconnect replay.
4. Add a single-owner field agent with mTLS, validated ArduCopter identity, MAVLink ACKs, mission readback, local durable deduplication, operator heartbeat and FC GCS failsafe checks.
5. Add REAL ground/mission controls, explicit action confirmations, preflight attestations and visible pending/completed/unknown states. Remove shared-cookie retention.
6. Verify isolated tests, package field installer, back up server files and deploy only REAL backend/gateway. Check real HTTPS authentication/isolation and offline rejection.

Physical limitation: FC and field reverse tunnel are offline. Agent installation and actual arming/flight cannot be claimed complete. Server changes must remain fail-closed while disconnected. No motor/flight commands during this task.

Primary protocol references: https://mavlink.io/en/services/mission.html ; https://ardupilot.org/copter/docs/gcs-failsafe.html ; https://ardupilot.org/copter/docs/common-mavlink-mission-command-messages-mav_cmd.html
