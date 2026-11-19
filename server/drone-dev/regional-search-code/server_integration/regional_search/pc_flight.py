"""School SIM phase executor. Adapted from the three verified campus trials; no historic route input."""
from pathlib import Path
import sys,os,json,time,math,threading,queue,subprocess,uuid,shutil,traceback,hashlib
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[1];RUNTIME=ROOT/'simulation_world/runtime'
sys.path[:0]=[str(ROOT/'simulation_world'),str(ROOT/'ml/region_search')]
for k in ('OPENBLAS_NUM_THREADS','OMP_NUM_THREADS','MKL_NUM_THREADS'):os.environ[k]='1'
import numpy as np
import psutil
from PIL import Image
import cosysairsim as airsim
from pymavlink import mavutil
from .motion import Timeline,wrap,validate_local_binding,POSITION_VELOCITY_YAW_MASK,observer_overdue
from camera_pipeline import CameraPipeline
from search_executor import image_quality
from run_storage import create_run_directory
from windows_resource_guard import memory_snapshot,Job

def read(p):return json.loads(p.read_text(encoding='utf-8'))
def save(p,v):
    tmp=p.with_suffix('.tmp');tmp.write_text(json.dumps(v,ensure_ascii=False,indent=2,allow_nan=False),encoding='utf-8');tmp.replace(p)

class Trial:
    def __init__(self, plan, config, run_id, output, remote):
        self.plan=plan;self.timeline=Timeline(plan);self.config=config
        self.run_id=run_id;self.out=Path(output);self.out.mkdir(parents=True,exist_ok=True)
        self.raw=create_run_directory(RUNTIME,run_id)
        save(self.raw/'manifest.json',dict(runId=run_id,scope='SCHOOL_SIM_ACTUAL_RGB',packageId=plan['packageId']))
        self.events=(self.out/'events.jsonl').open('w',encoding='utf-8',buffering=1)
        self.track=(self.out/'tracking.jsonl').open('w',encoding='utf-8',buffering=1)
        self.memory=(self.out/'memory.jsonl').open('w',encoding='utf-8',buffering=1)
        self.stop=threading.Event();self.capture_stop=threading.Event();self.phase='PREPARING'
        self.state={};self.latest={};self.times={};self.observer_status={};self.error=None;self.sensor={}
        self.publish_lock=threading.Lock();self.last_published=-1;self.pending=queue.Queue(maxsize=12)
        self.dropped=0;self.rgb_count=0;self.last_rgb=0.;self.search_start=None;self.airborne=False
        self.result=dict(runId=run_id,status='PREPARING',startedAt=time.time(),raw=str(self.raw),packageId=plan['packageId'])
        self.remote=remote;self.remote.trial=self
        self.network=threading.Thread(target=remote.pump,daemon=True)
        self.link=mavutil.mavlink_connection('tcp:127.0.0.1:5762',source_system=254)
        if not self.link.wait_heartbeat(timeout=10):raise RuntimeError('No local SITL heartbeat')
        if self.link.target_system!=1:raise RuntimeError('Unexpected SITL system')
        self.link.mav.request_data_stream_send(1,1,mavutil.mavlink.MAV_DATA_STREAM_ALL,10,1)
        for message,hz in [(32,20),(30,20),(33,10),(245,5),(193,2),(24,5)]:
            self.command(mavutil.mavlink.MAV_CMD_SET_MESSAGE_INTERVAL,message,1e6/hz)
        self.pipeline=CameraPipeline(self.process_rgb,self.capture_error,workers=2)
        self.capture_thread=threading.Thread(target=self.capture,daemon=True);self.capture_thread.start()
        self.health_thread=threading.Thread(target=self.health,daemon=True);self.health_thread.start()
        self.last_resource=0.;self.speed=None
        # Start lease renewal only after local construction succeeds.
        self.network.start()

    def event(self,name,**values):
        row=dict(event=name,time=time.time(),phase=self.phase,**values);self.events.write(json.dumps(row)+'\n')
        print(json.dumps(row,ensure_ascii=False),flush=True)

    def capture_error(self,error):
        if isinstance(error,OSError):self.error='RGB_STORAGE: '+repr(error)
        self.sensor['lastCaptureError']=repr(error)

    def capture(self):
        client=airsim.MultirotorClient(ip='127.0.0.1',port=41451,timeout_value=3)
        i=0
        try:
            while not self.capture_stop.is_set():
                tick=time.perf_counter();before=dict(self.state)
                try:
                    image=client.simGetImages([airsim.ImageRequest('front_center',airsim.ImageType.Scene,False,False)],'Copter')[0]
                    received=time.time();after=dict(self.state)
                    if (image.width,image.height)!=(1920,1080):raise ValueError('Camera dimensions changed')
                    self.pipeline.submit((i,tick,received,image,before,after));i+=1
                except Exception as e:self.capture_error(e)
                self.capture_stop.wait(max(.001,1/6-(time.perf_counter()-tick)))
        finally:client.client.close()

    def process_rgb(self,packet,queue_seconds):
        i,tick,received,image,before,after=packet
        raw=bytes(image.image_data_uint8);channels=len(raw)//(1920*1080)
        if channels not in (3,4):raise ValueError('Unexpected camera channels')
        picture=Image.frombytes('RGB' if channels==3 else 'RGBA',(1920,1080),raw).convert('RGB')
        quality=image_quality(picture)
        obs=dict(frameId=int(image.time_stamp),source='AIRSIM_RGB_PAIRED_CAMERA_POSE',evidenceOrigin='CAPTURED_RGB',
            positionNed=[image.camera_position.x_val,image.camera_position.y_val,image.camera_position.z_val],
            quaternion=[image.camera_orientation.x_val,image.camera_orientation.y_val,image.camera_orientation.z_val,image.camera_orientation.w_val],
            width=1920,height=1080,horizontalFovDeg=78.,quality=quality,capturedAt=received,
            acquisitionSeconds=time.perf_counter()-tick,valid=bool(before.get('armed') and after.get('armed') and before.get('valid') and after.get('valid')))
        meta=dict(index=i,receivedAt=received,cameraObservation=obs,aircraftBefore=before,aircraftAfter=after,queueSeconds=queue_seconds,
            storage='LOSSLESS_PNG_LEVEL1',timeAlignment='RGB_RESPONSE_POSE_WITH_BRACKETED_AIRCRAFT_TELEMETRY')
        if after.get('armed') or i==0:
            if shutil.disk_usage(self.raw).free<5*1024**3:raise OSError('5GiB storage reserve reached')
            p=self.raw/f'rgb-{i:06}.png';temp=p.with_suffix('.png.tmp');picture.save(temp,format='PNG',compress_level=1);temp.replace(p)
            meta['storedAt']=time.time();meta['imageSha256']=hashlib.sha256(p.read_bytes()).hexdigest();save(p.with_suffix('.json'),meta)
        with self.publish_lock:
            self.last_rgb=time.time();self.rgb_count+=1
            if obs['frameId']<=self.last_published:return
            self.last_published=obs['frameId']
            if self.phase=='SEARCH' and after.get('ned') is not None:
                data=dict(type='FRAME',observation=obs,receivedAt=received,aircraftBefore=before,aircraftAfter=after,
                    imageSha256=meta['imageSha256'],recordingName=p.name,searchStartedAt=self.search_start,
                    eligible=bool(obs['valid'] and time.perf_counter()-tick<1.))
                try:self.pending.put_nowait(data)
                except queue.Full:self.dropped+=1

    def health(self):
        client=airsim.MultirotorClient(ip='127.0.0.1',port=41451,timeout_value=3)
        try:
            while not self.stop.is_set():
                try:
                    collision=client.simGetCollisionInfo('Copter');pose=client.simGetVehiclePose('Copter')
                    self.sensor={**self.sensor, 'time':time.time(),'collision':collision.has_collided,
                        'collisionStamp':int(collision.time_stamp),'collisionObject':collision.object_name,
                        'ned':[pose.position.x_val,pose.position.y_val,pose.position.z_val]}
                except Exception as e:self.sensor={**self.sensor,'healthError':repr(e)}
                self.stop.wait(.5)
        finally:client.client.close()

    def command(self,cmd,*params):
        self.link.mav.command_long_send(1,1,cmd,0,*(list(params)+[0]*(7-len(params))))

    def poll(self,checks=True):
        now=time.time()
        while True:
            m=self.link.recv_match(blocking=False)
            if m is None:break
            typ=m.get_type();self.latest[typ]=m;self.times[typ]=now
            if typ=='STATUSTEXT':self.event('SITL_STATUS',text=m.text)
        p=self.latest.get('LOCAL_POSITION_NED');a=self.latest.get('ATTITUDE');hb=self.latest.get('HEARTBEAT')
        if p and a and hb:
            self.state=dict(ned=[p.x,p.y,p.z],velocity=[p.vx,p.vy,p.vz],yaw=math.degrees(a.yaw),
                roll=math.degrees(a.roll),pitch=math.degrees(a.pitch),armed=bool(hb.base_mode&128),mode=hb.custom_mode,
                valid=all(now-self.times.get(k,0)<2 for k in ('LOCAL_POSITION_NED','ATTITUDE','HEARTBEAT')),time=now)
        if checks and self.airborne:
            if not self.state.get('valid'):raise RuntimeError('STALE_FLIGHT_TELEMETRY')
            if self.phase!='LAND' and not self.state['armed']:raise RuntimeError('UNEXPECTED_DISARM')
            if self.phase!='LAND' and self.state['mode']!=4:raise RuntimeError('GUIDED_MODE_LOST')
            if math.hypot(*self.state['ned'][:2])>600 or self.state['ned'][2]<-66:raise RuntimeError('LOCAL_TEST_ENVELOPE')
            if self.phase not in ('LAND','TAKEOFF'):
                if now-self.sensor.get('time',0)>3:raise RuntimeError('STALE_SIM_COLLISION_MONITOR')
                if self.sensor.get('collisionStamp',0)>self.initial_collision and self.sensor.get('collision'):raise RuntimeError('SIM_COLLISION: '+self.sensor.get('collisionObject',''))
            if now-self.last_rgb>3:raise RuntimeError('RGB_CAPTURE_LOST')
            if self.error:raise RuntimeError(self.error)
            if self.phase=='SEARCH' and observer_overdue(now,self.search_start,self.observer_status.get('responseAt',0)):raise RuntimeError('OBSERVER_BACKLOG')
        if now-self.last_resource>1:
            m=memory_snapshot();self.memory.write(json.dumps(m)+'\n');self.last_resource=now
            if checks and (m['availableBytes']<12*1024**3 or m['commitBytes']/m['commitLimitBytes']>.75):raise RuntimeError('SYSTEM_MEMORY_RESERVE')
        return self.state

    def wait(self,condition,seconds,label,action=None,checks=True):
        start=time.monotonic()
        while time.monotonic()-start<seconds:
            # A stop/loss during GUIDED or ARM retries must prevent another arm.
            # Landing must still be attempted when the school connection is lost.
            if label not in ('LANDED_AND_DISARMED','ABORT_LANDED_AND_DISARMED'):
                if self.error:raise RuntimeError(self.error)
                if time.monotonic()-self.remote.last_success>3:raise RuntimeError('SCHOOL_CONNECTION_LOST_WHILE_WAITING')
            state=self.poll(checks)
            if condition(state):self.event(label);return
            if action:action()
            time.sleep(.1)
        raise TimeoutError(label)

    def setpoint(self,pos,yaw,velocity=(0.,0.,0.)):
        if not all(math.isfinite(v) for v in (*pos,*velocity,yaw)):raise ValueError('Nonfinite setpoint')
        self.link.mav.set_position_target_local_ned_send(0,1,1,mavutil.mavlink.MAV_FRAME_LOCAL_NED,
            POSITION_VELOCITY_YAW_MASK,*pos,*velocity,0,0,0,math.radians(wrap(yaw)),0)

    def set_speed(self,value):
        if value not in (3.,4.):raise ValueError('Original speed policy only')
        if self.speed!=value:self.command(mavutil.mavlink.MAV_CMD_DO_CHANGE_SPEED,1,value,-1);self.speed=value

    def goto(self,pos,yaw,timeout=None):
        self.set_speed(3.)
        limit=timeout or math.dist(self.state['ned'],pos)/2.+35
        stable=[0.]
        def reached(s):
            if math.dist(s['ned'],pos)<1.1 and abs(wrap(s['yaw']-yaw))<7 and math.dist(s['velocity'],[0,0,0])<.7:
                if not stable[0]:stable[0]=time.monotonic()
                return time.monotonic()-stable[0]>.7
            stable[0]=0.;return False
        self.wait(reached,limit,'POINT_REACHED',lambda:self.setpoint(pos,yaw))

    def search(self):
        self.pending.put(dict(type='BEGIN',time=time.time(),ned=self.state['ned'],yaw=self.state['yaw']))
        self.search_start=time.time();self.phase='SEARCH';self.event('REGION_ENTRY',position=self.state['ned'],yaw=self.state['yaw'])
        clock=0.;last=time.monotonic();last_report=0.;pauses=0.;maxerr=0.;maxyaw=0.;frozen_since=None
        while clock<self.timeline.seconds:
            now=time.monotonic();dt=min(.3,now-last);last=now;s=self.poll()
            pos,velocity,yaw,index=self.timeline.at(clock)
            error=math.dist(s['ned'],pos);yerr=abs(wrap(s['yaw']-yaw));maxerr=max(maxerr,error);maxyaw=max(maxyaw,yerr)
            if error>4.:raise RuntimeError('TRAJECTORY_TRACKING_ERROR %.2fm'%error)
            frozen=error>1.5 or yerr>15
            if frozen:
                pauses+=dt
                if frozen_since is None:frozen_since=now
                if now-frozen_since>15:raise RuntimeError('TRAJECTORY_CANNOT_BE_FOLLOWED')
            else:clock=min(self.timeline.seconds,clock+dt);frozen_since=None
            self.set_speed(4. if math.sqrt(sum(v*v for v in velocity))>3.00001 else 3.)
            self.setpoint(pos,yaw,[0.,0.,0.] if frozen else velocity)
            self.track.write(json.dumps(dict(time=time.time(),searchSeconds=time.time()-self.search_start,planSeconds=clock,
                actual=s,command=dict(ned=pos,velocity=velocity,yaw=yaw),positionErrorM=error,yawErrorDeg=yerr,trackingHold=frozen,phaseIndex=index))+'\n')
            if now-last_report>=10:
                self.event('SEARCH_PROGRESS',seconds=round(time.time()-self.search_start,1),planSeconds=round(clock,1),
                    percent=self.observer_status.get('percent'),frameCounts=self.observer_status.get('counts'),errorM=round(error,2))
                last_report=now
            if time.time()-self.search_start>1800:raise TimeoutError('SEARCH_WALL_DEADLINE')
            time.sleep(max(.001,.1-(time.monotonic()-now)))
        pos,_,yaw,_=self.timeline.at(self.timeline.seconds);self.goto(pos,yaw,25)
        self.result.update(searchSeconds=time.time()-self.search_start,trackingHoldSeconds=pauses,maxPositionErrorM=maxerr,maxYawErrorDeg=maxyaw)
        self.event('REGISTERED_ROUTE_FINISHED')

    def finish_observation(self):
        if self.search_start is not None and self.phase=='SEARCH':
            self.phase='RETURN'
            self.result['searchEndedAt']=time.time()

    def run(self):
        try:
            self.wait(lambda s:self.observer_status.get('event')=='READY' and s.get('valid') and self.last_rgb>0 and self.sensor.get('time'),60,'PREFLIGHT_READY',checks=False)
            if self.error or time.monotonic()-self.remote.last_success>2:
                raise RuntimeError('SCHOOL_PREFLIGHT_CONNECTION_LOST')
            gps=self.latest.get('GLOBAL_POSITION_INT');lon,lat,_=self.config['spawnGeographic']
            if gps is None:raise RuntimeError('GPS missing')
            gps_error=math.hypot((gps.lat/1e7-lat)*111320,(gps.lon/1e7-lon)*111320*math.cos(math.radians(lat)))
            if gps_error>5 or math.dist(self.state['ned'],self.sensor['ned'])>2:raise RuntimeError('SIM_ORIGIN_MISMATCH')
            self.result['spawnGpsErrorM']=gps_error;self.initial_collision=self.sensor.get('collisionStamp',0)
            self.link.set_mode('GUIDED');self.wait(lambda s:s.get('mode')==4,10,'GUIDED_READY',checks=False)
            next_arm=[0.]
            def arm():
                if time.monotonic()>next_arm[0]:self.link.arducopter_arm();next_arm[0]=time.monotonic()+3
            self.wait(lambda s:s.get('armed'),60,'ARMED',arm,checks=False)
            self.airborne=True;self.phase='TAKEOFF';self.command(mavutil.mavlink.MAV_CMD_NAV_TAKEOFF,0,0,0,0,0,0,30)
            self.wait(lambda s:s['ned'][2]<-28.5,60,'TAKEOFF_CONFIRMED')
            self.phase='INGRESS'
            for p in self.plan['ingressPath']:self.goto(p,self.plan['entryYaw'])
            self.search();self.finish_observation()
            self.phase='RETURN'
            for p in self.plan['returnPath'][1:]:self.goto(p,0.)
            self.result['returnedHome']=math.hypot(*self.state['ned'][:2])<2.
            self.phase='LAND';self.link.set_mode('LAND')
            self.wait(lambda s:not s.get('armed',True),90,'LANDED_AND_DISARMED',checks=False)
            self.airborne=False;self.result['status']='COMPLETED_FLIGHT'
        except (Exception, KeyboardInterrupt) as e:
            self.result.update(status='FAILED',error=repr(e),traceback=traceback.format_exc())
            self.event('TRIAL_FAILED',error=repr(e))
            try:self.finish_observation()
            except Exception as obs_error:self.result['observationCloseError']=repr(obs_error)
            if self.state.get('armed'):
                # Abort in place; never issue an unplanned straight RTL through buildings.
                self.phase='LAND';self.link.set_mode('LAND')
                try:self.wait(lambda s:not s.get('armed',True),90,'ABORT_LANDED_AND_DISARMED',checks=False);self.airborne=False
                except Exception as land_error:self.result['landError']=repr(land_error)
        finally:
            self.result.update(finishedAt=time.time(),lastState=self.state,landedAndDisarmed=not self.state.get('armed',True),
                rgbFrames=self.rgb_count,observerQueueDrops=self.dropped,pipeline=self.pipeline.snapshot(),sensor=self.sensor)
            self.result['landedAndDisarmed']=bool(self.state.get('valid') and self.state.get('armed') is False)
            self.capture_stop.set();self.capture_thread.join(5);self.pipeline.close(5);self.stop.set();self.health_thread.join(4)
            self.network.join(3);self.link.close()
            save(self.out/'flight-result.json',self.result);save(self.raw/'flight-result.json',self.result)
            self.event('TRIAL_FINISHED',status=self.result['status'],landed=self.result['landedAndDisarmed'],output=str(self.out))
            self.events.close();self.track.close();self.memory.close()
        return self.result

