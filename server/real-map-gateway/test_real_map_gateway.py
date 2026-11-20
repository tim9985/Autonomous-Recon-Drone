"""Offline tests for real_map_gateway.py (no serial port, no server).

    python3 -m unittest test_real_map_gateway.py
"""
import json
from pathlib import Path
import tempfile
import time
import types
import unittest

import real_map_gateway as gw


def msg(**fields):
    return types.SimpleNamespace(**fields)


class FakeLink:
    def __init__(self, latest, last_fc):
        self.value = (latest, last_fc, {}, None)

    def snapshot(self):
        return self.value


class FakeDevice:
    def __init__(self, replies):
        self.replies, self.sent = list(replies), []

    def post(self, endpoint, body):
        self.sent.append((endpoint, json.loads(json.dumps(body))))
        return self.replies.pop(0)


def fresh_fc(now_mono, wall):
    return {
        'HEARTBEAT': (now_mono, wall, msg(base_mode=1 | 128, autopilot=3)),
        'GPS_RAW_INT': (now_mono, wall, msg(fix_type=3, alt_ellipsoid=78_000)),
        'GLOBAL_POSITION_INT': (now_mono, wall, msg(lat=361452000, lon=1283917000, relative_alt=12_400,
                                                    vx=150, vy=0)),
        'SYS_STATUS': (now_mono, wall, msg(battery_remaining=-1)),
        'EXTENDED_SYS_STATE': (now_mono, wall, msg(landed_state=2)),
    }


class TelemetryTest(unittest.TestCase):
    def test_full_sample_matches_protocol_fields(self):
        now, wall = time.monotonic(), time.time()
        sample = gw.telemetry(fresh_fc(now, wall), (now, wall), wall - 60, now)
        self.assertEqual(sample['position'], {'longitude': 128.3917, 'latitude': 36.1452, 'ellipsoid_m': 78.0})
        self.assertEqual((sample['relative_alt_m'], sample['ground_speed_mps']), (12.4, 1.5))
        self.assertTrue(sample['armed'] and sample['airborne'] and sample['radio_connected'])
        self.assertNotIn('battery_pct', sample)          # unknown without a current sensor
        self.assertFalse(sample['remote_control_allowed'])
        self.assertEqual(sample['sampled_at'], wall)

    def test_stale_heartbeat_reports_lost_radio_only(self):
        now, wall = time.monotonic(), time.time()
        latest = fresh_fc(now - 10, wall - 10)
        sample = gw.telemetry(latest, (now - 10, wall - 10), wall - 60, now)
        self.assertEqual(sample, {'sampled_at': wall - 10, 'radio_connected': False,
                                  'remote_control_allowed': False})

    def test_no_position_without_3d_fix(self):
        now, wall = time.monotonic(), time.time()
        latest = fresh_fc(now, wall)
        latest['GPS_RAW_INT'] = (now, wall, msg(fix_type=2, alt_ellipsoid=0))
        self.assertNotIn('position', gw.telemetry(latest, (now, wall), wall, now))


class DiagnosticsTest(unittest.TestCase):
    def test_statustext_gps_and_voltage_are_kept_for_status_file(self):
        link = gw.FcLink('/dev/null', 57600, None, 1, 1)

        def mav(kind, source=(1, 1), **fields):
            m = msg(**fields)
            m.get_type, m.get_srcSystem, m.get_srcComponent = (lambda: kind), (lambda: source[0]), (lambda: source[1])
            return m

        link._store(mav('GPS_RAW_INT', fix_type=1, satellites_visible=0, eph=9999))
        link._store(mav('SYS_STATUS', voltage_battery=12150, battery_remaining=-1))
        link._store(mav('STATUSTEXT', severity=3, text='PreArm: GPS 1: Bad fix'))
        link._store(mav('STATUSTEXT', source=(255, 190), severity=6, text='from a ground station'))
        d = link.diagnostics()
        self.assertEqual((d['gps_fix_type'], d['satellites'], d['hdop'], d['battery_voltage_v'], d['battery_remaining']),
                         (1, 0, 99.99, 12.15, -1))
        self.assertEqual([t['text'] for t in d['statustext']], ['PreArm: GPS 1: Bad fix'])


class CommandTest(unittest.TestCase):
    def bridge(self, replies, state_dir):
        now, wall = time.monotonic(), time.time()
        device = FakeDevice(replies)
        bridge = gw.Bridge(FakeLink(fresh_fc(now, wall), (now, wall)), device, state_dir, 1.0)
        bridge.session_id = 'a22cc3f4-7bcf-412d-95fa-e3d62d6e913e'
        return bridge, device

    def test_route_preview_is_kept_and_flight_commands_rejected(self):
        route = {'type': 'FeatureCollection', 'features': [
            {'type': 'Feature', 'geometry': {'type': 'LineString', 'coordinates': [[128.39, 36.14, 60], [128.391, 36.141, 60]]}}]}
        preview = {'command_id': 'c1', 'session_id': 's', 'action': 'ROUTE_PREVIEW', 'expires_at': 0,
                   'payload': {'mission_id': 'm', 'plan_id': 'p', 'route': route, 'execution_enabled': False}}
        hold = {'command_id': 'c2', 'session_id': 's', 'action': 'HOLD', 'expires_at': 0, 'payload': None}
        ok = {'accepted_sequence': 0, 'command': None}
        with tempfile.TemporaryDirectory() as tmp:
            bridge, device = self.bridge([(200, dict(ok, command=preview)), (200, dict(ok, command=hold)),
                                          (200, ok), (200, ok)], tmp)
            for _ in range(4):
                bridge.exchange()
            receipts = [body['receipt'] for _, body in device.sent]
            self.assertEqual(receipts, [None, {'command_id': 'c1', 'state': 'APPLIED'},
                                        {'command_id': 'c2', 'state': 'REJECTED'}, None])
            kept = json.loads((Path(tmp) / 'route-preview.json').read_text())
            self.assertEqual((kept['plan_id'], kept['point_count'], kept['execution_enabled']), ('p', 2, False))
            self.assertEqual([body['sequence'] for _, body in device.sent], [0, 1, 2, 3])

    def test_receipt_is_resent_until_delivered_and_session_change_reopens(self):
        status = {'command_id': 'c9', 'session_id': 's', 'action': 'REQUEST_STATUS', 'expires_at': 0, 'payload': None}
        with tempfile.TemporaryDirectory() as tmp:
            bridge, device = self.bridge([(200, {'command': status}), (503, None), (200, {'command': status}),
                                          (409, {'error': {'code': 'REAL_GATEWAY_SESSION_CHANGED'}})], tmp)
            bridge.exchange()
            with self.assertRaises(gw.LinkError):
                bridge.exchange()                       # receipt not delivered
            bridge.exchange()                           # same receipt again; re-offer ignored
            with self.assertRaises(gw.LinkError):
                bridge.exchange()
            receipts = [body['receipt'] for _, body in device.sent]
            self.assertEqual(receipts[1], receipts[2])
            self.assertIsNone(receipts[3])
            self.assertIsNone(bridge.session_id)


if __name__ == '__main__':
    unittest.main()
