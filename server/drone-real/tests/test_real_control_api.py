from contextlib import contextmanager
from datetime import datetime,timezone
from pathlib import Path
import sys
from uuid import uuid4
import pytest
from fastapi import FastAPI,HTTPException
from fastapi.testclient import TestClient

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from drone_backend import real_control as api
from drone_backend.real_control_store import Store,CHECKS

@pytest.fixture
def client(tmp_path,monkeypatch):
    store=Store(tmp_path/'queue.db')
    actor={'user_id':str(uuid4()),'session_id':str(uuid4()),'permissions':[{'drone_id':'real-1','scopes':['read','edit','control']}]}
    drone={'drone_id':'real-1','gateway_state':{'environment':'REAL','session_id':str(uuid4())}}
    @contextmanager
    def transaction(**kw):yield object()
    def user(request,c,scope='read'):
        if request.headers.get('cookie')!='operator=valid':raise HTTPException(401,'SESSION_EXPIRED')
        return dict(actor,required_scope=scope)
    monkeypatch.setattr(api,'store',lambda:store)
    monkeypatch.setattr(api,'transaction',transaction)
    monkeypatch.setattr(api,'user',user)
    monkeypatch.setattr(api,'one',lambda c,sql,args=():{'permissions':actor['permissions']} if 'user_session' in sql else drone)
    monkeypatch.setattr(api,'device',lambda request,c:({},drone))
    app=FastAPI();app.include_router(api.router)
    return TestClient(app),store,actor,drone

def test_anonymous_operator_denied(client):
    http,_,_,_=client
    assert http.get('/api/v1/drones/real-1/control').status_code==401

def test_other_drone_scope_denied(client):
    http,_,_,_=client
    assert http.get('/api/v1/drones/sim-1/control',headers={'Cookie':'operator=valid'}).status_code==404

def test_offline_arm_rejected_not_success(client):
    http,store,actor,_=client;headers={'Cookie':'operator=valid'}
    assert http.post('/api/v1/drones/real-1/control/acquire',headers=headers).status_code==200
    r=http.post('/api/v1/drones/real-1/commands',headers=headers,json={'command_id':str(uuid4()),'action':'ARM','confirmed':True})
    assert r.status_code==409 and r.json()['detail']=='FC_DISCONNECTED_OR_STALE'

def test_valid_ground_command_and_device_poll_contract(client):
    http,store,actor,drone=client;headers={'Cookie':'operator=valid'};sid=drone['gateway_state']['session_id']
    store.heartbeat('real-1',sid,{'connected':True,'armed':False,'landed':True,'mode':5})
    http.post('/api/v1/drones/real-1/control/acquire',headers=headers)
    r=http.post('/api/v1/drones/real-1/commands',headers=headers,json={'command_id':str(uuid4()),'action':'MODE','mode':5,'confirmed':True})
    assert r.status_code==202,r.text
    paused=http.post('/device/v1/control/poll',json={'producer_session_id':sid,'accept_job':False})
    assert paused.status_code==200 and paused.json()['job'] is None
    polled=http.post('/device/v1/control/poll',json={'producer_session_id':sid,'accept_job':True})
    assert polled.status_code==200 and polled.json()['job']['action']=='MODE'

def test_stale_device_timestamp_rejected(client):
    http,_,_,drone=client
    r=http.post('/device/v1/control/heartbeat',json={'producer_session_id':drone['gateway_state']['session_id'],
        'observed_at':'2000-01-01T00:00:00Z','status':dict(connected=True,armed=False,landed=True,mode=5,gps_ok=True,battery_ok=True,failsafe_ok=True,rc_override=False)})
    assert r.status_code==422 and r.json()['detail']=='STATE_TIMESTAMP_OUT_OF_WINDOW'

def test_empty_command_cannot_arm(client):
    http,_,_,_=client
    assert http.post('/api/v1/drones/real-1/commands',json={},headers={'Cookie':'operator=valid'}).status_code==422

def test_complete_upload_preflight_start_flow(client,monkeypatch):
    http,store,actor,drone=client;sid=drone['gateway_state']['session_id'];headers={'Cookie':'operator=valid'}
    store.heartbeat('real-1',sid,dict(connected=True,armed=False,landed=True,mode=5,gps_ok=True,battery_ok=True,failsafe_ok=True,rc_override=False,position={'lat':36,'lon':128}))
    store.acquire('real-1',*api.identity(actor));mid,pid,upload_id=uuid4(),uuid4(),str(uuid4())
    row={'content_hash':'abc','mission_id':str(mid),'items':[],'plan':{'plan_id':str(pid),'takeoff':{'lat':36,'lon':128}},'estimated_seconds':60}
    mission={'drone_id':'real-1'}
    monkeypatch.setattr(api,'owned_mission',lambda *a:(actor,mission))
    monkeypatch.setattr(api,'load_plan',lambda *a:row)
    assert http.post(f'/api/v1/missions/{mid}/execution-plans/{pid}/upload',headers=headers,json={'command_id':upload_id}).status_code==202
    store.poll('real-1',sid)
    assert http.post(f'/device/v1/control/commands/{upload_id}/reports',json={'producer_session_id':sid,'revision':1,'state':'SUCCEEDED','evidence':{'readback_verified':True,'plan_hash':'abc'}}).status_code==200
    assert http.post(f'/api/v1/missions/{mid}/execution-plans/{pid}/preflight',headers=headers,json={'confirmations':{k:True for k in CHECKS}}).status_code==200
    assert api.readiness_for(actor,mission,row)['can_dispatch']
    result=api.submit_plan(actor,mission,row,uuid4())
    assert result['state']=='QUEUED' and result['action']=='START'
