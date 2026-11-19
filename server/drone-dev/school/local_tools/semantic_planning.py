"""Versioned, evidence-backed relation overlay. No flight command dependency."""
from __future__ import annotations

from collections import Counter, OrderedDict
from contextlib import contextmanager
from hashlib import sha256
import json
from pathlib import Path
import sqlite3
from threading import Lock
import time
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field
from pyproj import Transformer
from shapely.geometry import Polygon, shape, mapping
from shapely.ops import transform, unary_union
from shapely.strtree import STRtree

from .search_regions import RegionRequest

ROOT = Path(__file__).resolve().parents[1]
POLICY = "anchor-relations-v1"


class Item(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Evidence(Item):
    url: str | None
    note: str


class Facility(Item):
    id: str
    name: str
    functions: list[str]
    sourceIds: list[str] = Field(min_length=1)
    mappingNote: str
    evidence: str


class RelationBase(Item):
    id: str
    status: Literal["REVIEWED", "PROPOSED"]
    strength: float = Field(ge=0, le=1)
    confidence: float = Field(ge=0, le=1)
    evidence: str
    note: str


class Group(RelationBase):
    name: str
    members: list[str] = Field(min_length=2)


class Relation(RelationBase):
    fromId: str
    toId: str
    kind: str
    bidirectional: bool


class Seed(Item):
    schemaVersion: Literal[1]
    environmentId: str
    worldVersion: str
    reviewedAt: str
    sources: dict[str, Evidence]
    facilities: list[Facility]
    groups: list[Group]
    relations: list[Relation]


class PriorityRequest(RegionRequest):
    semanticVersion: str = Field(min_length=16, max_length=64)
    partitionVersion: str = Field(min_length=16, max_length=64)
    anchors: list[str] = Field(default_factory=list, max_length=16)
    priorityCoordinates: list[tuple[float, float]] | None = Field(default=None, min_length=4, max_length=129)
    radiusM: float = Field(default=500, ge=25, le=2000, allow_inf_nan=False)
    includeProposed: bool = False
    ttlSeconds: int = Field(default=1800, ge=60, le=3600)


def related_facilities(seed: dict, anchors: list[str], include_proposed: bool):
    """One-hop from ORIGINAL anchors. Do not diffuse from a newly visited node."""
    reasons = {f["id"]: [] for f in seed["facilities"]}
    selected = set(anchors)
    for item in seed["groups"]:
        if item["status"] != "REVIEWED" and not include_proposed:
            continue
        if selected.intersection(item["members"]):
            for target in item["members"]:
                reasons[target].append({"id": item["id"], "reason": item["name"], "status": item["status"], "evidence": item["evidence"], "score": item["strength"]*item["confidence"]})
    for item in seed["relations"]:
        if item["status"] != "REVIEWED" and not include_proposed:
            continue
        pairs = [(item["fromId"], item["toId"])]
        if item["bidirectional"]:
            pairs.append((item["toId"], item["fromId"]))
        for origin, target in pairs:
            if origin in selected:
                reasons[target].append({"id": item["id"], "reason": item["note"], "status": item["status"], "evidence": item["evidence"], "score": item["strength"]*item["confidence"]})
    return reasons


class SemanticStore:
    def __init__(self, db_path: Path, seed_path: Path | None = None):
        self.db_path = db_path
        self.seed_path = seed_path or ROOT/"data_seeds/campus_semantics.json"
        self.lock = Lock()
        self.cached = OrderedDict()

    @contextmanager
    def database(self):
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        db = sqlite3.connect(self.db_path, timeout=30)
        db.execute("PRAGMA foreign_keys=ON")
        db.executescript((ROOT/"migrations/001_semantic_planning.sql").read_text(encoding="utf-8"))
        try:
            with db:
                yield db
        finally:
            db.close()

    def catalog(self, directory: Path, manifest: dict):
        raw = self.seed_path.read_bytes()
        seed = Seed.model_validate_json(raw).model_dump()
        if (seed["environmentId"], seed["worldVersion"]) != (manifest["environmentId"], manifest["worldVersion"]):
            raise ValueError("현재 지도 버전에 검토된 시설 연결 자료가 없습니다.")
        facilities = {f["id"]: f for f in seed["facilities"]}
        for items in (seed["facilities"], seed["groups"], seed["relations"]):
            if len({i["id"] for i in items}) != len(items):
                raise ValueError("의미 자료 ID 중복")
            if any(i["evidence"] not in seed["sources"] for i in items):
                raise ValueError("의미 자료 출처 누락")
        if any(not set(g["members"]) <= facilities.keys() or len(set(g["members"])) != len(g["members"]) for g in seed["groups"]):
            raise ValueError("그룹 시설 연결 오류")
        if any(r["fromId"] not in facilities or r["toId"] not in facilities for r in seed["relations"]):
            raise ValueError("관계 시설 연결 오류")
        buildings = json.loads((directory/"buildings.geojson").read_bytes())
        shapes = {str(f.get("id") or f["properties"].get("worldObjectId")): f["geometry"] for f in buildings["features"]}
        if any(s not in shapes for f in facilities.values() for s in f["sourceIds"]):
            raise ValueError("시설의 원본 객체를 찾지 못했습니다. 재연결 검토가 필요합니다.")
        # Bind semantic release to the exact mapped geometry as well as seed.
        linked = {s: shapes[s] for f in facilities.values() for s in f["sourceIds"]}
        version = sha256(raw+json.dumps(linked, sort_keys=True).encode()).hexdigest()[:16]
        resolved = [{**f, "geometry": mapping(unary_union([shape(shapes[s]) for s in f["sourceIds"]]))} for f in facilities.values()]
        with self.lock, self.database() as db:
            if not db.execute("SELECT 1 FROM semantic_releases WHERE version=?", (version,)).fetchone():
                db.execute("INSERT INTO semantic_releases VALUES (?,?,?,?,?)", (version,seed["environmentId"],seed["worldVersion"],time.time(),json.dumps(seed,ensure_ascii=False)))
                db.executemany("INSERT INTO semantic_facilities VALUES (?,?,?)", [(version,f["id"],json.dumps(f,ensure_ascii=False)) for f in resolved])
                db.executemany("INSERT INTO semantic_groups VALUES (?,?,?)", [(version,g["id"],json.dumps(g,ensure_ascii=False)) for g in seed["groups"]])
                db.executemany("INSERT INTO semantic_memberships VALUES (?,?,?)", [(version,g["id"],fid) for g in seed["groups"] for fid in g["members"]])
                db.executemany("INSERT INTO semantic_relations VALUES (?,?,?,?,?)", [(version,r["id"],r["fromId"],r["toId"],json.dumps(r,ensure_ascii=False)) for r in seed["relations"]])
        return {**seed,"facilities":resolved,"semanticVersion":version,"policyVersion":POLICY}

    def bindings(self, catalog: dict, regions: dict):
        meta = regions["metadata"]
        key = (catalog["semanticVersion"], meta["partitionVersion"])
        with self.lock:
            if key in self.cached:
                self.cached.move_to_end(key)
                return self.cached[key]
            forward = Transformer.from_crs(4326,meta["metricCrs"],always_xy=True).transform
            geometries = [transform(forward,shape(f["geometry"])) for f in regions["features"]]
            tree = STRtree(geometries)
            result = []
            for facility in catalog["facilities"]:
                footprint = transform(forward,shape(facility["geometry"]))
                outdoor = footprint.buffer(12).difference(footprint)
                for index in tree.query(outdoor,predicate="intersects"):
                    region = regions["features"][int(index)]
                    area = geometries[int(index)].intersection(outdoor).area
                    fraction = area/max(geometries[int(index)].area,1e-9)
                    if area < 1 or fraction < .01:
                        continue
                    result.append({"regionId":region["id"],"facilityId":facility["id"],"overlapM2":round(area,3),"fraction":round(fraction,4),"method":"OUTDOOR_12M_INTERSECTION","status":"SPATIAL_APPROXIMATION"})
            with self.database() as db:
                db.execute("INSERT OR IGNORE INTO semantic_partitions VALUES (?,?,?)", (*key,json.dumps(meta)))
                db.executemany("INSERT OR REPLACE INTO semantic_region_bindings VALUES (?,?,?,?,?)", [(*key,b["regionId"],b["facilityId"],json.dumps(b)) for b in result])
            self.cached[key] = result
            while len(self.cached)>4:
                self.cached.popitem(last=False)
            return result

    def preview(self, catalog: dict, regions: dict, request: PriorityRequest, now: float | None = None, *, persist: bool = True):
        now = time.time() if now is None else now
        meta = regions["metadata"]
        if request.semanticVersion != catalog["semanticVersion"] or request.partitionVersion != meta["partitionVersion"]:
            raise ValueError("지도·분할·의미 자료 버전이 변경되었습니다. 다시 불러오세요.")
        known = {f["id"]:f for f in catalog["facilities"]}
        if not set(request.anchors) <= known.keys():
            raise ValueError("등록되지 않은 기준 시설입니다.")
        forward = Transformer.from_crs(4326,meta["metricCrs"],always_xy=True).transform
        scope = transform(forward,shape(meta["scopeGeometry"]))
        priority = None
        anchors = set(request.anchors)
        if request.priorityCoordinates:
            ring = RegionRequest(coordinates=request.priorityCoordinates).coordinates
            priority = transform(forward,Polygon(ring))
            if priority.difference(scope.buffer(.05)).area > .1:
                raise ValueError("우선 구역은 확정 임무 범위 안에 있어야 합니다.")
            for facility in known.values():
                if transform(forward,shape(facility["geometry"])).intersection(priority).area > 1:
                    anchors.add(facility["id"])
        reasons = related_facilities(catalog,sorted(anchors),request.includeProposed)
        anchor_shapes = [transform(forward,shape(known[i]["geometry"])) for i in anchors]
        if priority is not None:
            anchor_shapes.append(priority)
        reference = unary_union(anchor_shapes)
        links = self.bindings(catalog,regions)
        by_region = {}
        for link in links:
            by_region.setdefault(link["regionId"],[]).append(link)
        outputs = []
        for feature in regions["features"]:
            rid = feature["id"]
            geometry = transform(forward,shape(feature["geometry"]))
            bindings = by_region.get(rid,[])
            direct = bool(anchors.intersection(b["facilityId"] for b in bindings)) or (priority is not None and geometry.intersection(priority).area>.01)
            distance = geometry.distance(reference) if anchor_shapes else None
            matches = []
            if distance is not None and distance<=request.radiusM:
                for binding in bindings:
                    for reason in reasons[binding["facilityId"]]:
                        matches.append({**reason,"facilityId":binding["facilityId"],"relatedness":reason["score"]*max(0,1-distance/request.radiusM)})
            score = max((r["relatedness"] for r in matches),default=0)
            tier = "DIRECT" if direct else "RELATED" if score>=.1 else "GENERAL"
            outputs.append({"regionId":rid,"tier":tier,"relatedness":round(score,4),"distanceM":round(distance,2) if distance is not None else None,
                "weightMultiplier":round(1+score,4) if tier=="RELATED" else 1,
                "reasons":matches,"bindings":bindings,"directReason":"사용자 기준 시설 주변 또는 지정 polygon" if direct else None,
                "observationState":"UNASSESSED","remainingAreaM2":None})
        result = {"previewId":str(uuid4()),"mode":"PLANNING_PREVIEW","environmentId":catalog["environmentId"],"worldVersion":catalog["worldVersion"],
            "partitionVersion":meta["partitionVersion"],"semanticVersion":catalog["semanticVersion"],"policyVersion":POLICY,
            "createdAt":now,"expiresAt":now+request.ttlSeconds,"context":{**request.model_dump(),"resolvedAnchors":sorted(anchors)},
            "regions":outputs,"counts":dict(Counter(r["tier"] for r in outputs)),"ordering":None,
            "evidenceSnapshot":{"sources":catalog["sources"],"groups":catalog["groups"],"relations":catalog["relations"],
                "facilities":[{k:v for k,v in f.items() if k!="geometry"} for f in catalog["facilities"]]},
            "limitations":["NOT_PERSON_PROBABILITY","SPATIAL_BINDINGS_APPROXIMATE","BUDGET_AND_OBSERVATIONS_NOT_CONNECTED","NOT_A_FLIGHT_COMMAND"]}
        if persist:
            with self.lock, self.database() as db:
                db.execute("INSERT INTO semantic_previews VALUES (?,?,?,?,?,?,?,?)", (result["previewId"],now,result["expiresAt"],catalog["semanticVersion"],meta["partitionVersion"],POLICY,json.dumps(result["context"]),json.dumps(result,ensure_ascii=False)))
        return result
