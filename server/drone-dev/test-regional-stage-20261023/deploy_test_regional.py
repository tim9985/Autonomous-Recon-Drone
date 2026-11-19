"""Install the reviewed test-account sequence only on an idle school DEV stack."""
from pathlib import Path
from datetime import datetime,timezone
import hashlib,importlib.util,json,os,shutil,subprocess,sys
ROOT=Path('/home/se/sandboxes/drone-dev');STAGE=ROOT/'test-regional-stage-20261023'
def read(p):return json.loads(p.read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def lit(s):return "'"+s.replace("'","''")+"'"
review=read(STAGE/'review.json')
for name,d in review['baseline'].items():assert sha(ROOT/name)==d,'Concurrent server edit: '+name
for name,d in review['files'].items():assert sha(STAGE/name)==d,'Staged file changed: '+name
sys.path.insert(0,str(ROOT/'regional-search-code'))
from server_integration.regional_search.package import adapter_hash
registry=ROOT/'data/backend/regional-search/packages.json';before_registry=read(registry)
assert len(before_registry)==1 and before_registry[0]['adapterHash']==adapter_hash()==review['previousAdapterHash']
assert before_registry[0]['packageId']==review['packageId']
spec=importlib.util.spec_from_file_location('db',ROOT/'db/apply.py');db=importlib.util.module_from_spec(spec);spec.loader.exec_module(db)
def counts():
 return json.loads(db.psql("""SELECT json_build_object('active',(SELECT count(*) FROM drone.regional_execution WHERE state IN ('QUEUED','RUNNING','STOP_REQUESTED','UNCONFIRMED')),
 'legacyActive',(SELECT count(*) FROM simulation.run WHERE state='RUNNING' OR (state='QUEUED' AND expires_at>now())),
 'planning',(SELECT count(*) FROM drone.regional_search_job WHERE state IN ('QUEUED','RUNNING')),
 'captures',(SELECT count(*) FROM drone.regional_capture),'completions',(SELECT count(*) FROM drone.regional_completion),'observations',(SELECT count(*) FROM drone.observation_cell));"""))
before=counts();assert before['active']==before['legacyActive']==before['planning']==0,'Active user work preserved; retry after it finishes'
stack=ROOT/'scripts/stack.sh';docker=ROOT.parent/'drone-server/scripts/docker.sh'
def services():
 vals=json.loads(subprocess.check_output([str(docker),'inspect','drone-real-20261006-backend-1','drone-services-20261005-vision-1']))
 return {x['Name']:{'id':x['Id'],'startedAt':x['State']['StartedAt']} for x in vals}
unchanged=services();main_sha=sha(ROOT/'web/index.html')
backup=ROOT/'backups'/('test-regional-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'));backup.mkdir()
mutable=['web/test-patrol.html','web-allowlist.json','data/backend/regional-search/packages.json','data/spatial/regional-inputs.json',
 'regional-search-code/server_integration/regional_search/observe.py','regional-search-code/server_integration/regional_search/pc_flight.py']
for name in mutable:
 dest=backup/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(ROOT/name,dest)
subprocess.run([str(stack),'stop','backend','regional-planner','regional-observer','regional-preview'],check=True)
try:
 assert counts()==before,'Concurrent execution appeared; preserved'
 for name in review['files']:
  dest=ROOT/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(STAGE/name,dest);os.chmod(dest,0o644)
 assert adapter_hash()==review['adapterHash']
 entries=read(registry);entry=entries[0];entry['adapterHash']=review['adapterHash']
 values=[entry[k] for k in ('packageId','adapterHash','sourceSpatialRelease','buildingActivityVersion','displaySha256','previewVersion')]
 db.psql('INSERT INTO drone.regional_input_binding(package_id,adapter_hash,release_id,building_activity_version,display_sha256,preview_version) VALUES ('+','.join(map(lit,values))+') ON CONFLICT DO NOTHING;')
 registry.write_text(json.dumps(entries))
 pointer=ROOT/'data/spatial/regional-inputs.json';display=read(pointer);display[entry['sourceSpatialRelease']]['adapterHash']=entry['adapterHash'];pointer.write_text(json.dumps(display))
 allow=ROOT/'web-allowlist.json';allowed=read(allow)
 for name in review['files']:
  if name.startswith('web/') and name[4:] not in allowed:allowed.append(name[4:])
 allow.write_text(json.dumps(allowed))
 subprocess.run([str(stack),'up','-d','--no-deps','backend','regional-planner','regional-observer','regional-preview'],check=True)
 subprocess.run([str(stack),'up','-d','--no-deps','--force-recreate','gateway'],check=True)
except BaseException:
 for name in mutable:shutil.copy2(backup/name,ROOT/name)
 subprocess.run([str(stack),'up','-d','--no-deps','backend','regional-planner','regional-observer','regional-preview'],check=False)
 subprocess.run([str(stack),'up','-d','--no-deps','--force-recreate','gateway'],check=False)
 raise
assert sha(ROOT/'web/index.html')==main_sha and services()==unchanged
assert counts()==before
report=dict(status='DEPLOYED',backup=str(backup),adapterHash=adapter_hash(),packageId=entry['packageId'],before=before,after=counts(),adminMainUnchanged=True,realAndVisionServicesUnchanged=True,simulationStarted=False)
(STAGE/'deployed.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
