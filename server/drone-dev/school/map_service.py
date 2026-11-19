"""Bounded read-only serving of version-pinned derived spatial artifacts."""
import hashlib,json,math,os,sqlite3
from functools import lru_cache
from pathlib import Path
from contextlib import contextmanager,closing
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
from .spatial_cache import region_rows, point_region, REGION_FIELDS, encoded, display_file, display_response
from . import spatial_tiles
from .semantic_raster import region_rgba

ROOT=Path(os.getenv('SCHOOL_SPATIAL','/spatial'))
app=FastAPI(dependencies=[Depends(authorize_service)],docs_url=None,redoc_url=None)

@lru_cache(maxsize=1)
def catalog():return json.loads((ROOT/'catalog.json').read_text(encoding='utf-8'))
def info(rid):
    value=next((m for m in catalog() if m['release_id']==rid),None)
    if not value:raise HTTPException(404,'Unknown spatial release')
    return value
def dataset(env):return next(m for m in catalog() if m['environment_id']==env)

def building_overlay(rid):
    pointer=ROOT/'regional-inputs.json'
    if not pointer.is_file():return None
    entry=json.loads(pointer.read_text()).get(rid)
    if not entry:return None
    path=ROOT/'regional-overlays'/entry['packageId']/'buildings.geojson'
    if not path.resolve().is_relative_to((ROOT/'regional-overlays').resolve()):raise HTTPException(503,'Invalid building input')
    verify_overlay(str(path),entry['displaySha256'])
    return path,entry

@lru_cache(maxsize=4)
def verify_overlay(path,sha):
    if hashlib.sha256(Path(path).read_bytes()).hexdigest()!=sha:raise HTTPException(503,'Building input changed')
def folder(rid):info(rid);return ROOT/rid

@app.get('/api/v1/spatial-releases/{rid}/display')
def display_manifest(rid:str):
    value,_=spatial_tiles.manifest(ROOT,info(rid))
    return {k:value[k] for k in ('build_id','minzoom','maxzoom','bounds','source_layer','region_count')}

@app.get('/api/v1/spatial-releases/{rid}/display/{build}/{z}/{x}/{y}.pbf')
def display_tile(rid:str,build:str,z:int,x:int,y:int,request:Request):
    return spatial_tiles.tile_response(ROOT,info(rid),build,z,x,y,request)

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
def regions(rid:str,request:Request,bounds:str|None=None,after:int=Query(0,ge=0),limit:int=Query(100,ge=1,le=200),geometry:bool=False,view:str='full'):
    rows=region_rows(folder(rid)/'regions.sqlite3',bbox(bounds) if bounds else None,after,limit,geometry)
    features=[]
    for r in rows[:limit]:
        p=json.loads(r['properties']);p.update(zoneId=r['source_id'],representativePoint=[r['longitude'],r['latitude']])
        if view=='map':p={k:p[k] for k in REGION_FIELDS if k in p}
        features.append({'type':'Feature','id':r['source_id'],'properties':p,'geometry':json.loads(r['geometry']) if geometry else None})
    result={'type':'FeatureCollection','features':features,'next_cursor':rows[limit-1]['ordinal'] if len(rows)>limit else None,'release_id':rid}
    return display_response(encoded(result),request) if view=='map' else result

@app.get('/api/v1/spatial-releases/{rid}/selection')
def selection(rid:str,bounds:str):
    w,s,e,n=bbox(bounds)
    with db(rid) as c:rows=c.execute('SELECT source_id FROM regions WHERE longitude BETWEEN ? AND ? AND latitude BETWEEN ? AND ? ORDER BY source_id LIMIT 4097',(w,e,s,n)).fetchall()
    if len(rows)>4096:raise HTTPException(422,'선택 범위를 줄여주세요. 최대 4096구역입니다.')
    return {'release_id':rid,'selected_zone_ids':[r['source_id'] for r in rows]}

@lru_cache(maxsize=2)
def colors(rid):return json.loads((folder(rid)/'colors.json').read_text(encoding='utf-8'))
@lru_cache(maxsize=512)
def raster_tile(rid,z,x,y,style='default'):
    if not 0<=z<=20 or not 0<=x<2**z or not 0<=y<2**z:raise HTTPException(422,'Invalid tile')
    if style not in ('default','contrast-v1'):raise HTTPException(422,'Invalid semantic display style')
    size=512 if style=='contrast-v1' else 256
    span=40075016.68557849/2**z;w=-20037508.342789244+x*span;n=20037508.342789244-y*span;px=span/size
    arr=np.zeros((size+2,size+2),dtype=np.int32)
    with rasterio.open(folder(rid)/'regions.tif') as src:reproject(rasterio.band(src,1),arr,src_transform=src.transform,src_crs=src.crs,dst_transform=from_bounds(w-px,n-span-px,w+span+px,n+px,size+2,size+2),dst_crs='EPSG:3857',resampling=Resampling.nearest,src_nodata=0,dst_nodata=0)
    rgba=region_rgba(arr,colors(rid),contrast=style=='contrast-v1')
    with MemoryFile() as f:
        with f.open(driver='PNG',width=size,height=size,count=4,dtype='uint8') as dst:dst.write(rgba)
        return f.read()

@app.get('/api/v1/spatial-releases/{rid}/tiles/{z}/{x}/{y}.png')
def tiles(rid:str,z:int,x:int,y:int):return Response(raster_tile(rid,z,x,y),media_type='image/png')

@app.get('/api/v1/spatial-releases/{rid}/point')
def point(rid:str,longitude:float,latitude:float):
    if not math.isfinite(longitude) or not math.isfinite(latitude) or not -180<=longitude<=180 or not -90<=latitude<=90:raise HTTPException(422,'Invalid point')
    return {**point_region(folder(rid)/'regions.sqlite3',longitude,latitude),'release_id':rid}

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
    rid=dataset(env)['release_id'];value=json.loads((folder(rid)/'world.json').read_text(encoding='utf-8'))
    overlay=building_overlay(rid)
    if overlay:value['regionalPlanningInput']=overlay[1]
    return value
@app.get('/api/environments/{env}/{world}/facilities/{name}')
def facilities(env:str,world:str,name:str,request:Request,view:str='full'):
    m=dataset('kumoh-campus-sim')
    if env!=m['environment_id'] or world!=m['world_version'] or name not in ('buildings.geojson','facilities.geojson'):raise HTTPException(404)
    overlay=building_overlay(m['release_id']) if name=='buildings.geojson' else None
    path=overlay[0] if overlay else folder(m['release_id'])/name
    if view=='map':return display_response(display_file(path,'buildings' if name=='buildings.geojson' else 'facilities'),request)
    return FileResponse(path,media_type='application/geo+json',headers={'Cache-Control':'private, no-store'})

@lru_cache(maxsize=1)
def campus_grid():return json.loads((folder(dataset('kumoh-campus-sim')['release_id'])/'grid.json').read_bytes())

@app.get('/api/environments/{env}/{world}/school-tools/{name}')
def local_tools(env:str,world:str,name:str,http_request:Request,request:str=Query('',max_length=32768),view:str='full'):
    m=dataset('kumoh-campus-sim')
    if env!=m['environment_id'] or world!=m['world_version']:raise HTTPException(404)
    if name=='search-zones' and view=='map':return display_response(display_file(folder(m['release_id'])/'grid.json','regions'),http_request)
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
def city_tiles(version:str,z:int,x:int,y:int,style:str='default'):
    m=dataset('gumi-city')
    if version!=m['world_version']:raise HTTPException(404)
    return Response(raster_tile(m['release_id'],z,x,y,style),media_type='image/png',headers={'Cache-Control':'private, max-age=3600'})
@app.get('/api/city/47190/{version}/point')
def city_point(version:str,longitude:float,latitude:float):
    m=dataset('gumi-city')
    if version!=m['world_version']:raise HTTPException(404)
    return point(m['release_id'],longitude,latitude)

@app.get('/api/map/tiles/{z}/{x}/{y}.png')
def base_tile(z:int,x:int,y:int):
    with service_client('egress') as client:r=client.get(f'/tiles/{z}/{x}/{y}.png')
    return Response(r.content,status_code=r.status_code,media_type=r.headers.get('content-type','image/png'))

@app.get('/api/map/real-buildings')
def real_buildings():
    path=ROOT/'buildings'/'manifest.json'
    if not path.is_file():raise HTTPException(503,'Building tiles not prepared')
    value=json.loads(path.read_text(encoding='utf-8'))
    result={k:value[k] for k in ('build_id','minzoom','maxzoom','bounds','source_layer','building_count','activity_version')}
    ground=building_ground_manifest(value)
    if ground:result['ground']=ground
    return result

@lru_cache(maxsize=4)
def valid_ground_package(path,mtime,size,expected):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()==expected

def building_ground_manifest(source):
    from datetime import datetime,timezone
    import re
    try:
        path=ROOT/'buildings'/'ground-manifest.json'
        value=json.loads(path.read_text(encoding='utf-8'))
        if (value['schema']!='vworld-building-ground-v1' or value['scope']!='DISPLAY_ONLY'
            or value['provider']!='VWORLD_WEBGL_3' or value['source_build']!=source['build_id']
            or value['source_sha256']!=source['package_sha256'] or not re.fullmatch('[a-f0-9]{16}',value['edition'])
            or datetime.fromisoformat(value['expires_at'])<=datetime.now(timezone.utc)):return None
        package=ROOT/'buildings'/f"ground-{source['build_id']}-{value['edition']}.sqlite3"
        if not package.is_file():return None
        stat=package.stat()
        if not valid_ground_package(str(package),stat.st_mtime_ns,stat.st_size,value['package_sha256']):return None
        return value
    except (OSError,ValueError,KeyError,TypeError):return None

@app.get('/api/map/real-buildings/{build}/{z}/{x}/{y}.pbf')
def real_building_tile(build:str,z:int,x:int,y:int,request:Request):
    m=real_buildings()
    if build!=m['build_id']:raise HTTPException(404,'Building version changed')
    if not m['minzoom']<=z<=m['maxzoom'] or not 0<=x<2**z or not 0<=y<2**z:raise HTTPException(422,'Invalid tile')
    from .spatial_cache import signature
    path=ROOT/'buildings'/f'buildings-{build}.sqlite3'
    return Response(spatial_tiles._tile(*signature(path),z,x,y),media_type='application/vnd.mapbox-vector-tile',headers={'Cache-Control':'private, max-age=3600'})

@lru_cache(maxsize=128)
def building_cell(build,x,y):
    path=ROOT/'buildings'/f'buildings-{build}.sqlite3'
    with sqlite3.connect(path.as_uri()+'?mode=ro&immutable=1',uri=True) as c:
        rows=c.execute('SELECT f.body FROM features f JOIN bounds b ON f.fid=b.fid WHERE b.e>=? AND b.w<=? AND b.n>=? AND b.s<=? LIMIT 5001',(x/100,(x+1)/100,y/100,(y+1)/100)).fetchall()
    if len(rows)>5000:raise HTTPException(422,'Building cell too dense')
    return {'type':'FeatureCollection','features':[json.loads(r[0]) for r in rows]}

@app.get('/api/map/real-buildings/{build}/cells/{x}/{y}')
def real_building_cell(build:str,x:int,y:int,request:Request):
    m=real_buildings()
    if build!=m['build_id']:raise HTTPException(404,'Building version changed')
    if not 12400<=x<=13200 or not 3300<=y<=3900:raise HTTPException(422,'Invalid building cell')
    response=display_response(encoded_building_cell(build,x,y),request)
    response.headers['Cache-Control']='private, max-age=3600'
    return response

@lru_cache(maxsize=128)
def encoded_building_cell(build,x,y):return encoded(building_cell(build,x,y))

@lru_cache(maxsize=128)
def encoded_ground_building_cell(build,edition,x,y):
    import hashlib
    path=ROOT/'buildings'/f'buildings-{build}.sqlite3'
    ground=ROOT/'buildings'/f'ground-{build}-{edition}.sqlite3'
    features=[]
    with closing(sqlite3.connect(path.as_uri()+'?mode=ro&immutable=1',uri=True)) as src, closing(sqlite3.connect(ground.as_uri()+'?mode=ro&immutable=1',uri=True)) as dst:
        rows=src.execute('SELECT f.fid,f.body FROM features f JOIN bounds b ON f.fid=b.fid WHERE b.e>=? AND b.w<=? AND b.n>=? AND b.s<=? LIMIT 5001',(x/100,(x+1)/100,y/100,(y+1)/100)).fetchall()
        if len(rows)>5000:raise HTTPException(422,'Building cell too dense')
        for fid,body in rows:
            feature=json.loads(body)
            row=dst.execute('SELECT source_hash,body FROM placements WHERE fid=?',(fid,)).fetchone()
            if row and row[0]==hashlib.sha256(body.encode()).hexdigest():
                placement=json.loads(row[1])
                if placement['building_id']==feature['properties']['buildingId']:
                    feature['properties']['terrain_display']={**placement,'edition':edition}
            features.append(feature)
    return encoded({'type':'FeatureCollection','features':features})

@app.get('/api/map/real-buildings/{build}/ground/{edition}/cells/{x}/{y}')
def real_ground_building_cell(build:str,edition:str,x:int,y:int,request:Request):
    manifest=real_buildings()
    if build!=manifest['build_id'] or edition!=manifest.get('ground',{}).get('edition'):raise HTTPException(404,'Ground version changed')
    if not 12400<=x<=13200 or not 3300<=y<=3900:raise HTTPException(422,'Invalid building cell')
    response=display_response(encoded_ground_building_cell(build,edition,x,y),request)
    response.headers['Cache-Control']='private, max-age=3600'
    return response

@app.get('/api/map/real-regions')
def real_region_geometry(ids:str):
    names=list(dict.fromkeys(ids.split(',')))
    if not 1<=len(names)<=32 or any(not v or len(v)>200 for v in names):raise HTTPException(422,'Invalid selection')
    rid=dataset('gumi-city')['release_id']
    with db(rid) as c:
        rows=c.execute('SELECT source_id,properties,geometry FROM regions WHERE source_id IN ('+','.join('?' for _ in names)+')',names).fetchall()
    return {'type':'FeatureCollection','features':[{'type':'Feature','id':r['source_id'],'properties':dict(json.loads(r['properties']),zoneId=r['source_id']),'geometry':json.loads(r['geometry'])} for r in rows]}

@app.get('/api/map/vworld3d/config')
def real_3d_config():
    cfg=json.loads((IDENTITY/'vworld-client.json').read_text(encoding='utf-8-sig'))
    return {'configured':bool(cfg.get('key')),'domain':cfg.get('domain'),'provider':'VWORLD_WEBGL_3'}

@app.get('/api/map/vworld3d/real-frame')
def real_3d_frame():
    import html
    from urllib.parse import urlencode
    cfg=json.loads((IDENTITY/'vworld-client.json').read_text(encoding='utf-8-sig'))
    if not cfg.get('key'):raise HTTPException(503,'VWorld 3D client key not configured')
    sdk='https://map.vworld.kr/js/webglMapInit.js.do?'+urlencode({'version':'3.0','apiKey':cfg['key'],'domain':cfg['domain']})
    return HTMLResponse('<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VWorld 3D 실지도</title><link rel="modulepreload" href="/local-real-3d.js"><link rel="preconnect" href="https://map.vworld.kr"><link rel="stylesheet" href="/local-real-3d.css"></head><body><div id="vworld-map" aria-label="VWorld 지형과 건물"></div><div id="frame-status" role="status">VWorld 3D 연결 중…</div><nav id="camera-tools" aria-label="3D 지도 조작"><button id="camera-plus" aria-label="확대">+</button><button id="camera-minus" aria-label="축소">−</button><button id="camera-north" aria-label="북쪽 정렬">N</button></nav><script src="'+html.escape(sdk,quote=True)+'"></script><script type="module" src="/local-real-3d.js"></script></body></html>',headers={'Content-Security-Policy':"frame-ancestors 'self'; object-src 'none'; base-uri 'self'",'X-Frame-Options':'SAMEORIGIN','Referrer-Policy':'strict-origin-when-cross-origin'})

@app.get('/api/map/vworld3d/city-frame')
def city_frame():
    import html
    from urllib.parse import urlencode
    cfg=json.loads((IDENTITY/'vworld-client.json').read_text(encoding='utf-8-sig'));build=Path('/web')
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

@app.get('/api/map/place-search')
def place_search(query:str,category:str='AUTO',lon:float|None=None,lat:float|None=None,
                 radius_m:int=10000,sort:str='distance'):
    if ((lon is None)!=(lat is None) or (lon is not None and not (-180<=lon<=180 and -90<=lat<=90))
            or not 1000<=radius_m<=20000 or sort not in ('distance','relevance')):
        raise HTTPException(422,'Invalid search location')
    if not 2<=len(query)<=160:raise HTTPException(422,'Invalid search')
    params=dict(query=query,category=category,radius_m=radius_m,sort=sort)
    if lon is not None:params.update(lon=lon,lat=lat)
    with service_client('egress') as client:r=client.get('/search',params=params)
    r.raise_for_status();return r.json()
