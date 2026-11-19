"""Add only the regional planner to the verified DEV sandbox; preserve vision/REAL."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

ROOT=Path('/home/se/sandboxes/drone-dev')
STAGE=ROOT/'regional-stage-20261022'
DOCKER=ROOT.parent/'drone-server/scripts/docker.sh'
EXPECTED_BACKEND='4df623b930b1271d6a3755afa7bbe54c67b0e7934beac5b39bd626dfb5f32d18'


def main():
    sys.path.insert(0,str(STAGE))
    from server_integration.regional_search.package import verify, adapter_hash
    manifest=verify(STAGE/'package')
    assert (STAGE/'database-verify-pass.txt').is_file()
    result=json.loads((STAGE/'linux-check/result.json').read_text())
    assert result['state']=='READY' and result['actualEvidenceWrites']==0
    assert hashlib.sha256((ROOT/'school/backend.py').read_bytes()).hexdigest()==EXPECTED_BACKEND,'Server source changed; review before deploying'
    assert not (ROOT/'db/migrations/012_regional_search.sql').exists()
    spec=importlib.util.spec_from_file_location('current_apply',ROOT/'db/apply.py')
    db=importlib.util.module_from_spec(spec);spec.loader.exec_module(db)
    assert db.psql("SELECT count(*) FROM simulation.run WHERE state='RUNNING' OR (state='QUEUED' AND expires_at>now());").strip()=='0','Active simulator run; defer backend restart'
    backup=ROOT/'backups/regional-search-20261022'
    backup.mkdir(parents=True,exist_ok=False);os.chmod(backup,0o700)
    for name in ('school/backend.py','scripts/stack.sh'):
        target=backup/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(ROOT/name,target)
    state=json.loads(subprocess.check_output([str(DOCKER),'inspect','drone-services-20261005-backend-1','drone-services-20261005-vision-1'],text=True))
    (backup/'services-before.json').write_text(json.dumps([{k:c[k] for k in ('Id','Name','Image','State')} for c in state],indent=2))
    command='export PGPASSWORD="$(cat /run/identity/db-owner-password)"; exec pg_dump -U drone_owner -d drone_dev --schema-only'
    with (backup/'database-schema.sql').open('w') as f:
        subprocess.run([str(DOCKER),'exec','drone-services-20261005-database-1','sh','-c',command],stdout=f,check=True)
    packages=ROOT/'data/regional-search-packages';packages.mkdir(exist_ok=True)
    shutil.copytree(STAGE/'package',packages/manifest['packageId'])
    code=ROOT/'regional-search-code';code.mkdir(exist_ok=False)
    shutil.copytree(STAGE/'server_integration/regional_search',code/'server_integration/regional_search',ignore=shutil.ignore_patterns('__pycache__'))
    queue=ROOT/'data/backend/regional-search';queue.mkdir(exist_ok=False);os.chown(queue,2101,2101);os.chmod(queue,0o700)
    regions=json.loads((STAGE/'package/regions.json').read_text())['features']
    registry={k:manifest[k] for k in ('packageId','environment','worldVersion','gridVersion','buildingActivityVersion','sourceSpatialRelease')}
    registry['regions']={f['properties']['zoneId']:f['geometry'] for f in regions}
    registry['adapterHash']=adapter_hash()
    policy=json.loads((STAGE/'package/input.json').read_text())['policy']
    registry['missionConditions']={'altitude_m':policy['altitude_m'],'speed_mps':policy['speed_mps'],'observation_seconds':policy['dwell_seconds']}
    (queue/'packages.json').write_text(json.dumps([registry],ensure_ascii=False),encoding='utf-8')
    shutil.copyfile(STAGE/'server_integration/migrations/012_regional_search.sql',ROOT/'db/migrations/012_regional_search.sql')
    db.apply('drone_dev')
    shutil.copyfile(STAGE/'server_integration/school/regional_search.py',ROOT/'school/regional_search.py')
    text=(ROOT/'school/backend.py').read_text()
    (ROOT/'school/backend.py').write_text(text+'\nfrom .regional_search import router as regional_search_router\nrouter.include_router(regional_search_router)\n')
    shutil.copyfile(STAGE/'server_integration/compose.regional-search.yml',ROOT/'compose.regional-search.yml')
    path=ROOT/'scripts/stack.sh';text=path.read_text();assert text.count('"$@"')==1
    path.write_text(text.replace('"$@"','-f "$ROOT/compose.regional-search.yml" "$@"'))
    subprocess.run([str(ROOT/'scripts/stack.sh'),'config','--quiet'],check=True)
    subprocess.run([str(DOCKER),'exec','drone-services-20261005-backend-1','python','-c','import school.regional_search; print("regional router import OK")'],check=True)
    subprocess.run([str(ROOT/'scripts/stack.sh'),'restart','backend'],check=True)
    subprocess.run([str(ROOT/'scripts/stack.sh'),'up','-d','--no-deps','regional-planner'],check=True)
    (STAGE/'deployment.json').write_text(json.dumps({'status':'INSTALLED','packageId':manifest['packageId'],'backup':str(backup),'realTouched':False,'visionRestarted':False},indent=2))
    print('INSTALLED regional planner; authenticated HTTPS acceptance remains required')


if __name__=='__main__':main()
