"""Read-only, version-pinned display tiles. Geometry used for planning stays in regions.sqlite3."""
from contextlib import closing
from functools import lru_cache
import json
from pathlib import Path
import re
import sqlite3
from fastapi import HTTPException
from fastapi.responses import Response
from .spatial_cache import signature

@lru_cache(maxsize=4)
def _manifest(path,mtime,size):return json.loads(Path(path).read_text())

def manifest(root,release):
    folder=Path(root)/'display'/release['release_id'];pointer=folder/'manifest.json'
    if not pointer.is_file():raise HTTPException(503,'Display tiles not prepared')
    m=_manifest(*signature(pointer))
    if m.get('source_sha256')!=release['files']['regions.sqlite3'] or m.get('release_id')!=release['release_id'] or not re.fullmatch(r'[a-f0-9]{16}',m.get('build_id','')):
        raise HTTPException(503,'Display tile release mismatch')
    return m,folder/f"regions-{m['build_id']}.sqlite3"

@lru_cache(maxsize=256)
def _tile(path,mtime,size,z,x,y):
    with closing(sqlite3.connect(Path(path).as_uri()+'?mode=ro&immutable=1',uri=True)) as c:
        row=c.execute('SELECT body FROM tiles WHERE z=? AND x=? AND y=?',(z,x,y)).fetchone()
    return row[0] if row else b''

def tile_response(root,release,build,z,x,y,request):
    m,path=manifest(root,release)
    if build!=m['build_id']:raise HTTPException(404,'Display version changed')
    if not m['minzoom']<=z<=m['maxzoom'] or not 0<=x<2**z or not 0<=y<2**z:raise HTTPException(422,'Invalid tile')
    tag=f'W/"{build}-{z}-{x}-{y}"';headers={'ETag':tag,'Cache-Control':'private, max-age=0, must-revalidate'}
    if tag in [v.strip() for v in request.headers.get('if-none-match','').split(',')]:return Response(status_code=304,headers=headers)
    return Response(_tile(*signature(path),z,x,y),media_type='application/vnd.mapbox-vector-tile',headers=headers)
