import importlib.util
from pathlib import Path
from types import SimpleNamespace
import pytest

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('executor',ROOT/'gateway/mavlink_executor.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
Executor,Fault=module.Executor,module.Fault

class Msg(SimpleNamespace):
    def get_type(self):return self.kind
    def get_srcSystem(self):return getattr(self,'src_system',1)
    def get_srcComponent(self):return 1

class Wire:
    def __init__(self,messages):self.messages=list(messages);self.sent=[];self.mav=self
    def __getattr__(self,name):
        if name.endswith('_send'):
            return lambda *args,**kwargs:self.sent.append((name,args))
        raise AttributeError(name)
    def recv_match(self,**kwargs):return self.messages.pop(0) if self.messages else None

def msg(kind,**fields):return Msg(kind=kind,**fields)
def make(messages,authorized=True):
    wire=Wire(messages)
    e=Executor(wire,1,1,255,lambda:authorized,clock=lambda:1000.0)
    e.state={'connected':True,'armed':False,'landed':True,'mode':5,'gps_ok':True,
             'battery_ok':True,'failsafe_ok':True,'rc_override':False,'position':{'lat':36,'lon':128}}
    e.seen={'HEARTBEAT':1000,'EXTENDED_SYS_STATE':1000,'SYS_STATUS':1000,'GPS_RAW_INT':1000,'GLOBAL_POSITION_INT':1000}
    return e,wire

def test_arm_never_uses_force_magic_value():
    e,w=make([msg('COMMAND_ACK',command=400,result=0),msg('HEARTBEAT',base_mode=128,custom_mode=5,autopilot=3,type=2)])
    e.execute('ARM',{})
    command=next(x for x in w.sent if x[0]=='command_long_send')
    assert command[1][2]==400 and command[1][4:6]==(1,0)

def test_ack_denial_is_failure():
    e,w=make([msg('COMMAND_ACK',command=400,result=2)])
    with pytest.raises(Fault,match='ACK_REJECTED'):e.execute('ARM',{})

def test_no_lease_never_transmits_movement():
    e,w=make([],False)
    with pytest.raises(Fault,match='CONTROL_LEASE_EXPIRED'):e.execute('ARM',{})
    assert w.sent==[]

def test_inflight_disarm_never_sends():
    e,w=make([]);e.state.update(armed=True,landed=False)
    with pytest.raises(Fault,match='LANDED_STATE_REQUIRED'):e.execute('DISARM',{})
    assert w.sent==[]

def test_mission_items_compared_with_float_tolerance_and_home_exception():
    a={'seq':1,'frame':6,'command':16,'params':[2,0,0,0],'x':360000000,'y':1280000000,'z':20.0,'autocontinue':1}
    b=dict(a,z=20.000001)
    assert module.same_item(a,b)
    assert not module.same_item(a,dict(b,x=a['x']+100))
    assert module.same_item(dict(a,seq=0),dict(b,seq=0,x=0,z=123))

def test_upload_waits_for_ack_then_downloads_and_compares():
    item={'seq':0,'frame':6,'command':16,'params':[0,0,0,0],'x':360000000,'y':1280000000,'z':0,'autocontinue':1}
    point=dict(item,seq=1,command=22,z=20)
    messages=[msg('MISSION_REQUEST_INT',seq=0),msg('MISSION_REQUEST_INT',seq=1),msg('MISSION_ACK',type=0),msg('MISSION_COUNT',count=2)]
    messages += [msg('MISSION_ITEM_INT',seq=x['seq'],frame=x['frame'],command=x['command'],param1=0,param2=0,param3=0,param4=0,x=x['x'],y=x['y'],z=x['z'],autocontinue=1) for x in [item,point]]
    e,w=make(messages)
    result=e.execute('UPLOAD',{'items':[item,point],'plan_hash':'abc'})
    assert result['readback_verified'] and result['plan_hash']=='abc'
    assert [x[0] for x in w.sent].count('mission_request_int_send')==2

def test_wrong_source_ack_ignored_until_correct_source():
    e,w=make([msg('COMMAND_ACK',command=400,result=0,src_system=2),msg('COMMAND_ACK',command=400,result=2)])
    with pytest.raises(Fault,match='ACK_REJECTED'):e.execute('ARM',{})

def test_upload_readback_mismatch_prevents_start():
    item={'seq':1,'frame':6,'command':22,'params':[0,0,0,0],'x':360000000,'y':1280000000,'z':20,'autocontinue':1}
    e,w=make([msg('MISSION_COUNT',count=1),msg('MISSION_ITEM_INT',seq=0,frame=6,command=16,param1=0,param2=0,param3=0,param4=0,x=0,y=0,z=0,autocontinue=1)])
    with pytest.raises(Fault,match='MISSION_READBACK_MISMATCH'):e.verify([item])

def test_failed_identity_never_becomes_connected():
    e,w=make([]);e.consume(msg('HEARTBEAT',base_mode=0,custom_mode=5,autopilot=12,type=2))
    assert e.snapshot()['connected'] is False

def test_start_rechecks_preflight_after_readback():
    e,w=make([])
    e.verify=lambda items:e.state.update(gps_ok=False)
    e.mode=lambda mode:None
    def stale_arm(value):raise RuntimeError('ARM_USED_STALE_PREFLIGHT')
    e.arm=stale_arm
    with pytest.raises(Fault,match='FC_PREFLIGHT_REQUIRED'):
        e.execute('START',{'items':[],'takeoff':{'lat':36,'lon':128}})

def test_acquiring_a_lease_alone_does_not_activate_gcs_failsafe():
    e,w=make([])
    e.receive()
    assert not any(name=='heartbeat_send' for name,_ in w.sent)

@pytest.mark.parametrize('position',[None,{'lat':37,'lon':129}])
def test_start_rechecks_launch_position_immediately_before_arm(position):
    e,w=make([]);e.verify=lambda items:None
    e.mode=lambda mode:e.state.update(position=position)
    def stale_arm(value):raise RuntimeError('ARM_USED_STALE_POSITION')
    e.arm=stale_arm
    with pytest.raises(Fault,match='GPS_HOME_POSITION_UNVERIFIED|LAUNCH_POSITION_MISMATCH'):
        e.execute('START',{'items':[],'takeoff':{'lat':36,'lon':128}})

def test_wrong_gcs_ack_is_ignored():
    e,w=make([msg('COMMAND_ACK',command=400,result=0,target_system=254),msg('COMMAND_ACK',command=400,result=2,target_system=255)])
    with pytest.raises(Fault,match='ACK_REJECTED'):e.execute('ARM',{})

def test_partial_arming_check_mask_is_not_ready():
    e,w=make([])
    for name,value in [('FS_GCS_ENABLE',1),('FS_GCS_TIMEOUT',5),('FS_OPTIONS',0),('SYSID_MYGCS',255),('ARMING_CHECK',2)]:
        e.consume(msg('PARAM_VALUE',param_id=name,param_value=value))
    assert not e.snapshot()['failsafe_ok']
    e.consume(msg('PARAM_VALUE',param_id='ARMING_CHECK',param_value=1))
    assert e.snapshot()['failsafe_ok']

def test_full_plan_accepts_real_ardupilot_nonlocation_frames():
    for command,params in [(178,[1,3,-1,0]),(20,[0,0,0,0])]:
        expected={'seq':2,'command':command,'frame':0,'x':0,'y':0,'z':0,'params':params,'autocontinue':1}
        assert module.same_item(expected,dict(expected))
