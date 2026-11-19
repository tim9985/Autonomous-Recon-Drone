from concurrent.futures import Future
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'gateway'))
from real_agent import Authority,complete_operation,Journal
from mavlink_executor import Fault

def test_unknown_start_ack_never_resumes_heartbeat_on_poll_reconnect():
    authority=Authority(clock=lambda:1000,wallclock=lambda:2000)
    reply={'lease_expires_at':2008,'lease_id':'a','lease_owner_session_id':'s','cancel_active':False}
    job={'command_id':'j','action':'START','lease_id':'a','owner_session_id':'s'}
    authority.update(reply);authority.begin(job)
    assert authority.authorized()
    f=Future();f.set_exception(Fault('FC_RESPONSE_TIMEOUT'))
    state,evidence=complete_operation(job,f,authority)
    assert state=='UNKNOWN' and not authority.authorized()
    authority.update(reply)
    assert not authority.authorized()
    authority.begin(dict(job,command_id='explicit-new-land',action='LAND'))
    assert authority.authorized()

def test_new_browser_lease_cannot_authorize_old_operation():
    a=Authority(clock=lambda:1000,wallclock=lambda:2000)
    a.update({'lease_expires_at':2008,'lease_id':'old','lease_owner_session_id':'s1','cancel_active':False})
    a.begin({'lease_id':'old','owner_session_id':'s1'})
    a.update({'lease_expires_at':2008,'lease_id':'new','lease_owner_session_id':'s2','cancel_active':False})
    assert not a.authorized()

def test_durable_claim_and_ordered_reports_survive_restart(tmp_path):
    path=tmp_path/'journal.db';j=Journal(path)
    job={'command_id':'j','action':'START','payload':{}}
    assert j.claim(job,'g')
    j.result('j','RUNNING',{'started':True});j.result('j','LANDED',{'landed':True})
    rows=j.pending('g')
    assert [x[1] for x in rows]==['RUNNING','LANDED']
    j.sent('j',1)
    assert [x[3] for x in j.pending('g')]==[2]
    restarted=Journal(path)
    assert not restarted.claim(job,'g')
