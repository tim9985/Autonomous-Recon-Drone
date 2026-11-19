"""Bounded read-only serving of version-pinned derived spatial artifacts."""
import json,math,os,sqlite3
from functools import lru_cache
from pathlib import Path
from contextlib import contextmanager
import numpy as np
import rasterio
from rasterio.transform import from_bounds
from rasterio.warp import reproject,Resampling
from rasterio.io import MemoryFile
from rasterio.windows import Window
from pyproj import Transformer
from fastapi import FastAPI,Depends,HTTPException,Query,Request
from fastapi.responses import FileResponse,Response,HTMLResponse
from .transport import authorize_service,service_client,IDENTITY

ROOT=Path(os.getenv('SCHOOL_SPATIAL','/spatial'))
app=FastAPI(dependencies=[Depends(authorize_service)],docs_url=None,redoc_url=None)

@lru_cache(maxsize=1)
def catalog():return json.loads((ROOT/'catalog.json').read_text(encoding='utf-8'))
def info(rid):
    value=next((m for m in catalog() if m['release_id']==rid),None)
    if not value:raise HTTPException(404,'Unknown spatial release')
    return value
def dataset(env):return next(m for m in catalog() if m['environment_id']==env)
def folder(rid):info(rid);return ROOT/rid
@contextmanager
def db(rid):
    c=sqlite3.connect((folder(rid)/'regions.sqlite3').as_uri()+'?mode=ro&immutable=1',uri=True);c.row_factory=sqlite3.Row
    try:yield c
    finally:c.close()
def bbox(value):
    try:
        v=list(map(float,value.split(',')))
        if len(v)!=4 or not all(map(math.isfinite,v)) or not (-180<=v[0]<v[2]<=180 and -90<=v[1]<v[3]<=90):raise ValueError()
        return v
    except ValueError:raise HTTPException(422,'Invalid bbox')

@app.get('/api/v1/spatial-releases/{rid}/regions')
def regions(rid:str,bounds:str|None=None,after:int=Query(0,ge=0),limit:int=Query(100,ge=1,le=200),geometry:bool=False):
    params=[];where='r.ordinal>?';params.append(after)
    if bounds:
        w,s,e,n=bbox(bounds);where+=' AND r.east>=? AND r.west<=? AND r.north>=? AND r.south<=?';params.extend([w,e,s,n])
    with db(rid) as c:rows=c.execute('SELECT r.* FROM regions r WHERE '+where+' ORDER BY r.ordinal LIMIT ?',(*params,limit+1)).fetchall()
    features=[]
    for r in rows[:limit]:
        p=json.loads(r['properties']);p.update(zoneId=r['source_id'],representativePoint=[r['longitude'],r['latitude']])
        features.append({'type':'Feature','id':r['source_id'],'properties':p,'geometry':json.loads(r['geometry']) if geometry else None})
    return {'type':'FeatureCollection','features':features,'next_cursor':rows[limit-1]['ordinal'] if len(rows)>limit else None,'release_id':rid}

@app.get('/api/v1/spatial-releases/{rid}/selection')
def selection(rid:str,bounds:str):
    w,s,e,n=bbox(bounds)
    with db(rid) as c:rows=c.execute('SELECT source_id FROM regions WHERE longitude BETWEEN ? AND ? AND latitude BETWEEN ? AND ? ORDER BY source_id LIMIT 4097',(w,e,s,n)).fetchall()
    if len(rows)>4096:raise HTTPException(422,'선택 범위를 줄여주세요. 최대 4096구역입니다.')
    return {'release_id':rid,'selected_zone_ids':[r['source_id'] for r in rows]}

@lru_cache(maxsize=2)
def colors(rid):return json.loads((folder(rid)/'colors.json').read_text(encoding='utf-8'))
@lru_cache(maxsize=512)
def raster_tile(rid,z,x,y):
    if not 0<=z<=20 or not 0<=x<2**z or not 0<=y<2**z:raise HTTPException(422,'Invalid tile')
    span=40075016.68557849/2**z;w=-20037508.342789244+x*span;n=20037508.342789244-y*span;px=span/256
    arr=np.zeros((258,258),dtype=np.int32)
    with rasterio.open(folder(rid)/'regions.tif') as src:reproject(rasterio.band(src,1),arr,src_transform=src.transform,src_crs=src.crs,dst_transform=from_bounds(w-px,n-span-px,w+span+px,n+px,258,258),dst_crs='EPSG:3857',resampling=Resampling.nearest,src_nodata=0,dst_nodata=0)
    ids=arr[1:-1,1:-1];rgba=np.zeros((4,256,256),dtype=np.uint8)
    for key in np.unique(ids):
        if not key:continue
        color=colors(rid).get(str(key),'#88949c');mask=ids==key
        for ch in range(3):rgba[ch][mask]=int(color[1+ch*2:3+ch*2],16)
        rgba[3][mask]=85
    border=(ids!=arr[:-2,1:-1])|(ids!=arr[2:,1:-1])|(ids!=arr[1:-1,:-2])|(ids!=arr[1:-1,2:]);rgba[3][border&(ids>0)]=215
    with MemoryFile() as f:
        with f.open(driver='PNG',width=256,height=256,count=4,dtype='uint8') as dst:dst.write(rgba)
        return f.read()

@app.get('/api/v1/spatial-releases/{rid}/tiles/{z}/{x}/{y}.png')
def tiles(rid:str,z:int,x:int,y:int):return Response(raster_tile(rid,z,x,y),media_type='image/png')

@app.get('/api/v1/spatial-releases/{rid}/point')
def point(rid:str,longitude:float,latitude:float):
    if not math.isfinite(longitude) or not math.isfinite(latitude) or not -180<=longitude<=180 or not -90<=latitude<=90:raise HTTPException(422,'Invalid point')
    from shapely.geometry import shape,Point
    with db(rid) as c:rows=c.execute('SELECT * FROM regions WHERE west<=? AND east>=? AND south<=? AND north>=?',(longitude,longitude,latitude,latitude)).fetchall()
    for r in rows:
        if shape(json.loads(r['geometry'])).covers(Point(longitude,latitude)):return {'region':json.loads(r['properties']),'zone_id':r['source_id'],'release_id':rid}
    return {'region':None,'release_id':rid}

@lru_cache(maxsize=2)
def raster_zones(rid):return json.loads((folder(rid)/'raster-zones.json').read_text(encoding='utf-8'))

@app.get('/api/v1/spatial-releases/{rid}/cells')
def cells(rid:str,bounds:str,after:int=Query(0,ge=0),limit:int=Query(200,ge=1,le=500)):
    m=info(rid);w,s,e,n=bbox(bounds)
    to_metric=Transformer.from_crs(4326,m['source_crs'],always_xy=True)
    to_geo=Transformer.from_crs(m['source_crs'],4326,always_xy=True)
    corners=[to_metric.transform(x,y) for x,y in [(w,s),(w,n),(e,s),(e,n)]]
    if not all(math.isfinite(v) for p in corners for v in p):raise HTTPException(422,'Invalid bounds')
    with rasterio.open(folder(rid)/'regions.tif') as src:
        indices=[src.index(x,y) for x,y in corners]
        r0=max(0,min(p[0] for p in indices));r1=min(src.height,max(p[0] for p in indices)+1)
        c0=max(0,min(p[1] for p in indices));c1=min(src.width,max(p[1] for p in indices)+1)
        width=max(0,c1-c0);height=max(0,r1-r0);total=width*height
        if total>20000:raise HTTPException(422,'CELL_VIEWPORT_TOO_LARGE')
        if not total:return {'features':[],'next_cursor':None,'release_id':rid}
        values=src.read(1,window=Window(c0,r0,width,height));items=[];offset=after
        while offset<total and len(items)<limit:
            row,col=divmod(offset,width);offset+=1;owner=int(values[row,col])
            if not owner:continue
            x,y=src.transform*(c0+col,r0+row+1);gx=round(x/5);gy=round(y/5)
            cid=f'utm52n-5m-v1:{gx}:{gy}' if m['source_crs']==32652 else f'5179:5:{gx}:{gy}'
            ring=[to_geo.transform(px,py) for px,py in [(x,y),(x+5,y),(x+5,y+5),(x,y+5),(x,y)]]
            items.append({'type':'Feature','id':cid,'properties':{'cell_id':cid,'zone_id':raster_zones(rid).get(str(owner)),'source_crs':m['source_crs'],'grid_version':m['grid_version'],'observed':None},'geometry':{'type':'Polygon','coordinates':[ring]}})
        return {'type':'FeatureCollection','features':items,'next_cursor':offset if offset<total else None,'release_id':rid}

@app.get('/api/environments')
def environments():
    m=dataset('kumoh-campus-sim');return {'environments':[{'environmentId':m['environment_id'],'worldVersion':m['world_version'],'name':m['name'],'mode':'SIMULATION','controlEnabled':False}]}
@app.get('/api/environments/{env}/manifest')
def manifest(env:str):
    if env!='kumoh-campus-sim':raise HTTPException(404)
    return json.loads((folder(dataset(env)['release_id'])/'world.json').read_text(encoding='utf-8'))
@app.get('/api/environments/{env}/{world}/facilities/{name}')
def facilities(env:str,world:str,name:str):
    m=dataset('kumoh-campus-sim')
    if env!=m['environment_id'] or world!=m['world_version'] or name not in ('buildings.geojson','facilities.geojson'):raise HTTPException(404)
    return FileResponse(folder(m['release_id'])/name,media_type='application/geo+json')

@lru_cache(maxsize=1)
def campus_grid():return json.loads((folder(dataset('kumoh-campus-sim')['release_id'])/'grid.json').read_bytes())

@app.get('/api/environments/{env}/{world}/school-tools/{name}')
def local_tools(env:str,world:str,name:str,request:str=Query('',max_length=32768)):
    m=dataset('kumoh-campus-sim')
    if env!=m['environment_id'] or world!=m['world_version']:raise HTTPException(404)
    if name in ('search-zones','index','report'):
        return campus_grid()[{'search-zones':'zones','index':'index','report':'report'}[name]]
    if name not in ('semantics','search-regions','semantic-priority'):raise HTTPException(404)
    from .local_analysis import analyze
    try:return analyze(name,request,env,world)
    except ValueError as e:raise HTTPException(422,str(e))
@app.get('/api/environments/{env}/{world}/terrain/{z}/{x}/{y}.png')
def terrain(env:str,world:str,z:int,x:int,y:int):
    m=dataset('kumoh-campus-sim')
    if env!=m['environment_id'] or world!=m['world_version'] or not 0<=z<=20 or not 0<=x<2**z or not 0<=y<2**z:raise HTTPException(404)
    p=folder(m['release_id'])/'terrain'/str(z)/str(x)/f'{y}.png'
    if not p.is_file():raise HTTPException(404)
    return FileResponse(p,media_type='image/png')
@app.get('/api/city/47190')
def city():
    m=dataset('gumi-city');v=json.loads((folder(m['release_id'])/'city.json').read_text(encoding='utf-8'));v.pop('colors',None);return v
@app.get('/api/city/47190/{version}/tiles/{z}/{x}/{y}.png')
def city_tiles(version:str,z:int,x:int,y:int):
    m=dataset('gumi-city')
    if version!=m['world_version']:raise HTTPException(404)
    return tiles(m['release_id'],z,x,y)
@app.get('/api/city/47190/{version}/point')
def city_point(version:str,longitude:float,latitude:float):
    m=dataset('gumi-city')
    if version!=m['world_version']:raise HTTPException(404)
    return point(m['release_id'],longitude,latitude)

@app.get('/api/map/tiles/{z}/{x}/{y}.png')
def base_tile(z:int,x:int,y:int):
    with service_client('egress') as client:r=client.get(f'/tiles/{z}/{x}/{y}.png')
    return Response(r.content,status_code=r.status_code,media_type=r.headers.get('content-type','image/png'))

@app.get('/api/map/vworld3d/city-frame')
def city_frame():
    import html
    from urllib.parse import urlencode
    cfg=json.loads((IDENTITY/'vworld-client.json').read_text(encoding='utf-8'));build=Path('/web')
    m=json.loads((build/'.vite/manifest.json').read_text(encoding='utf-8'));entry=m['src/map/vworld3d/cityFrame.ts']
    css=[];seen=set()
    def collect(k):
        if k in seen:return
        seen.add(k)
        for i in m[k].get('imports',[]):collect(i)
        css.extend(m[k].get('css',[]))
    collect('src/map/vworld3d/cityFrame.ts')
    sdk='https://map.vworld.kr/js/webglMapInit.js.do?'+urlencode({'version':'3.0','apiKey':cfg['key'],'domain':cfg['domain']})
    styles=''.join('<link rel="stylesheet" href="/'+html.escape(s)+'">' for s in dict.fromkeys(css))
    return HTMLResponse('<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+styles+'</head><body><div id="vworld-map"></div><div id="map-overlay"></div><div id="frame-status">3D 지도 준비 중</div><script src="'+html.escape(sdk,quote=True)+'"></script><script type="module" src="/'+html.escape(entry['file'])+'"></script></body></html>',headers={'Content-Security-Policy':"frame-ancestors 'self'; object-src 'none'; base-uri 'self'",'X-Frame-Options':'SAMEORIGIN','Referrer-Policy':'strict-origin-when-cross-origin'})
