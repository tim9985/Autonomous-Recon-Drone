"""Register the checked REAL model through the HTTPS operator API."""

from hashlib import file_digest
from http.cookiejar import CookieJar
import json
import os
from pathlib import Path
import ssl
from tempfile import NamedTemporaryFile
from urllib.request import build_opener, HTTPSHandler, HTTPCookieProcessor, Request
from uuid import NAMESPACE_URL, uuid5


ROOT = Path("/home/se/sandboxes/drone-real")
ORIGIN = "https://localhost:19443"


def sha256(path):
    with path.open("rb") as stream:
        return file_digest(stream, "sha256").hexdigest()


def main():
    if os.geteuid() != 0:
        raise SystemExit("Run as the WSL root user.")
    workspace = Path(__file__).resolve().parent.parent
    template = workspace / "10_essential_models/runs_person/_pack_v12w_real/active.json"
    active = json.loads(template.read_text())
    models = ROOT / "data/models"
    candidate = models / active["name"]
    manifest = json.loads((candidate / "model.json").read_text())
    artifact = sha256(candidate / "best.pt")
    if manifest["sha256"] != artifact or manifest["environment"] != "REAL":
        raise SystemExit("REAL model manifest does not match the staged weights.")
    posture = sha256(candidate / "posture.json")
    version = active["name"] + "_REAL_PyTorch_FP16"
    config_id = str(uuid5(NAMESPACE_URL, f"drone-real/{version}/{artifact}/{posture}"))
    private = ROOT / "secrets"
    context = ssl.create_default_context(cafile=str(private / "ca.crt"))
    client = build_opener(HTTPSHandler(context=context), HTTPCookieProcessor(CookieJar()))

    def send(path, body=None, csrf=None):
        headers = {"Origin": ORIGIN}
        if csrf:
            headers["X-CSRF-Token"] = csrf
        payload = json.dumps(body).encode() if body is not None else None
        if payload is not None:
            headers["Content-Type"] = "application/json"
        with client.open(Request(ORIGIN + path, data=payload, headers=headers), timeout=10) as response:
            return json.load(response)

    account = json.loads((private / "operator-login.json").read_text())
    login = send("/api/v1/auth/login", {"login_id": account["username"], "password": account["password"]})
    try:
        send("/api/v1/configs/models", {
            "config_id": config_id, "version": version, "artifact_sha256": artifact,
            "pipeline_version": manifest["pipeline_version"], "environment": "REAL",
            "posture_sha256": posture,
        }, login["csrf_token"])
    finally:
        send("/api/v1/auth/logout", {}, login["csrf_token"])

    active["model_config_id"] = config_id
    with NamedTemporaryFile(mode="w", encoding="utf-8", dir=models, prefix=".active.", delete=False) as stream:
        staging = Path(stream.name)
        json.dump(active, stream, indent=2)
        stream.write("\n")
    try:
        os.chown(staging, 2202, 2202)
        staging.chmod(0o400)
        staging.replace(models / "active.json")
    finally:
        staging.unlink(missing_ok=True)
    print(f"Registered {version} ({config_id}).")


if __name__ == "__main__":
    main()
