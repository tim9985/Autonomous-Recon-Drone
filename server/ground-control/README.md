# Server ground motor control — 2026-11-16

Verified route: school server -> authenticated reverse SSH tunnel -> Pi -> KOA telemetry -> ArduCopter.
Server CLI: /home/se/drone-ground-control/motor_control.py
Gateway service: drone-server-bench-tunnel.service

Read-only FC status:
python3 /home/se/drone-ground-control/motor_control.py status

Ground motor test, all four, about 10 percent command range, 20 seconds:
python3 /home/se/drone-ground-control/motor_control.py motor-test --motor 0 --seconds 20 --props-removed

Motor 0 means all four together; 1..4 are A..D test sequence, not physical connector order. Duration is 1..20 seconds. All-motor starts are staggered by approximately 0.5 seconds. FC stops the group after the final test timer. Use only with all props removed, secured vehicle, and an onsite observer able to disconnect power. No unattended automatic retries.

The worker rejects expired requests, duplicate request IDs, missing prop confirmation, unavailable/stale FC heartbeat, armed FC, and reported battery voltage outside the configured 3S bench range 11.1..12.8V. This voltage range is a test gate, not an independent cell measurement or battery health certification.

Results: server /home/se/drone-ground-control/results; Pi /var/lib/drone-gateway/server-bench. The FC state publisher is temporarily stopped during serial access and restored afterward; a separate 60-second systemd timer also requests restoration.

Confirmed 2026-11-16: four command ACKs accepted; 100 telemetry samples with all four outputs active; final outputs all 1000, disarmed. Onsite user confirmed four motors rotated together and stopped. Expired, duplicate and >20-second requests rejected with no motor commands.

Scope: server CLI ground motor tests. This does not enable the web REAL flight-command API, autonomous missions, flight arming, or five-minute tests.
