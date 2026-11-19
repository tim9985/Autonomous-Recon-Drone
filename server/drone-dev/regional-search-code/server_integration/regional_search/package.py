"""Read only explicitly listed files from an immutable planning package."""
import hashlib
import json
from pathlib import Path


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False)


def digest(value):
    return hashlib.sha256(canonical(value).encode()).hexdigest()


def adapter_hash():
    root = Path(__file__).parent
    return digest({n:hashlib.sha256((root/n).read_bytes()).hexdigest()
                   for n in ('planner.py','package.py','run_plan.py','worker.py','observe.py','motion.py','pc_worker.py','pc_flight.py','Dockerfile')})


def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def checked_file(root, name):
    root = Path(root).resolve()
    if not isinstance(name, str) or '\\' in name or ':' in name:
        raise ValueError('Invalid package path')
    path = (root / name).resolve()
    if not path.is_relative_to(root) or not path.is_file():
        raise ValueError('Missing or escaping package file')
    return path


def verify(root):
    root = Path(root).resolve()
    manifest = read(root / 'package.json')
    expected = manifest['packageId']
    if expected != digest({k: v for k, v in manifest.items() if k != 'packageId'}):
        raise ValueError('Package identity mismatch')
    if manifest['schema'] != 'REGIONAL_SEARCH_INPUT_V1' or manifest['environment'] != 'SIM':
        raise ValueError('Unsupported planning package')
    for name, sha in manifest['files'].items():
        if hashlib.sha256(checked_file(root, name).read_bytes()).hexdigest() != sha:
            raise ValueError('Package file changed: ' + name)
    return manifest


def save(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix('.tmp')
    tmp.write_text(canonical(value), encoding='utf-8')
    tmp.replace(path)
