"""Reconcile only proven ended local captures; never expire a live SIM by age."""
from datetime import datetime, timezone
import json
from uuid import UUID, uuid5, NAMESPACE_URL

VERSIONS={'global-continuous-v1':'LOCAL_CONTINUOUS_POSTFLIGHT_V1',
          'regional-current-input-v1':'LOCAL_REGIONAL_POSTFLIGHT_V1',
          'kumoh-local-square-8m-v1':'LOCAL_NET_SITL_POSTFLIGHT_V1'}
TERMINAL={'INTERRUPTED','FAILED','CANCELLED','EXPIRED'}


def read(path):
    try:return json.loads(path.read_text(encoding='utf-8'))
    except (OSError,ValueError):return {}


def evidence(run,request,state,report):
    """A terminal host record plus its closed-SIM receipt is required."""
    try:
        rid=str(UUID(str(run['run_id'])));jid=str(UUID(request['job_id']))
        finished=datetime.fromisoformat(report['finished_at'])
        if finished.tzinfo is None or not run['requested_at']<=finished<=datetime.now(timezone.utc):return None
        if (run['state']!='RUNNING' or not run.get('worker_session_id')
            or run['drone_id']!='sim-pi-01' or run['request'].get('environment')!='SIM'
            or run['world']!='Kumoh' or run['coordinate_frame']!='NED_M'
            or VERSIONS.get(request.get('route'))!=run['simulator_version']
            or str(run['creator_user_id'])!=request.get('requested_by')):return None
        if (request.get('run_id')!=rid or state.get('run_id')!=rid or state.get('job_id')!=jid
            or report.get('run_id')!=rid or state.get('state') not in TERMINAL
            or report.get('status') not in TERMINAL or report.get('simulator_ports_closed') is not True
            or report.get('school_server_contacted') is not False):return None
        if (not request.get('plan_hash') or report.get('plan_hash')!=request['plan_hash']
            or report.get('plan_id')!=request.get('plan_id')
            or state.get('plan_hash')!=request['plan_hash']):return None
        expected=str(uuid5(NAMESPACE_URL,'local-postflight-mission/'+rid))
        if report.get('mission_id')!=expected or run['request'].get('pipeline_config',{}).get('mission_id')!=expected:return None
        return dict(source='LOCAL_TERMINAL_SIM_RECOVERY',job_id=jid,run_id=rid,
            local_state=state['state'],local_error=report.get('error','LOCAL_EXECUTION_INTERRUPTED'),
            finished_at=report['finished_at'],simulator_ports_closed=True,
            landing_confirmed=report.get('landed_disarmed') is True,automatic_flight=False)
    except (KeyError,TypeError,ValueError):return None


def reconcile(c,control,runs,worker_id=None):
    from drone_backend.core import one,digest
    from .simulation_api import write
    active_sql="SELECT * FROM simulation.run WHERE state='RUNNING' OR (state='QUEUED' AND expires_at>now()) ORDER BY requested_at"
    active=c.execute(active_sql).fetchall();active=[r for r in active if worker_id is None or r['worker_id']==worker_id];recovered=[]
    ids={str(r['run_id']) for r in active}
    local={}
    for path in (control/'requests').glob('*.json') if ids else ():
        request=read(path)
        if request.get('run_id') in ids and path.stem==request.get('job_id'):local[request['run_id']]=request
    for old in active:
        rid=str(old['run_id']);request=local.get(rid)
        if not request:continue
        # Same per-run lock used by simulation.write: re-read after acquiring it,
        # and commit command reports and the failed run as one transaction.
        c.execute('SELECT pg_advisory_xact_lock(20261009,hashtext(%s))',(rid,))
        run=one(c,'SELECT * FROM simulation.run WHERE run_id=%s',(rid,))
        state=read(control/'states'/f"{request['job_id']}.json")
        report=read(runs/rid/'session.json');proof=evidence(run,request,state,report)
        if not proof:continue
        latest=one(c,'SELECT coalesce(max(sequence),-1) AS sequence,max(received_at) AS received_at FROM simulation.sample WHERE run_id=%s',(rid,))
        if latest['received_at'] and latest['received_at']>datetime.fromisoformat(proof['finished_at']):continue
        sequence=int(latest['sequence'])+1
        commands=c.execute("SELECT command_id FROM simulation.command WHERE run_id=%s AND state IN ('QUEUED','ACKNOWLEDGED') ORDER BY sequence",(rid,)).fetchall()
        packets=[('COMMAND_REPORT',str(v['command_id']),dict(command_id=str(v['command_id']),state='FAILED',evidence=proof)) for v in commands]
        packets.append(('RUN_STATUS','run',dict(state='FAILED',evidence=proof,realtime_vision_enabled=False)))
        for kind,key,data in packets:
            value=dict(run_id=rid,worker_id=run['worker_id'],producer_session_id=str(run['worker_session_id']),
                sample_id=str(uuid5(NAMESPACE_URL,f'local-interrupted-recovery/{rid}/{key}')),
                sequence=str(sequence),sim_time_ns=None,captured_at=proof['finished_at'],kind=kind,schema_version='1',data=data)
            write(c,'sample',value|dict(content_hash=digest(value)));sequence+=1
        recovered.append(dict(run_id=rid,job_id=request['job_id'],state='FAILED'))
    blockers=[{k:str(r[k]) for k in ('run_id','worker_id','state')} for r in c.execute(active_sql).fetchall() if worker_id is None or r['worker_id']==worker_id]
    return dict(recovered=recovered,blockers=blockers)
