"""Describe the browser gateway and authenticated internal transports without exposing identities."""
from fastapi.openapi.utils import get_openapi
from .responses import Error

def schema(app):
    if app.openapi_schema: return app.openapi_schema
    value=get_openapi(title=app.title,version=app.version,routes=app.routes)
    components=value.setdefault('components',{})
    errors=Error.model_json_schema(ref_template='#/components/schemas/{model}')
    components.setdefault('schemas',{}).update(errors.pop('$defs',{}))
    components['schemas']['Error']=errors
    components['securitySchemes']={
        'OperatorSession':{'type':'apiKey','in':'cookie','name':'drone_session','description':'HttpOnly Secure SameSite=Strict cookie set by login.'},
        'ServiceBearer':{'type':'http','scheme':'bearer','description':'Distinct workload token; server-side only.'},
        'WorkloadTLS':{'type':'mutualTLS','description':'Verified workload certificate; SHA256 identity is supplied by TLS transport, never by an HTTP header.'}}
    for path,methods in value['paths'].items():
        for method,operation in methods.items():
            if method not in ('get','post','put','patch','delete','head','options'):continue
            browser=path.startswith('/api/')
            operation['servers']=[{'url':'https://localhost:18443' if browser else 'https://backend.internal','description':'SSH development gateway' if browser else 'Logical HTTPS authority over Unix socket; no TCP listener'}]
            operation['security']=([{'OperatorSession':[]}] if browser and path!='/api/v1/auth/login' else [] if browser else [{'WorkloadTLS':[]}] if path=='/health/live' else [{'ServiceBearer':[],'WorkloadTLS':[]}])
            if not browser:operation['x-unix-socket']='/run/backend-socket/service.sock'
            if path.startswith('/device/v1/simulations/runs/') and ('/media-' in path or path.endswith('/frames')):
                operation['x-workload-role']='assigned simulator or legacy SIM device; run, mission and session scoped'
                operation.setdefault('parameters',[]).append({'name':'X-Simulator-Session','in':'header','required':True,
                    'schema':{'type':'string','format':'uuid'},'description':'The producer_session_id accepted when claiming this run.'})
            if browser: operation['x-backend-security']={'ServiceBearer':[],'WorkloadTLS':[]}
            if browser and method!='get':
                operation.setdefault('parameters',[]).append({'name':'Origin','in':'header','required':True,'schema':{'type':'string'},'description':'Allowed HTTPS origin.'})
                if path!='/api/v1/auth/login':operation['parameters'].append({'name':'X-CSRF-Token','in':'header','required':True,'schema':{'type':'string'},'description':'Token from login or GET /api/v1/auth/me.'})
            for status in ('401','403','404','409','413','422','503'):
                operation['responses'][status]={'description':'Structured error code','content':{'application/json':{'schema':{'$ref':'#/components/schemas/Error'}}}}
            if path=='/api/v1/auth/login':operation['responses']['429']={'description':'Concurrent password check capacity reached; retry after current checks finish','content':{'application/json':{'schema':{'$ref':'#/components/schemas/Error'}}}}
            if path.endswith('/content') or path.endswith('/input'):
                if method=='get':
                    binary={'description':'Verified file bytes','headers':{'X-Content-SHA256':{'schema':{'type':'string','pattern':'^[0-9a-f]{64}$'}}},'content':{'application/octet-stream':{'schema':{'type':'string','format':'binary'}}}}
                    operation['responses']['200']=binary
                    operation['responses']['206']=binary|{'description':'Partial file bytes for a valid Range request'}
                elif method=='put':
                    operation['requestBody']={'required':True,'content':{'application/octet-stream':{'schema':{'type':'string','format':'binary'}}}}
                    operation['responses']['408']={'description':'Upload exceeded 120 seconds','content':{'application/json':{'schema':{'$ref':'#/components/schemas/Error'}}}}
            if path.endswith('/start') or path.endswith('/resume'):operation['responses'].pop('202',None)
    value['x-websocket']={'url':'wss://localhost:18443/api/v1/ws','security':'OperatorSession and allowed Origin; gateway supplies workload TLS and token',
        'subscribe':{'mission_id':'UUID string','after_cursor':'canonical int64 decimal string'},
        'event_page':{'$ref':'#/components/schemas/Replay'},'heartbeat':{'type':'heartbeat','cursor':'int64 string'},
        'scope':'Mission events plus CONTROL_ACQUIRED/CONTROL_RELEASED/DEVICE_CONNECTED/SAFETY_REPORTED for that mission drone. Session-only global events are excluded.'}
    app.openapi_schema=value
    return value
