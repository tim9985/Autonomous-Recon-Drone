#!/usr/bin/env bash
# Install the real-map telemetry bridge and camera publisher on the ground Pi.
# Run from the staged folder on the Pi:   sudo bash ~/real-map-gateway-install/install.sh
# Undo:  sudo systemctl disable --now real-map-gateway real-map-camera
#        sudo cp -a /opt/drone-camera/pi_camera_relay.py.orig-real-map /opt/drone-camera/pi_camera_relay.py
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Run with sudo."; exit 1; }
here=$(dirname "$(realpath "$0")")
for name in real_map_gateway.py ground_camera_publish.py fake_fc.py real-map-gateway.service \
            real-map-camera.service real-map.json real-map-camera.env; do
    [[ -f "$here/$name" ]] || { echo "Missing $name in $here"; exit 1; }
done
id gateway >/dev/null

install -d -m 0755 /opt/real-map-gateway
install -m 0644 "$here/real_map_gateway.py" "$here/ground_camera_publish.py" "$here/fake_fc.py" /opt/real-map-gateway/
install -m 0640 -o root -g gateway "$here/real-map.json" "$here/real-map-camera.env" /etc/drone-gateway/
if [[ -f "$here/real-map-key" ]]; then
    install -m 0640 -o root -g gateway "$here/real-map-key" /etc/drone-gateway/real-map-key
    shred -u "$here/real-map-key" 2>/dev/null || rm -f "$here/real-map-key"
fi
[[ -s /etc/drone-gateway/real-map-key ]] || { echo "No gateway key at /etc/drone-gateway/real-map-key"; exit 1; }

# The relay already copies the radio's RTP to 5602 (preview) and 5604 (school uplink).
# Add 5606 for the real-map publisher without touching the other two.
relay=/opt/drone-camera/pi_camera_relay.py
if grep -q 'for port in (5602, 5604, 5606):' "$relay"; then
    echo "Camera relay already copies to 5606"
elif grep -q 'for port in (5602, 5604):' "$relay"; then
    [[ -e "$relay.orig-real-map" ]] || cp -a "$relay" "$relay.orig-real-map"
    sed -i 's/for port in (5602, 5604):/for port in (5602, 5604, 5606):/' "$relay"
    systemctl restart drone-camera-relay.service
    echo "Camera relay now also copies to 5606 (backup: $relay.orig-real-map)"
else
    echo "WARNING: $relay has an unexpected layout; video will not reach the real-map publisher"
fi

install -m 0644 "$here/real-map-gateway.service" "$here/real-map-camera.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now real-map-gateway.service real-map-camera.service
sleep 5
echo "--- check ---"
runuser -u gateway -- python3 /opt/real-map-gateway/real_map_gateway.py \
    --config /etc/drone-gateway/real-map.json --check || true
systemctl --no-pager --lines=6 status real-map-gateway.service real-map-camera.service || true
echo "Done. Logs: journalctl -u real-map-gateway -u real-map-camera -f"
