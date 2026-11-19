"""Display-only projections and indexed replicas of immutable spatial releases.

Original geometry, planner inputs, and height evidence files are never written.
"""
from contextlib import contextmanager, closing
from functools import lru_cache
import hashlib
import json
from pathlib import Path
import shutil
import sqlite3
from tempfile import TemporaryDirectory
from threading import RLock
from fastapi.responses import Response

REGION_FIELDS = ('id','zoneId','name','kind','color','role','representativePoint','areaM2',
                 'searchableAreaM2','gridVersion','semanticZoneId','flightFeasibility','boundaryStatus')
BUILDING_FIELDS = ('id','name','buildingName','worldObjectId','representationMode',
                   'displayRoofM','displayBaseM','height_m','render_height_m','simulation_height_m',
                   'base_elevation_m','roof_elevation_m','height_source','height_review_status',
                   'height_candidate_status','floors','detailTier')
FACILITY_FIELDS = ('id','kind','name','sourceId','height_m')
DISPLAY_KINDS = {'wood','green','water','pitch','sport_track','parking','road','footway','tree'}
_replica_lock = RLock()


def signature(path):
    path=Path(path).resolve();s=path.stat()
    return str(path),s.st_mtime_ns,s.st_size


@lru_cache(maxsize=2)
def _replica(source,mtime,size):
    temporary=TemporaryDirectory(prefix='local-map-index-')
    target=Path(temporary.name)/'regions.sqlite3'
    try:
        shutil.copyfile(source,target)
        with closing(sqlite3.connect(target)) as c, c:
            c.execute('CREATE VIRTUAL TABLE local_region_bounds USING rtree(ordinal,west,east,south,north)')
            c.execute('INSERT INTO local_region_bounds SELECT ordinal,west,east,south,north FROM regions')
        return temporary,target
    except BaseException:
        temporary.cleanup();raise


@contextmanager
def indexed_db(source):
    # functools.lru_cache alone permits duplicate cold builds from parallel requests.
    with _replica_lock: owner,path=_replica(*signature(source))
    c=sqlite3.connect(path.as_uri()+'?mode=ro&immutable=1',uri=True);c.row_factory=sqlite3.Row
    try:yield c
    finally:c.close()


def region_rows(source,bounds=None,after=0,limit=200,geometry=True):
    columns='r.*' if geometry else 'r.ordinal,r.source_id,r.properties,r.longitude,r.latitude'
    where='r.ordinal>?';params=[after]
    if bounds:
        w,s,e,n=bounds
        # RTree bounds round outward. Exact original bounds retain the former query semantics.
        where+=' AND r.ordinal IN (SELECT ordinal FROM local_region_bounds WHERE east>=? AND west<=? AND north>=? AND south<=?)'
        params.extend([w,e,s,n])
        where+=' AND r.east>=? AND r.west<=? AND r.north>=? AND r.south<=?'
        params.extend([w,e,s,n])
    with indexed_db(source) as c:
        return c.execute(f'SELECT {columns} FROM regions r WHERE {where} ORDER BY r.ordinal LIMIT ?',(*params,limit+1)).fetchall()


def point_region(source,longitude,latitude):
    """Exact original polygons after indexed bounds; holes and boundary ties survive."""
    from shapely.geometry import Point, shape
    with indexed_db(source) as c:
        rows=c.execute('''SELECT r.source_id,r.properties,r.geometry FROM local_region_bounds b
            JOIN regions r ON r.ordinal=b.ordinal
            WHERE b.west<=? AND b.east>=? AND b.south<=? AND b.north>=?
              AND r.west<=? AND r.east>=? AND r.south<=? AND r.north>=?
            ORDER BY r.ordinal''',(longitude,longitude,latitude,latitude)*2).fetchall()
    point=Point(longitude,latitude)
    for row in rows:
        if shape(json.loads(row['geometry'])).covers(point):
            return {'region':json.loads(row['properties']),'zone_id':row['source_id']}
    return {'region':None}


def project(collection,kind):
    fields={'regions':REGION_FIELDS,'buildings':BUILDING_FIELDS,'facilities':FACILITY_FIELDS}[kind]
    features=[]
    for feature in collection.get('features',[]):
        p=feature.get('properties') or {}
        if kind=='facilities' and p.get('kind') not in DISPLAY_KINDS:continue
        features.append({**feature,'properties':{key:p[key] for key in fields if key in p}})
    # Preserve metadata (including zoneVersion), ring order, holes and MultiPolygons exactly.
    return {**collection,'features':features}


def encoded(value):
    body=json.dumps(value,ensure_ascii=False,separators=(',',':'),allow_nan=False).encode()
    return body,'W/"'+hashlib.sha256(body).hexdigest()+'"'


@lru_cache(maxsize=6)
def _display_file(source,mtime,size,kind):
    data=json.loads(Path(source).read_bytes())
    if kind=='regions':data=data['zones']
    return encoded(project(data,kind))


def display_file(path,kind):return _display_file(*signature(path),kind)


def display_response(payload,request):
    body,etag=payload
    headers={'ETag':etag,'Cache-Control':'private, max-age=0, must-revalidate'}
    candidates=request.headers.get('if-none-match','').split(',')
    if etag in [v.strip() for v in candidates]:return Response(status_code=304,headers=headers)
    return Response(body,media_type='application/geo+json',headers=headers)
