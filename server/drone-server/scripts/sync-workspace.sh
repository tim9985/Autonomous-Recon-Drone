#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"
python3 - <<'PY'
import os, pathlib, tempfile
root = pathlib.Path.cwd()
for folder in ['app', 'config', 'scripts']:
    for source in (root/folder).rglob('*'):
        if not source.is_file() or '__pycache__' in source.parts:
            continue
        target = root/'workspace'/source.relative_to(root)
        target.parent.mkdir(parents=True, exist_ok=True)
        content = source.read_bytes()
        if target.exists() and target.read_bytes() == content:
            continue
        with tempfile.NamedTemporaryFile(dir=target.parent, delete=False) as out:
            out.write(content)
            temp = out.name
        os.chmod(temp, source.stat().st_mode & 0o777)
        os.replace(temp, target)
        print(source.relative_to(root))
PY
