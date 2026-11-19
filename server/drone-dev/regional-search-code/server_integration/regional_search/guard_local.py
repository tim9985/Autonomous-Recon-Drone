"""Run one acceptance job with existing Windows memory/commit protections."""
import json
from pathlib import Path
import sys
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'ml/region_search'))
from windows_resource_guard import supervise

if __name__ == '__main__':
    output, *command = sys.argv[1:]
    result = supervise(command, Path(output), limit_gib=4, min_available_gib=12, timeout=180)
    print(json.dumps({k: result[k] for k in ('status', 'durationSeconds', 'stopReason')}))
    raise SystemExit(0 if result['status'] == 'PASS' else 1)
