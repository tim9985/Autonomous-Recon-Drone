from pathlib import Path
import sys
import pytest
pytest.importorskip('fcntl',reason='Linux deployed planner uses POSIX file locks')
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from drone_backend.real_mission_prepare import Plan,compile_plan
from uuid import uuid4

def test_compiled_plan_uses_ardupilot_location_and_nonlocation_frames():
    plan=Plan(plan_id=uuid4(),takeoff={'lat':36,'lon':128},route=[{'lat':36.0001,'lon':128,'altitude_m':20}])
    compiled=compile_plan(plan)
    assert [(x['command'],x['frame']) for x in compiled['items']]==[(16,6),(22,6),(178,0),(16,6),(20,0)]

def test_fractional_hold_cannot_disagree_with_ardupilot_integer_storage():
    with pytest.raises(ValueError):
        Plan(plan_id=uuid4(),takeoff={'lat':36,'lon':128},route=[{'lat':36.0001,'lon':128,'altitude_m':20,'hold_seconds':2.5}])
