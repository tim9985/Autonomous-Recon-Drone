"""Shared SIM execution boundary, deliberately independent of HTTP and NumPy."""
import math
import time

PROFILE = 'SIM_BODY_YAW_PHASES_V1'
CAPABILITIES = ['POSITION_VELOCITY_YAW', 'PAIRED_RGB_POSE', 'LOCAL_LOSS_STOP', 'INPUT_BINDING']
ACTIVE = ('QUEUED', 'RUNNING', 'STOP_REQUESTED', 'UNCONFIRMED')


def validate_frame(packet, received=None):
    received = time.time() if received is None else received
    s = packet['observation']
    if s.get('source') != 'AIRSIM_RGB_PAIRED_CAMERA_POSE' or s.get('evidenceOrigin') != 'CAPTURED_RGB':
        raise ValueError('CAPTURED_RGB_REQUIRED')
    if type(s.get('frameId')) is not int or not 0 < s['frameId'] < 2**63:
        raise ValueError('INVALID_FRAME_ID')
    if (s.get('width'), s.get('height'), s.get('horizontalFovDeg')) != (1920, 1080, 78.):
        raise ValueError('CAMERA_CHANGED')
    for key, size in [('positionNed', 3), ('quaternion', 4)]:
        if len(s.get(key, [])) != size or not all(type(v) in (float, int) and math.isfinite(v) for v in s[key]):
            raise ValueError('INVALID_PAIRED_POSE')
    if abs(sum(v*v for v in s['quaternion'])-1.) > 1e-4:
        raise ValueError('INVALID_PAIRED_POSE')
    if not 0 <= packet['receivedAt']-s['capturedAt'] <= 1 or not -2 <= received-packet['receivedAt'] <= 10:
        raise ValueError('FRAME_TIME_INVALID')
    q = s['quality']
    if q.get('source') != 'RGB_LUMA_LAPLACIAN_V1' or not all(type(q.get(k)) in (int,float) and math.isfinite(q[k]) for k in ('sharpness','meanLuma','clippedFraction')):
        raise ValueError('RGB_QUALITY_REQUIRED')
    sha = packet.get('imageSha256', '')
    if len(sha) != 64 or any(c not in '0123456789abcdef' for c in sha):
        raise ValueError('RGB_HASH_REQUIRED')
    if not packet.get('recordingName','').endswith('.png') or '/' in packet['recordingName'] or '\\' in packet['recordingName']:
        raise ValueError('RECORDING_REFERENCE_REQUIRED')
    before, after = packet['aircraftBefore'], packet['aircraftAfter']
    # Late transport is recorded but cannot extend a valid observation streak.
    return bool(packet.get('eligible') is True and s.get('valid') is True
                and before.get('armed') is True and after.get('armed') is True
                and before.get('valid') is True and after.get('valid') is True
                and 0 <= packet['receivedAt']-before['time'] < 2
                and 0 <= packet['receivedAt']-after['time'] < 2
                and received-s['capturedAt'] <= 1)


def ready_reasons(job, mission, package, worker, now):
    reasons = []
    result = job.get('result') or {}
    if job['state'] != 'READY' or not result.get('execution'):
        reasons.append('REGIONAL_PLAN_NOT_READY')
    if job['mission_revision'] != mission['draft_revision']:
        reasons.append('REVISION_CONFLICT')
    if not package or (package['packageId'],package['adapterHash']) != (job['package_id'],job['request'].get('adapterHash')):
        reasons.append('REGIONAL_SEARCH_INPUT_CHANGED')
    if not worker or now-worker['seen_at'].timestamp() > 4:
        reasons.append('SIM_EXECUTOR_NOT_FRESH')
    elif (not worker['ready'] or worker['package_id'] != job['package_id']
          or worker['adapter_hash'] != job['request']['adapterHash']
          or worker['world_version'] != result.get('worldVersion')
          or not set(CAPABILITIES).issubset(worker['capabilities'])):
        reasons.append('SIM_EXECUTOR_NOT_READY')
    return reasons
