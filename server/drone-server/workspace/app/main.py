"""Development environment status API. Does not issue flight commands."""
import os
import shutil
from pathlib import Path

import psycopg
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from app.probes import components

app = FastAPI(title="Drone server sandbox", version="0.1.0")
ROOT = Path(os.environ.get("STORAGE_ROOT", "/data"))


def db_check():
    with psycopg.connect(os.environ["DATABASE_URL"], connect_timeout=3) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT version(), PostGIS_Version()")
            row = cur.fetchone()
    return {"postgresql": row[0], "postgis": row[1]}


@app.get("/health/live")
def live():
    return {"status": "ok", "environment": "sandbox", "flight_enabled": False}


@app.get("/health/ready")
def ready():
    try:
        database = db_check()
        stat = shutil.disk_usage(ROOT)
        return {"status": "ok", "database": database,
                "storage": {"root": str(ROOT), "free_bytes": stat.free},
                "flight_enabled": False, "video_profile": "CROP_BASELINE"}
    except Exception:
        raise HTTPException(status_code=503, detail="Database or storage unavailable")


@app.get("/", response_class=HTMLResponse)
def index():
    return """<!doctype html><html lang='ko'><meta charset='utf-8'>
    <meta name='viewport' content='width=device-width,initial-scale=1'>
    <title>드론 서버 샌드박스</title><style>body{font:18px system-ui;max-width:800px;
    margin:60px auto;padding:24px;background:#101820;color:#eaf1f5}a{color:#69d2ff}
    section{background:#1b2a36;padding:24px;border-radius:16px;margin:20px 0}</style>
    <h1>드론 서버 샌드박스</h1><section><p>Ubuntu 24.04 · GPU 개발 환경</p>
    <p>FastAPI · PostgreSQL/PostGIS · SRT/HLS · JupyterLab</p>
    <p>현재는 내부 개발용입니다. 비행 명령은 활성화되지 않았습니다.</p></section>
    <p><a href='/health/ready'>DB·저장소 상태 확인</a> ·
    <a href='/health/components'>Jupyter·미디어·처리 프로세스 상태</a> · <a href='/docs'>API 문서</a></p>
    <section><h2>현장 배포 전 확인</h2><p>운영자 인증, HTTPS/WSS, 외부 UDP 경로,
    저장소 영속성, Pi 및 FC 연결 시험이 필요합니다.</p></section></html>"""


@app.get('/health/components')
def component_health():
    status = components(ROOT)
    return {'status': 'ok' if all(s['available'] for s in status.values()) else 'degraded',
            'scope': 'service diagnostics, not flight safety',
            'components': status, 'flight_enabled': False}
