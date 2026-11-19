import json
import ssl
from pathlib import Path
import httpx

IDENTITY = Path('/run/identity')

def text(name):
    return (IDENTITY / name).read_text().strip()

def config(name):
    return json.loads(text(name))

def client(socket, hostname, mutual=True):
    ctx = ssl.create_default_context(cafile=str(IDENTITY/'ca.crt'))
    if mutual:
        ctx.load_cert_chain(IDENTITY/'client.crt', IDENTITY/'client.key')
    # Idle proxy sockets also count toward Uvicorn's 24-connection admission limit.
    limits = httpx.Limits(max_connections=8, max_keepalive_connections=4)
    return httpx.Client(base_url='https://'+hostname, timeout=8,
                        transport=httpx.HTTPTransport(uds=socket, verify=ctx, limits=limits), trust_env=False)

