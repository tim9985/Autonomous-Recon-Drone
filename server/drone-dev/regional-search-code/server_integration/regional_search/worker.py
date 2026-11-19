"""Single serial CPU worker; immutable inputs and an atomic file outbox only."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import time
from uuid import UUID
from .package import read, save, digest


def process(request_path, queue, packages):
    envelope = read(request_path)
    jid = str(UUID(envelope['jobId']))
    request = envelope['request']
    package_id = request['packageId']
    if len(package_id) != 64 or any(c not in '0123456789abcdef' for c in package_id):
        raise ValueError('Invalid package identity')
    package = packages/package_id
    result_path = queue/'results'/(jid+'.json')
    if result_path.exists():
        previous = read(result_path)
        if previous['requestHash'] != envelope['requestHash']:
            raise ValueError('Conflicting job retry')
        return
    work = queue/'work'/jid
    work.mkdir(parents=True, exist_ok=True)
    save(work/'request.json', request)
    save(work/'status.json', dict(state='RUNNING', startedAt=time.time(), jobId=jid))
    env = {**os.environ, 'OMP_NUM_THREADS':'1', 'OPENBLAS_NUM_THREADS':'1', 'MKL_NUM_THREADS':'1',
           'NUMBA_CACHE_DIR':str(queue/'numba-cache'), 'PYTHONUNBUFFERED':'1'}
    error = None
    try:
        if not package.is_dir() or package.resolve().parent != packages.resolve():
            raise ValueError('Unregistered package')
        with (work/'worker.log').open('w', encoding='utf-8') as log:
            completed = subprocess.run([sys.executable, '-m', 'server_integration.regional_search.run_plan',
                '--package', str(package), '--request', str(work/'request.json'), '--output', str(work/'result.json')],
                env=env, stdout=log, stderr=subprocess.STDOUT, timeout=150)
        if completed.returncode:
            error = 'PLANNER_PROCESS_FAILED'
    except subprocess.TimeoutExpired:
        error = 'PLANNER_WATCHDOG'
    except (ValueError, OSError):
        error = 'PLANNER_INPUT_UNAVAILABLE'
    if error:
        result = dict(schema='REGIONAL_SEARCH_RESULT_V1', packageId=package_id, regionId=request['regionId'],
            adapterHash=request.get('adapterHash'), state='FAILED', reason=error, predictedOnly=True, actualEvidenceWrites=0, realExecutable=False)
    else:
        try:
            result = read(work/'result.json')
        except (OSError, ValueError):
            result = dict(schema='REGIONAL_SEARCH_RESULT_V1', packageId=package_id, regionId=request['regionId'],
                adapterHash=request.get('adapterHash'),state='FAILED', reason='PLANNER_RESULT_MISSING', predictedOnly=True, actualEvidenceWrites=0, realExecutable=False)
    save(result_path, dict(jobId=jid, requestHash=envelope['requestHash'], resultHash=digest(result), result=result))


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--queue', type=Path, required=True)
    p.add_argument('--packages', type=Path, required=True)
    p.add_argument('--once', action='store_true')
    a = p.parse_args()
    for name in ('requests', 'results', 'work', 'numba-cache'):
        (a.queue/name).mkdir(parents=True, exist_ok=True)
    rejected = set()
    while True:
        for path in sorted((a.queue/'requests').glob('*.json')):
            identity = (path.name,path.stat().st_mtime_ns)
            if identity in rejected:
                continue
            try:
                process(path, a.queue, a.packages)
            except (ValueError, KeyError, OSError, json.JSONDecodeError) as exc:
                rejected.add(identity)
                print(json.dumps({'event':'JOB_REJECTED','file':path.name,'reason':type(exc).__name__}), flush=True)
        if a.once:
            return
        time.sleep(1.)


if __name__ == '__main__':
    main()
