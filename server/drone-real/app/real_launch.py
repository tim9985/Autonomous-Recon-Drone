import ssl,sys,uvicorn
from app.common import IDENTITY
from app.tls_identity import IdentityProtocol,IdentityWebSocketProtocol
role=sys.argv[1]
assert role in ('backend','gateway')
uvicorn.run('drone_backend.real:app' if role=='backend' else 'app.gateway:app',uds='/run/'+role+'-socket/service.sock',
 http=IdentityProtocol,ws=IdentityWebSocketProtocol,ssl_keyfile=str(IDENTITY/'server.key'),ssl_certfile=str(IDENTITY/'server.crt'),
 ssl_ca_certs=str(IDENTITY/'ca.crt'),ssl_cert_reqs=ssl.CERT_NONE if role=='gateway' else ssl.CERT_REQUIRED,
 access_log=False,limit_concurrency=24,timeout_keep_alive=5)
