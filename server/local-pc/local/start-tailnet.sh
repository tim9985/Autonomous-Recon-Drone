#!/usr/bin/env bash
set -euo pipefail

socket=/run/tailscale/tailscaled.sock
install -d -m 0755 /run/tailscale
install -d -m 0700 /var/lib/tailscale
if ! tailscale status --json >/dev/null 2>&1; then
    start-stop-daemon --start --oknodo --quiet --background --make-pidfile \
        --pidfile /run/capstone-tailscaled.pid --exec /usr/sbin/tailscaled -- \
        --state=/var/lib/tailscale/tailscaled.state --socket="$socket"
fi
for _ in {1..25}; do
    tailscale status --json >/dev/null 2>&1 && exit 0
    sleep .2
done
exit 1
