import json,ssl,os
from pathlib import Path
import httpx
from fastapi import HTTPException,Request

IDENTITY=Path(os.environ.get('SCHOOL_IDENTITY','/run/school-identity'))

def service_client(target):
    ctx=ssl.create_default_context(cafile=str(IDENTITY/'ca.crt'))
    ctx.load_cert_chain(IDENTITY/'client.crt',IDENTITY/'client.key')
    return httpx.Client(base_url='https://'+target+'.internal',transport=httpx.HTTPTransport(uds='/run/'+target+'-socket/service.sock',verify=ctx),
        headers={'Authorization':'Bearer '+(IDENTITY/(target+'-token')).read_text(encoding='utf-8').strip()},timeout=30,trust_env=False,follow_redirects=False)

def authorize_service(request:Request):
    import hmac
    policy=json.loads((IDENTITY/'caller.json').read_text(encoding='utf-8'))
    token=request.headers.get('authorization','')
    if not token.isascii() or not hmac.compare_digest(token,'Bearer '+policy['token']) or request.scope.get('client_certificate_sha256')!=policy['certificate_sha256']:
        raise HTTPException(401,'Unknown service identity')
