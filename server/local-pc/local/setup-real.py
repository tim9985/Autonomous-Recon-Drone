"""Stage and initialize the restored REAL sandbox in WSL."""

import argparse
import importlib.util
import json
import os
from pathlib import Path
import pwd
import shutil
import subprocess
import time


WORKSPACE = Path(__file__).resolve().parent.parent
SOURCE = WORKSPACE / "restored/server/drone-real"
ROOT = Path("/home/se/sandboxes/drone-real")
IMAGE = "drone-real-api:local"
PROJECT = "drone-real-20261006"


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def prepare_runtime(operator_uid, operator_gid):
    if not ROOT.exists():
        ROOT.parent.mkdir(parents=True, exist_ok=True)
        deployment = load_module("bundle_deploy_real", SOURCE / "deploy_real.py")
        deployment.OLD = SOURCE.parent
        try:
            deployment.provision(SOURCE, identity_only=True)
        except Exception:
            raise SystemExit(f"REAL identity provisioning stopped. Inspect {ROOT} before retrying.")
        private = ROOT / "secrets"
        os.chown(private, 0, operator_gid)
        private.chmod(0o710)
        os.chown(private / "operator-login.json", operator_uid, operator_gid)
        (private / "ca.key").chmod(0o600)
        (ROOT / ".local-identity-ready").touch()
    if not (ROOT / ".local-identity-ready").is_file():
        raise SystemExit(f"Existing sandbox {ROOT} needs inspection before it can be reused.")
    os.chown(ROOT / "sockets/backend", 2201, 2500)
    os.chown(ROOT / "sockets/gateway", 2204, operator_gid)

    for name in ("app", "drone_backend", "tests", "db", "tools", "docs"):
        shutil.copytree(SOURCE / name, ROOT / name, dirs_exist_ok=True,
                        ignore=shutil.ignore_patterns("__pycache__"))

    for file in (ROOT / "db").glob("*.sh"):
        file.chmod(0o755)

    camera = ROOT / "camera-live"
    shutil.copytree(SOURCE / camera.name, camera, dirs_exist_ok=True)
    data = camera / "data"
    data.mkdir(exist_ok=True)
    os.chown(data, operator_uid, operator_gid)
    data.chmod(0o750)

    # The services continue to exchange data over their original Unix sockets.
    compose = json.loads((SOURCE / "compose.json").read_text())
    services = compose["services"]
    for name in ("backend", "gateway"):
        services[name]["image"] = IMAGE
    vision = services["vision"]
    vision["volumes"] = [mount for mount in vision["volumes"] if mount.startswith("./")]
    vision["devices"] = ["nvidia.com/gpu=all"]
    vision["environment"].pop("LD_LIBRARY_PATH", None)
    vision["environment"]["VISION_TRT"] = "0"
    # 3,000 MB stops recording after about 8 minutes of 4K frames (11-17 check).
    vision["environment"]["VISION_RECORD_MAX_MB"] = "30000"
    (ROOT / "compose.json").write_text(json.dumps(compose, indent=2) + "\n")


def initialize_database():
    stack = ["docker", "compose", "-f", str(ROOT / "compose.json")]
    subprocess.run(stack + ["up", "-d", "database"], check=True)
    db_container = PROJECT + "-database-1"
    for _ in range(60):
        check = subprocess.run(
            ["docker", "exec", db_container, "sh", "-c",
             'test "$(cat /proc/1/comm)" = postgres && pg_isready -q -U drone_owner -d drone_real'],
            capture_output=True, check=False,
        )
        if check.returncode == 0:
            break
        time.sleep(1)
    else:
        subprocess.run(stack + ["logs", "--tail=40", "database"], check=False)
        raise SystemExit("REAL database initialization did not complete.")

    database = load_module("real_migrations", ROOT / "db/apply.py")
    database.DOCKER = ["docker"]
    database.CONTAINER = db_container
    database.apply("drone_real")
    private = ROOT / "secrets"
    settings = json.loads((private / "backend/business.json").read_text())
    account = json.loads((private / "gateway/operator.json").read_text())
    uid = settings["configuration_admins"][0]
    credential = f"pbkdf2_sha256$1000000${account['salt']}${account['digest']}"
    database.psql(f"""
        BEGIN;
        INSERT INTO drone.drone (drone_id, name, gateway_id, gateway_state, link_state)
        VALUES ('real-drone-01', 'REAL intake device', 'real-gateway-01',
                '{{"environment":"REAL","flight_enabled":false}}', '{{}}')
        ON CONFLICT (drone_id) DO NOTHING;
        INSERT INTO drone.user_account (user_id, login_id, credential_hash, permissions, status)
        VALUES ('{uid}', 'real-operator', '{credential}',
                '[{{"drone_id":"real-drone-01","scopes":["read","edit","control"]}}]', 'ACTIVE')
        ON CONFLICT (user_id) DO NOTHING;
        COMMIT;
        """, "drone_real")


def stage_model():
    src = WORKSPACE / "10_essential_models/runs_person/_pack_v12w_real"
    models = ROOT / "data/models"
    # An existing active model carries the UUID registered in this local database.
    if (models / "active.json").is_file():
        return
    shutil.copytree(src, models, dirs_exist_ok=True, ignore=shutil.ignore_patterns("active.json"))
    candidate = json.loads((src / "active.json").read_text())["name"]
    shutil.copyfile(models / "posture.json", models / candidate / "posture.json")
    for path in models.rglob("*"):
        os.chown(path, 2202, 2202)
        path.chmod(0o500 if path.is_dir() else 0o400)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--operator", default="hun22", help="local WSL account")
    parser.add_argument("--stage-only", action="store_true")
    args = parser.parse_args()
    if os.geteuid() != 0:
        raise SystemExit("Run as the WSL root user.")
    operator = pwd.getpwnam(args.operator)
    prepare_runtime(operator.pw_uid, operator.pw_gid)
    stage_model()
    if not args.stage_only:
        initialize_database()


if __name__ == "__main__":
    main()
