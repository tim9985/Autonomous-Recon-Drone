from typing import Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator

class DTO(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)

class Appearance(DTO):
    upper_color: str = Field(min_length=1,max_length=20)
    lower_color: str = Field(min_length=1,max_length=20)

class Conditions(DTO):
    altitude_m: float = Field(default=15,ge=5,le=120)
    speed_mps: float = Field(default=2,ge=.5,le=10)
    return_reserve_percent: float = Field(default=20,ge=10,le=80)
    observation_seconds: float = Field(default=3,ge=1,le=120)
    priority_mode: Literal['UNIFORM'] = 'UNIFORM'
    appearance: Appearance | None = None

class MapDraft(DTO):
    request_id: UUID
    expected_draft_revision: int = Field(ge=0)
    release_id: str = Field(min_length=1,max_length=128,pattern=r'^[a-zA-Z0-9_-]+$')
    selected_zone_ids: list[str] = Field(min_length=1,max_length=4096)
    name: str = Field(min_length=1,max_length=80)
    mission_type: Literal['AREA_RECON','APPEARANCE_SEARCH'] = 'AREA_RECON'
    conditions: Conditions = Field(default_factory=Conditions)

    @field_validator('selected_zone_ids')
    @classmethod
    def ids(cls, value):
        if len(set(value))!=len(value) or any(not x or len(x)>128 for x in value):
            raise ValueError('Invalid or duplicate zone ID')
        return sorted(value)

    @field_validator('name')
    @classmethod
    def name_not_blank(cls,value):
        if not value.strip(): raise ValueError('Name is required')
        return value.strip()
