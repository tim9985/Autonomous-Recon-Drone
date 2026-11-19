"""Additive DEV deployment after scratch DB and numerical replay verification."""
import hashlib,importlib.util,json,os,shutil,subprocess
from pathlib import Path
ROOT=Path('/home/se/sandboxes/drone-dev');STAGE=ROOT/'regional-execution-stage'
DOCKER=ROOT.parent/'drone-server/scripts/docker.sh'

def main():
    import sys
    sys.path.insert(0,str(STAGE))
    from server_integration.regional_search.package import verify,adapter_hash
    manifest=verify(STAGE/'package')
    assert 'stop/landing: PASS' in (STAGE/'database-check.txt').read_text()
    assert json.loads((STAGE/'numerical-check.json').read_text())['status']=='PASS'
    assert json.loads((STAGE/'api-check.json').read_text())['status']=='PASS'
    expected={'school/backend.py':'3df85cfb65bd8f592a0e4529e91cc8b17470c43ded3bae072effe683905e1134','school/regional_search.py':'f05cdbd682ac727bd876ce082b119a729ffa780e7038bb055d3ee32313b91e70'}
    for name,sha in expected.items():assert hashlib.sha256((ROOT/name).read_bytes()).hexdigest()==sha,'Current server changed: '+name
    spec=importlib.util.spec_from_file_location('db_apply',ROOT/'db/apply.py');db=importlib.util.module_from_spec(spec);spec.loader.exec_module(db)
    assert db.psql("SELECT count(*) FROM simulation.run WHERE state='RUNNING' OR (state='QUEUED' AND expires_at>now())").strip()=='0'
    backup=ROOT/'backups/regional-execution-20261022';backup.mkdir(exist_ok=False);os.chmod(backup,0o700)
    for name in ('school/backend.py','school/regional_search.py','compose.regional-search.yml','web-allowlist.json','web/test-patrol.html','data/backend/regional-search/packages.json'):
        target=backup/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(ROOT/name,target)
    shutil.copytree(ROOT/'regional-search-code',backup/'regional-search-code')
    (backup/'services-before.json').write_bytes(subprocess.check_output([str(DOCKER),'inspect','drone-services-20261005-backend-1','drone-services-20261005-vision-1','drone-real-20261006-backend-1']))
    shutil.copy2(STAGE/'server_integration/migrations/013_regional_execution.sql',ROOT/'db/migrations/013_regional_execution.sql');db.apply('drone_dev')
    for name in ('regional_search.py','regional_execution.py','regional_contract.py'):
        shutil.copy2(STAGE/'server_integration/school'/name,ROOT/'school'/name)
    code=ROOT/'school/backend.py';s=code.read_text();assert 'regional_execution_router' not in s
    code.write_text(s+'\nfrom .regional_execution import router as regional_execution_router\nrouter.include_router(regional_execution_router)\n')
    shutil.copytree(STAGE/'server_integration/regional_search',ROOT/'regional-search-code/server_integration/regional_search',dirs_exist_ok=True,ignore=shutil.ignore_patterns('__pycache__'))
    package=ROOT/'data/regional-search-packages'/manifest['packageId'];shutil.copytree(STAGE/'package',package)
    registry=ROOT/'data/backend/regional-search/packages.json';entries=json.loads(registry.read_text());entry=entries[0]
    entry['packageId']=manifest['packageId'];entry['adapterHash']=adapter_hash();registry.write_text(json.dumps(entries))
    compose=ROOT/'compose.regional-search.yml';s=compose.read_text();assert 'regional-observer:' not in s
    # Same constrained numerical image; distinct service so planning cannot stall frames.
    service=s[s.index('  regional-planner:'):].replace('regional-planner:','regional-observer:',1).replace('server_integration.regional_search.worker','server_integration.regional_search.observe')
    compose.write_text(s+service)
    allow=ROOT/'web-allowlist.json';allowed=json.loads(allow.read_text())
    for path in (STAGE/'server_integration/regional_search/web').glob('*'):
        shutil.copy2(path,ROOT/'web'/path.name)
        if isinstance(allowed,list):
            if path.name not in allowed:allowed.append(path.name)
        else:raise RuntimeError('Unknown web allowlist structure')
    html=ROOT/'web/test-patrol.html';s=html.read_text();s=s.replace('<h1>선택 구역 시뮬레이션 정찰</h1>','<p><a href="/regional-search.html">지역수색 · 경로 준비 / 실제 95% 관측 / 실행 상태 →</a></p><h1>선택 구역 시뮬레이션 정찰</h1>');html.write_text(s)
    allow.write_text(json.dumps(allowed))
    subprocess.run([str(ROOT/'scripts/stack.sh'),'config','--quiet'],check=True)
    subprocess.run([str(ROOT/'scripts/stack.sh'),'restart','backend','gateway'],check=True)
    subprocess.run([str(ROOT/'scripts/stack.sh'),'up','-d','--no-deps','regional-planner','regional-observer'],check=True)
    (STAGE/'deployed.json').write_text(json.dumps(dict(packageId=manifest['packageId'],adapterHash=adapter_hash(),backup=str(backup),status='DEPLOYED',realTouched=False,visionRestarted=False)))
    print('DEPLOYED; authenticated acceptance remains required')

if __name__=='__main__':main()
