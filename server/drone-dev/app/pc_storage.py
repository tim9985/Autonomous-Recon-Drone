"""Admission combines fresh PC recording storage and school media quota."""
import time
from app.local_patrol_api import CONTROL, load
from app.local_storage import recording_storage
from drone_backend.core import fail


def status(required=False):
    heartbeat=load(CONTROL/'heartbeat.json',{})
    pc=heartbeat.get('recording_storage',{});now=time.time()
    fresh=(0<=now-heartbeat.get('transport_received_at',0)<15 and 0<=now-pc.get('checked_at',0)<30)
    school=recording_storage(probe=required)
    ready=fresh and pc.get('ready') is True and school['ready']
    reason=None if ready else ('PC_STORAGE_STATUS_STALE' if not fresh else pc.get('reason') or school.get('reason'))
    result=dict(pc,ready=ready,reason=reason,school_media=school,mode='PC_BLACKBOX_SCHOOL_LIVE')
    if required and not ready:fail(reason or 'RECORDING_STORAGE_UNAVAILABLE',503)
    return result
