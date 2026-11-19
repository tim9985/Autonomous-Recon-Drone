import importlib.util,json
from pathlib import Path
ROOT=Path('/home/se/sandboxes/drone-dev');STAGE=ROOT/'regional-execution-stage';DB='regional_verify_execution_20261022'
spec=importlib.util.spec_from_file_location('db',ROOT/'db/apply.py');db=importlib.util.module_from_spec(spec);spec.loader.exec_module(db)
assert db.psql('SELECT count(*) FROM drone.mission;',DB).strip()=='0','Test DB is not empty'
sql=(STAGE/'server_integration/regional_search/verify_database.sql').read_text().split('DO $$')[0]
sql=sql.replace("'regional-contract-only'","'sim-pi-01'")
sql+="INSERT INTO drone.config_version(config_id,kind,version,schema_version,payload,content_hash,status) VALUES('88888888-8888-4888-8888-888888888888','SPATIAL','isolated','1','{}',repeat('e',64),'DRAFT');\nUPDATE drone.mission_revision SET spatial_config_id='88888888-8888-4888-8888-888888888888',conditions='{\"altitude_m\":30,\"speed_mps\":3,\"observation_seconds\":3}';\n"
import sys
sys.path.insert(0,str(STAGE))
from server_integration.regional_search.package import digest
result=json.loads((STAGE/'fresh-plan.json').read_text())
request=dict(regionId=result['regionId'],adapterHash=result['adapterHash'])
p=dict(job_id='44444444-4444-4444-8444-444444444444',mission_id='22222222-2222-4222-8222-222222222222',mission_revision=1,region_id='33333333-3333-4333-8333-333333333333',creator_user_id='11111111-1111-4111-8111-111111111111',request_hash='a'*64,package_id=result['packageId'],request=request)
finish=dict(job_id=p['job_id'],request_hash=p['request_hash'],result_hash=digest(result),result=result,plan_id='55555555-5555-4555-8555-555555555555')
for action,value in [('create',p),('finish',finish)]:sql+="SELECT drone.regional_search_write('"+action+"','"+json.dumps(value).replace("'","''")+"'::jsonb);\n"
sql+='COMMIT;'
db.psql(sql,DB)
(STAGE/'api-job.json').write_text(json.dumps(dict(result=result,result_hash=digest(result))))
print('Isolated API fixture prepared; no DEV observation writes')
