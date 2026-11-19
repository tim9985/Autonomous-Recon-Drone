"""REAL evidence intake v1; receipt is distinct from physical verification or flight authority."""
from typing import Literal
from uuid import UUID
from pydantic import Field,model_validator
from .contracts import DTO,Time,Counter,Hash,FramePose,bind_pose

class Mission(DTO):
    mission_id: UUID
    drone_id: str=Field(min_length=1,max_length=255)
    environment: Literal['REAL']

class Session(DTO):
    session_id: UUID
    control_epoch: Counter
    environment: Literal['REAL']

class Telemetry(DTO):
    sample_id: UUID
    mission_id: UUID
    drone_id: str
    producer_session_id: UUID
    sequence: Counter
    source: Literal['REAL']
    source_time_utc: Time|None=None
    clock_domain: Literal['UTC','DEVICE_MONOTONIC','UNKNOWN']='UNKNOWN'
    pose: dict=Field(default_factory=dict)
    flight_state: dict=Field(default_factory=dict)
    time_evidence: dict=Field(default_factory=dict)

class RealFramePose(FramePose):
    clock_domain: Literal['UTC','DEVICE_MONOTONIC']

class Frame(DTO):
    frame_id: UUID
    mission_id: UUID
    input_asset_id: UUID
    producer_session_id: UUID
    stream_id: str=Field(min_length=1,max_length=255)
    stream_epoch: int=Field(ge=0)
    frame_seq: Counter
    capture_at: Time|None=None
    time_source: Literal['SIDECAR','RECEIVE','UNKNOWN']
    width: int=Field(ge=1,le=8192)
    height: int=Field(ge=1,le=8192)
    format: Literal['JPEG','PNG']
    pose: RealFramePose|None=None
    time_evidence: dict=Field(default_factory=dict)
    source: Literal['REAL']
    @model_validator(mode='after')
    def synchronized(self):return bind_pose(self)

class Model(DTO):
    config_id: UUID
    version: str=Field(min_length=1,max_length=255)
    artifact_sha256: Hash
    pipeline_version: str=Field(min_length=1,max_length=255)
    environment: Literal['REAL']
    engine_sha256: Hash|None=None
    posture_sha256: Hash|None=None

class Box(DTO):
    x1: float=Field(ge=0)
    y1: float=Field(ge=0)
    x2: float=Field(gt=0)
    y2: float=Field(gt=0)
    @model_validator(mode='after')
    def valid(self):
        if self.x1>=self.x2 or self.y1>=self.y2:raise ValueError('Empty bbox')
        return self

class Ellipse(DTO):
    major_m: float=Field(ge=0)
    minor_m: float=Field(ge=0)
    azimuth_deg: float=Field(ge=0,lt=360)
    k: Literal[1]=1
    @model_validator(mode='after')
    def valid(self):
        if self.major_m<self.minor_m:raise ValueError('Ellipse axis order')
        return self

class Geo(DTO):
    status: Literal['VALID','PENDING','INVALID']
    lat: float|None=Field(default=None,ge=-90,le=90)
    lon: float|None=Field(default=None,ge=-180,le=180)
    reasons: list[str]=Field(default_factory=list,max_length=16)
    error_ellipse: Ellipse|None=None
    method: str|None=Field(default=None,max_length=80)
    @model_validator(mode='after')
    def valid(self):
        if self.status=='VALID' and (self.lat is None or self.lon is None or self.error_ellipse is None):raise ValueError('VALID claim requires location and uncertainty')
        if self.status!='VALID' and (self.lat is not None or self.lon is not None or not self.reasons):raise ValueError('Nonvalid result requires reasons and no current position')
        return self

class Observation(DTO):
    observation_id: UUID
    candidate_id: UUID
    detection_index: int=Field(ge=0)
    bbox: Box
    confidence: float=Field(ge=0,le=1)
    kind: Literal['DETECT','TRACK_ONLY']='DETECT'
    track_id: str|None=Field(default=None,max_length=255)
    geo: Geo
    auto_confirmed: bool=False
    appearance: dict=Field(default_factory=dict)
    state: dict|None=None
    worker_revision: Counter
    snapshot_asset_id: UUID|None=None
    clip_asset_id: UUID|None=None

class VisionResult(DTO):
    schema_version: Literal['vision-ingest/1.0']
    message_id: UUID
    producer_session_id: UUID
    sequence: Counter
    mission_id: UUID
    frame_id: UUID
    model_config_id: UUID
    emitted_at: Time
    analysis_state: Literal['DONE','SKIPPED','DROPPED']
    reason: str|None=Field(default=None,max_length=255)
    observations: list[Observation]=Field(default_factory=list,max_length=128)
    @model_validator(mode='after')
    def valid(self):
        if self.analysis_state!='DONE' and (self.observations or not self.reason):raise ValueError('Skipped/dropped frames need reason and no detections')
        if len({o.detection_index for o in self.observations})!=len(self.observations):raise ValueError('Duplicate detection index')
        if len({o.candidate_id for o in self.observations})!=len(self.observations):raise ValueError('Duplicate candidate in frame')
        return self

class Reobserve(DTO):
    request_id: UUID
    candidate_id: UUID
    reason: Literal['GEO_PENDING','LOW_EVIDENCE','STATE_UNCERTAIN','COLOR_UNDETERMINED']
    hypothesis: dict=Field(default_factory=dict)
    desired_view: dict=Field(default_factory=dict)

class CommandObservation(DTO):
    message_id: UUID
    command_id: UUID
    mission_id: UUID
    producer_session_id: UUID
    sequence: Counter
    observed_at: Time
    action: Literal['GOTO','HOLD','RETURN','LAND','PAUSE','MISSION_UPLOAD','OTHER']
    reported_state: Literal['ACCEPTED','EXECUTING','COMPLETED','FAILED','REJECTED','UNCONFIRMED']
    status_revision: int=Field(ge=1)
    evidence: dict

class Receipt(DTO):
    stored: bool=True
    duplicate: bool=False
    message_id: UUID
    validation: Literal['STRUCTURAL_ONLY']='STRUCTURAL_ONLY'
    flight_enabled: Literal[False]=False

class ObservationRecord(DTO):
    observation_id: UUID
    candidate_id: UUID
    frame_id: UUID
    analysis_mode: str
    detection_index: int
    track_id: str|None
    bbox: dict
    confidence: float
    class_name: str
    observation_kind: str
    model_config_id: UUID
    coordinate_config_id: UUID|None
    association_evidence: dict
    geo_result: dict
    historical: bool
    supersedes_id: UUID|None
