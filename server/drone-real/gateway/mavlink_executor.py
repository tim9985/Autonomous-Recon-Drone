"""Single-owner ArduCopter adapter. ACK is not flight completion evidence."""
import math
import time
import threading
from functools import wraps

def locked(fn):
    @wraps(fn)
    def run(self,*args,**kwargs):
        with self.lock:return fn(self,*args,**kwargs)
    return run

class Fault(Exception):
    pass

def same_item(a,b):
    if a['seq']!=b['seq'] or a['command']!=b['command']:return False
    # ArduPilot replaces seq 0 with its real home and can return frame 3 for 6.
    if a['seq']==0:return a['command']==16
    frame=lambda n:3 if n==6 else n
    if frame(a['frame'])!=frame(b['frame']) or a['autocontinue']!=b['autocontinue']:return False
    return (abs(a['x']-b['x'])<=2 and abs(a['y']-b['y'])<=2 and abs(a['z']-b['z'])<=0.05
            and all(math.isclose(x,y,abs_tol=0.001,rel_tol=0.00001) for x,y in zip(a['params'],b['params'])))

class Executor:
    def __init__(self, link, system_id, component_id, gcs_id, authorized,
                 clock=time.monotonic, battery_min=None, battery_max=None):
        self.link,self.system,self.component,self.gcs=link,system_id,component_id,gcs_id
        self.authorized,self.clock=authorized,clock
        self.battery_min,self.battery_max=battery_min,battery_max
        self.lock=threading.RLock()
        self.state={'connected':False,'armed':False,'landed':False,'mode':0,'gps_ok':False,
                    'battery_ok':False,'failsafe_ok':False,'rc_override':False,'position':None}
        self.seen={};self.parameters={};self.expected_modes=None;self.last_gcs=0
        self.flying=False;self.was_airborne=False;self.gcs_active=False

    @locked
    def consume(self,m):
        if m.get_srcSystem()!=self.system or m.get_srcComponent()!=self.component:return
        kind=m.get_type();self.seen[kind]=self.clock()
        if kind=='HEARTBEAT':
            self.state.update(connected=m.autopilot==3 and m.type==2,
                              armed=bool(m.base_mode&128),mode=m.custom_mode)
            if self.expected_modes is not None and m.custom_mode not in self.expected_modes:
                self.state['rc_override']=True
        elif kind=='EXTENDED_SYS_STATE':
            self.state['landed']=m.landed_state==1
            if m.landed_state==2:self.was_airborne=True
        elif kind=='SYS_STATUS':
            voltage=None if m.voltage_battery==65535 else m.voltage_battery/1000.0
            self.state['battery_voltage_v']=voltage
            self.state['battery_ok']=(voltage is not None and self.battery_min is not None
                and self.battery_max is not None and self.battery_min<=voltage<=self.battery_max
                and (m.battery_remaining==-1 or m.battery_remaining>=30))
        elif kind=='GPS_RAW_INT':
            self.state.update(gps_ok=m.fix_type>=3 and 6<=m.satellites_visible<255,
                              gps_fix_type=m.fix_type,satellites_visible=m.satellites_visible)
        elif kind=='GLOBAL_POSITION_INT':
            self.state['position']={'lat':m.lat/1e7,'lon':m.lon/1e7,'relative_altitude_m':m.relative_alt/1000.0}
        elif kind=='MISSION_CURRENT':self.state['mission_current']=m.seq
        elif kind=='MISSION_ITEM_REACHED':self.state['mission_reached']=m.seq
        elif kind=='PARAM_VALUE':
            key=m.param_id.decode().rstrip('\0') if isinstance(m.param_id,bytes) else m.param_id.rstrip('\0')
            self.parameters[key]=(float(m.param_value),self.clock())
            p={k:v for k,(v,t) in self.parameters.items() if self.clock()-t<30}
            self.state['failsafe_ok']=(p.get('FS_GCS_ENABLE')==1 and p.get('SYSID_MYGCS')==self.gcs
                and 0<p.get('FS_GCS_TIMEOUT',999)<=5 and p.get('ARMING_CHECK')==1
                and 'FS_OPTIONS' in p and int(p['FS_OPTIONS'])&18==0)

    @locked
    def snapshot(self):
        s=dict(self.state);now=self.clock()
        for kind,key in [('HEARTBEAT','connected'),('EXTENDED_SYS_STATE','landed'),
                         ('SYS_STATUS','battery_ok'),('GPS_RAW_INT','gps_ok')]:
            if now-self.seen.get(kind,-999)>3:s[key]=False
        if now-self.seen.get('GLOBAL_POSITION_INT',-999)>3:s['position']=None
        if self.parameters and any(now-t>=30 for _,t in self.parameters.values()):s['failsafe_ok']=False
        if not s['gps_ok']:s['position']=None
        return s

    def guard(self):
        if not self.authorized():raise Fault('CONTROL_LEASE_EXPIRED')
        if not self.snapshot()['connected']:raise Fault('FC_DISCONNECTED_OR_STALE')
        if self.state['rc_override']:raise Fault('RC_TAKEOVER')

    def receive(self):
        # Only this thread owns the FC link. No GCS heartbeat without an operator lease.
        if self.gcs_active and not self.state['rc_override'] and self.authorized() and self.clock()-self.last_gcs>=1:
            self.link.mav.heartbeat_send(6,8,0,0,4)
            self.last_gcs=self.clock()
        m=self.link.recv_match(blocking=True,timeout=0.1)
        if m is not None and m.get_type()!='BAD_DATA':self.consume(m)
        return m

    def wait(self,kinds,predicate=lambda m:True,timeout=5):
        deadline=time.monotonic()+timeout
        while time.monotonic()<deadline:
            self.guard()
            m=self.receive()
            if (m is not None and m.get_srcSystem()==self.system and m.get_srcComponent()==self.component
                    and getattr(m,'target_system',self.gcs) in (0,self.gcs)
                    and getattr(m,'target_component',190) in (0,190)
                    and getattr(m,'mission_type',0)==0 and m.get_type() in kinds and predicate(m)):return m
        raise Fault('FC_RESPONSE_TIMEOUT')

    def command(self,command,params):
        self.guard()
        values=(list(params)+[0]*7)[:7]
        self.link.mav.command_long_send(self.system,self.component,command,0,*values)
        deadline=time.monotonic()+8
        while time.monotonic()<deadline:
            ack=self.wait(('COMMAND_ACK',),lambda m:m.command==command,timeout=max(.1,deadline-time.monotonic()))
            if ack.result==0:return
            if ack.result!=5:raise Fault('ACK_REJECTED_'+str(ack.result))
        raise Fault('ACK_IN_PROGRESS_TIMEOUT')

    def mode(self,mode):
        if mode not in (0,2,3,4,5,6,9):raise Fault('MODE_NOT_ALLOWED')
        self.expected_modes={self.state['mode'],mode}
        self.command(176,[1,mode])
        self.wait(('HEARTBEAT',),lambda m:m.custom_mode==mode)
        self.expected_modes={mode}

    def arm(self,value):
        self.command(400,[1 if value else 0,0])  # param2=0; never force arm/disarm.
        self.wait(('HEARTBEAT',),lambda m:bool(m.base_mode&128)==value)

    def upload(self,items):
        self.guard();self.link.mav.mission_count_send(self.system,self.component,len(items),0)
        sent=set();deadline=time.monotonic()+45
        while time.monotonic()<deadline:
            m=self.wait(('MISSION_REQUEST_INT','MISSION_REQUEST','MISSION_ACK'),timeout=5)
            if m.get_type()=='MISSION_ACK':
                if m.type!=0 or len(sent)!=len(items):raise Fault('MISSION_UPLOAD_REJECTED')
                return
            if not 0<=m.seq<len(items):raise Fault('MISSION_SEQUENCE_INVALID')
            it=items[m.seq];self.guard()
            if m.get_type()=='MISSION_REQUEST_INT':
                self.link.mav.mission_item_int_send(self.system,self.component,it['seq'],it['frame'],it['command'],0,it['autocontinue'],*it['params'],it['x'],it['y'],it['z'],0)
            else:
                self.link.mav.mission_item_send(self.system,self.component,it['seq'],3 if it['frame']==6 else it['frame'],it['command'],0,it['autocontinue'],*it['params'],it['x']/1e7,it['y']/1e7,it['z'],0)
            sent.add(m.seq)
        raise Fault('MISSION_UPLOAD_TIMEOUT')

    def verify(self,items):
        self.guard();self.link.mav.mission_request_list_send(self.system,self.component,0)
        count=self.wait(('MISSION_COUNT',))
        if count.count!=len(items):raise Fault('MISSION_READBACK_MISMATCH')
        for index,it in enumerate(items):
            self.guard();self.link.mav.mission_request_int_send(self.system,self.component,index,0)
            m=self.wait(('MISSION_ITEM_INT',),lambda m:m.seq==index)
            actual={'seq':m.seq,'frame':m.frame,'command':m.command,'params':[m.param1,m.param2,m.param3,m.param4],
                    'x':m.x,'y':m.y,'z':m.z,'autocontinue':m.autocontinue}
            if not same_item(it,actual):raise Fault('MISSION_READBACK_MISMATCH')
        self.guard();self.link.mav.mission_ack_send(self.system,self.component,0,0)

    def preflight(self,payload):
        self.guard();s=self.snapshot()
        if not s['landed'] or s['armed'] or not all(s[k] for k in ('gps_ok','battery_ok','failsafe_ok')):
            raise Fault('FC_PREFLIGHT_REQUIRED')
        position=s['position'];home=payload['takeoff']
        if not position:raise Fault('GPS_HOME_POSITION_UNVERIFIED')
        dlat=math.radians(position['lat']-home['lat']);dlon=math.radians(position['lon']-home['lon'])
        if 6371000*math.hypot(dlat,dlon*math.cos(math.radians(home['lat'])))>20:raise Fault('LAUNCH_POSITION_MISMATCH')

    def execute(self,action,payload):
        self.guard();s=self.snapshot()
        if action in ('ARM','DISARM','UPLOAD','START') and not s['landed']:raise Fault('LANDED_STATE_REQUIRED')
        if action in ('ARM','UPLOAD','START') and s['armed']:raise Fault('DISARMED_STATE_REQUIRED')
        if action in ('ARM','START') and not all(s[k] for k in ('gps_ok','battery_ok','failsafe_ok')):
            raise Fault('FC_PREFLIGHT_REQUIRED')
        if action in ('ARM','START') or s['armed']:
            self.gcs_active=True
        if action=='MODE':
            if payload.get('mode') not in (0,2,4,5,6,9):raise Fault('MODE_NOT_ALLOWED')
            self.mode(payload['mode'])
        elif action in ('RTL','LAND'):self.mode(6 if action=='RTL' else 9)
        elif action in ('ARM','DISARM'):
            self.arm(action=='ARM')
            if action=='DISARM':self.gcs_active=False
        elif action=='UPLOAD':
            self.upload(payload['items']);self.verify(payload['items'])
            return {'readback_verified':True,'plan_hash':payload['plan_hash'],'item_count':len(payload['items'])}
        elif action=='START':
            self.verify(payload['items'])
            self.preflight(payload)
            self.mode(4)
            self.preflight(payload)
            self.arm(True)
            self.guard();self.link.mav.mission_set_current_send(self.system,self.component,1)
            self.wait(('MISSION_CURRENT',),lambda m:m.seq==1)
            self.mode(3);self.command(300,[1,len(payload['items'])-1])
            self.expected_modes={3,6,9};self.flying=True;self.was_airborne=False
            return {'started':True,'mission_completed':False,'plan_hash':payload['plan_hash']}
        else:raise Fault('ACTION_NOT_ALLOWED')
        return {'ack':True,'state_confirmed':True,'armed':self.state['armed'],'mode':self.state['mode']}
