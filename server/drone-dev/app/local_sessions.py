"""Renew an authenticated local session without changing its identity or CSRF token."""
from collections import OrderedDict
import hashlib
import logging
import time

from starlette.concurrency import run_in_threadpool
from drone_backend.core import COOKIE, now, one, transaction

log = logging.getLogger(__name__)


def refresh(token_digest):
    with transaction() as conn:
        return one(conn, 'SELECT drone.local_refresh_session(%s) AS expires_at',
                   (token_digest,))['expires_at']


def install(app):
    checked = OrderedDict()

    @app.middleware('http')
    async def keep_session(request, call_next):
        response = await call_next(request)
        # A successful user() check is required; failed/expired/revoked sessions
        # can never be renewed by this middleware. Explicit logout wins.
        token = request.cookies.get(COOKIE)
        if (not token or not getattr(request.state, 'trace_user', None)
                or response.status_code >= 400 or request.url.path.endswith('/auth/logout')):
            return response
        digest = hashlib.sha256(token.encode()).hexdigest()
        clock = time.monotonic()
        if checked.get(digest, 0) > clock:
            return response
        checked[digest] = clock+60  # Coalesce concurrent tile/poll responses.
        checked.move_to_end(digest)
        while len(checked) > 2048:
            checked.popitem(last=False)
        try:
            expiry = await run_in_threadpool(refresh, digest)
            if expiry:
                seconds = max(0, int((expiry-now()).total_seconds()))
                if seconds:
                    response.set_cookie(COOKIE, token, max_age=seconds, secure=True,
                                        httponly=True, samesite='strict', path='/')
                    checked[digest] = clock+900
        except Exception as exc:
            # Preserve the successful request during a temporary renewal issue.
            log.warning('Local session renewal unavailable: %s', type(exc).__name__)
        return response
