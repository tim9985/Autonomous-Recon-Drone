#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"
scripts/stack.sh exec -T --interactive=false api python scripts/mission_dirs.py sample
scripts/stack.sh exec -T --interactive=false api ffmpeg -nostdin -hide_banner -loglevel warning -y \
  -re -f lavfi -i testsrc2=size=1920x1080:rate=30 \
  -t "${SAMPLE_DURATION:-12}" -an -c:v libx264 -preset ultrafast -tune zerolatency \
  -pix_fmt yuv420p -g 30 -b:v 3M -maxrate 3M -bufsize 6M \
  -f mpegts 'srt://127.0.0.1:18890?streamid=publish:sample&pkt_size=1316'
echo 'Synthetic sample stream sent; this does not validate the field link.'
