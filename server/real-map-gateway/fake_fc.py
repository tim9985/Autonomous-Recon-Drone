#!/usr/bin/env python3
"""Synthetic ArduCopter telemetry on a pseudo-terminal, for testing the bridge
(or rehearsing the control screen) without the aircraft.

Prints the pty path first, then plays a scenario such as
``ground:12,fly:20,lost:8,fly:10``:
  ground  disarmed on the ground at the centre point
  fly     armed, climbs to --alt-m and circles the centre at --speed-mps
  lost    radio silence (nothing is written)
Messages: HEARTBEAT 1 Hz; SYS_STATUS, GPS_RAW_INT, GLOBAL_POSITION_INT,
EXTENDED_SYS_STATE, VFR_HUD 2 Hz as system 1 / component 1, plus a ground
station HEARTBEAT (255/190) that the bridge must ignore.
"""
import argparse
import importlib.util
import math
import os
import sys
import time
import tty


class Writer:
    """Non-blocking radio: drops bytes nobody reads, like a real link."""

    def __init__(self, fd):
        self.fd = fd

    def write(self, data):
        try:
            os.write(self.fd, data)
        except BlockingIOError:
            pass


def load(path):
    spec = importlib.util.spec_from_file_location('live_mavlink', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def phases(text):
    for token in text.split(','):
        name, _, seconds = token.partition(':')
        if name not in ('ground', 'fly', 'lost'):
            raise SystemExit(f'Unknown phase: {name}')
        yield name, float(seconds)


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('--mavlink-module', default='/opt/drone-gateway/live_mavlink.py')
    parser.add_argument('--center', default='36.1452,128.3917', help='lat,lon (WGS84)')
    parser.add_argument('--radius-m', type=float, default=25)
    parser.add_argument('--alt-m', type=float, default=16)
    parser.add_argument('--speed-mps', type=float, default=3)
    parser.add_argument('--ground-msl-m', type=float, default=52)
    parser.add_argument('--battery-pct', type=int, default=87, help='-1 = unknown, as without a current sensor')
    parser.add_argument('--scenario', default='ground:12,fly:20,lost:8,fly:10')
    args = parser.parse_args()
    mav = load(args.mavlink_module)
    lat0, lon0 = (float(v) for v in args.center.split(','))
    master, slave = os.openpty()
    tty.setraw(slave)
    os.set_blocking(master, False)
    print(os.ttyname(slave), flush=True)
    fc = mav.MAVLink(Writer(master), srcSystem=1, srcComponent=1)
    gcs = mav.MAVLink(Writer(master), srcSystem=255, srcComponent=190)
    boot = time.monotonic()
    angle = alt = 0.0
    for name, seconds in phases(args.scenario):
        print(f'phase {name} {seconds:g}s', file=sys.stderr, flush=True)
        end = time.monotonic() + seconds
        tick = 0
        while time.monotonic() < end:
            time.sleep(0.5)
            tick += 1
            if name == 'lost':
                continue
            flying = name == 'fly'
            if flying:
                alt = min(args.alt_m, alt + 1.5)
                angle += args.speed_mps * 0.5 / args.radius_m
            else:
                alt = max(0.0, alt - 1.5)
            north, east = args.radius_m * math.cos(angle), args.radius_m * math.sin(angle)
            lat = lat0 + north / 111_320
            lon = lon0 + east / (111_320 * math.cos(math.radians(lat0)))
            speed = args.speed_mps if flying else 0.0
            vx = -speed * math.sin(angle) * 100      # north cm/s
            vy = speed * math.cos(angle) * 100       # east cm/s
            heading = (math.degrees(math.atan2(vy, vx)) + 360) % 360 if flying else 0
            msl = args.ground_msl_m + alt
            ms = int((time.monotonic() - boot) * 1000)
            if tick % 2 == 0:
                fc.heartbeat_send(2, 3, 1 | 16 | (128 if flying else 0), 5 if flying else 2, 4 if flying else 3)
                gcs.heartbeat_send(6, 8, 0, 0, 4)
            fc.sys_status_send(0, 0, 0, 250, 12200 - tick * 2, -1, args.battery_pct, 0, 0, 0, 0, 0, 0)
            fc.gps_raw_int_send(ms * 1000, 3, int(lat * 1e7), int(lon * 1e7), int(msl * 1000), 80, 120,
                                int(speed * 100), int(heading * 100), 18, int((msl + 26) * 1000))
            fc.global_position_int_send(ms, int(lat * 1e7), int(lon * 1e7), int(msl * 1000), int(alt * 1000),
                                        int(vx), int(vy), 0, int(heading * 100))
            fc.extended_sys_state_send(0, 2 if flying and alt > 0.5 else 1)
            fc.vfr_hud_send(speed, speed, int(heading), 45 if flying else 0, msl, 0.0)
    print('scenario finished', file=sys.stderr, flush=True)


if __name__ == '__main__':
    main()
