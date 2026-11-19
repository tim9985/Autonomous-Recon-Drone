import re

def is_map_draft(method,path):
    return method=='POST' and re.fullmatch(r'/api/v1/missions/[0-9a-fA-F-]{36}/map-drafts',path) is not None

def is_analysis_completion(method,path):
    return method=='POST' and re.fullmatch(r'/internal/v1/analysis-runs/[0-9a-fA-F-]{36}/completion',path) is not None

class BodyLimit:
    def __init__(self,app,max_bytes=65536):
        self.app=app
        self.limit=max_bytes

    async def __call__(self,scope,receive,send):
        if scope['type']!='http':
            return await self.app(scope,receive,send)
        if scope.get('method')=='PUT' and (scope.get('path','').startswith(('/device/v1/media-assets/','/internal/v1/vision/media-assets/')) or re.fullmatch(r'/device/v1/simulations/runs/[0-9a-fA-F-]{36}/media-assets/[0-9a-fA-F-]{36}/content',scope.get('path',''))) and scope['path'].endswith('/content'):
            # The authenticated business upload handler streams with its reserved byte/hash limit.
            return await self.app(scope,receive,send)
        body=bytearray()
        while True:
            message=await receive()
            if message['type']=='http.disconnect':return
            body.extend(message.get('body',b''))
            if len(body)>(1048576 if is_map_draft(scope.get('method'),scope.get('path','')) or is_analysis_completion(scope.get('method'),scope.get('path','')) else self.limit):
                await send({'type':'http.response.start','status':413,'headers':[(b'content-type',b'application/json')]})
                await send({'type':'http.response.body','body':b'{"detail":"BODY_TOO_LARGE"}'})
                return
            if not message.get('more_body',False):break
        delivered=False
        async def replay():
            nonlocal delivered
            if not delivered:
                delivered=True
                return {'type':'http.request','body':bytes(body),'more_body':False}
            return await receive()
        await self.app(scope,replay,send)

