"""Preserve a short, real recorded SIM camera interval for integration replay only."""
from pathlib import Path
import hashlib,json
from .package import read,save

ROOT=Path(__file__).resolve().parents[2]

def main():
    trial=ROOT/'문서/지역수색_기존알고리즘_SIM검증_20261022'
    active=read(trial/'active-run.json');raw=Path(active['raw']);out=ROOT/'server_integration/artifacts/regional-search/recorded-replay'
    result=read(Path(active['output'])/'observation-result.json');started=result['startedAt'];count=0;source=[]
    # Bounded archived interval, identified by the original REGION_ENTRY timestamp.
    # Avoid hydrating every Drive placeholder from a 400-second recording.
    for path in [raw/f'rgb-{i:06d}.json' for i in range(535,568)]:
        meta=read(path);stamp=meta.get('receivedAt',0)
        if stamp>started+4.5:break
        if not started+.2<=stamp<=started+4.5:continue
        png=path.with_suffix('.png')
        if not png.exists():continue
        count+=1;sha=hashlib.sha256(png.read_bytes()).hexdigest()
        packet=dict(receivedAt=stamp,observation=meta['cameraObservation'],aircraftBefore=meta['aircraftBefore'],aircraftAfter=meta['aircraftAfter'],
            searchStartedAt=started,eligible=True,imageSha256=sha,recordingName=png.name)
        save(out/'frames'/f'{count:08d}.json',packet)
        source.append(dict(name=png.name,sha256=sha,metadataSha256=hashlib.sha256(path.read_bytes()).hexdigest()))
    if count<6:raise RuntimeError('Insufficient original contiguous frames')
    save(out/'provenance.json',dict(scope='PREVIOUS_SIM_RECORDING_REPLAY_NOT_NEW_FLIGHT',originalRun=active['runId'],originalDirectory=str(raw),startedAt=started,frames=source))
    print(json.dumps(dict(frames=count,scope='RECORDED_REPLAY_ONLY')))

if __name__=='__main__':main()
