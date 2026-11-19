#!/bin/bash
set -euo pipefail
exec sudo /home/se/sandboxes/drone-server/runtime/docker/docker --config /home/se/sandboxes/drone-server/runtime/client -H unix:///home/se/sandboxes/drone-server/runtime/docker.sock compose --project-directory /home/se/sandboxes/drone-real -f /home/se/sandboxes/drone-real/compose.json "$@"
