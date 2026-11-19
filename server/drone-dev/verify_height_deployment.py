from pathlib import Path
import ssl,urllib.request,hashlib,json,subprocess,importlib.util
ROOT=Path('/home/se/sandboxes/drone-dev');STAGE=ROOT/'height-final-20261023'
b=json.loads((STAGE/'input-binding.json').read_text())
ctx=ssl.create_default_context(cafile=str(ROOT/'certs/ca.crt'));checks=[]
labels=json.loads((STAGE/'labels/changes.json').read_text())
for path in ['/']+['/assets/'+v['new'] for v in labels['assets'].values()]:
    with urllib.request.urlopen('https://127.0.0.1:18443'+path,context=ctx,timeout=15) as r:
        data=r.read();assert r.status==200
        local=ROOT/'web'/('index.html' if path=='/' else path.lstrip('/'))
        assert hashlib.sha256(data).digest()==hashlib.sha256(local.read_bytes()).digest()
        checks.append(path)
spec=importlib.util.spec_from_file_location('db',ROOT/'db/apply.py');db=importlib.util.module_from_spec(spec);spec.loader.exec_module(db)
row=json.loads(db.psql("SELECT row_to_json(t) FROM drone.regional_input_binding t WHERE package_id='"+b['packageId']+"'"))
assert row['building_activity_version']==b['buildingActivityVersion'] and row['display_sha256']==b['displaySha256']
code="""from school.transport import service_client
import json
with service_client('map') as c:
    m=c.get('/api/environments/kumoh-campus-sim/manifest').json()
    d=c.get('/api/environments/kumoh-campus-sim/990bee4527600963/facilities/buildings.geojson').json()
    ids=['LT_C_BLDGINFO.15489025-part-1','LT_C_BLDGINFO.15862264-part-1','LT_C_BLDGINFO.5192758-part-1']
    print(json.dumps(dict(manifest=m['regionalPlanningInput'],buildings=len(d['features']),examples=[dict(id=f['id'],name=f['properties']['name'],height=f['properties']['simulation_height_m']) for f in d['features'] if f['id'] in ids])))
"""
docker=str(ROOT.parent/'drone-server/scripts/docker.sh')
map_result=json.loads(subprocess.check_output([docker,'exec','drone-services-20261005-backend-1','python','-c',code]))
assert map_result['manifest']['packageId']==b['packageId']
values={x['id']:x['height'] for x in map_result['examples']}
assert values=={'LT_C_BLDGINFO.15489025-part-1':38.25,'LT_C_BLDGINFO.15862264-part-1':17.1,'LT_C_BLDGINFO.5192758-part-1':32.}
counts=json.loads(db.psql("SELECT json_build_object('executions',(SELECT count(*) FROM drone.regional_execution),'captures',(SELECT count(*) FROM drone.regional_capture),'observations',(SELECT count(*) FROM drone.observation_cell));"))
assert not any(counts.values())
report=dict(status='PASS',binding=row,mapResponse=map_result,httpsAssets=checks,labelsOnly=True,counts=counts,simulatorStarted=False,browserRenderingVerified=False)
p=STAGE/'server-verification.json';p.write_text(json.dumps(report,ensure_ascii=False,indent=2));p.chmod(0o644)
print(json.dumps(dict(status='PASS',assets=len(checks),examples=map_result['examples'],counts=counts),ensure_ascii=False))
