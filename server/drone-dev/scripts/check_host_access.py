import base64, json, pathlib, ssl, urllib.request
root=pathlib.Path(__file__).resolve().parent.parent
account=json.loads((root/'secrets/operator-login.json').read_text())
ctx=ssl.create_default_context(cafile=str(root/'secrets/ca.crt'))
credential=base64.b64encode((account['username']+':'+account['password']).encode()).decode()
request=urllib.request.Request('https://localhost:18443/api/v1/status',headers={'Authorization':'Basic '+credential})
with urllib.request.urlopen(request,context=ctx,timeout=15) as response:
    result=json.load(response)
    assert response.status==200 and result['model_loaded'] is False and result['flight_enabled'] is False
print(json.dumps({'authenticated_host_https':'passed','status':result}))
