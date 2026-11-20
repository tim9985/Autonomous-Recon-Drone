#!/usr/bin/env python3
"""Real-map telemetry bridge for the ground Raspberry Pi gateway.

Reads ArduPilot MAVLink from the ground telemetry radio and reports it to the
real-map control web with gateway protocol v1: ``POST {device}/sessions`` once
per start, then ``POST {device}/exchange`` about once a second
(``docs/실기체-게이트웨이.md`` in the control web repository).

Safety
  * The serial port is opened read-only. Nothing is written to the flight
    controller unless ``request_streams_hz`` is set, and even then only
    MAV_CMD_SET_MESSAGE_INTERVAL telemetry-rate requests are sent.
  * ``remote_control_allowed`` is always false, so the server never offers
    HOLD / RETURN_HOME. Any such command is answered REJECTED.
  * ROUTE_PREVIEW plans are only stored on disk for review (APPLIED means
    "kept on the gateway", as the protocol defines it).

Modes
  run (default)   bridge telemetry to the control web
  --probe N       list the MAVLink messages received for N seconds (no network)
  --check         check configuration, CA and TLS reachability (no device call)
"""
import argparse
import collections
import errno
import fcntl
import http.client
import importlib.util
import json
import logging
import math
import os
from pathlib import Path
import select
import signal
import ssl
import sys
import termios
import threading
import time
from urllib.parse import urlsplit
import uuid

LOG = logging.getLogger('real-map-gateway')

DEFAULTS = {
    'device_url': None,
    'ca_file': '/etc/drone-gateway/local-school-web-ca.crt',
    'key_file': '/etc/drone-gateway/real-map-key',
    'serial': '/dev/serial/by-id/usb-Falconshop_KoaFC_Telemetry_FS-S3-V1-if00',
    'baud': 57600,
    'mavlink_module': '/opt/drone-gateway/live_mavlink.py',
    'system_id': 1,
    'component_id': 1,
    'interval_s': 1.0,
    'state_dir': '/var/lib/real-map-gateway',
    'request_streams_hz': 0,
}

SAFETY_ARMED = 128                  # MAV_MODE_FLAG_SAFETY_ARMED
MAV_AUTOPILOT_INVALID = 8
MAV_CMD_SET_MESSAGE_INTERVAL = 511
WATCHED = ('HEARTBEAT', 'SYS_STATUS', 'GPS_RAW_INT', 'GLOBAL_POSITION_INT',
           'EXTENDED_SYS_STATE', 'VFR_HUD')
STREAM_IDS = {'SYS_STATUS': 1, 'GPS_RAW_INT': 24, 'GLOBAL_POSITION_INT': 33,
              'VFR_HUD': 74, 'EXTENDED_SYS_STATE': 245}
HEARTBEAT_FRESH_S = 3.0             # server treats samples older than 6 s as lost
DATA_FRESH_S = 3.0
STATUS_FRESH_S = 6.0
LANDED = {1: False, 2: True, 3: True, 4: True}   # MAV_LANDED_STATE -> airborne
KEY_LENGTH = 43


class LinkError(Exception):
    def __init__(self, status, code):
        super().__init__(f'HTTP {status} {code or ""}'.strip())
        self.status = status
        self.code = code


def load_mavlink(path):
    spec = importlib.util.spec_from_file_location('live_mavlink', path)
    if spec is None or spec.loader is None:
        raise SystemExit(f'MAVLink module not found: {path}')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def write_json(path, value):
    tmp = path.with_name(path.name + '.tmp')
    tmp.write_text(json.dumps(value, ensure_ascii=False, indent=1), encoding='utf-8')
    os.replace(tmp, path)


class _FdWriter:
    def __init__(self, fd):
        self.fd = fd

    def write(self, data):
        os.write(self.fd, data)


class FcLink(threading.Thread):
    """Reads the radio and keeps the newest message of each watched type."""

    def __init__(self, path, baud, mav, system_id, component_id, request_hz=0):
        super().__init__(daemon=True, name='fc-link')
        speed = getattr(termios, f'B{int(baud)}', None)
        if speed is None:
            raise SystemExit(f'Unsupported serial speed: {baud}')
        self.path, self.speed, self.mav = path, speed, mav
        self.source = (int(system_id), int(component_id))
        self.request_hz = float(request_hz or 0)
        self.lock = threading.Lock()
        self.latest = {}                    # type -> (monotonic, wall, message)
        self.counts = collections.Counter()  # "sys/comp TYPE" -> count
        self.last_fc = None                 # (monotonic, wall) of the newest FC message
        self.texts = collections.deque(maxlen=8)   # recent FC STATUSTEXT (pre-arm checks etc.)
        self.error = 'starting'
        self.stopping = threading.Event()

    def snapshot(self):
        with self.lock:
            return dict(self.latest), self.last_fc, dict(self.counts), self.error

    def diagnostics(self):
        """Field-check values that the protocol sample does not carry (status.json only)."""
        with self.lock:
            gps, status = self.latest.get('GPS_RAW_INT'), self.latest.get('SYS_STATUS')
            out = {}
            if gps:
                g = gps[2]
                out.update(gps_fix_type=g.fix_type,
                           satellites=None if g.satellites_visible == 255 else g.satellites_visible,
                           hdop=None if g.eph == 65535 else round(g.eph / 100, 2),
                           gps_age_s=round(time.monotonic() - gps[0], 1))
            if status:
                s = status[2]
                out.update(battery_voltage_v=None if s.voltage_battery == 65535 else round(s.voltage_battery / 1000, 2),
                           battery_remaining=s.battery_remaining)
            out['statustext'] = [{'at': round(at, 1), 'severity': sev, 'text': text}
                                 for at, sev, text in self.texts]
            return out

    def stop(self):
        self.stopping.set()

    def run(self):
        while not self.stopping.is_set():
            try:
                self._read_port()
            except OSError as exc:
                self._set_error(f'{type(exc).__name__}: {exc.strerror or exc}')
            self.stopping.wait(2)

    def _set_error(self, text):
        with self.lock:
            changed = self.error != text
            self.error = text
        if changed:
            if text:
                LOG.warning('Radio link: %s', text)
            else:
                LOG.info('Radio link: serial port open')

    def _read_port(self):
        flags = (os.O_RDWR if self.request_hz else os.O_RDONLY) | os.O_NOCTTY | os.O_NONBLOCK
        fd = os.open(self.path, flags)
        try:
            try:
                fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                raise OSError(errno.EBUSY, 'serial port is held by another program') from None
            old = termios.tcgetattr(fd)
            attrs = termios.tcgetattr(fd)
            attrs[0] = attrs[1] = attrs[3] = 0
            attrs[2] = ((attrs[2] & ~(termios.PARENB | termios.CSTOPB | termios.CSIZE
                                      | getattr(termios, 'CRTSCTS', 0)))
                        | termios.CS8 | termios.CLOCAL | termios.CREAD)
            attrs[4] = attrs[5] = self.speed
            attrs[6][termios.VMIN] = attrs[6][termios.VTIME] = 0
            termios.tcsetattr(fd, termios.TCSANOW, attrs)
            try:
                self._loop(fd)
            finally:
                try:
                    termios.tcsetattr(fd, termios.TCSANOW, old)
                except (termios.error, OSError):
                    pass
        finally:
            os.close(fd)

    def _loop(self, fd):
        parser = self.mav.MAVLink(None)
        parser.robust_parsing = True
        sender = self.mav.MAVLink(_FdWriter(fd), srcSystem=254, srcComponent=191) if self.request_hz else None
        self._set_error(None)
        next_request = 0.0
        while not self.stopping.is_set():
            # Ask only once the FC is heard (requests sent before that were lost on the radio).
            if sender and self.last_fc and time.monotonic() >= next_request:
                self._request_streams(sender)
                next_request = time.monotonic() + 30
            if not select.select([fd], [], [], 0.2)[0]:
                continue
            try:
                raw = os.read(fd, 65536)
            except BlockingIOError:
                continue
            if not raw:
                raise OSError(errno.EIO, 'serial link closed')
            for msg in parser.parse_buffer(raw) or []:
                self._store(msg)

    def _request_streams(self, sender):
        interval = int(1e6 / self.request_hz)
        for msg_id in STREAM_IDS.values():
            sender.command_long_send(self.source[0], self.source[1], MAV_CMD_SET_MESSAGE_INTERVAL,
                                     0, msg_id, interval, 0, 0, 0, 0, 0)
            time.sleep(0.05)   # do not burst the half-duplex telemetry radio

    def _store(self, msg):
        kind = msg.get_type()
        if kind == 'BAD_DATA':
            return
        source = (msg.get_srcSystem(), msg.get_srcComponent())
        now = (time.monotonic(), time.time())
        with self.lock:
            self.counts[f'{source[0]}/{source[1]} {kind}'] += 1
            if source != self.source:
                return
            if kind == 'HEARTBEAT' and msg.autopilot == MAV_AUTOPILOT_INVALID:
                return
            self.last_fc = now
            if kind in WATCHED:
                self.latest[kind] = (now[0], now[1], msg)
            elif kind == 'STATUSTEXT':
                text = msg.text.decode(errors='replace') if isinstance(msg.text, bytes) else str(msg.text)
                self.texts.append((now[1], msg.severity, text.rstrip('\x00').strip()))


def telemetry(latest, last_fc, boot_wall, now_mono):
    """Build a protocol v1 telemetry sample from the newest radio messages."""
    used = []

    def fresh(kind, age):
        item = latest.get(kind)
        if item and now_mono - item[0] <= age:
            used.append(item[1])
            return item[2]
        return None

    heartbeat = fresh('HEARTBEAT', HEARTBEAT_FRESH_S)
    sample = {'sampled_at': last_fc[1] if last_fc else boot_wall,
              'radio_connected': heartbeat is not None,
              'remote_control_allowed': False}
    if heartbeat is None:
        return sample
    sample['armed'] = bool(heartbeat.base_mode & SAFETY_ARMED)
    gps = fresh('GPS_RAW_INT', DATA_FRESH_S)
    pos = fresh('GLOBAL_POSITION_INT', DATA_FRESH_S)
    if (pos and gps and gps.fix_type >= 3 and (pos.lat or pos.lon)
            and abs(pos.lat) <= 900_000_000 and abs(pos.lon) <= 1_800_000_000):
        position = {'longitude': round(pos.lon / 1e7, 7), 'latitude': round(pos.lat / 1e7, 7)}
        ellipsoid = getattr(gps, 'alt_ellipsoid', 0) / 1000
        if ellipsoid and -1000 <= ellipsoid <= 30000:
            position['ellipsoid_m'] = round(ellipsoid, 2)
        sample['position'] = position
    if pos:
        relative = pos.relative_alt / 1000
        if -1000 <= relative <= 20000:
            sample['relative_alt_m'] = round(relative, 2)
        speed = math.hypot(pos.vx, pos.vy) / 100
        if speed <= 500:
            sample['ground_speed_mps'] = round(speed, 2)
    else:
        hud = fresh('VFR_HUD', DATA_FRESH_S)
        if hud and 0 <= hud.groundspeed <= 500:
            sample['ground_speed_mps'] = round(hud.groundspeed, 2)
    status = fresh('SYS_STATUS', STATUS_FRESH_S)
    if status and 0 <= status.battery_remaining <= 100:
        sample['battery_pct'] = status.battery_remaining
    extended = fresh('EXTENDED_SYS_STATE', STATUS_FRESH_S)
    if extended and extended.landed_state in LANDED:
        sample['airborne'] = LANDED[extended.landed_state]
    sample['sampled_at'] = max(used)
    return sample


def error_code(body):
    if isinstance(body, dict):
        detail = body.get('error') or body.get('detail')
        if isinstance(detail, dict):
            return detail.get('code')
        if isinstance(detail, str):
            return detail
    return None


class Device:
    """HTTPS client for one registered real-map gateway link."""

    def __init__(self, url, key, ca_file, timeout=5):
        dest = urlsplit(url or '')
        if dest.scheme != 'https' or not dest.hostname or dest.username or dest.query or dest.fragment:
            raise SystemExit('device_url must be the full HTTPS device URL from the pairing dialog')
        if '/link/device/' not in dest.path:
            raise SystemExit('device_url must end with /real-map/link/device/<link id>')
        self.host, self.port = dest.hostname, dest.port or 443
        self.path = dest.path.rstrip('/')
        self.key, self.timeout = key, timeout
        self.context = ssl.create_default_context(cafile=ca_file)
        self.conn = None

    def close(self):
        if self.conn:
            self.conn.close()
        self.conn = None

    def post(self, endpoint, body):
        data = json.dumps(body, allow_nan=False, separators=(',', ':')).encode()
        for attempt in (1, 2):
            if self.conn is None:
                self.conn = http.client.HTTPSConnection(self.host, self.port, timeout=self.timeout,
                                                        context=self.context)
            try:
                self.conn.request('POST', f'{self.path}/{endpoint}', body=data, headers={
                    'Content-Type': 'application/json', 'X-Real-Gateway-Key': self.key})
                response = self.conn.getresponse()
                payload = response.read()
            except (OSError, http.client.HTTPException):
                # A stale keep-alive connection: resend the identical body once,
                # which the server accepts as a retry of the same sequence.
                self.close()
                if attempt == 2:
                    raise
                continue
            try:
                parsed = json.loads(payload) if payload else None
            except ValueError:
                parsed = None
            return response.status, parsed
        raise AssertionError('unreachable')


class Bridge:
    def __init__(self, link, device, state_dir, interval):
        self.link, self.device, self.interval = link, device, interval
        self.state_dir = Path(state_dir)
        self.boot_id, self.started_at = str(uuid.uuid4()), time.time()
        self.session_id = None
        self.sequence = 0
        self.last_stamp = 0.0
        self.receipts = collections.deque()
        self.answered = collections.OrderedDict()
        self.last_ok = None
        self.last_sample = None

    def new_boot(self):
        self.boot_id, self.started_at = str(uuid.uuid4()), time.time()
        self.session_id = None

    def open_session(self):
        status, body = self.device.post('sessions', {
            'boot_id': self.boot_id, 'started_at': self.started_at, 'protocol_version': 1})
        if status == 200 and isinstance(body, dict) and body.get('session_id'):
            if body['session_id'] != self.session_id:
                self.sequence = 0
                self.receipts.clear()
                self.answered.clear()
            self.session_id = body['session_id']
            LOG.info('Session open (protocol %s)', body.get('protocol_version', 1))
            return
        code = error_code(body)
        if status == 409 and code in ('REAL_GATEWAY_OLD_BOOT', 'ID_CONFLICT'):
            if code == 'REAL_GATEWAY_OLD_BOOT':
                LOG.warning('Server holds a newer gateway start time: check the Pi clock (NTP)')
            self.new_boot()
        raise LinkError(status, code)

    def exchange(self):
        latest, last_fc, _, _ = self.link.snapshot()
        sample = telemetry(latest, last_fc, self.started_at, time.monotonic())
        stamp = max(sample['sampled_at'], self.last_stamp)
        sample['sampled_at'] = round(stamp, 3)
        body = {'session_id': self.session_id, 'sequence': self.sequence, 'telemetry': sample,
                'receipt': self.receipts[0] if self.receipts else None}
        # Every new packet takes the next sequence, even if this attempt fails:
        # the server accepts any higher sequence, and Device.post() already
        # resends the identical body once for a dropped connection.
        self.sequence += 1
        status, reply = self.device.post('exchange', body)
        if status == 200:
            self.last_stamp = stamp
            self.last_ok = time.time()
            if self.last_sample is None or self.last_sample['radio_connected'] != sample['radio_connected']:
                LOG.info('Aircraft: %s', 'heartbeat received' if sample['radio_connected']
                         else 'no heartbeat (aircraft off or out of radio range)')
            self.last_sample = sample
            if body['receipt']:
                self.receipts.popleft()
            command = reply.get('command') if isinstance(reply, dict) else None
            if command:
                self.answer(command)
            return
        code = error_code(reply)
        if status == 409 and code == 'REAL_GATEWAY_SESSION_CHANGED':
            LOG.warning('Server reports a newer gateway session; reopening')
            self.session_id = None
        elif status == 409 and code == 'REAL_GATEWAY_RECEIPT_CONFLICT' and self.receipts:
            self.receipts.popleft()
        elif status == 422 and code == 'REAL_GATEWAY_SAMPLE_TIME':
            LOG.warning('Sample time rejected: check that the Pi clock is synchronized (NTP)')
        elif status == 401:
            self.session_id = None
        raise LinkError(status, code)

    def answer(self, command):
        cid = command.get('command_id')
        if not cid or cid in self.answered:
            return
        action = command.get('action')
        if action == 'REQUEST_STATUS':
            state = 'APPLIED'
        elif action == 'ROUTE_PREVIEW' and self.keep_route(command):
            state = 'APPLIED'
        else:
            state = 'REJECTED'
        self.answered[cid] = state
        while len(self.answered) > 64:
            self.answered.popitem(last=False)
        self.receipts.append({'command_id': cid, 'state': state})
        LOG.info('Command %s -> %s', action, state)

    def keep_route(self, command):
        payload = command.get('payload') or {}
        features = (payload.get('route') or {}).get('features')
        if not isinstance(features, list) or not features:
            return False
        points = 0
        for feature in features:
            geometry = (feature or {}).get('geometry') or {}
            coords = geometry.get('coordinates') or []
            points += len(coords) if geometry.get('type') == 'LineString' else sum(
                len(part) for part in coords) if geometry.get('type') == 'MultiLineString' else 1
        record = dict(payload, command_id=command['command_id'], session_id=command.get('session_id'),
                      received_at=time.time(), point_count=points)
        self.state_dir.mkdir(parents=True, exist_ok=True)
        write_json(self.state_dir / 'route-preview.json', record)
        LOG.info('Route preview kept: plan %s, %d features, %d points (execution disabled)',
                 payload.get('plan_id'), len(features), points)
        return True

    def status(self, error):
        latest, last_fc, counts, radio_error = self.link.snapshot()
        fc = self.link.diagnostics() if hasattr(self.link, 'diagnostics') else None
        return {'updated_at': time.time(), 'boot_id': self.boot_id, 'session_open': bool(self.session_id),
                'sequence': self.sequence, 'last_exchange_ok_at': self.last_ok, 'error': error,
                'radio_error': radio_error, 'last_fc_message_at': last_fc[1] if last_fc else None,
                'sample': self.last_sample, 'fc': fc, 'messages': counts}


def run(cfg):
    key_path = Path(cfg['key_file'])
    key = key_path.read_text(encoding='ascii').strip()
    if len(key) != KEY_LENGTH:
        raise SystemExit(f'{key_path} must hold the {KEY_LENGTH}-character gateway key')
    mav = load_mavlink(cfg['mavlink_module'])
    device = Device(cfg['device_url'], key, cfg['ca_file'])
    link = FcLink(cfg['serial'], cfg['baud'], mav, cfg['system_id'], cfg['component_id'],
                  cfg['request_streams_hz'])
    state_dir = Path(cfg['state_dir'])
    state_dir.mkdir(parents=True, exist_ok=True)
    bridge = Bridge(link, device, state_dir, float(cfg['interval_s']))
    stopping = threading.Event()
    signal.signal(signal.SIGTERM, lambda *_: stopping.set())
    signal.signal(signal.SIGINT, lambda *_: stopping.set())
    link.start()
    LOG.info('Bridge started (receive-only%s)', '' if not cfg['request_streams_hz']
             else f", telemetry rate requests {cfg['request_streams_hz']} Hz")
    backoff, previous, next_status = 1.0, 'starting', 0.0
    while not stopping.is_set():
        started = time.monotonic()
        try:
            if bridge.session_id is None:
                bridge.open_session()
            bridge.exchange()
            error, delay = None, max(0.0, bridge.interval - (time.monotonic() - started))
            backoff = 1.0
        except LinkError as exc:
            error = str(exc)
            delay = 30.0 if exc.status == 401 else backoff
            backoff = min(backoff * 2, 10.0)
        except (OSError, http.client.HTTPException, ValueError) as exc:
            device.close()
            error = f'{type(exc).__name__}: {exc}'
            delay = backoff
            backoff = min(backoff * 2, 10.0)
        if error != previous:
            if error:
                LOG.warning('Control web link: %s', error)
            else:
                LOG.info('Control web link: exchanging telemetry')
            previous = error
        if time.monotonic() >= next_status:
            write_json(state_dir / 'status.json', bridge.status(error))
            next_status = time.monotonic() + 5
        stopping.wait(delay)
    link.stop()
    device.close()
    write_json(state_dir / 'status.json', bridge.status('stopped'))
    LOG.info('Bridge stopped')


def probe(cfg, seconds):
    mav = load_mavlink(cfg['mavlink_module'])
    link = FcLink(cfg['serial'], cfg['baud'], mav, cfg['system_id'], cfg['component_id'],
                  cfg['request_streams_hz'])
    link.start()
    time.sleep(seconds)
    latest, last_fc, counts, error = link.snapshot()
    link.stop()
    print(json.dumps({'seconds': seconds, 'radio_error': error,
                      'rates_hz': {k: round(v / seconds, 2) for k, v in sorted(counts.items())},
                      'sample': telemetry(latest, last_fc, time.time(), time.monotonic())},
                     ensure_ascii=False, indent=1))
    return 0 if last_fc else 1


def check(cfg):
    ok = True

    def report(name, passed, detail=''):
        nonlocal ok
        ok &= passed
        print(f"{'OK ' if passed else 'FAIL'} {name}{': ' + detail if detail else ''}")

    try:
        key = Path(cfg['key_file']).read_text(encoding='ascii').strip()
        report('gateway key file', len(key) == KEY_LENGTH, f'{len(key)} characters')
    except OSError as exc:
        report('gateway key file', False, exc.strerror)
    report('serial device', os.path.exists(cfg['serial']), cfg['serial'])
    report('MAVLink module', os.path.isfile(cfg['mavlink_module']), cfg['mavlink_module'])
    try:
        dest = urlsplit(cfg['device_url'] or '')
        context = ssl.create_default_context(cafile=cfg['ca_file'])
        conn = http.client.HTTPSConnection(dest.hostname, dest.port or 443, timeout=5, context=context)
        conn.request('GET', '/')
        status = conn.getresponse().status
        conn.close()
        report('control web TLS', status == 200, f'{dest.hostname}:{dest.port or 443} HTTP {status}')
    except (OSError, ssl.SSLError, ValueError, TypeError, http.client.HTTPException) as exc:
        report('control web TLS', False, f'{type(exc).__name__}: {exc}')
    return 0 if ok else 1


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('--config', type=Path, help='JSON file with the settings below')
    for name, value in DEFAULTS.items():
        parser.add_argument('--' + name.replace('_', '-'), dest=name,
                            type=type(value) if value is not None else str)
    parser.add_argument('--probe', type=float, metavar='SECONDS')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    cfg = dict(DEFAULTS)
    if args.config:
        cfg.update(json.loads(args.config.read_text(encoding='utf-8')))
    cfg.update({k: v for k, v in vars(args).items() if k in DEFAULTS and v is not None})
    logging.basicConfig(level=logging.INFO, format='%(levelname)s %(message)s', stream=sys.stdout)
    if args.probe:
        return probe(cfg, args.probe)
    if args.check:
        return check(cfg)
    run(cfg)
    return 0


if __name__ == '__main__':
    sys.exit(main())
