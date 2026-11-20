#!/usr/bin/env bash
set -euo pipefail

local_dir=$(dirname "$(realpath "${BASH_SOURCE[0]}")")
root=/home/se/sandboxes/drone-real
operator=${1:-hun22}
stack=(docker compose -f "$root/compose.json")

install -d -m 0755 /run/sshd /etc/drone-real-ssh
exec 9>/run/drone-real-local.lock
flock -n 9 || exit 0

id drone-gw-tunnel >/dev/null 2>&1 ||
    useradd --no-create-home --shell /usr/sbin/nologin drone-gw-tunnel
if [[ ! -e /etc/drone-real-ssh/authorized_keys ]]; then
    install -m 0644 /dev/null /etc/drone-real-ssh/authorized_keys
fi
if [[ ! -e /etc/drone-real-ssh/sshd_config ]]; then
    install -m 0644 "$local_dir/real-sshd.conf" /etc/drone-real-ssh/sshd_config
fi
/usr/sbin/sshd -t -f /etc/drone-real-ssh/sshd_config

if command -v tailscaled >/dev/null 2>&1; then
    bash "$local_dir/start-tailnet.sh" 9>&- || >&2 echo "Tailscale did not start."
fi

if ! docker info >/dev/null 2>&1; then
    service docker start 9>&-
fi
"${stack[@]}" up -d --wait database
"${stack[@]}" up -d backend gateway

# Keep the WSL invocation open and supervise the three host listeners.
pids=()
trap 'if (( ${#pids[@]} )); then kill "${pids[@]}" 2>/dev/null || true; wait || true; fi' EXIT
trap 'exit 0' INT TERM
setpriv --reuid "$(id -u "$operator")" --regid "$(id -g "$operator")" --groups 2500 \
    /usr/bin/python3 "$root/tools/real_relay.py" 9>&- &
pids+=("$!")
runuser -u "$operator" -- /usr/bin/python3 "$root/camera-live/school_camera_receiver.py" 9>&- &
pids+=("$!")
/usr/sbin/sshd -D -e -f /etc/drone-real-ssh/sshd_config 9>&- &
pids+=("$!")

if [[ -f "$root/data/models/active.json" ]] && docker image inspect drone-vision:v12-20261014 >/dev/null 2>&1; then
    "${stack[@]}" up -d vision || >&2 echo "REAL vision did not start. Inspect compose logs."
fi
wait -n "${pids[@]}"
exit 1
