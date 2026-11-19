"""Private school-server camera receiver. MPEG-TS arrives through verified SSH.

Counts decoded frames at full source resolution. JPEG samples are independent
of the measured receive FPS. Does not command the aircraft or claim capture UTC.
"""
from collections import deque
import datetime
import hashlib
import io
import json
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
import socket
import sys
import threading
import time
import uuid

BASE = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE / 'runtime'))


def utc():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def atomic_json(path, value):
    tmp = path.with_suffix(path.suffix + '.tmp')
    tmp.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')
    tmp.chmod(0o640)
    tmp.replace(path)


class ReceiveStats:
    def __init__(self):
        self.lock = threading.Lock()
        self.epoch = str(uuid.uuid4())
        self.frames = 0
        self.last_frame = None
        self.first_frame = None
        self.width = self.height = None
        self.corrupt = self.errors = self.connections = 0
        self.connected = False
        self.samples = 0
        self.arrivals = deque(maxlen=3600)
        self.intervals = deque(maxlen=3600)
        self.last_tick = None
        self.last_tick_frames = 0

    def frame(self, when, width, height):
        with self.lock:
            self.frames += 1
            self.last_frame = when
            self.first_frame = when if self.first_frame is None else self.first_frame
            self.width, self.height = width, height
            self.arrivals.append(when)
            return self.frames

    def tick(self, when):
        with self.lock:
            if self.last_tick is not None and when > self.last_tick:
                fps = (self.frames-self.last_tick_frames)/(when-self.last_tick)
                # Only startup warmup is omitted. Later outages remain in the test.
                if self.first_frame is not None and when-self.first_frame >= 5:
                    self.intervals.append((when, fps))
            self.last_tick, self.last_tick_frames = when, self.frames

    def snapshot(self, when):
        with self.lock:
            age = when-self.last_frame if self.last_frame is not None else None
            fps1 = sum(t > when-1 for t in self.arrivals)
            recent = [v for t, v in self.intervals if t > when-900]
            elapsed = when-self.first_frame if self.first_frame is not None else 0
            return {'stream_epoch': self.epoch, 'updated_at_utc': utc(),
                'connected': self.connected, 'live': age is not None and age < 3,
                'source_resolution': [self.width, self.height],
                'decoded_frames': self.frames, 'last_frame_age_seconds': age,
                'receive_fps_1s': fps1,
                'receive_fps_5s': sum(t > when-5 for t in self.arrivals)/min(5, elapsed)
                    if elapsed > 0 else 0,
                'target_receive_fps': 30, 'minimum_receive_fps': 20,
                'minimum_interval_fps_last_15min': min(recent) if recent else None,
                'intervals_below_20_last_15min': sum(v < 20 for v in recent),
                'measured_intervals': len(recent), 'uptime_since_first_frame_s': elapsed,
                'jpeg_samples': self.samples, 'corrupt_frames': self.corrupt,
                'decode_errors': self.errors, 'connections': self.connections,
                'fps_scope': 'Complete frames decoded on school server before JPEG sampling',
                'capture_utc_verified': False}


class Receiver:
    def __init__(self, directory, port=19560, sample_fps=5):
        self.directory = directory
        self.directory.mkdir(parents=True, exist_ok=True)
        self.port, self.sample_fps = port, sample_fps
        self.stats = ReceiveStats()
        self.sample_condition = threading.Condition()
        self.pending_sample = None
        self.started_at = utc()
        self.test_written = False

    def write_status(self):
        while True:
            time.sleep(1)
            now = time.monotonic()
            self.stats.tick(now)
            state = self.stats.snapshot(now)
            atomic_json(self.directory/'receive-status.json', state)
            if state['uptime_since_first_frame_s'] >= 905 and not self.test_written:
                state['test_started_at_utc'] = self.started_at
                state['test_result'] = ('PASS' if state['measured_intervals'] >= 890
                    and state['intervals_below_20_last_15min'] == 0 else 'FAIL')
                atomic_json(self.directory/'receive-15min-test.json', state)
                self.test_written = True

    def write_samples(self):
        while True:
            with self.sample_condition:
                self.sample_condition.wait_for(lambda: self.pending_sample is not None)
                frame, sequence, received_at = self.pending_sample
                self.pending_sample = None
            try:
                image = frame.to_image()
                buffer = io.BytesIO()
                image.save(buffer, format='JPEG', quality=95)
                data = buffer.getvalue()
                tmp = self.directory/'latest.jpg.tmp'
                tmp.write_bytes(data)
                tmp.chmod(0o640)
                tmp.replace(self.directory/'latest.jpg')
                atomic_json(self.directory/'latest-frame.json', {
                    'stream_epoch': self.stats.epoch, 'frame_sequence': sequence,
                    'received_at_utc': received_at, 'capture_at_utc': None,
                    'capture_time_verified': False, 'width': frame.width, 'height': frame.height,
                    'sha256': hashlib.sha256(data).hexdigest(),
                    'jpeg_sampling_fps': self.sample_fps,
                    'source': 'REAL_CAMERA_VIA_PI_SSH'})
                with self.stats.lock:
                    self.stats.samples += 1
            except Exception:
                logging.exception('JPEG sampling failed')

    def serve(self):
        import av
        av.logging.set_level(av.logging.ERROR)
        threading.Thread(target=self.write_status, daemon=True).start()
        threading.Thread(target=self.write_samples, daemon=True).start()
        listener = socket.socket()
        listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        listener.bind(('127.0.0.1', self.port))
        listener.listen(2)
        logging.info('Waiting on loopback TCP %s', self.port)
        while True:
            conn, _ = listener.accept()
            conn.settimeout(10)
            conn.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
            with self.stats.lock:
                self.stats.connected = True
                self.stats.connections += 1
            try:
                with conn, conn.makefile('rb', buffering=0) as source:
                    with av.open(source, mode='r', format='mpegts',
                        options={'probesize': '1000000', 'analyzeduration': '500000',
                                 'fflags': 'discardcorrupt'}) as container:
                        video = container.streams.video[0]
                        video.codec_context.thread_count = 6
                        video.codec_context.thread_type = 'AUTO'
                        next_sample = 0
                        for packet in container.demux(video):
                            try:
                                decoded = packet.decode()
                            except av.error.InvalidDataError:
                                with self.stats.lock:
                                    self.stats.errors += 1
                                continue
                            for frame in decoded:
                                if getattr(frame, 'is_corrupt', False):
                                    with self.stats.lock:
                                        self.stats.corrupt += 1
                                    continue
                                now = time.monotonic()
                                sequence = self.stats.frame(now, frame.width, frame.height)
                                if now >= next_sample:
                                    next_sample = now + 1/self.sample_fps
                                    with self.sample_condition:
                                        self.pending_sample = (frame, sequence, utc())
                                        self.sample_condition.notify()
            except Exception:
                logging.exception('Camera input disconnected; waiting for reconnect')
            finally:
                with self.stats.lock:
                    self.stats.connected = False


if __name__ == '__main__':
    directory = BASE/'data'
    directory.mkdir(exist_ok=True)
    handler = RotatingFileHandler(directory/'receiver.log', maxBytes=2_000_000, backupCount=2)
    logging.basicConfig(level=logging.INFO, handlers=[handler],
                        format='%(asctime)s %(levelname)s %(message)s')
    Receiver(directory).serve()
