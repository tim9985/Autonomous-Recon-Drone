"""Actual RGB metadata accumulation in the same core, outside the HTTP process.

RGB quality is measured on the authenticated PC from the retained lossless image.
This service has no flight authority, network, DB password, or forecast masks.
"""
import argparse
from pathlib import Path
import time
import sys
from .package import read,save


def run(directory,packages):
    from .planner import construct
    import numpy as np
    request=read(directory/'request.json');job=request['job'];eid=request['execution']['execution_id']
    search,manifest=construct(packages/job['package_id'],job['request']['regionId'],observed=True)
    from app.spatial_grid import GEOGRAPHIC
    from shapely.ops import transform
    from shapely.geometry import mapping
    search.planning_core.evidence_origin='CAPTURED_RGB';search.state='RUNNING'
    base=dict(packageId=manifest['packageId'],resultHash=job['result_hash'],sequence=0,state='READY',
              percent=0.,targetAreaM2=search.target_area_m2,frameCounts=search.frame_counts,
              evidenceOrigin='CAPTURED_RGB',heartbeatAt=time.time())
    save(directory/'observation.json',base)
    sequence=0;started=None;first95=None;last_save=0;elapsed=0.;last=None;processing=0.;percent=0.
    while True:
        request=read(directory/'request.json');execution=request['execution']
        f=directory/'frames'/f'{sequence+1:08d}.json'
        if f.is_file():
            packet=read(f);sample=packet['observation'];before=search.observed.copy()
            # Preserve acquisition time; queue/worker delay must not invent exposure gaps.
            if started is None:started=packet['searchStartedAt'];search.started_at=started
            if packet['searchStartedAt']!=started:raise ValueError('REGION_CLOCK_CHANGED')
            # RGB processing may finish after entry for a frame acquired just before it.
            # Drain that frame as ineligible; never count it or abort the observer.
            eligible=packet['eligible'] and sample['capturedAt']>=started
            t=time.perf_counter();search.update(sample,packet['receivedAt'],eligible);processing+=time.perf_counter()-t
            elapsed=max(0.,sample['capturedAt']-started);sequence+=1;cells=[]
            for i in np.flatnonzero(search.observed & ~before):
                c=search.cells[i]
                cells.append(dict(index=int(i),areaM2=float(search.areas[i]),geometry=mapping(transform(GEOGRAPHIC.transform,c['geometry'])),evidence=c['completionEvidence']))
            save(directory/'completions'/f'{sequence:08d}.json',cells)
            percent=100*float(search.areas[search.observed].sum())/search.target_area_m2
            if first95 is None and percent>=95:first95=elapsed
            last=dict(capturedAt=sample['capturedAt'],positionNed=sample['positionNed'],reason=search.reason)
        else:
            if execution['state'] in ('COMPLETED','FAILED','CANCELLED') and sequence>=execution['last_sequence']:break
            # An unconfirmed lost PC can no longer provide eligible evidence. Keep data.
            if execution['state']=='UNCONFIRMED' and sequence>=execution['last_sequence']:break
            from datetime import datetime
            lease=execution.get('lease_until')
            if lease and time.time()-datetime.fromisoformat(lease).timestamp()>30 and sequence>=execution['last_sequence']:break
            time.sleep(.05)
        if time.monotonic()-last_save>.5:
            save(directory/'observation.json',dict(base,percent=percent,searchStartedAt=started,sequence=sequence,heartbeatAt=time.time(),elapsedSeconds=elapsed,
                first95Seconds=first95,frameCounts=search.frame_counts,processingSeconds=processing,lastFrame=last))
            last_save=time.monotonic()
    save(directory/'observation.json',dict(base,percent=percent,searchStartedAt=started,state='FINISHED',sequence=sequence,heartbeatAt=time.time(),elapsedSeconds=elapsed,
        first95Seconds=first95,frameCounts=search.frame_counts,processingSeconds=processing,lastFrame=last))


def main():
    p=argparse.ArgumentParser();p.add_argument('--queue',type=Path,required=True);p.add_argument('--packages',type=Path,required=True)
    p.add_argument('--execution',type=Path);a=p.parse_args()
    if a.execution:return run(a.execution,a.packages)
    import subprocess
    finished=set()
    while True:
        for f in sorted((a.queue/'executions').glob('*/request.json')):
            if f.parent.name in finished:continue
            r=read(f)['execution']
            if r['state'] not in ('RUNNING','STOP_REQUESTED','UNCONFIRMED','COMPLETED','FAILED','CANCELLED'):continue
            with (f.parent/'observer.log').open('a',encoding='utf-8') as log:
                child=subprocess.run([sys.executable,'-m','server_integration.regional_search.observe','--queue',str(a.queue),
                    '--packages',str(a.packages),'--execution',str(f.parent)],stdout=log,stderr=log)
            if child.returncode:
                save(f.parent/'observer-error.json',dict(error='ACTUAL_OBSERVER_FAILED',returnCode=child.returncode,at=time.time()))
            finished.add(f.parent.name)
        time.sleep(.5)

if __name__=='__main__':main()
