import copy
import unittest
from datetime import datetime,timezone,timedelta
from .motion import Timeline
from server_integration.school.regional_contract import ready_reasons,validate_frame,CAPABILITIES

def packet():
    return dict(receivedAt=100.,searchStartedAt=99.,eligible=True,imageSha256='a'*64,recordingName='rgb-000001.png',
        aircraftBefore=dict(armed=True,valid=True,time=99.9),aircraftAfter=dict(armed=True,valid=True,time=100.),
        observation=dict(frameId=1,source='AIRSIM_RGB_PAIRED_CAMERA_POSE',evidenceOrigin='CAPTURED_RGB',
            capturedAt=99.95,positionNed=[0,0,-30],quaternion=[0,0,0,1],width=1920,height=1080,horizontalFovDeg=78.,valid=True,
            quality=dict(source='RGB_LUMA_LAPLACIAN_V1',sharpness=100.,meanLuma=120.,clippedFraction=.01)))

class ExecutionContracts(unittest.TestCase):
    def test_actual_capture_binding_and_late_packets(self):
        self.assertTrue(validate_frame(packet(),100.))
        self.assertFalse(validate_frame(packet(),102.))
        p=packet();p['observation']['evidenceOrigin']='OFFLINE_SYNTHETIC'
        with self.assertRaises(ValueError):validate_frame(p,100.)
        p=packet();p['observation']['quaternion']=[0,0,0,2]
        with self.assertRaises(ValueError):validate_frame(p,100.)
        p=packet();p['imageSha256']=''
        with self.assertRaises(ValueError):validate_frame(p,100.)

    def test_curved_independent_yaw_timing_and_discontinuity(self):
        p=dict(scope='LOCAL_UNREAL_ARDUCOPTER_SITL_ONLY',entryNed=[0,0,-30],predictedSeconds=3.,legs=[dict(otherSeconds=1.,phases=[
            dict(start=[0,0,-30],end=[3,0,-30],yaw=45.,delta=30.,seconds=1.),
            dict(start=[3,0,-30],end=[5,2,-30],yaw=75.,delta=0.,seconds=1.)])])
        t=Timeline(p);pos,velocity,yaw,_=t.at(.5)
        self.assertEqual(pos,[1.5,0.,-30.]);self.assertEqual(velocity,[3.,0.,0.]);self.assertEqual(yaw,60.)
        self.assertEqual(t.at(3.)[1],[0.,0.,0.])
        bad=copy.deepcopy(p);bad['legs'][0]['phases'][1]['start']=[4,0,-30]
        with self.assertRaises(ValueError):Timeline(bad)
        bad=copy.deepcopy(p);bad['legs'][0]['phases'][0]['seconds']=.1
        with self.assertRaises(ValueError):Timeline(bad)

    def test_fresh_matching_executor_required(self):
        now=datetime.now(timezone.utc);job=dict(state='READY',mission_revision=1,package_id='p',request=dict(adapterHash='a'),result=dict(execution={},worldVersion='w'))
        job['result']['execution']={'profile':'SIM_BODY_YAW_PHASES_V1'}
        mission=dict(draft_revision=1);package=dict(packageId='p',adapterHash='a')
        w=dict(seen_at=now,ready=True,package_id='p',adapter_hash='a',world_version='w',capabilities=CAPABILITIES)
        self.assertEqual(ready_reasons(job,mission,package,w,now.timestamp()),[])
        self.assertIn('SIM_EXECUTOR_NOT_FRESH',ready_reasons(job,mission,package,w,now.timestamp()+5))
        w['capabilities']=[]
        self.assertIn('SIM_EXECUTOR_NOT_READY',ready_reasons(job,mission,package,w,now.timestamp()))
        mission['draft_revision']=2
        self.assertIn('REVISION_CONFLICT',ready_reasons(job,mission,package,w,now.timestamp()))

if __name__=='__main__':unittest.main()
