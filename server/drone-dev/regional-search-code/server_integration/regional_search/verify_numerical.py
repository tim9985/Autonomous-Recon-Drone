"""Fresh plan plus previously captured RGB replay; no new simulator or flight."""
import argparse,hashlib,json,time
from pathlib import Path
from .package import read,save,digest,adapter_hash,verify
from .planner import prepare
from .observe import run
from .pc_worker import executable_plan

def main():
    p=argparse.ArgumentParser();p.add_argument('--root',type=Path,required=True);p.add_argument('--replay-only',action='store_true');a=p.parse_args();root=a.root
    package=root/'package';manifest=verify(package)
    result=read(root/'fresh-plan.json') if a.replay_only else prepare(package,dict(packageId=manifest['packageId'],regionId='zone-106c8e3a7e32',adapterHash=adapter_hash()))
    save(root/'fresh-plan.json',result)
    assert result['state']=='READY' and result['actualEvidenceWrites']==0
    job=dict(result=result,result_hash=digest(result),package_id=manifest['packageId'],request=dict(regionId=result['regionId']))
    executable_plan(job,manifest,dict(version='677a3be43c2cd2fb'))
    replay=root/'recorded-replay';n=len(list((replay/'frames').glob('*.json')))
    save(replay/'request.json',dict(job=job,execution=dict(execution_id='recorded-replay-only',state='CANCELLED',last_sequence=n)))
    # Observer resolves package by immutable ID, as in the deployed queue.
    packages=root/'packages';packages.mkdir(exist_ok=True)
    import os
    link=packages/manifest['packageId']
    if not link.exists():os.symlink(package,link,target_is_directory=True)
    began=time.perf_counter();run(replay,packages);elapsed=time.perf_counter()-began
    cells=[]
    for f in (replay/'completions').glob('*.json'):cells.extend(read(f))
    stat=read(replay/'observation.json')
    assert cells and stat['frameCounts']['accepted']>=6
    assert all(c['evidence']['evidenceOrigin']=='CAPTURED_RGB' and c['evidence']['durationSeconds']>=1 and c['evidence']['distinctFrames']>=3 for c in cells)
    summary=dict(status='PASS',scope='FRESH_PLAN_AND_PREVIOUS_CAPTURE_REPLAY_NOT_NEW_FLIGHT',preparationSeconds=result['preparationSeconds'],
        predicted95Seconds=result['plan'].get('predictedFirstTargetSeconds'),predictedPercent=result['plan']['predictedPercent'],
        replayFrames=n,completedParts=len(cells),completedAreaM2=sum(c['areaM2'] for c in cells),frameCounts=stat['frameCounts'],
        replaySeconds=elapsed,observationProcessingSeconds=stat['processingSeconds'],packageId=manifest['packageId'],adapterHash=adapter_hash())
    save(root/'numerical-check.json',summary);print(json.dumps(summary))

if __name__=='__main__':main()
