"""Read-only DEV runtime audit and explicit, credential-free evidence archive."""
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tarfile

ROOT=Path('/home/se/sandboxes/drone-dev')
STAGE=ROOT/'regional-execution-stage'
DOCKER=ROOT.parent/'drone-server/scripts/docker.sh'


def main():
    spec=importlib.util.spec_from_file_location('db_apply',ROOT/'db/apply.py')
    db=importlib.util.module_from_spec(spec);spec.loader.exec_module(db)
    counts=json.loads(db.psql("""SELECT json_build_object(
      'migrations',(SELECT count(*) FROM drone.schema_migration),
      'executions',(SELECT count(*) FROM drone.regional_execution),
      'captures',(SELECT count(*) FROM drone.regional_capture),
      'regionalCompletions',(SELECT count(*) FROM drone.regional_completion),
      'observations',(SELECT count(*) FROM drone.observation_cell),
      'activeLegacyRuns',(SELECT count(*) FROM simulation.run WHERE state='RUNNING' OR (state='QUEUED' AND expires_at>now())))"""))
    names=['drone-services-20261005-'+v+'-1' for v in ['backend','gateway','regional-planner','regional-observer','vision']]+['drone-real-20261006-backend-1']
    inspected=json.loads(subprocess.check_output([str(DOCKER),'inspect',*names]))
    services=[dict(name=v['Name'],id=v['Id'],running=v['State']['Running'],startedAt=v['State']['StartedAt'],health=v['State'].get('Health',{}).get('Status')) for v in inspected]
    previous=json.loads((ROOT/'backups/regional-execution-20261022/services-before.json').read_text())
    old={v['Name']:v for v in previous}
    unchanged={v['name']:v['id']==old[v['name']]['Id'] and v['startedAt']==old[v['name']]['State']['StartedAt'] for v in services if v['name'] in ['/drone-services-20261005-vision-1','/drone-real-20261006-backend-1']}
    paths=['school/regional_execution.py','school/regional_search.py','school/regional_contract.py','db/migrations/013_regional_execution.sql','web/regional-search.html','web/regional-search.js','web/regional-search.css']
    paths += ['regional-search-code/server_integration/regional_search/'+v for v in ['pc_flight.py','pc_worker.py','observe.py','planner.py','package.py','motion.py']]
    hashes={n:hashlib.sha256((ROOT/n).read_bytes()).hexdigest() for n in paths}
    registry=json.loads((ROOT/'data/backend/regional-search/packages.json').read_text())[0]
    registry={k:v for k,v in registry.items() if k!='regions'}
    sys.path.insert(0,str(ROOT/'regional-search-code'))
    from server_integration.regional_search.package import adapter_hash
    assert registry['adapterHash']==adapter_hash()
    latest=json.loads((STAGE/'https-check.json').read_text())
    assert latest['status']=='PASS' and latest['planning']['adapterHash']==adapter_hash()
    assert all(unchanged.values()) and all(v['running'] for v in services)
    report=dict(database=counts,services=services,unchanged=unchanged,sources=hashes,registry=registry,status='PASS',simulationStarted=False)
    (STAGE/'final-audit.json').write_text(json.dumps(report,indent=2))
    for name in ['regional-execution-numerical-check','regional-execution-replay-check','regional-execution-api-check','regional-execution-api-check02']:
        p=subprocess.run([str(DOCKER),'logs',name],stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
        if p.returncode==0:(STAGE/(name+'.log')).write_bytes(p.stdout)
    filenames=['database-check.txt','database-console.log','database-console-02.log','numerical-check.json','api-check.json','https-check.json','https-check-before-final-guards.json','device-mtls-check.json','deployed.json','final-guards-deployed.json','final-audit.json','final-audit-before-final-guards.json','deploy-console.log','fresh-plan.json','replay-coverage.json']
    filenames += [v.name for v in STAGE.glob('regional-execution-*.log')]
    with tarfile.open(ROOT/'regional-execution-evidence-final.tar.gz','w:gz') as archive:
        for name in filenames:archive.add(STAGE/name,arcname=name)
    print(json.dumps(dict(status='PASS',database=counts,untouchedServices=unchanged,adapterHash=adapter_hash(),preparationSeconds=latest['planning']['preparationSeconds'])))


if __name__=='__main__':main()
