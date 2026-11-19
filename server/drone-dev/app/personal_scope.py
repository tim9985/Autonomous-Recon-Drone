"""Visibility of school SIM records and PC workers for individual operators."""
import json
import os
from pathlib import Path

from drone_backend.core import fail, one


def personal(actor):
    return any('personal_workspace' in entry.get('scopes', ()) for entry in actor['permissions'])


def require_owner(conn, actor, owner):
    if actor['user_id'] != owner and not one(conn, 'SELECT drone.school_owner_visible(%s,%s) AS allowed',
                                            (actor['user_id'], owner))['allowed']:
        fail('RESOURCE_NOT_FOUND', 404)


def bound_worker(actor):
    root = Path(os.environ.get('SCHOOL_PC_ROOT', '/data/pc-workspaces'))
    binding = root / str(actor['user_id']) / 'binding.json'
    try:
        row = json.loads(binding.read_bytes())
    except FileNotFoundError:
        return None
    if row.get('owner') != str(actor['user_id']):
        return None
    return row.get('worker_id')


def visible_workers(actor, workers):
    owned = bound_worker(actor)
    return [worker for worker in workers if worker['worker_id'] == owned
            or (not personal(actor) and not worker['worker_id'].startswith('school-pc-'))]


def check_worker(actor, worker):
    if (personal(actor) or worker.startswith('school-pc-')) and worker != bound_worker(actor):
        fail('PC_WORKER_NOT_OWNED', 403)


def previous_recording(conn, owner):
    row = one(conn, """SELECT run_id FROM simulation.run
        WHERE creator_user_id=%s AND state='COMPLETED'
        AND request->'pipeline_config' ? 'mission_id'
        AND (request->'pipeline_config' @> '{"analysis_policy":"POSTFLIGHT","realtime_vision_enabled":false}'::jsonb
          OR request->'pipeline_config' @> '{"analysis_policy":"LIVE","realtime_vision_enabled":true}'::jsonb)
        ORDER BY ended_at DESC NULLS LAST,run_id DESC LIMIT 1""", (owner,))
    return str(row['run_id']) if row else None
