"""Only bounded VWorld WMTS GETs. No user URL, redirects, DB or mission mounts."""
import json
import httpx
from fastapi import FastAPI,Depends,HTTPException
from fastapi.responses import Response
from .transport import authorize_service,IDENTITY
app=FastAPI(dependencies=[Depends(authorize_service)],docs_url=None,redoc_url=None)

@app.get('/tiles/{z}/{x}/{y}.png')
def tile(z:int,x:int,y:int):
    if not 0<=z<=19 or not 0<=x<2**z or not 0<=y<2**z:raise HTTPException(422,'Invalid tile')
    config=json.loads((IDENTITY/'vworld-server.json').read_text(encoding='utf-8'))
    # Key and endpoint come from server configuration, never request input.
    try:
        with httpx.Client(timeout=8,trust_env=False,follow_redirects=False) as client:
            with client.stream('GET','https://api.vworld.kr/req/wmts/1.0.0/'+config['key']+f'/Base/{z}/{y}/{x}.png',headers={'Referer':config['domain']}) as r:
                if r.status_code!=200 or not r.headers.get('content-type','').startswith('image/'):raise HTTPException(503,'Map upstream unavailable')
                body=bytearray()
                for part in r.iter_bytes():
                    body.extend(part)
                    if len(body)>2*1024*1024:raise HTTPException(503,'Map tile too large')
                return Response(bytes(body),media_type=r.headers['content-type'])
    except httpx.HTTPError:
        # Upstream exception URLs contain the API key. Never emit them to logs or responses.
        raise HTTPException(503,'Map upstream unavailable') from None

@app.get('/search')
def place_search(query:str,category:str='AUTO',lon:float|None=None,lat:float|None=None,
                 radius_m:int=10000,sort:str='distance'):
    if ((lon is None)!=(lat is None) or (lon is not None and not (-180<=lon<=180 and -90<=lat<=90))
            or not 1000<=radius_m<=20000 or sort not in ('distance','relevance')):
        raise HTTPException(422,'Invalid search location')
    if not 2<=len(query)<=160 or any(ord(c)<32 for c in query):raise HTTPException(422,'Invalid search')
    from .provider_search import search
    cfg=json.loads((IDENTITY/'vworld-server.json').read_text())
    return search(query,category,{'VWORLD_API_KEY':cfg['key'],'VWORLD_API_DOMAIN':cfg['domain']},
                  center=[lon,lat] if lon is not None else None,radius_m=radius_m,sort=sort)
