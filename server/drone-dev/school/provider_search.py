"""Bounded public VWorld searches. Keys and raw network errors stay off the wire."""
from concurrent.futures import ThreadPoolExecutor
import json
import math
import re
import time
import urllib.parse
import urllib.request

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):return None

def distance(a,b):
    lat1,lat2=map(math.radians,(a[1],b[1]));dlat=lat2-lat1;dlon=math.radians(b[0]-a[0])
    return 12742000*math.asin(min(1,math.sqrt(math.sin(dlat/2)**2+math.cos(lat1)*math.cos(lat2)*math.sin(dlon/2)**2)))

def matches_facility(query,name,category):
    # Broad facility queries are operational destinations, not similarly named
    # bus stops, car repair shops or hospital annex services. Specific names
    # (including an explicitly requested animal hospital) retain normal search.
    if query not in ('병원','경찰서','소방서'):return True
    if any(word in name+' '+category for word in ('버스','정류장','장례','주차장','충전소','동물','수의','수리업','구내식당')):return False
    if query=='병원':return category.startswith('병원') or any(word in name for word in ('보건소','보건지소','보건진료소'))
    if query=='경찰서':return any(word in name for word in ('경찰서','지구대','파출소','치안센터'))
    return any(word in name for word in ('소방서','119','안전센터'))

def provider_query(query,kind,config,address_kind=None,center=None,radius_m=10000):
    params=dict(service='search',request='search',version='2.0',crs='EPSG:4326',size=1000 if center else 40,page=1,query=query,type=kind,format='json',key=config['VWORLD_API_KEY'])
    if center:
        dx=radius_m/(111320*max(.01,math.cos(math.radians(center[1]))));dy=radius_m/111320
        params['bbox']=','.join(f'{v:.6f}' for v in (max(-180,center[0]-dx),max(-90,center[1]-dy),min(180,center[0]+dx),min(90,center[1]+dy)))
    if config.get('VWORLD_API_DOMAIN'):params['domain']=config['VWORLD_API_DOMAIN']
    if address_kind:params['category']=address_kind
    url='https://api.vworld.kr/req/search?'+urllib.parse.urlencode(params)
    try:
        with urllib.request.build_opener(NoRedirect).open(url,timeout=5) as response:raw=response.read(4*1024*1024+1)
        if len(raw)>4*1024*1024:raise ValueError('Response too large')
        data=json.loads(raw)['response']
        if data.get('status')=='NOT_FOUND':return dict(state='DONE',items=[],provider='VWorld')
        if data.get('status')!='OK':return dict(state='UNAVAILABLE',items=[],reason='PROVIDER_REJECTED')
        items=[]
        raw_items=data.get('result',{}).get('items',[])[:1000]
        for row in raw_items:
            try:
                point=row['point'];x,y=float(point['x']),float(point['y'])
                if not all(map(math.isfinite,(x,y))) or not (-180<=x<=180 and -90<=y<=90):continue
                address=row.get('address') or {}
                label=row.get('title') or address.get('bldnm') or address.get('road') or address.get('parcel') or query
                if not address_kind and not matches_facility(query,str(label),str(row.get('category') or '')):continue
                items.append(dict(name=str(label)[:180],address=str(address.get('road') or address.get('parcel') or '')[:200],road_address=str(address.get('road') or '')[:200],parcel_address=str(address.get('parcel') or '')[:200],point=[x,y],source='VWorld',kind='ADDRESS' if address_kind else 'PLACE'))
            except (ValueError,KeyError,TypeError,OverflowError,AttributeError):continue
        total=int(data.get('record',{}).get('total',len(raw_items)))
        return dict(state='DONE',items=items,provider='VWorld',truncated=total>len(raw_items))
    except Exception:
        return dict(state='UNAVAILABLE',reason='PROVIDER_CONNECTION_FAILED',items=[])

def merge(results):
    successful=[r for r in results if r['state']=='DONE'];items=[];seen=set()
    if not successful:return dict(state='UNAVAILABLE',reason=results[0].get('reason','PROVIDER_CONNECTION_FAILED'),items=[])
    for result in successful:
        for row in result['items']:
            key=(row['name'].casefold(),*(round(v,6) for v in row['point']))
            if key not in seen:seen.add(key);items.append(row)
    return dict(state='DONE',items=items[:2000],provider='VWorld',partial=len(successful)!=len(results) or any(r.get('partial') for r in results),truncated=any(r.get('truncated') for r in results))

def search(query,category,env_file,center=None,radius_m=10000,sort='distance'):
    config=env_file
    if not config.get('VWORLD_API_KEY'):return dict(state='UNAVAILABLE',reason='PROVIDER_NOT_CONFIGURED',items=[])
    if category not in ('AUTO','PLACE','ADDRESS'):return dict(state='UNAVAILABLE',reason='INVALID_SEARCH_CATEGORY',items=[])
    if center is not None and (not isinstance(center,list) or len(center)!=2 or not all(isinstance(v,(int,float)) and math.isfinite(v) for v in center) or not (-180<=center[0]<=180 and -90<=center[1]<=90)):
        return dict(state='UNAVAILABLE',reason='INVALID_SEARCH_CENTER',items=[])
    if not isinstance(radius_m,int) or not 1000<=radius_m<=20000:return dict(state='UNAVAILABLE',reason='INVALID_SEARCH_RADIUS',items=[])
    def run(near):
        options=dict(center=center,radius_m=radius_m) if near and center else {}
        def addresses():
            with ThreadPoolExecutor(max_workers=2,thread_name_prefix='address-type') as pool:
                return merge(list(pool.map(lambda kind:provider_query(query,'ADDRESS',config,kind,**options),['ROAD','PARCEL'])))
        if category=='ADDRESS':return addresses()
        if category=='PLACE':return provider_query(query,'PLACE',config,**options)
        address_first=bool(re.search(r'\d|(?:로|길)\s*$',query))
        first=addresses() if address_first else provider_query(query,'PLACE',config,**options)
        if first.get('items'):return first
        second=provider_query(query,'PLACE',config,**options) if address_first else addresses()
        return merge([first,second])
    result=run(bool(center));scope='nearby' if center else 'global'
    if center and result['state']=='DONE':
        result['items']=[row for row in result['items'] if distance(center,row['point'])<=radius_m]
        if not result['items']:
            partial=result.get('partial',False);result=run(False);result['partial']=bool(partial or result.get('partial'));scope='global-fallback'
    if center:
        for row in result.get('items',[]):row['distance_m']=round(distance(center,row['point']))
        if sort=='distance':result['items'].sort(key=lambda row:row['distance_m'])
    result['items']=result.get('items',[])[:30];result['scope']=scope
    return result
