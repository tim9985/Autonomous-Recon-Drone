"""Service diagnostics only; these thresholds never authorize flight."""
import json
import time
from pathlib import Path
import httpx


def components(storage_root):
    statuses = {}
    with httpx.Client(timeout=2, trust_env=False) as client:
        for name, url in [('jupyter', 'http://127.0.0.1:18459/login'),
                          ('media', 'http://127.0.0.1:18497/v3/paths/list')]:
            try:
                response = client.get(url)
                response.raise_for_status()
                statuses[name] = {'available': True}
            except httpx.HTTPError:
                statuses[name] = {'available': False}
    try:
        worker = json.loads((Path(storage_root) / 'worker-status.json').read_text())
        age = time.time() - worker['updated_unix']
        statuses['vision'] = {'available': 0 <= age < 20,
                              'status_age_seconds': round(age, 2),
                              'cuda_available': worker['cuda_available'],
                              'model_loaded': worker['model_loaded']}
    except (OSError, ValueError, KeyError, TypeError):
        statuses['vision'] = {'available': False}
    return statuses
