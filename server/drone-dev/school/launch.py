import os,sys,ssl
import uvicorn
from app.tls_identity import IdentityProtocol
from .transport import IDENTITY
role=sys.argv[1]
if role not in ('map','egress'):raise SystemExit('Unknown role')
uvicorn.run('school.'+('map_service' if role=='map' else 'egress')+':app',uds='/run/'+role+'-socket/service.sock',http=IdentityProtocol,
 ssl_keyfile=str(IDENTITY/'server.key'),ssl_certfile=str(IDENTITY/'server.crt'),ssl_ca_certs=str(IDENTITY/'ca.crt'),ssl_cert_reqs=ssl.CERT_REQUIRED,
 access_log=False,limit_concurrency=16,timeout_keep_alive=5)
