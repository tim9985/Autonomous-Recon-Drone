"""Read-only map projection of captured-RGB completion ledgers (never forecasts)."""
import json
import math
import re
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import RLock
from uuid import UUID

_cache = OrderedDict()
_snapshots = OrderedDict()
_progress = OrderedDict()
_lock = RLock()
_cell_lock = RLock()


def dependencies(value,control,runs):
    """Version every binding and committed metadata before reusing encoded geometry."""
    from .local_file_snapshots import read_json
    if not value.get('plan_id'):return []
    path=control/'plans'/f"{UUID(value['plan_id'])}.json"
    plan=read_json(path);paths=[path]
    if plan['plan_hash']!=value.get('plan_hash'):raise ValueError('COVERAGE_PLAN_BINDING_CHANGED')
    tasks=plan.get('tasks',[]) if plan['kind']=='GLOBAL' else [plan] if plan['kind']=='REGIONAL' else []
    for task in tasks:
        directory=runs/str(UUID(value['run_id']))/'observers'/segment(task['region_id'])
        paths.extend([control/'plans'/f"{UUID(task['plan_id'])}.json",directory/'request.json',directory/'observation.json'])
    return paths


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def segment(value):
    if not isinstance(value, str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,200}', value):
        raise ValueError('INVALID_LEDGER_PATH')
    return value


def polygon(geometry):
    if not isinstance(geometry, dict) or geometry.get('type') not in ('Polygon', 'MultiPolygon'):
        return False
    polygons = [geometry['coordinates']] if geometry['type'] == 'Polygon' else geometry['coordinates']
    return bool(polygons) and all(rings and all(len(ring) >= 4 and ring[0] == ring[-1] and all(
        len(p) >= 2 and all(isinstance(v, (float, int)) and math.isfinite(v) for v in p[:2])
        and -180 <= p[0] <= 180 and -90 <= p[1] <= 90 for p in ring) for ring in rings) for rings in polygons)

def surface(geometry):
    """Clipped cells may include zero-area boundary lines; retain every valid face."""
    if polygon(geometry):
        return geometry
    if isinstance(geometry,dict) and geometry.get('type')=='GeometryCollection':
        polygons=[]
        for member in geometry.get('geometries',[]):
            if member.get('type') in ('Point','MultiPoint','LineString','MultiLineString'):continue
            face=surface(member)
            if face is None:return None
            polygons.extend([face['coordinates']] if face['type']=='Polygon' else face['coordinates'])
        if polygons:return dict(type='MultiPolygon',coordinates=polygons)
    return None


def committed_shards(directory,first,last):
    """Bound Windows bind-mount I/O without queuing the entire ledger in memory."""
    def load(number):return read(directory/'completions'/f'{number:08d}.json')
    if last-first<8:
        for number in range(first,last+1):yield load(number)
        return
    with ThreadPoolExecutor(max_workers=8,thread_name_prefix='coverage-ledger') as pool:
        for start in range(first,last+1,64):
            yield from pool.map(load,range(start,min(start+64,last+1)))


def completed_cells(directory, meta, binding):
    """Only consume shards committed by observation.sequence; cache bounded run/region state."""
    sequence = meta['sequence']
    if type(sequence) is not int or not 0 <= sequence <= 100000:
        raise ValueError('INVALID_LEDGER_SEQUENCE')
    key = (str(directory), binding['package_id'], binding['result_hash'])
    # Slow shard reads must never own the lock used by live progress telemetry.
    with _cell_lock:
        previous = _cache.get(key, (0, {}))
        last, cells = previous if previous[0] <= sequence else (0, {})
        cells = dict(cells)
        for shard in committed_shards(directory,last+1,sequence):
            if not isinstance(shard, list):
                raise ValueError('INVALID_LEDGER_SHARD')
            for cell in shard:
                cell=dict(cell,geometry=surface(cell.get('geometry')))
                evidence = cell.get('evidence', {})
                area, index = cell['areaM2'], cell['index']
                duration, ended = evidence.get('durationSeconds'), evidence.get('endedAt')
                if (type(index) is not int or index < 0 or not isinstance(area, (float, int))
                    or not math.isfinite(area) or area <= 0 or cell['geometry'] is None
                    or evidence.get('evidenceOrigin') != 'CAPTURED_RGB'
                    or type(evidence.get('distinctFrames')) is not int or evidence['distinctFrames'] < 3
                    or not isinstance(duration, (float, int)) or not math.isfinite(duration) or duration < 1
                    or not isinstance(ended, (float, int)) or not math.isfinite(ended) or ended <= 0
                    or evidence.get('firstFrameId') == evidence.get('lastFrameId')):
                    raise ValueError('UNQUALIFIED_OBSERVATION_CELL')
                if index in cells and cells[index] != cell:
                    raise ValueError('CONFLICTING_OBSERVATION_CELL')
                cells[index] = cell
        _cache[key] = (sequence, cells)
        _cache.move_to_end(key)
        while len(_cache) > 24:
            _cache.popitem(last=False)
        return list(cells.values())


def coverage(value, control: Path, runs: Path):
    run_id = str(UUID(value['run_id']))
    result = dict(job_id=value['job_id'], run_id=run_id, plan_id=value.get('plan_id'),
                  evidence_origin='CAPTURED_RGB', state='NO_OBSERVATIONS', regions=[],
                  observed_area_m2=0., target_area_m2=0., actual_percent=None,
                  observed_cells=0, updated_at=None, features=[], type='FeatureCollection')
    if not value.get('plan_id'):
        return result
    plan = read(control/'plans'/f"{UUID(value['plan_id'])}.json")
    if plan['plan_hash'] != value.get('plan_hash'):
        raise ValueError('COVERAGE_PLAN_BINDING_CHANGED')
    tasks = plan.get('tasks', []) if plan['kind'] == 'GLOBAL' else [plan] if plan['kind'] == 'REGIONAL' else []
    for task in tasks:
        region_id = segment(task['region_id'])
        directory = runs/run_id/'observers'/region_id
        row = dict(region_id=region_id, name=task.get('name', region_id), state='NO_OBSERVATIONS', observed_cells=0)
        result['regions'].append(row)
        key=None;binding_valid=False
        # A malformed/mismatched region never contributes green map cells.
        try:
            child = read(control/'plans'/f"{UUID(task['plan_id'])}.json")
            # Even a retained snapshot must match this exact child/result/run.
            if not (directory/'request.json').exists():continue
            request=read(directory/'request.json')
            binding = request['job']
            if (request['execution']['execution_id'] != child['plan_id'] or child['region_id'] != region_id
                or binding['request']['regionId'] != region_id or child['package_id'] != plan['package_id']
                or binding['package_id'] != child['package_id'] or binding['result_hash'] != child['result_hash']):
                raise ValueError('COVERAGE_EVIDENCE_BINDING_CHANGED')
            key=(str(directory),child['plan_id'],child['package_id'],child['result_hash'],plan['plan_hash'])
            if not (directory/'observation.json').exists() and key not in _snapshots:continue
            binding_valid=True
            meta=read(directory/'observation.json')
            if (meta['packageId'] != child['package_id'] or meta['resultHash'] != child['result_hash']
                or meta.get('evidenceOrigin') != 'CAPTURED_RGB'):
                binding_valid=False
                raise ValueError('COVERAGE_EVIDENCE_BINDING_CHANGED')
            cells = completed_cells(directory, meta, binding)
            area, target = sum(c['areaM2'] for c in cells), meta['targetAreaM2']
            if not math.isfinite(target) or target <= 0 or area > target + .01:
                raise ValueError('INVALID_COVERAGE_AREA')
            percent = 100 * area / target
            if abs(percent - meta['percent']) > .05:
                raise ValueError('COVERAGE_LEDGER_AREA_MISMATCH')
            row.update(state=meta['state'], sequence=meta['sequence'], actual_percent=percent,
                       observed_cells=len(cells), target_area_m2=target, observed_area_m2=area,updated_at=meta['heartbeatAt'])
            features=[dict(type='Feature', geometry=c['geometry'], properties=dict(
                region_id=region_id, cell_index=c['index'], area_m2=c['areaM2'],
                evidence_origin='CAPTURED_RGB', observed_at=c['evidence']['endedAt'])) for c in cells]
            with _lock:
                prior=_snapshots.get(key)
                if prior and prior[0]['sequence']>row['sequence']:raise ValueError('COVERAGE_SEQUENCE_REGRESSED')
                _snapshots[key]=(dict(row),features);_snapshots.move_to_end(key)
                while len(_snapshots)>24:_snapshots.popitem(last=False)
        except (OSError, ValueError, KeyError, TypeError, IndexError) as error:
            with _lock:cached=_snapshots.get(key) if binding_valid else None
            if cached:
                row.update(cached[0],state='RETAINED',error=str(error));features=cached[1]
            else:
                row.update(state='UNAVAILABLE',error=str(error));continue
        result['features'].extend(features)
        result['observed_area_m2'] += row['observed_area_m2']
        result['target_area_m2'] += row['target_area_m2']
        result['updated_at'] = max(result['updated_at'] or 0, row['updated_at'])
    result['observed_cells'] = len(result['features'])
    if result['target_area_m2']:
        result['actual_percent'] = 100 * result['observed_area_m2'] / result['target_area_m2']
    result['state'] = ('PARTIAL_DATA' if any(r['state'] in ('UNAVAILABLE','RETAINED') for r in result['regions'])
                       else 'AVAILABLE' if result['target_area_m2'] else 'NO_OBSERVATIONS')
    return result


def progress(value, control: Path, runs: Path):
    """Small live percentages from committed actual-observation metadata.

    Geometry/shard reads stay on the slower map endpoint. Binding is checked
    before retaining any prior value; a forecast never supplies this endpoint.
    """
    result=dict(job_id=value.get('job_id'),run_id=value.get('run_id'),regions=[],evidence_origin='CAPTURED_RGB')
    if not value.get('plan_id') or not value.get('run_id'):return result
    plan=read(control/'plans'/f"{UUID(value['plan_id'])}.json")
    if plan['plan_hash']!=value.get('plan_hash'):raise ValueError('COVERAGE_PLAN_BINDING_CHANGED')
    tasks=plan.get('tasks',[]) if plan['kind']=='GLOBAL' else [plan] if plan['kind']=='REGIONAL' else []
    for task in tasks:
        rid=segment(task['region_id']);directory=runs/str(UUID(value['run_id']))/'observers'/rid
        key=(value['job_id'],value['run_id'],plan['plan_hash'],rid);bound=False;row=None
        try:
            if not (directory/'request.json').exists():continue
            child=read(control/'plans'/f"{UUID(task['plan_id'])}.json")
            envelope=read(directory/'request.json');binding=envelope['job']
            if (envelope['execution']['execution_id']!=child['plan_id'] or binding['request']['regionId']!=rid
                or child['region_id']!=rid or binding['package_id']!=child['package_id']
                or child['package_id']!=plan['package_id'] or binding['result_hash']!=child['result_hash']):
                raise ValueError('COVERAGE_EVIDENCE_BINDING_CHANGED')
            meta=read(directory/'observation.json')
            if (meta['packageId']!=child['package_id'] or meta['resultHash']!=child['result_hash']
                or meta.get('evidenceOrigin')!='CAPTURED_RGB'):raise ValueError('COVERAGE_EVIDENCE_BINDING_CHANGED')
            bound=True
            percent=meta['percent'];seq=meta['sequence'];area=meta['targetAreaM2']
            if (type(seq) is not int or seq<0 or seq>100000 or not isinstance(percent,(int,float))
                or not math.isfinite(percent) or not 0<=percent<=100.001 or not math.isfinite(area) or area<=0):
                raise ValueError('INVALID_COVERAGE_PROGRESS')
            row=dict(region_id=rid,sequence=seq,actual_percent=min(100.,percent),state=meta['state'],
                updated_at=meta['heartbeatAt'],started_at=meta.get('searchStartedAt'),elapsed_seconds=meta.get('elapsedSeconds'))
            with _lock:
                old=_progress.get(key)
                if old and old['sequence']>seq:row=old
                _progress[key]=row;_progress.move_to_end(key)
                while len(_progress)>256:_progress.popitem(last=False)
        except (OSError,ValueError,KeyError,TypeError):
            with _lock:row=_progress.get(key) if bound else None
        if row:result['regions'].append(dict(row))
    return result
