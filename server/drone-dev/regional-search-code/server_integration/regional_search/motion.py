"""Explicit school SIM profile. Never accepted by the REAL executor."""
import bisect,math
POSITION_VELOCITY_YAW_MASK=0x9c0  # ignore acceleration and yaw rate only

def wrap(deg):return (deg+180.)%360.-180.

def observer_overdue(now,search_start,response_time):
    # The ledger deliberately receives no flight frames before region entry.
    return now-max(search_start,response_time)>3.

class Timeline:
    def __init__(self,plan):
        if plan['scope']!='LOCAL_UNREAL_ARDUCOPTER_SITL_ONLY':raise ValueError('SIM scope required')
        self.rows=[];self.ends=[];t=0.;previous=None
        for leg in plan['legs']:
            for row in leg['phases']:
                r=dict(row);r['begin']=t
                values=[*r['start'],*r['end'],r['yaw'],r['delta'],r['seconds']]
                if not all(math.isfinite(v) for v in values) or r['seconds']<=0:raise ValueError('Invalid phase')
                if previous is not None and math.dist(previous,r['start'])>1e-6:raise ValueError('Discontinuous route')
                if math.dist(r['start'],r['end'])/r['seconds']>4.00001:raise ValueError('Speed envelope exceeded')
                if abs(r['delta'])/r['seconds']>30.00001:raise ValueError('Yaw envelope exceeded')
                t+=r['seconds'];self.rows.append(r);self.ends.append(t);previous=r['end']
            if leg['otherSeconds']:
                r=dict(kind='ACCOUNTED_OVERHEAD',start=previous,end=previous,yaw=r['yaw']+r['delta'],delta=0.,seconds=leg['otherSeconds'],begin=t)
                t+=r['seconds'];self.rows.append(r);self.ends.append(t)
        self.seconds=t
        if abs(t-plan['predictedSeconds'])>1e-6:raise ValueError('Timing changed')
        if math.dist(plan['entryNed'],self.rows[0]['start'])>1e-6:raise ValueError('Entry mismatch')

    def at(self,t):
        i=min(len(self.rows)-1,bisect.bisect_right(self.ends,max(0,t)))
        r=self.rows[i];f=min(1.,max(0.,(t-r['begin'])/r['seconds']))
        pos=[a+(b-a)*f for a,b in zip(r['start'],r['end'])]
        vel=[(b-a)/r['seconds'] for a,b in zip(r['start'],r['end'])] if t<self.seconds else [0.,0.,0.]
        return pos,vel,wrap(r['yaw']+r['delta']*f),i

def validate_local_binding(config,plan,scene,process_command):
    if config.get('mode')!='SIMULATION' or config.get('mavlink')!='tcp:127.0.0.1:5762':raise ValueError('Local SITL binding required')
    if config.get('rpcHost')!='127.0.0.1' or config.get('rpcPort')!=41451:raise ValueError('Local AirSim binding required')
    if config.get('controlScope')!='LOCAL_SIMULATION_ONLY':raise ValueError('Simulation scope missing')
    if config['worldVersion']!=plan['worldVersion'] or scene['version']!=plan['sceneVersion']:raise ValueError('World mismatch')
    if config['level']!=scene['level'] or scene['status']!='PASS':raise ValueError('Validated trial level required')
    if scene['level'] not in process_command or '-game' not in process_command:raise ValueError('Wrong running Unreal scene')
