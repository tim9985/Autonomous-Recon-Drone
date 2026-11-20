#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/.."
repo=restored
images="$repo/server/images"

database=$(python3 -c 'import json; print(json.load(open("restored/server/drone-real/compose.json"))["services"]["database"]["image"])')
if ! docker image inspect "$database" >/dev/null 2>&1; then
    docker pull "$database"
fi
docker build -f local/real-api.Dockerfile -t drone-real-api:local "$repo/server/drone-server"
if ! docker image inspect drone-sandbox:20261003 >/dev/null 2>&1; then
    docker build -f "$images/00_drone-sandbox.Dockerfile" -t drone-sandbox:20261003 "$repo/server/drone-server"
fi
docker build -f "$images/01_drone-real-vision.Dockerfile" -t drone-real-vision:20261007 "$images"
docker build -f "$images/02_drone-vision-v12.Dockerfile" -t drone-vision:v12-20261014 "$images"
