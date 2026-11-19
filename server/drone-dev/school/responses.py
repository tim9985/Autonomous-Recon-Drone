from datetime import datetime
from uuid import UUID
from pydantic import BaseModel,ConfigDict
from drone_backend.responses import Snapshot
from .contracts import Conditions

class Reply(BaseModel):
    model_config=ConfigDict(extra='forbid',allow_inf_nan=False)
class SpatialRelease(Reply):
    release_id:str
    environment_id:str
    world_version:str
    grid_version:str
    source_crs:int
    content_hash:str
    manifest:dict
class SavedDraft(Reply):
    mission_id:UUID
    revision:int
    duplicate:bool
class SpatialDraft(Reply):
    mission_id:UUID
    revision:int
    release_id:str
    selected_zone_ids:list[str]
    request_id:UUID
    request_hash:str
    name:str
    mission_type:str
    conditions:Conditions
class Presentation(Reply):
    mission_id:UUID
    name:str
    mission_type:str
    created_at:datetime
    updated_at:datetime
class Workspace(Snapshot):
    spatial_draft:SpatialDraft|None
    presentation:Presentation|None
class MissionItem(Reply):
    mission_id:UUID
    drone_id:str
    state:str
    draft_revision:int|None
    active_revision:int|None
    name:str|None
    mission_type:str|None
    updated_at:datetime|None
class MissionPage(Reply):
    items:list[MissionItem]
    next_cursor:str|None
class Feature(Reply):
    type:str
    id:str
    properties:dict
    geometry:dict|None
class FeaturePage(Reply):
    type:str='FeatureCollection'
    features:list[Feature]
    next_cursor:int|None
    release_id:str
class Selection(Reply):
    release_id:str
    selected_zone_ids:list[str]
class PointResult(Reply):
    release_id:str
    region:dict|None
    zone_id:str|None=None
