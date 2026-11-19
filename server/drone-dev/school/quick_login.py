"""Explicitly enabled school SIM access using the existing session/CSRF contract."""
import hashlib
import hmac
import os
import secrets
from datetime import timedelta
from uuid import uuid4

from fastapi import Request, Response
from drone_backend.core import COOKIE, event, fail, mutate, now, one, settings, transaction, workload
from drone_backend.main import login_slots

USER_ID = '89e12df7-1d43-443c-94d8-5ff98047b3bc'
PERMISSIONS = [{'drone_id': 'sim-pi-01', 'scopes': ['read', 'edit', 'control']}]


def quick_login(request: Request, response: Response):
    workload(request, 'operator')
    if os.getenv('SCHOOL_QUICK_LOGIN') != '1':
        fail('QUICK_LOGIN_DISABLED', 403)
    if request.headers.get('origin') not in settings()['origins']:
        fail('ORIGIN_REJECTED', 403)
    if not login_slots.acquire(blocking=False):
        fail('RATE_LIMITED', 429)
    try:
        with transaction(events=True) as c:
            account = one(c, 'SELECT * FROM drone.user_account WHERE user_id=%s', (USER_ID,))
            # Refuse silently expanded or re-purposed accounts.
            if (not account or account['login_id'] != 'school-quick-sim' or
                    account['status'] != 'ACTIVE' or account['permissions'] != PERMISSIONS):
                fail('QUICK_LOGIN_UNAVAILABLE', 503)
            recent = one(c, "SELECT count(*) AS n FROM drone.user_session WHERE user_id=%s AND issued_at>now()-interval '1 minute'", (USER_ID,))
            if recent['n'] >= 10:
                fail('RATE_LIMITED', 429)
            token = secrets.token_urlsafe(32)
            expiry = now() + timedelta(seconds=settings()['session_seconds'])
            session = mutate(c, 'session_create', {'session_id': str(uuid4()), 'user_id': USER_ID,
                'token_digest': hashlib.sha256(token.encode()).hexdigest(), 'issued_at': now(), 'expires_at': expiry})
            event(c, 'SESSION_CREATED', actor=USER_ID, payload={'session_id': session['session_id'], 'access_mode': 'QUICK_SIM'})
    finally:
        login_slots.release()
    response.set_cookie(COOKIE, token, secure=True, httponly=True, samesite='strict', max_age=settings()['session_seconds'], path='/')
    return {'session_id': session['session_id'], 'expires_at': expiry,
        'csrf_token': hmac.new(token.encode(), b'csrf', hashlib.sha256).hexdigest(), 'permissions': account['permissions']}
