"""Keep the upstream iterator alive until its explicit, cancellation-safe close."""
from anyio import CancelScope
from starlette.concurrency import run_in_threadpool
from starlette.responses import StreamingResponse


class UpstreamResponse(StreamingResponse):
    def __init__(self, upstream, **kwargs):
        self.upstream = upstream
        self.iterator = upstream.iter_bytes()
        super().__init__(self.iterator, **kwargs)

    def close_upstream(self):
        # Abandoned sync generators can otherwise finalize while HTTPX holds its pool lock.
        try:
            self.iterator.close()
        finally:
            self.upstream.close()

    async def __call__(self, scope, receive, send):
        try:
            await super().__call__(scope, receive, send)
        finally:
            with CancelScope(shield=True):
                await run_in_threadpool(self.close_upstream)
