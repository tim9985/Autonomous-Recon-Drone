"""Frame-pose compatible extension: image geography never relabels late body GPS."""
from uuid import uuid4
import unittest
from pydantic import ValidationError
from drone_backend.contracts import FramePose


class SyncContractTests(unittest.TestCase):
    def setUp(self):
        self.pose=dict(schema_version='frame-pose/1.0',frame_id=str(uuid4()),capture_at='2026-10-17T00:00:00Z',
            clock_domain='SIM',source_timestamp_ns='1000000000',body_timestamp_ns='1500000000',sync_error_ms=0,
            geographic_source='image_camera_position',geographic_timestamp_ns='1000000000',
            geographic=dict(latitude=36,longitude=128,altitude_m=50,altitude_datum='MSL'),
            camera_position_ned=dict(north_m=0,east_m=0,down_m=-10),
            camera_attitude=dict(reference='CAMERA_FRD_TO_NED',quaternion=dict(w=1,x=0,y=0,z=0)))

    def test_image_geography_accepts_later_body_diagnostic(self):
        self.assertEqual(FramePose(**self.pose).sync_error_ms,0)

    def test_image_provenance_requires_sim_complete_camera_and_capture_time(self):
        for change in ({'clock_domain':'UTC'},{'geographic_timestamp_ns':'1100000000'},
                       {'sync_error_ms':500},{'camera_attitude':None},{'camera_position_ned':None},
                       {'geographic':None},{'geographic_source':'state_gps_location'},
                       {'geographic_source':'not-a-source'},{'geographic_timestamp_ns':None}):
            with self.subTest(change=change),self.assertRaises(ValidationError):FramePose(**(self.pose|change))

    def test_legacy_producer_still_reports_body_skew(self):
        p={k:v for k,v in self.pose.items() if k not in ('geographic_source','geographic_timestamp_ns')}
        self.assertEqual(FramePose(**(p|{'sync_error_ms':500})).sync_error_ms,500)
        with self.assertRaises(ValidationError):FramePose(**p)


if __name__=='__main__':unittest.main()
