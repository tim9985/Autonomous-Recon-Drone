"""Analyze latest native4K samples independently of full-rate video reception.

The existing API worker remains responsible for mission records. These live
results are image-space observations with no flight commands or location claims.
"""
import datetime
from collections import deque
import hashlib
import json
import os
from pathlib import Path
import time

import cv2
import numpy as np

SOURCE = Path('/camera-live')
OUTPUT = Path('/scratch')


def now():
    return datetime.datetime.now(datetime.timezone.utc)


def save(value):
    value['updated_at_utc'] = now().isoformat()
    target = OUTPUT/'live-analysis.json'
    tmp = target.with_suffix('.tmp')
    tmp.write_text(json.dumps(value, ensure_ascii=False, indent=2))
    os.replace(tmp, target)


def main():
    from app.vision_ingest import load_detector

    OUTPUT.mkdir(parents=True, exist_ok=True)
    expected = json.loads(Path('/camera-model-config.json').read_text())
    detector, active = load_detector(expected['artifact_sha256'], expected)
    assert active['model_config_id'] == expected['config_id']
    assert detector.native_4k and detector.backend == 'tensorrt'
    common = {'model_config_id': active['model_config_id'],
        'pipeline_version': expected['pipeline_version'], 'native_4k': True,
        'model_input_pixel_scale': 1.0, 'analysis_target_fps': 5,
        'target_person_input_wh_px': [25, 25], 'field_validation_complete': False,
        'capture_utc_verified': False, 'geolocation_provided': False}
    previous = None
    processed = 0
    timings = deque(maxlen=60)
    last_wait_state = 0
    while True:
        started = time.monotonic()
        try:
            metadata = json.loads((SOURCE/'latest-frame.json').read_text())
            received = datetime.datetime.fromisoformat(metadata['received_at_utc'])
            token = (metadata['stream_epoch'], metadata['frame_sequence'])
            age = (now()-received).total_seconds()
            if age >= 3 or token == previous:
                if age >= 3 and started-last_wait_state >= 1:
                    save(common | {'state': 'WAITING_FRAME', 'reason': 'STALE_SOURCE',
                        'source_age_s': age, 'processed_frames': processed, 'observations': []})
                    last_wait_state = started
                time.sleep(.02)
                continue
            data = (SOURCE/'latest.jpg').read_bytes()
            if hashlib.sha256(data).hexdigest() != metadata['sha256']:
                time.sleep(.01)
                continue
            frame = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
            if frame is None or frame.shape != (2160, 3840, 3):
                raise ValueError('Expected a native3840x2160 camera sample')
            boxes, scores, detector_ms = detector.detect(frame)
            observations = []
            for box, confidence in zip(boxes, scores):
                x1, y1, x2, y2 = [float(v) for v in box]
                width, height = x2-x1, y2-y1
                observations.append({'bbox_xyxy': [x1, y1, x2, y2],
                    'confidence': float(confidence), 'model_input_box_wh_px': [width, height],
                    'meets_25px_both_dimensions': width >= 25 and height >= 25})
            previous = token
            processed += 1
            timings.append(time.monotonic())
            fps = ((len(timings)-1)/(timings[-1]-timings[0])
                   if len(timings)>1 and timings[-1]>timings[0] else 0)
            save(common | {'state': 'RUNNING', 'processed_frames': processed,
                'analysis_fps': fps, 'detector_ms': detector_ms,
                'source_resolution': [3840, 2160], 'source_frame_sequence': token[1],
                'source_stream_epoch': token[0], 'source_frame_sha256': metadata['sha256'],
                'server_receive_to_analysis_ms': (now()-received).total_seconds()*1000,
                'observations': observations})
            time.sleep(max(0, .2-(time.monotonic()-started)))
        except FileNotFoundError:
            if started-last_wait_state >= 1:
                save(common | {'state': 'WAITING_FRAME', 'reason': 'NO_SOURCE_SAMPLE',
                               'processed_frames': processed, 'observations': []})
                last_wait_state = started
            time.sleep(.2)
        except (ValueError, json.JSONDecodeError) as exc:
            save(common | {'state': 'WAITING_FRAME', 'reason': type(exc).__name__,
                'processed_frames': processed, 'observations': []})
            time.sleep(.2)


if __name__ == '__main__':
    main()
