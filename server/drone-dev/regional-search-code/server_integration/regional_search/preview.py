"""Isolated nominal coverage replay for the UI; never writes actual observations.

The route and immutable input are bound to the stored result hash. This worker
has no database credentials or network and runs separately from the RGB writer.
"""
import argparse
import copy
import math
import os
from pathlib import Path
import subprocess
import sys
import time
from .package import read, save, digest, adapter_hash

VERSION = 'REGIONAL_TEMPORAL_PREVIEW_V1'


def same_execution(a,b):
    """Allow only floating-point roundoff across Linux/Windows geometry math."""
    if isinstance(a,dict):
        return isinstance(b,dict) and a.keys()==b.keys() and all(same_execution(a[k],b[k]) for k in a)
    if isinstance(a,list):
        return isinstance(b,list) and len(a)==len(b) and all(same_execution(x,y) for x,y in zip(a,b))
    if type(a) in (float,int) and type(b) in (float,int):
        return math.isfinite(a) and math.isfinite(b) and abs(a-b)<=1e-8
    return type(a) is type(b) and a==b


def replay(package, request):
    began = time.perf_counter()
    result = request['result']
    if (request['version'] != VERSION or digest(result) != request['resultHash']
            or result['packageId'] != request['packageId'] or result['state'] != 'READY'
            or result['adapterHash'] != adapter_hash()):
        raise ValueError('PREVIEW_BINDING_CHANGED')
    from .planner import construct, execution_contract
    from .motion import Timeline
    import numpy as np
    from shapely.geometry import mapping, shape
    from shapely.ops import transform
    from shapely.affinity import translate
    search, manifest = construct(package, result['regionId'], observed=True)
    from app.search_trajectory import configure, TrajectoryModel
    from app.local_search_ipp import Forecast
    from app.local_search_timing import forecast
    from app.search_observation_segments import attach
    from app.spatial_grid import PROJECT
    search.planning_core.evidence_origin = 'OFFLINE_SYNTHETIC'
    configure(search, TrajectoryModel(mode='CURVE_YAW', joint_segments=True,
        curved_observations=True, heading_mode='VIEW_TRACKING'))
    execution = result['execution']
    # Rebuild phases from the same core; stale camera/motion interpretation fails.
    rebuilt = execution_contract(search, result['plan'], search._enu(execution['entryNed']),
        execution['entryYaw'], [search._enu(p) for p in execution['ingressPath']])
    # GEOS may split a near-zero-area sliver differently across platforms.
    # Compare its actual area in metres; never relax route, height or timing.
    expected_target=transform(PROJECT.transform,shape(execution['targetGeometry']))
    target_error=search.fixed_target_geometry.symmetric_difference(expected_target).area
    if (target_error>1e-4 or abs(search.target_area_m2-result['targetAreaM2'])>1e-4
            or not same_execution({k:v for k,v in rebuilt.items() if k!='targetGeometry'},
                                  {k:v for k,v in execution.items() if k!='targetGeometry'})):
        raise ValueError('PREVIEW_EXECUTION_CHANGED')
    timeline = Timeline(dict(execution, scope='LOCAL_UNREAL_ARDUCOPTER_SITL_ONLY',
        predictedSeconds=result['plan']['predictedSearchSeconds']))
    completed = np.full(len(search.cells), np.nan)
    seed = Forecast(search.observed, search.policy)
    curve = [[0., 0.]]
    first95 = None

    def sample(future, point, yaw):
        nonlocal first95
        new = future.done & ~np.isfinite(completed)
        if new.any():
            completed[new] = future.time
            percent = float(search.areas[future.done].sum()) / search.target_area_m2 * 100
            curve.append([float(future.time), percent])
            if first95 is None and percent >= 95:
                first95 = float(future.time)

    heading = execution['entryYaw']
    deadline = time.monotonic() + 110.
    for leg in result['plan']['routes']:
        spec = copy.deepcopy(leg.get('observationSegment'))
        if spec:
            spec['generation'] = search.planning_core.generation
        seed, _ = forecast(search, seed, attach(leg['path'], spec), heading, leg['yawDeg'],
            sample_seconds=.2, on_sample=sample, deadline=deadline)
        heading = leg['yawDeg']
    if abs(seed.time - timeline.seconds) > 1e-6:
        raise ValueError('PREVIEW_CLOCK_CHANGED')
    if search.observed.any() or search.frame_counts['received']:
        raise ValueError('PREVIEW_ACTUAL_EVIDENCE_WRITE')
    ox, oy = search.geometry.home[:2]

    def geometry(g):
        return mapping(translate(g, xoff=-float(ox), yoff=-float(oy))) if g is not None else None

    return dict(state='READY', version=VERSION, resultHash=request['resultHash'],
        packageId=manifest['packageId'], buildingActivityVersion=manifest['buildingActivityVersion'],
        coordinateFrame='LOCAL_EAST_NORTH_M', predictionOnly=True, actualEvidenceWrites=0,
        assumptions='PRIOR_MAP_OCCLUSION_NOMINAL_RGB_5HZ_NO_TRACKING_OR_IMAGE_DROPOUT',
        computeSeconds=time.perf_counter()-began, seconds=timeline.seconds,
        percent=curve[-1][1], first95Seconds=first95, targetAreaM2=search.target_area_m2,
        forecastDifferencePP=curve[-1][1]-result['plan']['predictedPercent'],
        target=geometry(search.fixed_target_geometry), buildings=geometry(search.geometry.building_mask.intersection(search.area.buffer(20))),
        forest=geometry(search.classified_forest_mask), canopy=geometry(search.opaque_canopy_mask),
        cells=[dict(geometry=geometry(c['geometry']), areaM2=float(search.areas[i]),
                    completedAt=float(completed[i]) if math.isfinite(completed[i]) else None)
               for i, c in enumerate(search.cells)], curve=curve)


def process(path, queue, packages):
    request = read(path)
    key = digest(dict(resultHash=request['resultHash'], version=VERSION))
    if path.stem != key:
        raise ValueError('PREVIEW_ID_CHANGED')
    destination = queue/'previews'/f'{key}.json'
    if destination.exists():
        return
    pid = request['packageId']
    if len(pid) != 64 or any(c not in '0123456789abcdef' for c in pid):
        raise ValueError('PREVIEW_PACKAGE_INVALID')
    work = queue/'preview-work'/key
    work.mkdir(parents=True, exist_ok=True)
    save(work/'status.json', dict(state='RUNNING', resultHash=request['resultHash']))
    env = {**os.environ, 'OMP_NUM_THREADS':'1', 'OPENBLAS_NUM_THREADS':'1',
        'MKL_NUM_THREADS':'1', 'NUMBA_CACHE_DIR':str(queue/'numba-cache')}
    try:
        with (work/'worker.log').open('w') as log:
            subprocess.run([sys.executable, '-m', 'server_integration.regional_search.preview',
                '--request', str(path), '--packages', str(packages), '--output', str(destination)],
                env=env, stdout=log, stderr=subprocess.STDOUT, check=True, timeout=150)
    except (subprocess.SubprocessError, OSError):
        save(destination, dict(state='FAILED', reason='PREVIEW_REPLAY_FAILED',
            version=VERSION, resultHash=request['resultHash'], packageId=pid, predictionOnly=True, actualEvidenceWrites=0))


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--queue', type=Path);p.add_argument('--packages', type=Path, required=True)
    p.add_argument('--request', type=Path);p.add_argument('--output', type=Path)
    a = p.parse_args()
    if a.request:
        request = read(a.request)
        return save(a.output, replay(a.packages/request['packageId'], request))
    rejected = set()
    while True:
        for path in sorted((a.queue/'preview-requests').glob('*.json')):
            if path.name in rejected:
                continue
            try:
                process(path, a.queue, a.packages)
            except (ValueError, KeyError, OSError):
                rejected.add(path.name)
                print('PREVIEW_REJECTED '+path.name, flush=True)
        time.sleep(1.)


if __name__ == '__main__':
    main()
