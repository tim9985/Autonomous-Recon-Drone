"""Local recording admission; read-only status and a bounded departure write probe."""
import os
import shutil
import tempfile
import time

from drone_backend.core import STORAGE, settings, transaction, one, fail

GIB = 1024 ** 3
QUOTA_RESERVE = GIB
DISK_RESERVE = 10 * GIB  # Same host volume also retains the original RGB frames.


def recording_storage(*, probe=False):
    result = dict(ready=False, checked_at=time.time(), reason='RECORDING_STORAGE_UNAVAILABLE',
                  required_quota_bytes=QUOTA_RESERVE, required_disk_bytes=DISK_RESERVE)
    try:
        raw=os.environ.get('LOCAL_RECORDING_ROOT')
        if raw:
            free=shutil.disk_usage(raw).free;metadata_free=shutil.disk_usage(STORAGE).free
            result.update(mode='BLACKBOX',disk_free_bytes=free,metadata_free_bytes=metadata_free,
                required_quota_bytes=0,available_bytes=free,required_disk_bytes=DISK_RESERVE)
            if free<DISK_RESERVE or metadata_free<GIB:result['reason']='RECORDING_SPACE_REQUIRED'
            else:
                if probe:
                    with tempfile.TemporaryFile(prefix='.recording-check-',dir=STORAGE) as file:
                        file.write(b'local-blackbox-preflight\n');file.flush();os.fsync(file.fileno())
                result.update(ready=True,reason=None)
            return result
        limit = int(settings()['max_storage_bytes'])
        with transaction(snapshot=True) as c:
            used = int(one(c, """SELECT coalesce(sum(coalesce((meta->>'byte_size')::bigint,
                octet_length((meta->'manifest')::text),0)),0) AS n FROM drone.media_asset
                WHERE state IN ('WRITING','STORED') OR
                (state='FAILED' AND meta->>'cleanup_pending'='true')""")['n'])
        free = shutil.disk_usage(STORAGE).free
        available = max(0, limit - used)
        result.update(limit_bytes=limit, used_bytes=used, available_bytes=available, disk_free_bytes=free)
        if available < QUOTA_RESERVE:
            result['reason'] = 'RECORDING_QUOTA_RESERVE_REQUIRED'
        elif free < DISK_RESERVE:
            result['reason'] = 'RECORDING_SPACE_REQUIRED'
        else:
            if probe:
                # Only this newly created temporary file is removed on exit.
                with tempfile.TemporaryFile(prefix='.recording-check-', dir=STORAGE) as file:
                    file.write(b'local-recording-preflight\n')
                    file.flush()
                    os.fsync(file.fileno())
            result.update(ready=True, reason=None)
    except OSError:
        result['reason'] = 'RECORDING_STORAGE_NOT_WRITABLE'
    except Exception:
        # A failed quota query is not permission to start a sortie.
        result['reason'] = 'RECORDING_STORAGE_UNAVAILABLE'
    return result


def require_recording_storage():
    result = recording_storage(probe=True)
    if not result['ready']:
        fail(result['reason'], 503)
    return result
