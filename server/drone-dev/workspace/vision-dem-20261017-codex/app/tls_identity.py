import hashlib
from uvicorn.protocols.http.h11_impl import H11Protocol
from uvicorn.protocols.websockets.websockets_impl import WebSocketProtocol

class IdentityProtocol(H11Protocol):
    """Attach identity from the verified TLS socket, never from HTTP headers."""
    def connection_made(self, transport):
        super().connection_made(transport)
        tls=transport.get_extra_info('ssl_object')
        certificate=tls.getpeercert(binary_form=True) if tls else None
        fingerprint=hashlib.sha256(certificate).hexdigest() if certificate else None
        original=self.app
        async def bound(scope,receive,send):
            scope['client_certificate_sha256']=fingerprint
            await original(scope,receive,send)
        self.app=bound

class IdentityWebSocketProtocol(WebSocketProtocol):
    """TLS identity must survive HTTP->WebSocket upgrade too."""
    def connection_made(self,transport):
        super().connection_made(transport)
        tls=transport.get_extra_info('ssl_object')
        certificate=tls.getpeercert(binary_form=True) if tls else None
        fingerprint=hashlib.sha256(certificate).hexdigest() if certificate else None
        original=self.app
        async def bound(scope,receive,send):
            scope['client_certificate_sha256']=fingerprint
            await original(scope,receive,send)
        self.app=bound

