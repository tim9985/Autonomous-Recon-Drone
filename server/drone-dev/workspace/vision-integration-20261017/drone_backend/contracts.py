from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, AfterValidator, model_validator, model_serializer

def aware(v):
    if v.tzinfo is None: raise ValueError('Timezone is required')
    return v

def integer_string(v):
    if not v.isascii() or not v.isdigit() or (len(v)>1 and v[0]=='0') or int(v)>9223372036854775807:
        raise ValueError('Expected canonical nonnegative int64 decimal string')
    return v

Time=Annotated[datetime,AfterValidator(aware)]
Counter=Annotated[str,Field(pattern='^(0|[1-9][0-9]{0,18})$',max_length=19),AfterValidator(integer_string)]
Hash=Annotated[str,Field(pattern='^[0-9a-f]{64}$')]

class DTO(BaseModel):
    model_config=ConfigDict(extra='forbid',allow_inf_nan=False)

class Position(DTO):
    latitude: float=Field(ge=-90,le=90)
    longitude: float=Field(ge=-180,le=180)
    altitude_m: float
    altitude_datum: Literal['MSL','ELLIPSOID','AGL','RELATIVE_HOME']

class Quaternion(DTO):
    w: float
    x: float
    y: float
    z: float
    @model_validator(mode='after')
    def normalized(self):
        if abs(sum(v*v for v in (self.w,self.x,self.y,self.z))-1)>0.01:
            raise ValueError('Orientation must be a unit quaternion')
        return self

class Attitude(DTO):
    reference: Literal['BODY_FRD_TO_NED','CAMERA_FRD_TO_NED','CAMERA_FRD_TO_BODY_FRD']
    quaternion: Quaternion

class NEDPosition(DTO):
    north_m: float
    east_m: float
    down_m: float

class Mount(DTO):
    kind: Literal['GIMBAL','FIXED']
    orientation: Attitude
    calibration_id: str=Field(min_length=1,max_length=255)
    @model_validator(mode='after')
    def relative(self):
        if self.orientation.reference!='CAMERA_FRD_TO_BODY_FRD':
            raise ValueError('Mount transform must be relative to body FRD')
        return self

class FramePose(DTO):
    schema_version: Literal['frame-pose/1.0']='frame-pose/1.0'
    frame_id: UUID
    capture_at: Time
    clock_domain: Literal['UTC','DEVICE_MONOTONIC','SIM']
    source_timestamp_ns: Counter
    body_timestamp_ns: Counter|None=None
    geographic_source: Literal['image_camera_position','state_gps_location']|None=None
    geographic_timestamp_ns: Counter|None=None
    sync_error_ms: float|None=Field(default=None,ge=0)
    geographic: Position|None=None
    body_attitude: Attitude|None=None
    camera_attitude: Attitude|None=None
    camera_position_ned: NEDPosition|None=None
    mount: Mount|None=None
    missing_reasons: list[str]=Field(default_factory=list,max_length=16)
    @model_serializer(mode='wrap')
    def compatible(self,handler):
        value=handler(self)
        # Legacy frame hashes must survive replay after the optional provenance extension.
        for key in ('geographic_source','geographic_timestamp_ns'):
            if value.get(key) is None:value.pop(key,None)
        return value
    @model_validator(mode='after')
    def references(self):
        for name,ref in (('body_attitude','BODY_FRD_TO_NED'),('camera_attitude','CAMERA_FRD_TO_NED')):
            value=getattr(self,name)
            if value and value.reference!=ref:raise ValueError('Incorrect attitude reference')
        if self.geographic_source=='image_camera_position':
            if self.clock_domain!='SIM' or not all((self.geographic,self.camera_position_ned,self.camera_attitude)):
                raise ValueError('Image-derived geography requires SIM camera pose')
            if self.geographic_timestamp_ns!=self.source_timestamp_ns:
                raise ValueError('Image-derived geography must use the image timestamp')
        elif self.geographic_timestamp_ns is not None and self.geographic_timestamp_ns!=self.body_timestamp_ns:
            raise ValueError('State geography must use the body timestamp')
        timestamp=self.geographic_timestamp_ns if self.geographic_source=='image_camera_position' else self.body_timestamp_ns
        if timestamp is not None:
            expected=abs(int(self.source_timestamp_ns)-int(timestamp))/1e6
            if self.sync_error_ms is None or abs(self.sync_error_ms-expected)>0.001:
                raise ValueError('Geographic/image timestamp error must be reported')
        return self

def bind_pose(frame):
    if frame.pose and (frame.pose.frame_id!=frame.frame_id or frame.pose.capture_at!=frame.capture_at):
        raise ValueError('Pose must identify the same frame and capture time')
    return frame

class Login(DTO):
    login_id: str=Field(min_length=1,max_length=255)
    password: str=Field(min_length=1,max_length=512)

class CreateMission(DTO):
    mission_id: UUID
    drone_id: str=Field(min_length=1,max_length=255)
    environment: Literal['SIM']='SIM'

class Revision(DTO):
    expected_draft_revision: int=Field(ge=0)
    area_geom: dict
    conditions: dict=Field(default_factory=dict)
    grid_version: str=Field(min_length=1,max_length=255)
    spatial_config_id: UUID
    coordinate_config_id: UUID
    policy_config_id: UUID
    model_config_id: UUID

class Approval(DTO):
    expected_draft_revision: int=Field(ge=1)

class Control(DTO):
    expected_control_revision: Counter

class DeviceSession(DTO):
    session_id: UUID
    control_epoch: Counter
    rc_taken: bool
    lease_id: UUID
    lease_expires_at: Time

class Telemetry(DTO):
    sample_id: UUID
    drone_id: str
    mission_id: UUID|None=None
    producer_session_id: UUID
    sequence: Counter
    source_time_utc: Time
    longitude: float=Field(ge=-180,le=180)
    latitude: float=Field(ge=-90,le=90)
    flight_state: dict
    source: Literal['SIM']='SIM'

class Command(DTO):
    command_id: UUID
    expected_control_revision: Counter
    mission_id: UUID
    mission_revision: int=Field(ge=1)
    action: Literal['GOTO','HOLD','RETURN','LAND','PAUSE','MISSION_UPLOAD']
    payload: dict=Field(default_factory=dict)

class CommandReport(DTO):
    request_hash: Hash
    status_revision: int=Field(ge=1)
    gateway_session_id: UUID
    control_epoch: Counter
    state: Literal['ACCEPTED','REJECTED','EXECUTING','COMPLETED','FAILED','UNCONFIRMED']
    evidence_at: Time
    evidence: dict

class Asset(DTO):
    asset_id: UUID
    role: Literal['VIDEO','SIDECAR','FRAME','RESULT']
    byte_size: int=Field(ge=1,le=67108864)
    sha256: Hash

class Bundle(DTO):
    bundle_id: UUID
    mission_id: UUID
    files: list[Asset]=Field(min_length=1,max_length=16)

class Frame(DTO):
    frame_id: UUID
    mission_id: UUID
    input_asset_id: UUID
    stream_id: str=Field(min_length=1,max_length=255)
    stream_epoch: int=Field(ge=0)
    frame_seq: Counter
    capture_at: Time
    width: int=Field(ge=1,le=8192)
    height: int=Field(ge=1,le=8192)
    format: Literal['JPEG','PNG']
    pose: FramePose|None=None
    @model_validator(mode='after')
    def synchronized(self):return bind_pose(self)

class Analysis(DTO):
    analysis_run_id: UUID
    frame_id: UUID
    input_asset_id: UUID
    model_config_id: UUID
    coordinate_config_id: UUID|None=None
    analysis_mode: Literal['LIVE_DETECT','HISTORICAL']='LIVE_DETECT'

class Observation(DTO):
    observation_id: UUID
    candidate_id: UUID
    detection_index: int=Field(ge=0)
    bbox: dict
    confidence: float=Field(ge=0,le=1)
    geo_result: dict
    class_name: Literal['person']='person'
    appearance: dict=Field(default_factory=dict)
    state: dict|None=None
    track_id: str|None=Field(default=None,max_length=255)

class Result(DTO):
    claim_id: UUID
    attempt_no: int=Field(ge=1)
    observations: list[Observation]=Field(max_length=128)

class AttemptFailure(DTO):
    claim_id: UUID
    attempt_no: int=Field(ge=1)
    reason: str=Field(min_length=1,max_length=512)

class Judgement(DTO):
    request_id: UUID
    expected_row_version: Counter
    value: Literal['CONFIRMED','REJECTED','UNDECIDED']
    reason: str=Field(max_length=512)

class Reobservation(DTO):
    request_id: UUID
    hypothesis: dict=Field(default_factory=dict)
    desired_view: dict=Field(default_factory=dict)

class Safety(DTO):
    event_id: UUID
    gateway_session_id: UUID
    control_epoch: Counter
    kind: Literal['RC_TAKEOVER','VIDEO_LOST','WAN_LOST','RECOVERED']
    evidence: dict

class Region(DTO):
    region_id: UUID
    mission_revision: int=Field(ge=1)
    geometry: dict

class Plan(DTO):
    plan_id: UUID
    mission_revision: int=Field(ge=1)
    region_id: UUID
    route: dict

class Cell(DTO):
    cell_id: str=Field(min_length=1,max_length=255)
    mission_revision: int=Field(ge=1)
    region_id: UUID
    geometry: dict
