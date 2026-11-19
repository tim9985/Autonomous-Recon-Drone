"""Derived, map-only search candidates; never flight targets or person probabilities.

The frozen world remains untouched. All topology uses a local metric CRS and
1 mm numerical precision (NOT source accuracy). Coverage cells are independent.
"""
from __future__ import annotations

from collections import Counter, OrderedDict
from hashlib import sha256
import json
import math
from pathlib import Path
from threading import Lock
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pyproj import CRS, Transformer
from shapely import make_valid, normalize, set_precision
from shapely.geometry import Polygon, box, mapping, shape
from shapely.ops import transform, unary_union
from shapely.strtree import STRtree

ALGORITHM = "semantic-ground-v1"
CATEGORIES = ("pitch", "sport_track", "parking", "junction", "footway", "road", "green", "wood", "building_surroundings", "unclassified")
LABELS = dict(zip(CATEGORIES, ("운동장", "운동 트랙", "주차장", "평면 교차부", "보행로", "도로", "녹지", "산림", "건물 주변", "미분류 지면")))


class RegionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    # One simple ring is the same contract used by the existing area editor.
    coordinates: list[tuple[float, float]] | None = Field(default=None, min_length=4, max_length=129)
    maxAreaM2: Literal[2000, 10000, 40000] = 10000

    @field_validator("coordinates")
    @classmethod
    def valid_ring(cls, ring):
        if ring is None:
            return ring
        if any(not math.isfinite(x) or not math.isfinite(y) or not -180 <= x <= 180 or not -90 <= y <= 90 for x, y in ring):
            raise ValueError("유효한 WGS84 좌표가 필요합니다.")
        polygon = Polygon(ring)
        if ring[0] != ring[-1] or not polygon.is_valid or polygon.area <= 0:
            raise ValueError("닫힌 비자기교차 구역이 필요합니다.")
        return ring


def polygons(geometry):
    if geometry.is_empty:
        return
    if geometry.geom_type == "Polygon":
        if geometry.area > 0:
            yield geometry
    elif hasattr(geometry, "geoms"):
        for child in geometry.geoms:
            yield from polygons(child)


def clean(geometry):
    # Snap inputs to 1 mm once. Use a much finer *numerical* overlay grid to avoid
    # floating-point sliver instability without accumulating 1 mm cut errors.
    return set_precision(set_precision(make_valid(geometry), .001), .000001)


def pieces(geometry, max_area, corridor=False):
    """Split connected components, preserving even small residual polygons."""
    queue = list(polygons(geometry))
    while queue:
        part = queue.pop()
        x0, y0, x1, y1 = part.bounds
        if part.area <= max_area + .001 and (not corridor or max(x1-x0, y1-y0) <= 80.001):
            yield part
            continue
        if x1-x0 >= y1-y0:
            middle = round((x0+x1)/2, 3)
            halves = (box(x0-1, y0-1, middle, y1+1), box(middle, y0-1, x1+1, y1+1))
        else:
            middle = round((y0+y1)/2, 3)
            halves = (box(x0-1, y0-1, x1+1, middle), box(x0-1, middle, x1+1, y1+1))
        for half in halves:
            queue.extend(polygons(part.intersection(half)))


def partition(manifest: dict, buildings: dict, facilities: dict, request: RegionRequest, source_hash: str):
    lon, lat = manifest["center"][:2]
    metric = CRS.from_proj4(f"+proj=aeqd +lat_0={lat} +lon_0={lon} +datum=WGS84 +units=m +no_defs")
    forward = Transformer.from_crs(4326, metric, always_xy=True).transform
    reverse = Transformer.from_crs(metric, 4326, always_xy=True).transform
    coverage = clean(transform(forward, box(*manifest["bounds"])))
    target = clean(transform(forward, Polygon(request.coordinates))) if request.coordinates else coverage
    original_area = target.area
    target = target.intersection(coverage)
    if target.area < 2000 or target.area > 50_000_000:
        raise ValueError("지도와 겹치는 구역은 2,000m² 이상, 50km² 이하여야 합니다.")
    repaired = 0

    def records(collection):
        nonlocal repaired
        result = []
        for feature in collection.get("features", []):
            raw = feature.get("geometry") or {}
            if raw.get("type") not in ("Polygon", "MultiPolygon"):
                continue
            geo = transform(forward, shape(raw))
            repaired += not geo.is_valid
            geo = clean(geo).intersection(target)
            if geo.is_empty or geo.area == 0:
                continue
            props = feature.get("properties") or {}
            identity = str(feature.get("id") or props.get("worldObjectId") or props.get("sourceId") or sha256(normalize(geo).wkb).hexdigest()[:16])
            result.append((identity, geo, props))
        return sorted(result, key=lambda item: item[0])

    bldgs, sites = records(buildings), records(facilities)
    building_mask = unary_union([g for _, g, _ in bldgs])
    water_mask = unary_union([g for _, g, p in sites if p.get("kind") == "water"]).difference(building_mask)
    ground = target.difference(unary_union([building_mask, water_mask]))
    exclusions = list(polygons(building_mask)) + list(polygons(water_mask))
    exclusion_tree = STRtree(exclusions)
    occupied = []
    candidates = []
    shapes = []
    version = sha256(json.dumps({"algorithm": ALGORITHM, "source": source_hash, "request": request.model_dump()}, sort_keys=True).encode()).hexdigest()[:16]

    def add(kind, geometry, source_ids, name="", source="DERIVED", evidence="MAP_BOUNDARY"):
        # Intersect only nearby masks; repeatedly subtracting from the entire
        # campus produces a huge, ever-growing polygon and quadratic cold loads.
        used = geometry.intersection(target)
        masks = [exclusions[int(i)] for i in exclusion_tree.query(used, predicate="intersects")]
        if occupied:
            occupied_tree = STRtree(occupied)
            masks.extend(occupied[int(i)] for i in occupied_tree.query(used, predicate="intersects"))
        if masks:
            used = used.difference(unary_union(masks))
        if used.is_empty:
            return
        occupied.append(used)
        divided = list(pieces(used, request.maxAreaM2, kind in ("road", "footway")))
        if abs(sum(g.area for g in divided)-used.area) > .1:
            raise ValueError("큰 구역의 세부 분할 면적이 일치하지 않습니다.")
        for part in divided:
            identity = f"R-{sha256(kind.encode()+normalize(part).wkb).hexdigest()[:16]}"
            point = transform(reverse, part.representative_point())
            shapes.append(part)
            candidates.append({"type": "Feature", "id": identity, "geometry": mapping(transform(reverse, part)), "properties": {
                "regionId": identity, "kind": kind, "label": LABELS[kind], "name": name or LABELS[kind],
                "areaM2": round(part.area, 6), "sourceIds": source_ids, "source": source,
                "boundaryEvidence": evidence, "weight": 1, "observationState": "UNASSESSED",
                "remainingAreaM2": None, "representativePoint": [point.x, point.y],
                "representativePointRole": "PLANNING_REFERENCE_NOT_FLIGHT_TARGET",
                "relationStatus": "NOT_REVIEWED", "passability": "UNKNOWN",
            }})

    # Crossing buffered surfaces are split, but do not establish grade, access,
    # actual centerline junctions or drone routes. Preserve all contributing IDs.
    corridors = [(i, g, p) for i, g, p in sites if p.get("kind") in ("road", "footway")]
    junctions = []
    if corridors:
        tree = STRtree([g for _, g, _ in corridors])
        for index, (identity, geo, _) in enumerate(corridors):
            for other in tree.query(geo, predicate="intersects"):
                if int(other) <= index:
                    continue
                common = geo.intersection(corridors[int(other)][1])
                if common.area > 0:
                    junctions.append(common)
    # Clear facility boundaries take precedence over overlapping display roads.
    for kind in CATEGORIES[:3]:
        for identity, geo, props in sites:
            if props.get("kind") == kind:
                add(kind, geo, [identity], props.get("name", ""), props.get("source", "UNKNOWN"), props.get("geometryStatus", "MAP_BOUNDARY"))
    for junction in polygons(unary_union(junctions)):
        nearby_ids = [corridors[int(i)][0] for i in tree.query(junction, predicate="intersects")]
        add("junction", junction, sorted(nearby_ids), evidence="PLANAR_OVERLAP_NOT_VERIFIED_CONNECTION")
    for kind in ("footway", "road", "green", "wood"):
        for identity, geo, props in sites:
            if props.get("kind") == kind:
                add(kind, geo, [identity], props.get("name", ""), props.get("source", "UNKNOWN"), props.get("geometryStatus", "MAP_BOUNDARY"))
    for identity, geo, props in bldgs:
        add("building_surroundings", clean(geo.buffer(12)), [identity], f"{props.get('name') or '건물'} 주변", evidence="DERIVED_12M_BUFFER_NOT_COURTYARD_SURVEY")
    add("unclassified", ground.difference(unary_union(occupied)), [], evidence="UNCLASSIFIED_RESIDUAL_NOT_EMPTY_SPACE")
    if len(candidates) > 25000:
        raise ValueError("구역 수가 너무 많습니다. 임무 구역을 줄이거나 최대 면적을 늘리세요.")
    combined = unary_union(shapes)
    gap = ground.difference(combined).area
    overlap = max(0., sum(g.area for g in shapes)-combined.area)
    outside = combined.difference(ground).area
    if max(gap, overlap, outside) > .1:
        raise ValueError(f"분할 정합성 검증 실패 (빈틈 {gap:.3f}, 중복 {overlap:.3f}, 범위 밖 {outside:.3f} m²): 결과를 표시하지 않습니다.")
    candidates.sort(key=lambda f: (CATEGORIES.index(f["properties"]["kind"]), f["id"]))
    counts = Counter(f["properties"]["kind"] for f in candidates)
    return {"type": "FeatureCollection", "features": candidates, "metadata": {
        "environmentId": manifest["environmentId"], "worldVersion": manifest["worldVersion"],
        "partitionVersion": version, "algorithm": ALGORITHM, "sourceHash": source_hash,
        "scope": "MISSION_AREA" if request.coordinates else "WORLD_BOUNDS", "maxAreaM2": request.maxAreaM2,
        "scopeGeometry": mapping(transform(reverse, target)), "regionCount": len(candidates), "counts": dict(counts),
        "missionAreaM2": target.area, "clippedOutsideM2": max(0, original_area-target.area),
        "searchableAreaM2": ground.area, "excludedBuildingM2": building_mask.area, "excludedWaterM2": water_mask.area,
        "gapM2": gap, "overlapM2": overlap, "outsideM2": outside, "topologyPassed": True,
        "smallRegionCount": sum(g.area < 1 for g in shapes), "repairedSourceGeometries": repaired,
        "metricCrs": metric.to_string(), "inputSnapM": .001, "overlayNumericPrecisionM": .000001,
        "observationState": "UNASSESSED", "weightPolicy": "UNIFORM",
        "limitations": ["MAP_ONLY_NOT_FLIGHT_PATH", "SOURCE_ACCURACY_UNVERIFIED", "PLANAR_JUNCTIONS_NOT_GRADE_VERIFIED", "RELATION_GRAPH_NOT_REVIEWED"],
        "attribution": "기존 Campus World Package · 도로/시설 OpenStreetMap contributors (ODbL-1.0) · 원자료별 출처 유지",
    }}


class RegionCache:
    """Bounded process cache; serializes cold GIS work, never recalculates per frame."""
    def __init__(self):
        self._lock = Lock()
        self._results: OrderedDict = OrderedDict()

    def get(self, directory: Path, manifest: dict, request: RegionRequest):
        paths = [directory/name for name in ("manifest.json", "buildings.geojson", "facilities.geojson")]
        stamps = tuple((str(p.resolve()), p.stat().st_mtime_ns, p.stat().st_size) for p in paths)
        key = (stamps, request.model_dump_json())
        with self._lock:
            if key in self._results:
                self._results.move_to_end(key)
                return self._results[key]
            contents = [p.read_bytes() for p in paths]
            source_hash = sha256(b"\n".join(contents)).hexdigest()
            result = partition(manifest, json.loads(contents[1]), json.loads(contents[2]), request, source_hash)
            self._results[key] = result
            while len(self._results) > 4:
                self._results.popitem(last=False)
            return result
