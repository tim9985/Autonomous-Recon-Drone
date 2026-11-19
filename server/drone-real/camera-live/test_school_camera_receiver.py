"""Receive-rate checks do not require FFmpeg or a live camera."""
import unittest
from school_camera_receiver import ReceiveStats


class ReceiveStatsTests(unittest.TestCase):
    def test_receive_rate_is_independent_of_sample_count(self):
        state = ReceiveStats()
        for i in range(300):
            state.frame(i/30, 3840, 2160)
        state.samples = 10
        result = state.snapshot(10)
        self.assertEqual(result['receive_fps_1s'], 29)
        self.assertEqual(result['decoded_frames'], 300)
        self.assertEqual(result['jpeg_samples'], 10)

    def test_outage_reports_zero_and_remains_in_measurement(self):
        state = ReceiveStats()
        for second in range(10):
            for i in range(30):
                state.frame(second+i/30, 3840, 2160)
            state.tick(second+1)
        state.tick(11)
        result = state.snapshot(11)
        self.assertFalse(result['receive_fps_1s'])
        self.assertEqual(result['minimum_interval_fps_last_15min'], 0)
        self.assertEqual(result['intervals_below_20_last_15min'], 1)

    def test_stale_image_is_not_reported_live(self):
        state = ReceiveStats()
        state.frame(0, 3840, 2160)
        self.assertFalse(state.snapshot(4)['live'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
