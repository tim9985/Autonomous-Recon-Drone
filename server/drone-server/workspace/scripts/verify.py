"""Verify the isolated environment, not flight readiness or model accuracy."""
import json
import subprocess
import time
from pathlib import Path

import cv2
import httpx
import psycopg
import torch
import os

report = {"checked_unix": time.time(), "scope": "server sandbox only"}
release = Path('/etc/os-release').read_text()
assert 'VERSION_ID="24.04"' in release, release
report['os'] = release
assert torch.cuda.is_available(), 'CUDA unavailable'
device = torch.cuda.get_device_name(0)
x = torch.arange(1024, device='cuda', dtype=torch.float32)
assert torch.allclose(x * 2, x + x)
torch.cuda.synchronize()
report['gpu'] = {'device': device, 'torch': torch.__version__,
                 'runtime_cuda': torch.version.cuda, 'tensor_operation': 'passed'}
protocols = subprocess.check_output(['ffmpeg', '-hide_banner', '-protocols'], text=True)
assert 'srt' in protocols
report['ffmpeg_srt'] = True
with psycopg.connect(os.environ['DATABASE_URL']) as conn:
    with conn.cursor() as cur:
        cur.execute("SELECT PostGIS_Version(), ST_SRID(ST_SetSRID(ST_MakePoint(127,37),4326))")
        version, srid = cur.fetchone()
        assert srid == 4326
        report['postgis'] = version
for name, url in [('api', 'http://127.0.0.1:18400/health/ready'),
                  ('jupyter', 'http://127.0.0.1:18459/lab'),
                  ('media', 'http://127.0.0.1:18497/v3/paths/list')]:
    resp = httpx.get(url, follow_redirects=True)
    resp.raise_for_status()
    report[name] = {'status': resp.status_code}
    if name == 'jupyter':
        assert '/login' in str(resp.url), 'Unauthenticated Jupyter must require login'
        report[name]['login_required'] = True
        with httpx.Client(base_url='http://127.0.0.1:18459', follow_redirects=True) as client:
            client.get('/login')
            client.post('/login', data={
                '_xsrf': client.cookies.get('_xsrf'),
                'password': Path('/run/secrets/jupyter-token').read_text().strip(),
            })
            contents = client.get('/api/contents')
            contents.raise_for_status()
            root_names = sorted(item['name'] for item in contents.json()['content'])
            assert all(item in root_names for item in ['app', 'config', 'scripts', 'data'])
            report[name]['token_login_verified'] = True
            report[name]['workspace_entries'] = root_names
files = sorted(Path('/data/missions/sample/video').rglob('*.mp4'))
assert files, 'SRT recording missing'
decoded = 0
started = time.perf_counter()
width = height = 0
for file in files:
    capture = cv2.VideoCapture(str(file))
    while True:
        ok, frame = capture.read()
        if not ok:
            break
        height, width = frame.shape[:2]
        decoded += 1
    capture.release()
elapsed = time.perf_counter() - started
assert decoded >= 150, decoded
assert (width, height) == (1920, 1080), (width, height)
report['sample_video'] = {'recordings': [str(f) for f in files],
                          'frames_decoded': decoded, 'width': width, 'height': height,
                          'decode_fps': round(decoded / elapsed, 2),
                          'model_inference_tested': False}
status = json.loads(Path('/data/worker-status.json').read_text())
assert status['flight_enabled'] is False
assert status['model_loaded'] is False
report['vision_worker'] = status
report['result'] = 'passed'
print(json.dumps(report, indent=2, ensure_ascii=False))
