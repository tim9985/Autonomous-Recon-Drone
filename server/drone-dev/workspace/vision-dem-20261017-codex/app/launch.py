import ssl
import sys
import importlib
import uvicorn
from app.common import IDENTITY
from app.tls_identity import IdentityProtocol, IdentityWebSocketProtocol
role=sys.argv[1]
if role not in ('backend','web','gateway'):
    raise SystemExit('Unknown service role')
application=importlib.import_module('drone_backend.deployment' if role=='backend' else 'app.'+role).app
if role!='backend':
    from app.communication import CommunicationTrace
    application.add_middleware(CommunicationTrace,service=role)
uvicorn.run(application,uds='/run/'+role+'-socket/service.sock',
            http=IdentityProtocol,
            ws=IdentityWebSocketProtocol,
            ssl_keyfile=str(IDENTITY/'server.key'),ssl_certfile=str(IDENTITY/'server.crt'),
            ssl_ca_certs=str(IDENTITY/'ca.crt'),
            ssl_cert_reqs=ssl.CERT_NONE if role=='gateway' else ssl.CERT_REQUIRED,
            access_log=False,limit_concurrency=24,timeout_keep_alive=5)
