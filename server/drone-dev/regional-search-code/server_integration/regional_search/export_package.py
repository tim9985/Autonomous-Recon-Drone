"""Export current source maps, never historical routes, accounts or recordings."""
import argparse
import ast
import hashlib
import json
from pathlib import Path
import shutil
import sqlite3
import sys
import zlib
from .package import digest, read, save


def export(root, output):
    root, output = Path(root).resolve(), Path(output).resolve()
    if output.exists():
        raise ValueError('Choose a new immutable package directory')
    sys.path.insert(0, str(root / 'mission_control_pwa/backend'))
    from app.building_activity import current_policy
    from app.partial_area_search import PartSearchPolicy
    from dataclasses import asdict
    config = read(root / 'simulation_world/runtime/config.json')
    release = Path(config['release'])
    activity = current_policy()
    if activity is None:
        raise ValueError('Explicit current building policy required')
    # These are source boundary and grid references, not an experiment answer.
    boundary = root / '문서/전역지역_통합수색_20261008/본캠퍼스_경계검토/비교결과-v2/candidate-boundary.geojson'
    source_grid = '04e1b46514574d45'
    with sqlite3.connect((root / 'mission_control_pwa/backend/data/semantic-grid.sqlite3').as_uri()+'?mode=ro', uri=True) as db:
        row = db.execute('SELECT payload_zlib FROM semantic_grid_releases WHERE grid_version=? AND world_version=?',
                         (source_grid, config['worldVersion'])).fetchone()
    if row is None:
        raise ValueError('Registered campus grid missing')
    grid = json.loads(zlib.decompress(row[0]))
    output.mkdir(parents=True)
    sources = {}

    def copy(source, target):
        source = Path(source)
        dest = output / target
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, dest)
        sources[target] = {'source': source.relative_to(root).as_posix(), 'sha256': hashlib.sha256(source.read_bytes()).hexdigest()}

    for name in ('manifest.json', 'terrain.tif', 'buildings.geojson', 'facilities.geojson'):
        copy(release / name, 'world/' + name)
    copy(boundary, 'boundary.geojson')
    save(output / 'regions.json', grid['zones'])
    save(output / 'grid-report.json', grid['report'])
    # Retain repository-relative policy inputs so the same production readers
    # work in a relocated Linux bundle without process-wide monkeypatching.
    pointer = root / 'mission_control_pwa/backend/data/building-activity/active.json'
    active = read(pointer)
    for source in (pointer, pointer.parent / active['manifest'], pointer.parent / active['manifest'].replace('manifest.json', 'bindings.json')):
        copy(source, source.relative_to(root).as_posix())
    index_path = root / 'mission_control_pwa/backend/data_seeds/landcover_sources.json'
    index = read(index_path)
    selected = [s for s in index['sources'] if (s['environmentId'], s['worldVersion']) == (config['environmentId'], config['worldVersion'])]
    if len(selected) != 1:
        raise ValueError('Exactly one current land-cover source required')
    source = selected[0]
    copy(root / source['localPath'], Path(source['localPath']).as_posix())
    save(output / index_path.relative_to(root), {**index, 'sources': selected})
    world_config = {k: config[k] for k in ('environmentId', 'worldVersion', 'frame', 'spawnNeu', 'groundElevation')}
    world_config['release'] = 'world'
    policy = asdict(PartSearchPolicy(planner_mode='EFFICIENT_HORIZON', target_percent=95., transit_speed_mps=4.,
        budget_seconds=1800., target_exclusion='CLASSIFIED_FOREST_AND_OPAQUE_CANOPY'))
    save(output / 'input.json', {'config': world_config, 'gridVersion': source_grid, 'policy': policy})
    save(output / 'provenance.json', sources)
    # Ship the current algorithm source in its existing package namespace,
    # separate from the school's unrelated app TLS/service package.
    app = root / 'mission_control_pwa/backend/app'
    pending = ['search_primitive_graph', 'search_entry', 'search_aperture_views', 'search_preflight',
               'search_trajectory', 'search_observation_segments', 'local_search_timing',
               'partial_area_search', 'simulation_coverage', 'global_search', 'spatial_grid']
    included = set()
    while pending:
        name = pending.pop()
        if name in included:
            continue
        if name in ('accounts', 'main'):
            raise ValueError('Planner must not depend on local accounts or HTTP application')
        source = app / (name + '.py')
        if not source.is_file():
            raise ValueError('Unsupported planner package dependency: ' + name)
        included.add(name)
        tree = ast.parse(source.read_text(encoding='utf-8-sig'))
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom) and node.level == 1:
                pending.extend([node.module.split('.')[0]] if node.module else [a.name for a in node.names])
        copy(source, source.relative_to(root).as_posix())
    save(output / 'algorithm-modules.json', sorted(included))
    (output / 'mission_control_pwa/backend/app/__init__.py').write_text('', encoding='utf-8')
    files = {p.relative_to(output).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
             for p in sorted(output.rglob('*')) if p.is_file()}
    manifest = dict(schema='REGIONAL_SEARCH_INPUT_V1', environment='SIM', environmentId=config['environmentId'],
        worldVersion=config['worldVersion'], gridVersion=source_grid, buildingActivityVersion=activity.version,
        algorithm='research_fused+candidate/VIEW_TRACKING', files=files, regionCount=len(grid['zones']['features']),
        sourceSpatialRelease='campus-'+source_grid, realExecutable=False, observationEvidence=False)
    manifest['packageId'] = digest(manifest)
    save(output / 'package.json', manifest)
    return manifest


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--root', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    a = p.parse_args()
    m = export(a.root, a.output)
    print(json.dumps({k: m[k] for k in ('packageId', 'regionCount', 'buildingActivityVersion')}))
