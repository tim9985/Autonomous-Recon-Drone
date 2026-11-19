"""Bounded backend-local JSON caches; never serve stale on read errors."""
from collections import OrderedDict
import hashlib
import json
from pathlib import Path
from threading import RLock

_json = OrderedDict()
_snapshots = OrderedDict()
_json_lock = RLock()
_snapshot_lock = RLock()
MAX_JSON_BYTES = 32 * 1024 * 1024
MAX_SNAPSHOT_BYTES = 32 * 1024 * 1024


def version(path):
    try:
        value = Path(path).stat()
        return value.st_mtime_ns, value.st_ctime_ns, value.st_size, value.st_ino
    except FileNotFoundError:
        return None


def read_json(path, default=None, *, loader=None):
    """Returned objects are shared and must not be mutated by callers."""
    path = Path(path); key = str(path.absolute()); before = version(path)
    if before is None:
        if default is not None: return default
        raise FileNotFoundError(path)
    with _json_lock:
        old = _json.get(key)
        if old and old[0] == before:
            _json.move_to_end(key)
            return old[1]
    value = loader(path,default) if loader else json.loads(path.read_text(encoding='utf-8'))
    if version(path) == before and before[2] <= MAX_JSON_BYTES // 2:
        with _json_lock:
            _json[key] = (before, value); _json.move_to_end(key)
            while len(_json) > 128 or sum(v[0][2] for v in _json.values()) > MAX_JSON_BYTES:
                _json.popitem(last=False)
    return value


def encoded_snapshot(key, paths, build):
    """Build only after dependency changes; a concurrent write prevents caching."""
    paths = tuple(Path(p) for p in paths)
    before = tuple((str(p.absolute()), version(p)) for p in paths)
    with _snapshot_lock:
        old = _snapshots.get(key)
        if old and old[0] == before:
            _snapshots.move_to_end(key)
            return old[1], old[2]
    value = build()
    body = json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False).encode('utf-8')
    etag = 'W/"' + hashlib.sha256(body).hexdigest() + '"'
    after = tuple((str(p.absolute()), version(p)) for p in paths)
    if before == after and value.get('state') != 'PARTIAL_DATA' and len(body) <= MAX_SNAPSHOT_BYTES // 2:
        with _snapshot_lock:
            _snapshots[key] = (before, body, etag); _snapshots.move_to_end(key)
            while len(_snapshots) > 16 or sum(len(v[1]) for v in _snapshots.values()) > MAX_SNAPSHOT_BYTES:
                _snapshots.popitem(last=False)
    return body, etag
