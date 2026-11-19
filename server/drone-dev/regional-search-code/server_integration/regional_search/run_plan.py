"""Single-process CLI used by the bounded server worker and local acceptance."""
import argparse
import json
import os
from pathlib import Path
import sys
for key in ('OPENBLAS_NUM_THREADS', 'OMP_NUM_THREADS', 'MKL_NUM_THREADS'):
    os.environ[key] = '1'
if __package__ in (None, ''):
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from server_integration.regional_search.package import read, save


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--package', type=Path, required=True)
    p.add_argument('--request', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    a = p.parse_args()
    from server_integration.regional_search.planner import prepare
    result = prepare(a.package, read(a.request))
    save(a.output, result)
    print(json.dumps({k: result[k] for k in ('state', 'preparationSeconds', 'targetAreaM2', 'actualEvidenceWrites')}))


if __name__ == '__main__':
    main()
