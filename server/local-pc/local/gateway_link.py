"""Raspberry Pi -> REAL API connection agent. Python standard library only.

TLS ends at backend.internal through a loopback SSH tunnel. Registration is a
real gateway connection event; this agent never invents aircraft telemetry.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import fcntl
import http.client
import json
import os
from pathlib import Path
import signal
import socket
import ssl
import threading
from uuid import UUID, uuid4


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def atomic_json(path, value):
    path = Path(path)
    temporary = path.with_suffix(".tmp")
    with temporary.open("w", encoding="utf-8") as stream:
        os.chmod(temporary, 0o600)
        json.dump(value, stream, indent=2)
        stream.write("\n")
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(temporary, path)


class LinkError(Exception):
    def __init__(self, code, http_status=None):
        super().__init__(code)
        self.code = code
        self.http_status = http_status


class TunnelTLS(http.client.HTTPSConnection):
    def __init__(self, config, context):
        super().__init__(config["tls_server_name"], timeout=config.get("timeout_seconds", 10), context=context)
        self.endpoint = (config["connect_host"], config["connect_port"])

    def connect(self):
        raw = socket.create_connection(self.endpoint, self.timeout)
        try:
            self.sock = self._context.wrap_socket(raw, server_hostname=self.host)
        except BaseException:
            raw.close()
            raise


class RealAPI:
    def __init__(self, config):
        self.config = config
        identity = Path(config["identity_directory"])
        self.context = ssl.create_default_context(cafile=str(identity / "ca.crt"))
        self.context.minimum_version = ssl.TLSVersion.TLSv1_2
        self.context.load_cert_chain(identity / "client.crt", identity / "client.key")
        self.token = (identity / "token").read_text(encoding="utf-8").strip()
        if not self.token or not self.token.isascii() or any(c.isspace() for c in self.token):
            raise LinkError("INVALID_TOKEN_FILE")

    def request(self, method, path, body=None):
        connection = TunnelTLS(self.config, self.context)
        headers = {"Authorization": "Bearer " + self.token, "Accept": "application/json"}
        payload = None
        if body is not None:
            headers["Content-Type"] = "application/json"
            payload = json.dumps(body).encode("utf-8")
        try:
            connection.request(method, path, body=payload, headers=headers)
            response = connection.getresponse()
            data = response.read(131073)
            if len(data) > 131072:
                raise LinkError("RESPONSE_TOO_LARGE", response.status)
            try:
                value = json.loads(data)
            except (UnicodeDecodeError, json.JSONDecodeError):
                raise LinkError("INVALID_JSON_RESPONSE", response.status) from None
            return response.status, value
        finally:
            connection.close()


def load_config(path):
    config = json.loads(Path(path).read_text(encoding="utf-8"))
    if config.get("environment") != "REAL" or config.get("flight_enabled") is not False:
        raise LinkError("REAL_STORAGE_ONLY_REQUIRED")
    if config.get("connect_host") != "127.0.0.1" or config.get("tls_server_name") != "backend.internal":
        raise LinkError("EXPECTED_LOOPBACK_TUNNEL_AND_TLS_NAME")
    if not 1 <= config.get("connect_port", 0) <= 65535:
        raise LinkError("INVALID_PORT")
    if not 10 <= config.get("interval_seconds", 30) <= 3600:
        raise LinkError("INVALID_INTERVAL")
    if not 1 <= config.get("timeout_seconds", 10) <= 60:
        raise LinkError("INVALID_TIMEOUT")
    if not 1 <= int(config["initial_control_epoch"]) < 2**63:
        raise LinkError("INVALID_INITIAL_EPOCH")
    for key in ("identity_directory", "state_directory"):
        if not Path(config[key]).is_absolute():
            raise LinkError("ABSOLUTE_PATH_REQUIRED")
    return config


def connection_check(api):
    status, value = api.request("GET", "/device/v1/commands")
    if status == 200 and value == []:
        return {"authenticated": True, "flight_enabled": False, "device_api_status": status,
                "device_api_code": "EMPTY_LEGACY_COMMAND_QUEUE"}
    error = value.get("error") if isinstance(value, dict) else None
    if status != 503 or not isinstance(error, dict) or error.get("code") != "REAL_FLIGHT_DISABLED":
        raise LinkError("UNEXPECTED_DEVICE_AUTH_RESPONSE", status)
    return {"authenticated": True, "flight_enabled": False, "device_api_status": status,
            "device_api_code": "REAL_FLIGHT_DISABLED"}


def load_session(config):
    path = Path(config["state_directory"]) / "session.json"
    if path.exists():
        session = json.loads(path.read_text(encoding="utf-8"))
        UUID(session["session_id"])
        if session.get("environment") != "REAL" or not 1 <= int(session["control_epoch"]) < 2**63:
            raise LinkError("INVALID_PERSISTED_SESSION")
    else:
        session = {"session_id": str(uuid4()), "control_epoch": str(config["initial_control_epoch"]),
                   "environment": "REAL"}
        atomic_json(path, session)
    return session


def register(api, config, session):
    status, value = api.request("POST", "/device/v1/sessions", session)
    if status != 200:
        # Do not increment epochs to displace a newer gateway session.
        raise LinkError("SESSION_REGISTRATION_REJECTED", status)
    if not isinstance(value, dict):
        raise LinkError("INVALID_SESSION_RESPONSE")
    state = value.get("gateway_state", {})
    if (value.get("drone_id") != config["drone_id"] or value.get("gateway_id") != config["gateway_id"]
            or state.get("session_id") != session["session_id"]
            or str(value.get("control_epoch")) != session["control_epoch"]
            or state.get("environment") != "REAL" or state.get("flight_enabled") is not False):
        raise LinkError("SESSION_IDENTITY_MISMATCH")
    return {"session_registered": True, "session_id": session["session_id"],
            "control_epoch": session["control_epoch"], "drone_id": value["drone_id"],
            "gateway_id": value["gateway_id"], "flight_enabled": False}


def safe_failure(exc):
    result = {"error_type": type(exc).__name__}
    if isinstance(exc, LinkError):
        result.update(error_code=exc.code, http_status=exc.http_status)
    # HTTP bodies, credentials and arbitrary exception messages are not logged.
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", default="/etc/drone-gateway/config.json")
    parser.add_argument("mode", choices=("check", "register", "run"))
    args = parser.parse_args()
    config = load_config(args.config)
    if args.mode == "check":
        print(json.dumps({"checked_at": utc_now(), **connection_check(RealAPI(config))}))
        return 0
    state_dir = Path(config["state_directory"])
    state_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
    with (state_dir / "agent.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        session = load_session(config)
        stop = threading.Event()
        for signum in (signal.SIGTERM, signal.SIGINT):
            signal.signal(signum, lambda *_: stop.set())
        last_success = None
        last_summary = None
        while not stop.is_set():
            report = {"checked_at": utc_now(), "environment": "REAL", "flight_enabled": False,
                      "aircraft_telemetry": "NOT_CONFIGURED", "aircraft_control": "DISABLED"}
            try:
                api = RealAPI(config)
                report.update(connection_check(api))
                report.update(register(api, config, session))
                last_success = report["checked_at"]
                report["state"] = "CONNECTED"
            except Exception as exc:
                report.update(state="DISCONNECTED", authenticated=False, **safe_failure(exc))
            report["last_success_at"] = last_success
            atomic_json(state_dir / "status.json", report)
            summary = {k: v for k, v in report.items() if k not in ("checked_at", "last_success_at")}
            if summary != last_summary or args.mode != "run":
                print(json.dumps(report), flush=True)
                last_summary = summary
            if args.mode != "run":
                return 0 if report["state"] == "CONNECTED" else 1
            stop.wait(config.get("interval_seconds", 30))
        atomic_json(state_dir / "status.json", {"state": "STOPPED", "checked_at": utc_now(),
                    "last_success_at": last_success, "flight_enabled": False})
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(json.dumps({"state": "ERROR", **safe_failure(exc)}), flush=True)
        raise SystemExit(1)
