# REAL mission preparation (2026-11-16)

REAL operator identity: dev-operator. This account already exists in REAL with read/edit/control permissions for real-drone-01. Account purpose must not be inferred from its name.
Page: https://localhost:19443/real-missions.html, linked from the existing REAL home page.

Implemented authenticated endpoints:
PUT /api/v1/missions/{mission_id}/execution-plans/{plan_id}
GET /api/v1/missions/{mission_id}/execution-plans/{plan_id}
GET /api/v1/missions/{mission_id}/execution-plans/{plan_id}/readiness
POST /api/v1/missions/{mission_id}/execution-requests

Offline plans compile ordered home, takeoff, speed, waypoints and RTL items for review. They include camera wake/preflight/video-altitude policy and the model-input person-size requirement. Takeoff/waypoint altitude must be >=15m, routes remain within 1km of launch, and estimated duration including return is <=900s. No fixed 40m ceiling was imposed. Estimates are not battery endurance validation. No real launch point, building-clearance evidence or detection altitude envelope was invented.

Flight dispatch remains disabled. The readiness gate lists missing FC freshness, position, battery, terrain/building clearance, camera, pixel/altitude envelope, link-loss policy, and commissioning evidence. Preparation requests record BLOCKED with fc_commands_sent=false. Requests do not auto-replay after reconnection. A compiled plan is not evidence of successful upload or execution.

Verification: 8 pure planner checks and 8 authenticated API checks passed. Invalid range, duration, altitude, NaN, video threshold and arbitrary return actions were rejected. Valid repeat requests were idempotent; changed immutable plan IDs conflicted. Browser rendered the REAL login/page. The API test used synthetic coordinates solely for structural verification; mission a20ed205-fd2e-4294-b13e-7bd8a4c87bb9 is a synthetic test, not a real route. No FC command was sent.

Remaining: commission gateway mission upload/download readback and explicitly initiated flight execution, fresh preflight evidence, state/progress/abort handling and field tests. No automatic flight readiness claim is made.
