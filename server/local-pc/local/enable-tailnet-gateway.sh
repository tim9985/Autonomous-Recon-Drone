#!/usr/bin/env bash
set -euo pipefail

local_dir=$(dirname "$(realpath "${BASH_SOURCE[0]}")")
bash "$local_dir/start-tailnet.sh"
tailscale up --hostname=capstone-local-server --accept-dns=false --accept-routes=false
tailscale serve --bg --yes --tcp=7540 tcp://127.0.0.1:7540
tailscale serve status
