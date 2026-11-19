import importlib.util
from pathlib import Path
import pytest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('control_store', ROOT/'drone_backend/real_control_store.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
Store, Refused = module.Store, module.Refused

@pytest.fixture
def ready(tmp_path):
    clock = [1000.0]
    store = Store(tmp_path/'control.sqlite3', clock=lambda: clock[0])
    store.heartbeat('d', 'gateway-1', {'connected': True, 'armed': False, 'landed': True,
        'mode': 5, 'gps_ok': True, 'battery_ok': True, 'failsafe_ok': True,
        'position': {'lat': 36.0, 'lon': 128.0}, 'rc_override': False})
    lease = store.acquire('d', 'operator', 'session-1')
    return store, clock, lease

def enqueue(store, job='job-1', action='MODE', payload=None, session='session-1'):
    return store.enqueue(job, 'd', 'operator', session, action, payload or {'mode': 5})

def test_no_gateway_cannot_queue(tmp_path):
    store = Store(tmp_path/'x.db', clock=lambda: 1000)
    store.acquire('d','u','s')
    with pytest.raises(Refused, match='FC_DISCONNECTED'): store.enqueue('j','d','u','s','ARM',{})

def test_operator_exclusive_lease(ready):
    store,clock,lease=ready
    with pytest.raises(Refused,match='CONTROL_HELD'):store.acquire('d','other','session-2')
    clock[0]+=9
    assert store.acquire('d','other','session-2')['session_id']=='session-2'

def test_exact_retry_is_idempotent_but_changed_body_conflicts(ready):
    store,_,_=ready
    first=enqueue(store)
    assert enqueue(store)==first
    with pytest.raises(Refused,match='ID_CONFLICT'):enqueue(store,payload={'mode':9})

def test_expired_job_is_never_replayed(ready):
    store,clock,_=ready
    enqueue(store);clock[0]+=9
    assert store.poll('d','gateway-1')['job'] is None
    assert store.get('job-1')['state']=='EXPIRED'

def test_old_gateway_session_cannot_claim(ready):
    store,_,_=ready
    enqueue(store)
    store.heartbeat('d','gateway-2',{'connected':True,'armed':False,'landed':True})
    assert store.poll('d','gateway-2')['job'] is None
    assert store.get('job-1')['state']=='CANCELLED'

def test_only_one_delivery_and_report_is_idempotent(ready):
    store,_,_=ready
    enqueue(store)
    assert store.poll('d','gateway-1')['job']['command_id']=='job-1'
    assert store.poll('d','gateway-1')['job'] is None
    store.report('d','gateway-1','job-1',1,'SUCCEEDED',{'ack':True})
    store.report('d','gateway-1','job-1',1,'SUCCEEDED',{'ack':True})
    with pytest.raises(Refused,match='REPORT_CONFLICT'):
        store.report('d','gateway-1','job-1',1,'FAILED',{})

def test_upload_requires_confirmed_readback(ready):
    store,_,_=ready
    enqueue(store,action='UPLOAD',payload={'items':[],'plan_hash':'abc'})
    store.poll('d','gateway-1')
    with pytest.raises(Refused,match='READBACK_REQUIRED'):
        store.report('d','gateway-1','job-1',1,'SUCCEEDED',{})

def test_disarm_rejected_in_air(ready):
    store,_,_=ready
    store.heartbeat('d','gateway-1',{'connected':True,'armed':True,'landed':False})
    with pytest.raises(Refused,match='LANDED_STATE_REQUIRED'):enqueue(store,action='DISARM')

def test_rc_takeover_blocks_operator_commands(ready):
    store,_,_=ready
    store.heartbeat('d','gateway-1',{'connected':True,'armed':False,'landed':True,'rc_override':True})
    with pytest.raises(Refused,match='RC_TAKEOVER'):enqueue(store)

def test_pending_action_rechecks_fc_state_at_dispatch(ready):
    store,_,_=ready
    enqueue(store,action='DISARM')
    store.heartbeat('d','gateway-1',{'connected':True,'armed':True,'landed':False})
    assert store.poll('d','gateway-1')['job'] is None
    assert store.get('job-1')['state']=='CANCELLED'

def test_release_cancels_pending_and_stops_lease(ready):
    store,_,_=ready
    enqueue(store);store.release('d','operator','session-1')
    assert store.poll('d','gateway-1')['job'] is None
    assert store.get('job-1')['state']=='CANCELLED'

def test_start_requires_uploaded_plan_and_preflight(ready):
    store,_,_=ready
    with pytest.raises(Refused,match='MISSION_READBACK_REQUIRED'):
        enqueue(store,action='START',payload={'plan_hash':'abc','items':[],'confirmations':{}})

def test_delivered_timeout_becomes_unknown_not_success(ready):
    store,clock,_=ready
    enqueue(store);store.poll('d','gateway-1');clock[0]+=65
    assert store.get('job-1')['state']=='UNKNOWN'

def test_long_flight_cannot_be_replaced_by_another_start(ready):
    store,_,_=ready
    enqueue(store);store.poll('d','gateway-1')
    store.report('d','gateway-1','job-1',1,'RUNNING',{'started':True})
    with pytest.raises(Refused,match='COMMAND_IN_PROGRESS'):enqueue(store,'job-2')

def test_release_invalidates_dispatched_operation_even_if_same_session_reacquires(ready):
    store,_,_=ready
    enqueue(store);old=store.poll('d','gateway-1')['job']
    store.release('d','operator','session-1');new=store.acquire('d','operator','session-1')
    result=store.poll('d','gateway-1',False,'job-1')
    assert result['cancel_active'] is True
    assert result['lease_id']!=old['lease_id']

def test_emergency_command_cancels_old_worker_before_arming(ready):
    store,_,_=ready
    enqueue(store);store.poll('d','gateway-1')
    enqueue(store,'land','LAND',{})
    result=store.poll('d','gateway-1',False,'job-1')
    assert result['cancel_active'] is True
    assert store.poll('d','gateway-1',True)['job']['action']=='LAND'
