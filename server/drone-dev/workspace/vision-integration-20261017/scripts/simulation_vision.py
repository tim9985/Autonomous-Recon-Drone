"""Spool synchronized AirSim image metadata; network uploads never block simulation control."""
import datetime
import base64
import hashlib
import json
import math
import os
import threading
import time
import uuid
from pathlib import Path

def quaternion(q):return {'w':q.w_val,'x':q.x_val,'y':q.y_val,'z':q.z_val}

def frame_pose(fid,capture_at,response,state,home):
    p=response.camera_position
    # Match AirSim EarthUtils::nedToGeodetic and the camera's vehicle-local NED origin.
    lat,lon=map(math.radians,(home.latitude,home.longitude))
    n,e=p.x_val/6378137.0,p.y_val/6378137.0;c=math.hypot(n,e)
    latitude=math.asin(math.cos(c)*math.sin(lat)+n*math.sin(c)*math.cos(lat)/c) if c else lat
    longitude=lon+math.atan2(e*math.sin(c),c*math.cos(lat)*math.cos(c)-n*math.sin(lat)*math.sin(c)) if c else lon
    return {'schema_version':'frame-pose/1.0','frame_id':fid,'capture_at':capture_at,'clock_domain':'SIM','source_timestamp_ns':str(response.time_stamp),
        'body_timestamp_ns':str(state.timestamp),'sync_error_ms':0,
        'geographic_source':'image_camera_position','geographic_timestamp_ns':str(response.time_stamp),
        'geographic':{'latitude':math.degrees(latitude),'longitude':math.degrees(longitude),'altitude_m':home.altitude-p.z_val,'altitude_datum':'MSL'},
        'body_attitude':{'reference':'BODY_FRD_TO_NED','quaternion':quaternion(state.kinematics_estimated.orientation)},
        'camera_attitude':{'reference':'CAMERA_FRD_TO_NED','quaternion':quaternion(response.camera_orientation)},
        'camera_position_ned':{'north_m':p.x_val,'east_m':p.y_val,'down_m':p.z_val},
        'mount':None,'missing_reasons':['MOUNT_CALIBRATION_UNVERIFIED','UTC_SIM_MAPPING_UNVERIFIED']}

class FrameUploader:
    def __init__(self,api,run,box,start=True):
        self.api,self.run,self.box=api,run,box
        self.cfg=run['request']['pipeline_config'];self.folder=box.folder/'frames';self.folder.mkdir(exist_ok=True)
        self.stop=threading.Event();self.last=0
        self.home=None
        self.metrics={'captured':0,'uploaded':0,'queue_full_skips':0,'max_pending':0}
        self.capture_stop=threading.Event();self.capture_thread=None;self.capture_error=None
        self.thread=threading.Thread(target=self.loop,daemon=True)
        if start:self.thread.start()

    def start_capture(self,airsim):
        def capture_loop():
            # AirSim RPC clients are confined to their own thread.
            client=airsim.MultirotorClient(ip='127.0.0.1',timeout_value=5)
            try:
                while not self.capture_stop.is_set():
                    self.capture(client,airsim);self.capture_stop.wait(.01)
            except Exception as exc:self.capture_error=exc
        self.capture_thread=threading.Thread(target=capture_loop,daemon=True)
        self.capture_thread.start()

    def end_capture(self):
        if getattr(self,'capture_thread',None):
            self.capture_stop.set();self.capture_thread.join(timeout=6)
            if self.capture_thread.is_alive():raise RuntimeError('AirSim capture did not stop')
            if self.capture_error:raise RuntimeError('AirSim capture failed') from self.capture_error

    def capture(self,client,airsim):
        current=time.monotonic();interval=self.cfg.get('interval_s',0.2)
        if current<self.last:return
        self.last=current+interval if current-self.last>interval else self.last+interval
        # Bound pending storage during WAN failure; preserve the recorded frames.
        pending=len(list(self.folder.glob('*.json')))
        self.metrics['max_pending']=max(self.metrics['max_pending'],pending)
        if pending>=30:self.metrics['queue_full_skips']+=1;return
        if self.home is None:self.home=client.getHomeGeoPoint(vehicle_name='Copter')
        response=client.simGetImages([airsim.ImageRequest(self.cfg.get('camera_name','0'),airsim.ImageType.Scene,False,True)],vehicle_name='Copter')[0]
        if not response.image_data_uint8 or response.width<=0 or response.height<=0:raise ValueError('No AirSim image')
        state=client.getMultirotorState(vehicle_name='Copter')
        fid=str(uuid.uuid4());raw=bytes(response.image_data_uint8)
        fmt=self.cfg.get('image_format','JPEG')
        if fmt=='JPEG':
            from io import BytesIO
            from PIL import Image
            encoded=BytesIO()
            with Image.open(BytesIO(raw)) as img:img.convert('RGB').save(encoded,format='JPEG',quality=90)
            raw=encoded.getvalue()
        capture_at=datetime.datetime.now(datetime.timezone.utc).isoformat()
        frame={'frame_id':fid,'mission_id':self.cfg['mission_id'],'input_asset_id':str(uuid.uuid4()),
            'stream_id':'unreal/'+self.run['run_id'],'stream_epoch':0,'frame_seq':str(response.time_stamp),
            'capture_at':capture_at,'width':response.width,'height':response.height,'format':fmt,
            'pose':frame_pose(fid,capture_at,response,state,self.home)}
        value={'producer_session_id':self.box.state['producer_session_id'],'frame':frame,
            'analysis_run_id':str(uuid.uuid4()),'bundle_id':str(uuid.uuid4()),'sha256':hashlib.sha256(raw).hexdigest()}
        # Pose values are finite JSON; the server independently validates the typed contract.
        with (self.folder/(fid+('.jpg' if fmt=='JPEG' else '.png'))).open('wb') as f:f.write(raw);f.flush();os.fsync(f.fileno())
        tmp=self.folder/(fid+'.tmp')
        with tmp.open('w') as f:json.dump(value,f,allow_nan=False);f.flush();os.fsync(f.fileno())
        os.replace(tmp,self.folder/(fid+'.json'))
        self.metrics['captured']+=1

    def flush(self):
        base='/device/v1/simulations/runs/'+self.run['run_id']
        records=[(path,json.loads(path.read_text())) for path in self.folder.glob('*.json')]
        records=sorted(records,key=lambda item:int(item[1]['frame']['frame_seq']))
        while records:
            batch=[];chunks=[];metadata=[]
            for path,value in records[:5]:
                frame=value['frame'];image=path.with_suffix('.jpg' if frame['format']=='JPEG' else '.png');raw=image.read_bytes()
                item=value|{'byte_size':len(raw)}
                trial=metadata+[item]
                encoded=base64.b64encode(json.dumps({'frames':trial},separators=(',',':'),allow_nan=False).encode()).decode()
                if len(encoded)>12288 or sum(map(len,chunks))+len(raw)>8388608:
                    if not batch:raise ValueError('Frame exceeds upload contract')
                    break
                batch.append((path,image));chunks.append(raw);metadata.append(item)
            many=len(batch)>1
            encoded=base64.b64encode(json.dumps({'frames':metadata} if many else metadata[0],separators=(',',':'),allow_nan=False).encode()).decode()
            if not many and len(encoded)>8192:raise ValueError('Frame exceeds upload contract')
            headers={'X-Simulator-Session':metadata[0]['producer_session_id'],'X-Frame-Metadata':encoded}
            result=self.api.request('POST',base+('/frames/batch/content' if many else '/frames/content'),b''.join(chunks),headers=headers)
            expected=[{'frame_id':m['frame']['frame_id'],'analysis_run_id':m['analysis_run_id'],'stored':True} for m in metadata]
            if result!=({'frames':expected} if many else expected[0]):raise ValueError('Frame acknowledgement mismatch')
            for path,image in batch:path.unlink();image.unlink()
            self.metrics['uploaded']+=len(batch)
            del records[:len(batch)]

    def loop(self):
        while not self.stop.is_set():
            try:
                pending=list(self.folder.glob('*.json'))
                if pending and (len(pending)>=5 or self.capture_stop.is_set() or time.time()-min(p.stat().st_mtime for p in pending)>=.8):self.flush()
            except Exception as exc:print('SIM_FRAME_RETRY:',type(exc).__name__,flush=True)
            self.stop.wait(.05)

    def finish(self):
        self.end_capture()
        # The simulation is already stopped/landed; allow a 20-second WAN interruption to drain.
        deadline=time.monotonic()+30
        while list(self.folder.glob('*.json')) and time.monotonic()<deadline:time.sleep(.1)
        if hasattr(self,'metrics'):
            report=self.metrics|{'pending':len(list(self.folder.glob('*.json')))}
            target=self.folder.parent/'frame-metrics.json';temp=target.with_suffix('.tmp')
            temp.write_text(json.dumps(report));os.replace(temp,target)
        return not list(self.folder.glob('*.json'))

    def close(self):
        if getattr(self,'capture_thread',None):self.capture_stop.set();self.capture_thread.join(timeout=6)
        self.stop.set();self.thread.join(timeout=1)
