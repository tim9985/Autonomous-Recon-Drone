"""Compress map geometry/track responses after authentication; never live control."""
import re
from starlette.middleware.gzip import GZipMiddleware


def versioned_map_path(path):
    """Only source-version-pinned, non-user-specific map display assets."""
    return re.fullmatch(r'/api/(?:city/47190/[a-f0-9]{16}/tiles/\d+/\d+/\d+\.png|map/real-buildings/[a-f0-9]{16}/(?:(?:ground/[a-f0-9]{16}/)?cells/\d+/\d+|\d+/\d+/\d+\.pbf))',path) is not None


def display_request(scope):
    path=scope.get('path','')
    return scope.get('type')=='http' and scope.get('method')=='GET' and (
        path.startswith('/local-') and path.endswith(('.js','.mjs','.css'))
        or path=='/api/v1/local-patrol/plans'
        or
        path.startswith('/api/v1/spatial-releases/') and (path.endswith('/regions') or '/display/' in path and path.endswith('.pbf'))
        or path.startswith('/api/environments/') and path.endswith(('/buildings.geojson','/facilities.geojson','/search-zones'))
        or re.fullmatch(r'/api/v1/local-patrol/[a-fA-F0-9-]{36}/(?:coverage|track)',path) is not None
        or versioned_map_path(path) and '/cells/' in path)


class SpatialCompression:
    def __init__(self,app):
        self.app=app;self.compressed=GZipMiddleware(app,minimum_size=1024,compresslevel=3)
    async def __call__(self,scope,receive,send):
        await (self.compressed if display_request(scope) else self.app)(scope,receive,send)
