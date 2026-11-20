"""Deploy the GitHub school dashboard and its compatible API on localhost."""

import argparse
from hashlib import file_digest
import json
import os
from pathlib import Path
import subprocess


WORKSPACE = Path(__file__).resolve().parent.parent
CHECKOUT = WORKSPACE / "web-source"
RUNTIME = Path("/home/se/sandboxes/capstone-school-web")
REAL = RUNTIME.parent / "drone-real"
STACK = ["docker", "compose", "--project-name", "capstone-school-web"]
REGIONS = "server/db/install/regions.csv"
CITY = "deployment/releases/20261106-pc-sim-v4"
REGIONAL = "data/regional-search-packages"
MAP_DATA = ("data/spatial", CITY)


def verify(path, expected):
    filename = CHECKOUT / path
    if filename.is_file() and filename.stat().st_size == expected["bytes"]:
        with filename.open("rb") as stream:
            if file_digest(stream, "sha256").hexdigest() == expected["sha256"]:
                return
    raise SystemExit(f"Release file is incomplete or differs from the manifest: {path}")


def stage(maps):
    manifest = json.loads((CHECKOUT / "release-manifest.json").read_text(encoding="utf-8"))["files"]
    data = (REGIONAL, *MAP_DATA) if maps else (REGIONAL,)
    for path, expected in manifest.items():
        if path == REGIONS or path.startswith("server/web/") or any(
            path.startswith(f"server/{directory}/") for directory in data
        ):
            verify(path, expected)
    parts = ["app", "backend", "config", "db", "install", "school", "web",
             "images/cpu", "data/backend", "data/models", "compose.yaml", "web-allowlist.json",
             "regional-search-code", *data]
    RUNTIME.mkdir(parents=True, exist_ok=True)
    subprocess.run(["rsync", "-rltR", "--chmod=D755,F644", *parts, str(RUNTIME)],
                   cwd=CHECKOUT / "server", check=True)
    init = RUNTIME / "db/init-release.sh"
    init.write_text(init.read_text().replace("\\i /install/team-operators.sql\n", ""))
    init.chmod(0o755)


def compose(*args, **kwargs):
    return subprocess.run(STACK + list(args), cwd=RUNTIME, check=True, **kwargs)


def deploy(maps):
    if subprocess.run(["docker", "image", "inspect", "capstone-school-runtime:20261118"],
                      capture_output=True).returncode:
        compose("build", "initialize")
    compose("up", "-d", "--wait", "--wait-timeout", "120", "database")
    account = json.loads((REAL / "secrets/admin-login.json").read_text())
    result = compose("exec", "-T", "database", "sh", "-c",
                     'export PGPASSWORD="$(cat /run/identity/db-owner-password)"; '
                     'exec psql -XAtq -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"',
                     text=True, input="SELECT status FROM drone.user_account WHERE login_id='real-admin';\n",
                     capture_output=True)
    if not result.stdout.strip():
        compose("run", "--rm", "-T", "--no-deps", "account", account["username"],
                input=account["password"] + "\n", text=True)
    services = ["entry"]
    if maps:
        services.extend(("map", "egress", "city-planner", "regional-observer",
                         "regional-planner", "regional-preview"))
    compose("up", "-d", "--wait", "--wait-timeout", "120", *services)
    ca = compose("run", "--rm", "-T", "--no-deps", "--entrypoint", "cat",
                 "initialize", "/identities/ca.crt", stdout=subprocess.PIPE)
    (WORKSPACE / "local/school-web-ca.crt").write_bytes(ca.stdout)


def refresh():
    compose("config", "--quiet")
    compose("run", "--rm", "-T", "--no-deps", "initialize")
    compose("up", "-d", "--no-deps", "--force-recreate", "--wait", "--wait-timeout", "120",
            "backend", "web", "map", "gateway", "entry")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--maps", action="store_true", help="include map and regional planning services")
    parser.add_argument("--refresh", action="store_true", help="refresh an existing dashboard deployment")
    args = parser.parse_args()
    if os.geteuid() != 0:
        raise SystemExit("Run as the WSL root user.")
    stage(args.maps or args.refresh)
    if args.refresh:
        refresh()
    else:
        deploy(args.maps)


if __name__ == "__main__":
    main()
