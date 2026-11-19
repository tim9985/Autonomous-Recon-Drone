"""Fresh map-to-plan entry point; never imports benchmark reports or saved paths."""
import copy
from dataclasses import asdict
import math
from pathlib import Path
import sys
import time
from .package import read, verify, digest, adapter_hash


def construct(package, region_id, *, observed=False):
    root = Path(package).resolve()
    manifest = verify(root)
    sys.path.insert(0, str(root / 'mission_control_pwa/backend'))
    from app.building_activity import version
    from app.search_primitive_graph import FusedPrimitiveGraphSearch
    from app.partial_area_search import PartSearchPolicy
    from app.local_search_geometry import SearchGeometry
    from app.simulation_coverage import SpatialWorld
    from app.spatial_grid import PROJECT
    from app.global_search import boundary_area
    from shapely.geometry import shape
    from shapely.ops import transform
    if version() != manifest['buildingActivityVersion']:
        raise ValueError('Loaded algorithm policy differs from the package')
    class RegionalSearch(FusedPrimitiveGraphSearch):
        native_candidate_refinement = True
        candidate_refinement_seconds = 6.
        repair_incomplete_tour = True
        residual_vantage_repair = True
        spatial_block_planning = False
        recover_incomplete_seed = True
    data = read(root / 'input.json')
    config = {**data['config'], 'release': str(root / 'world')}
    region = next((r for r in read(root / 'regions.json')['features'] if r['properties']['zoneId'] == region_id), None)
    if region is None:
        raise ValueError('Region is not in this immutable package')
    area = transform(PROJECT.transform, shape(region['geometry'])).intersection(
        boundary_area(read(root / 'boundary.geojson'), config, data['gridVersion']))
    if area.is_empty or area.area < 100:
        raise ValueError('Region is outside the supported campus boundary or too small')
    policy = PartSearchPolicy(**data['policy'])
    world = SpatialWorld(config)
    search = RegionalSearch(world, region, data['gridVersion'], policy,
        geometry=SearchGeometry(world, area, policy), projected_area=area)
    if not observed:
        from app.search_aperture_views import augment
        search.aperture_report = augment(search, time.monotonic()+7.)
        search.coverage_time_priority = search.aperture_report['enabled']
    return search, manifest


def execution_contract(search, plan, start, yaw, ingress):
    from app.search_trajectory import build
    from app.search_observation_segments import attach
    from app.local_search_timing import timing_for
    from app.spatial_grid import GEOGRAPHIC
    from shapely.geometry import mapping
    from shapely.ops import transform
    heading, legs = yaw, []
    previous = start
    for leg in plan['routes']:
        if math.dist(previous, leg['path'][0]) > 1e-6:
            raise ValueError('Discontinuous regional route')
        spec = copy.deepcopy(leg.get('observationSegment'))
        if spec:
            spec['generation'] = search.planning_core.generation
        phases, _ = build(search, attach(leg['path'], spec), heading, leg['yawDeg'], dwell=True)
        rows = []
        for kind, a, b, angle, delta, seconds in phases:
            if not (seconds > 0 and all(math.isfinite(v) for v in [*a, *b, angle, delta, seconds])):
                raise ValueError('Invalid motion phase')
            if math.dist(a, b)/seconds > 4.00001 or abs(delta)/seconds > 30.00001:
                raise ValueError('Motion envelope changed')
            rows.append(dict(kind=kind, start=search._ned(a), end=search._ned(b), yaw=angle, delta=delta, seconds=seconds))
        legs.append(dict(phases=rows, otherSeconds=timing_for(search).other_seconds))
        previous, heading = leg['path'][-1], leg['yawDeg']
    return dict(profile='SIM_BODY_YAW_PHASES_V1', coordinateFrame='NED_M',
        requiredCapabilities=['POSITION_VELOCITY_YAW', 'PAIRED_RGB_POSE', 'LOCAL_LOSS_STOP', 'INPUT_BINDING'],
        entryNed=search._ned(start), entryYaw=yaw, homeNed=search._ned(search.home),
        ingressPath=[search._ned(p) for p in ingress], returnPath=[search._ned(p) for p in plan['returnPath']],
        legs=legs, realExecutable=False, automaticStart=False,
        originGeographic=list(GEOGRAPHIC.transform(*search.geometry.home[:2])),
        targetGeometry=mapping(transform(GEOGRAPHIC.transform,search.fixed_target_geometry)))


def prepare(package, request):
    began = time.perf_counter()
    adapter = adapter_hash()
    if request.get('adapterHash', adapter) != adapter:
        raise ValueError('Planner adapter changed since the request was submitted')
    search, manifest = construct(package, request['regionId'])
    if request['packageId'] != manifest['packageId']:
        raise ValueError('Request input version changed')
    from app.search_entry import entry_path
    from app.search_trajectory import TrajectoryModel, configure
    from app.search_preflight import prepare_full_route
    from app.local_search_timing import estimate_seconds
    from shapely.geometry import Point
    import numpy as np
    if request.get('entryNed') is None:
        start, yaw, ingress = entry_path(search, deadline=time.monotonic()+10.)
    else:
        start = np.asarray(search._enu(request['entryNed']))
        yaw = float(request['entryYawDeg'])
        if not search.area.covers(Point(start[:2])) or not search.geometry.clear(start)[0]:
            raise ValueError('Actual entry pose is outside the region or unsafe')
        ingress = search.geometry.path(search.home, start, deadline=time.monotonic()+5.)
        if ingress is None:
            raise ValueError('No checked ingress/return from the configured home')
    # A disposable forecast uses the existing research profile unchanged.
    # It never becomes the operational observation ledger.
    search.planning_core.evidence_origin = 'OFFLINE_SYNTHETIC'
    configure(search, TrajectoryModel(mode='CURVE_YAW', joint_segments=True, curved_observations=True,
                                     heading_mode='VIEW_TRACKING'))
    search.graph_revision = 'research_fused'
    ingress_seconds = estimate_seconds(search, ingress, 0., yaw, dwell=False)
    limit = 60.
    plan = prepare_full_route(search, start=start, yaw=yaw, elapsed_before_start=ingress_seconds,
        max_seconds=max(.001, limit-1.-(time.perf_counter()-began)), strategy='PRIMITIVE_GRAPH',
        time_limit_seconds=search.target_area_m2/10000.*120., cache_validation=False)
    elapsed = time.perf_counter()-began
    ready = bool(plan.get('predictedPercent', 0) >= search.policy.target_percent and plan.get('returnPath'))
    result = dict(schema='REGIONAL_SEARCH_RESULT_V1', packageId=manifest['packageId'], adapterHash=adapter, regionId=request['regionId'],
        state='READY' if ready and elapsed <= limit else 'INCOMPLETE', preparationSeconds=elapsed,
        preparationLimitSeconds=limit, targetAreaM2=search.target_area_m2, policy=asdict(search.policy),
        camera=asdict(search.camera_profile), buildingActivityVersion=manifest['buildingActivityVersion'],
        worldVersion=manifest['worldVersion'], gridVersion=manifest['gridVersion'],
        predictedOnly=True, actualEvidenceWrites=0, actualObservedPercent=0., realExecutable=False,
        plan=plan, ingressSeconds=ingress_seconds)
    if ready:
        result['execution'] = execution_contract(search, plan, start, yaw, ingress)
    result['preparationSeconds'] = time.perf_counter()-began
    if result['preparationSeconds'] > limit:
        result['state'] = 'INCOMPLETE'
    if search.observed.any() or search.frame_counts['received']:
        raise RuntimeError('Planning unexpectedly changed actual evidence')
    result['resultHash'] = digest(result)
    return result
