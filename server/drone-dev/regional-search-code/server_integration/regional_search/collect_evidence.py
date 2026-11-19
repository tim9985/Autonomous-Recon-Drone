"""Collect non-secret integration receipts and verify operational records stayed empty."""
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tarfile

ROOT=Path('/home/se/sandboxes/drone-dev');STAGE=ROOT/'regional-stage-20261022'


def main():
    spec=importlib.util.spec_from_file_location('db',ROOT/'db/apply.py')
    db=importlib.util.module_from_spec(spec);spec.loader.exec_module(db)
    report={'regions':{},'realTouched':False}
    for name in ('living','academic','support'):
        value=json.loads((STAGE/f'https-{name}.json').read_text());assert value['status']=='PASS'
        mid=value['missionId'];jid=value['jobId']
        from uuid import UUID
        UUID(mid);UUID(jid)
        data=json.loads(db.psql(f"""SELECT json_build_object(
          'jobState',(SELECT state FROM drone.regional_search_job WHERE job_id='{jid}'),
          'planCount',(SELECT count(*) FROM drone.search_plan WHERE mission_id='{mid}'),
          'planEvents',(SELECT count(*) FROM drone.mission_event WHERE mission_id='{mid}' AND event_type='PLAN_REGISTERED'),
          'observationCells',(SELECT count(*) FROM drone.observation_cell WHERE mission_id='{mid}'),
          'flightCommands',(SELECT count(*) FROM drone.flight_command WHERE mission_id='{mid}'),
          'videoFrames',(SELECT count(*) FROM drone.video_frame WHERE mission_id='{mid}'));
        """))
        assert data==dict(jobState='READY',planCount=1,planEvents=1,observationCells=0,flightCommands=0,videoFrames=0),data
        report['regions'][name]=data
    d=str(ROOT.parent/'drone-server/scripts/docker.sh')
    names=['drone-services-20261005-backend-1','drone-services-20261005-regional-planner-1','drone-services-20261005-vision-1']
    states=json.loads(subprocess.check_output([d,'inspect',*names],text=True))
    report['services']=[{'name':c['Name'],'image':c['Image'],'state':c['State'],'memoryLimit':c['HostConfig']['Memory'],
        'nanoCpus':c['HostConfig']['NanoCpus'],'networkMode':c['HostConfig']['NetworkMode']} for c in states]
    before=json.loads((ROOT/'backups/regional-search-20261022/services-before.json').read_text())
    previous=next(c for c in before if c['Name'].endswith('-vision-1'))
    after=next(c for c in states if c['Name'].endswith('-vision-1'))
    report['visionSameContainerAndStart']=previous['Id']==after['Id'] and previous['State']['StartedAt']==after['State']['StartedAt']
    assert report['visionSameContainerAndStart']
    assert all(c['State']['Running'] and not c['State']['OOMKilled'] for c in states)
    report['captureProbeFinalState']=db.psql("SELECT state FROM simulation.run WHERE run_id='32e99846-206e-46db-8690-f3101239a2a6';").strip()
    report['migrations']=json.loads(db.psql('SELECT json_agg(row_to_json(s)) FROM (SELECT version,checksum FROM drone.schema_migration ORDER BY version) s;'))
    sys.path.insert(0,str(ROOT/'regional-search-code'))
    from server_integration.regional_search.package import verify,adapter_hash
    registry=json.loads((ROOT/'data/backend/regional-search/packages.json').read_text())[0]
    package=verify(ROOT/'data/regional-search-packages'/registry['packageId'])
    assert adapter_hash()==registry['adapterHash']
    report['packageId']=package['packageId'];report['adapterHash']=adapter_hash()
    report['deployedSourceHashes']={name:hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in
        ('school/regional_search.py','db/migrations/012_regional_search.sql','compose.regional-search.yml','scripts/stack.sh')}
    (STAGE/'final-audit.json').write_text(json.dumps(report,indent=2))
    files=['final-audit.json','https-probe.json','https-living.json','https-academic.json','https-support.json',
        'https-living-job.json','https-academic-job.json','https-support-job.json','database-verify-pass.txt','deployment.json',
        'linux-check/result.json','image-build-02.log','deployment.log','v3-https-plan.json','https-plan-verifier-error.json']
    with tarfile.open(ROOT/'regional-search-evidence.tar.gz','w:gz') as t:
        for f in files:t.add(STAGE/f,arcname=f)
    print(json.dumps({'status':'PASS','regions':report['regions'],'visionUnchanged':report['visionSameContainerAndStart'],
        'archiveSha256':hashlib.sha256((ROOT/'regional-search-evidence.tar.gz').read_bytes()).hexdigest()}))


if __name__=='__main__':main()
