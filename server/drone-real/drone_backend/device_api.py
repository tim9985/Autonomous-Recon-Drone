from . import responses as out
from datetime import timedelta
from uuid import UUID
from fastapi import APIRouter, Request
from . import contracts as dto
from .core import *

router=APIRouter()

@router.post('/device/v1/sessions',response_model=out.Drone)
def session(body:dto.DeviceSession,request:Request):
    with transaction(events=True) as c:
        p,d=device(request,c)
        s=d['gateway_state']
        if s.get('session_id')==str(body.session_id):
            if s.get('session_hash')!=digest(body.model_dump(mode='json')): fail('ID_CONFLICT')
            return output(d)
        if int(body.control_epoch)<=d['control_epoch']: fail('OLD_CONTROL_EPOCH')
        if not now()<body.lease_expires_at<=now()+timedelta(seconds=settings()['sim_lease_max_seconds']): fail('INVALID_LEASE',422)
        state=body.model_dump(mode='json')|{'environment':'SIM','session_hash':digest(body.model_dump(mode='json'))}
        value=mutate(c,'device_state',{'drone_id':d['drone_id'],'control_epoch':int(body.control_epoch),'gateway_state':state})
        event(c,'DEVICE_CONNECTED',drone_id=d['drone_id'],payload={'session_id':str(body.session_id),'epoch':body.control_epoch})
        return output(value)

def current_session(d, sid):
    if d['gateway_state'].get('session_id')!=str(sid): fail('OLD_DEVICE_SESSION')

@router.post('/device/v1/telemetry',response_model=out.Stored)
def telemetry(body:dto.Telemetry,request:Request):
    with transaction(events=True) as c:
        p,d=device(request,c,body.drone_id);current_session(d,body.producer_session_id)
        if body.mission_id and mission(c,body.mission_id)['drone_id']!=d['drone_id']: fail('FORBIDDEN',403)
        if body.source_time_utc>now()+timedelta(seconds=5): fail('CLOCK_INVALID',422)
        value={'sample_id':str(body.sample_id),'mission_id':str(body.mission_id) if body.mission_id else None,
          'drone_id':d['drone_id'],'producer_id':p['id'],'producer_session_id':str(body.producer_session_id),
          'sample_kind':'SIM_STATE','sequence':int(body.sequence),'clock_domain':'SIM_UTC','source_time_utc':body.source_time_utc,
          'time_evidence':{'environment':'SIM','input_hash':digest(body.model_dump(mode='json'))},
          'pose':{'longitude':body.longitude,'latitude':body.latitude},'flight_state':body.flight_state,'validity':{'environment':'SIM'}}
        old=one(c,'SELECT * FROM drone.telemetry_sample WHERE sample_id=%s',(body.sample_id,))
        if old:
            if old['time_evidence']['input_hash']!=value['time_evidence']['input_hash']: fail('ID_CONFLICT')
            return {'stored':True,'duplicate':True,'sample_id':str(body.sample_id)}
        add(c,'telemetry_sample',value)
        event(c,'TELEMETRY_RECEIVED',body.mission_id,d['drone_id'],payload={'sample_id':str(body.sample_id)})
        return {'stored':True,'duplicate':False,'sample_id':str(body.sample_id)}

def command_guard(c,d,m,actor=None):
    if m['test_conditions'].get('environment')!='SIM': fail('REAL_FLIGHT_DISABLED',503)
    if m['grant_status']!='GRANTED' or not m['active_revision']: fail('MISSION_NOT_APPROVED')
    s=d['gateway_state']
    if s.get('rc_taken',True) or s.get('environment')!='SIM': fail('RC_OR_DEVICE_NOT_READY')
    if not s.get('lease_expires_at') or datetime.fromisoformat(s['lease_expires_at'].replace('Z','+00:00'))<=now(): fail('LEASE_EXPIRED')
    sample=one(c,'SELECT source_time_utc FROM drone.telemetry_sample WHERE drone_id=%s AND producer_session_id=%s ORDER BY source_time_utc DESC LIMIT 1',
               (d['drone_id'],s['session_id']))
    if not sample or (now()-sample['source_time_utc']).total_seconds()>settings()['sim_freshness_seconds']: fail('STALE_TELEMETRY')
    if actor and (d['control_session_id']!=actor['session_id'] or d['control_expires_at']<=now()): fail('CONTROL_REQUIRED')

def dispatch_guard(c,d,row):
    command_guard(c,d,mission(c,row['mission_id']))
    active=one(c,'SELECT s.*,u.status,u.permissions FROM drone.user_session s JOIN drone.user_account u USING(user_id) WHERE session_id=%s',(row['requester']['session_id'],))
    if not active or active['revoked_at'] or active['status']!='ACTIVE' or active['expires_at']<=now(): fail('SESSION_EXPIRED',401)
    authorize(active,d['drone_id'],'control')
    if (row['requester'].get('control_revision')!=str(d['control_revision'])
        or row['requester'].get('user_id')!=str(active['user_id'])
        or d['control_session_id']!=active['session_id'] or not d['control_expires_at'] or d['control_expires_at']<=now()): fail('CONTROL_REQUIRED')
    if (mission(c,row['mission_id'])['active_revision']!=row['mission_revision']
        or row['payload']['gateway_session_id']!=d['gateway_state']['session_id']): fail('REVISION_CONFLICT')
    if row['expires_at']<=now() or (row['execution_deadline'] and row['execution_deadline']<=now()): fail('COMMAND_EXPIRED')

@router.post('/api/v1/drones/{did}/commands',status_code=202,response_model=out.FlightCommand)
def issue(did:str,body:dto.Command,request:Request):
    from .core import user,authorize
    with transaction(events=True) as c:
        u=user(request,c,'control');authorize(u,did)
        d=locked_row(c,'drone',did)
        if not d: fail('RESOURCE_NOT_FOUND',404)
        m=mission(c,body.mission_id,True)
        if m['drone_id']!=did: fail('RESOURCE_NOT_FOUND',404)
        meaning=digest(body.model_dump(mode='json')|{'user_id':str(u['user_id'])})
        previous=one(c,'SELECT * FROM drone.flight_command WHERE command_id=%s',(body.command_id,))
        if previous:
            if previous['requester'].get('client_hash')!=meaning or previous['drone_id']!=did: fail('ID_CONFLICT')
            return output(previous)
        if d['control_revision']!=int(body.expected_control_revision): fail('REVISION_CONFLICT')
        if m['active_revision']!=body.mission_revision: fail('REVISION_CONFLICT')
        command_guard(c,d,m,u)
        r=one(c,'SELECT * FROM drone.mission_revision WHERE mission_id=%s AND revision=%s',(body.mission_id,body.mission_revision))
        issued=now();s=d['gateway_state']
        seq=one(c,'SELECT coalesce(max(sequence),0)+1 AS n FROM drone.flight_command WHERE drone_id=%s AND control_epoch=%s',(did,d['control_epoch']))['n']
        value={'command_id':str(body.command_id),'mission_id':str(body.mission_id),'mission_revision':body.mission_revision,
           'drone_id':did,'control_epoch':d['control_epoch'],'sequence':seq,'issued_at':issued,
           'expires_at':issued+timedelta(seconds=settings()['sim_command_ttl_seconds']),
           'execution_deadline':issued+timedelta(seconds=settings()['sim_execution_seconds']),
           'schema_version':'1.3','policy_version':'SIM_ONLY_V1','coordinate_config_id':str(r['coordinate_config_id']),
           'requester':{'user_id':str(u['user_id']),'session_id':str(u['session_id']),'client_hash':meaning,'control_revision':str(d['control_revision']),'environment':'SIM'},
           'action':body.action,'payload':body.payload|{'gateway_session_id':s['session_id'],'lease_id':s['lease_id']},
           'state':'REQUESTED','completion_policy':{'environment':'SIM','evidence':'sim_completed=true'}}
        value['request_hash']=digest(value)
        result=add(c,'flight_command',value)
        event(c,'COMMAND_REQUESTED',body.mission_id,did,u['user_id'],{'command_id':str(body.command_id),'request_hash':value['request_hash']})
        return output(result)

@router.get('/api/v1/commands/{cid}',response_model=out.FlightCommand)
def get_command(cid:UUID,request:Request):
    with transaction() as c:
        row=one(c,'SELECT * FROM drone.flight_command WHERE command_id=%s',(cid,))
        if not row: fail('RESOURCE_NOT_FOUND',404)
        owned_mission(request,c,row['mission_id'])
        return output(row)

@router.get('/device/v1/commands',response_model=list[out.FlightCommand])
def pending(request:Request):
    with transaction(events=True) as c:
        p,d=device(request,c)
        rows=c.execute("SELECT * FROM drone.flight_command WHERE drone_id=%s AND control_epoch=%s AND expires_at>now() AND (execution_deadline IS NULL OR execution_deadline>now()) AND state='REQUESTED' AND requester->>'control_revision'=%s ORDER BY sequence LIMIT 20",(d['drone_id'],d['control_epoch'],str(d['control_revision']))).fetchall()
        result=[]
        for row in rows:
            try:
                dispatch_guard(c,d,row)
                result.append(output(row))
            except HTTPException: continue
        return result

@router.post('/device/v1/commands/{cid}/reports',response_model=out.FlightCommand)
@router.post('/device/v1/commands/{cid}/evidence',response_model=out.RecordedEvidence)
def report(cid:UUID,body:dto.CommandReport,request:Request):
    with transaction(events=True) as c:
        p,d=device(request,c)
        row=locked_row(c,'flight_command',cid)
        if not row or row['drone_id']!=d['drone_id']: fail('RESOURCE_NOT_FOUND',404)
        if row['request_hash']!=body.request_hash: fail('ID_CONFLICT')
        if row['control_epoch']!=int(body.control_epoch): fail('OLD_CONTROL_EPOCH')
        if row['payload']['gateway_session_id']!=str(body.gateway_session_id): fail('OLD_DEVICE_SESSION')
        data=body.model_dump(mode='json')
        if request.url.path.endswith('/evidence'):
            previous=one(c,"SELECT payload FROM drone.mission_event WHERE event_type='COMMAND_EVIDENCE_RECORDED' AND payload->>'command_id'=%s AND payload->>'status_revision'=%s",(str(cid),str(body.status_revision)))
            if previous and previous['payload']['report']!=data:fail('ID_CONFLICT')
            if body.evidence_at>now()+timedelta(seconds=5):fail('CLOCK_INVALID',422)
            if not previous:event(c,'COMMAND_EVIDENCE_RECORDED',row['mission_id'],d['drone_id'],payload={'command_id':str(cid),'status_revision':body.status_revision,'report':data,'reconciled':False})
            return {'recorded':True,'duplicate':bool(previous),'command_id':str(cid),'reconciled':False}
        old=one(c,"SELECT payload FROM drone.mission_event WHERE event_type='COMMAND_REPORTED' AND payload->>'command_id'=%s AND payload->>'status_revision'=%s",(str(cid),str(body.status_revision)))
        if old:
            if old['payload']['report']!=data: fail('ID_CONFLICT')
            return output(row)
        if body.status_revision<=row['status_revision']: fail('OLD_STATUS_REVISION')
        allowed={'REQUESTED':{'ACCEPTED','REJECTED','UNCONFIRMED'},'ACCEPTED':{'EXECUTING','FAILED','UNCONFIRMED'},'EXECUTING':{'COMPLETED','FAILED','UNCONFIRMED'}}
        if body.state not in allowed.get(row['state'],set()): fail('INVALID_TRANSITION')
        if body.state in ('ACCEPTED','EXECUTING'):
            current_session(d,body.gateway_session_id)
            if d['control_epoch']!=int(body.control_epoch):fail('OLD_CONTROL_EPOCH')
            dispatch_guard(c,d,row)
        if body.state=='COMPLETED' and body.evidence.get('sim_completed') is not True: fail('COMPLETION_EVIDENCE_REQUIRED',422)
        if body.evidence_at>now()+timedelta(seconds=5): fail('CLOCK_INVALID',422)
        value=mutate(c,'command_report',{'command_id':str(cid),'state':body.state,'status_revision':body.status_revision,'evidence_at':body.evidence_at})
        event(c,'COMMAND_REPORTED',row['mission_id'],d['drone_id'],payload={'command_id':str(cid),'status_revision':body.status_revision,'report':data})
        return output(value)

@router.post('/device/v1/safety-reports',response_model=out.MissionEvent)
def safety(body:dto.Safety,request:Request):
    with transaction(events=True) as c:
        p,d=device(request,c);current_session(d,body.gateway_session_id)
        if d['control_epoch']!=int(body.control_epoch): fail('OLD_CONTROL_EPOCH')
        if body.kind in ('RC_TAKEOVER','VIDEO_LOST','WAN_LOST'):
            state=d['gateway_state']|{'rc_taken':True,'blocked_reason':body.kind}
            mutate(c,'device_state',{'drone_id':d['drone_id'],'control_epoch':d['control_epoch'],'gateway_state':state})
        # RECOVERED is evidence only: neither grants nor RC block are silently cleared.
        return event(c,'SAFETY_REPORTED',drone_id=d['drone_id'],payload=body.model_dump(mode='json'),eid=body.event_id)
