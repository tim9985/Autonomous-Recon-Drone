"""Authenticated public HTTPS checks. Credentials come only from stdin, never a file."""
import argparse
import http.cookiejar
import json
from pathlib import Path
import ssl
import sys
import time
import urllib.request
import urllib.error
from uuid import uuid4

ROOT=Path('/home/se/sandboxes/drone-dev')
BASE='https://127.0.0.1:18443'


def main():
    p=argparse.ArgumentParser();p.add_argument('--mode',choices=['probe','plan'],required=True)
    p.add_argument('--region',choices=['living','academic','support'],default='living');a=p.parse_args()
    zone=dict(living='zone-106c8e3a7e32',academic='zone-0bb1b42ef9e7',support='zone-633e575ab1ca-c-89106-799958')[a.region]
    identity=json.loads(sys.stdin.read())
    jar=http.cookiejar.CookieJar()
    client=urllib.request.build_opener(urllib.request.HTTPSHandler(context=ssl.create_default_context(cafile=str(ROOT/'certs/ca.crt'))),urllib.request.HTTPCookieProcessor(jar))
    csrf=''; report={'mode':a.mode,'region':a.region,'checks':[], 'simulationStarted':False}
    def call(method,path,data=None,expected=200,csrf_enabled=True):
        headers={'Origin':BASE,'Content-Type':'application/json'}
        if csrf and csrf_enabled:headers['X-CSRF-Token']=csrf
        req=urllib.request.Request(BASE+path,data=json.dumps(data).encode() if data is not None else None,headers=headers,method=method)
        try:
            with client.open(req,timeout=70) as r:status=r.status;body=r.read()
        except urllib.error.HTTPError as e:status=e.code;body=e.read()
        if status!=expected:
            raise RuntimeError(f'{method} {path}: expected {expected}, received {status}: '+body.decode(errors='replace')[:250])
        return json.loads(body) if body else None
    signed=False
    try:
        call('GET','/api/v1/missions',expected=401);report['checks'].append('anonymous_rejected')
        login=call('POST','/api/v1/auth/login',identity);csrf=login['csrf_token'];signed=True;identity.clear()
        report['checks'].append('test_login_pass')
        report['simLink']=call('GET','/api/v1/drones/sim-pi-01/sim-link')
        report['workers']=call('GET','/api/v1/simulations/workers')
        runs=call('GET','/api/v1/simulations/runs?limit=5')
        report['recentRuns']=[{k:r.get(k) for k in ('run_id','worker_id','state','requested_at','ended_at','error')} for r in runs]
        if a.mode=='probe':
            rid=str(uuid4())
            call('POST','/api/v1/simulations/runs',dict(run_id=rid,scenario='CAPTURE',world='Kumoh',
                 simulator_version='NET_SITL/UE5.5.4/Cosys5.5-v3.3',duration_s=1,worker_id='sim-worker-01',ttl_s=60),201)
            until=time.monotonic()+15
            while time.monotonic()<until:
                run=call('GET','/api/v1/simulations/runs/'+rid)
                if run['state'] in ('COMPLETED','FAILED','CANCELLED'):break
                time.sleep(1)
            report['captureProbe']={k:run.get(k) for k in ('run_id','state','claimed_at','ended_at','sample_counts')}
            if run['state'] not in ('COMPLETED','FAILED','CANCELLED'):
                stopped=call('POST',f'/api/v1/simulations/runs/{rid}/stop',dict(command_id=str(uuid4())),202)
                report['stopCommandState']=stopped.get('state')
                report['captureFinalState']=call('GET','/api/v1/simulations/runs/'+rid)['state']
            report['captureProbe']['note']='CAPTURE only, no route or takeoff request; timeout does not identify the client fault.'
        if a.mode=='plan':
            mid=str(uuid4());report['missionId']=mid
            call('POST','/api/v1/missions',dict(mission_id=mid,drone_id='sim-pi-01',environment='SIM'),201)
            draft=dict(request_id=str(uuid4()),expected_draft_revision=0,release_id='campus-04e1b46514574d45',
                selected_zone_ids=[zone],name='지역수색 서버 통합 검증 20261022 '+a.region,mission_type='AREA_RECON',
                conditions=dict(altitude_m=15,speed_mps=3,observation_seconds=3,return_reserve_percent=20,priority_mode='UNIFORM'))
            call('POST',f'/api/v1/missions/{mid}/map-drafts',draft,201)
            regions=call('GET',f'/api/v1/missions/{mid}/regions');assert len(regions)==1
            body=dict(job_id=str(uuid4()),mission_revision=1,region_id=regions[0]['region_id'])
            path=f'/api/v1/missions/{mid}/regional-search'
            denied=call('POST',path,body,409);assert denied['error']['code']=='REGIONAL_SEARCH_CONDITIONS_MISMATCH'
            report['checks'].append('legacy_altitude_mismatch_rejected')
            draft.update(request_id=str(uuid4()),expected_draft_revision=1)
            draft['conditions']['altitude_m']=30
            call('POST',f'/api/v1/missions/{mid}/map-drafts',draft,201)
            regions=[r for r in call('GET',f'/api/v1/missions/{mid}/regions') if r['mission_revision']==2]
            assert len(regions)==1
            body.update(mission_revision=2,region_id=regions[0]['region_id'])
            start=time.monotonic()
            call('POST',path,body,403,False);report['checks'].append('csrf_rejected')
            queued=call('POST',path,body,202);report['jobId']=body['job_id']
            assert call('POST',path,body,202)['job_id']==queued['job_id'];report['checks'].append('duplicate_same_job')
            call('POST',path,body|dict(entry_yaw_deg=30),409);report['checks'].append('conflicting_retry_rejected')
            while time.monotonic()-start<180:
                job=call('GET',path+'/'+body['job_id'])
                if job['state'] not in ('QUEUED','RUNNING'):break
                time.sleep(2)
            report['jobState']=job['state'];report['elapsedSeconds']=time.monotonic()-start
            report['planId']=job.get('plan_id')
            result=job.get('result') or {}
            report['result']={k:result.get(k) for k in ('packageId','state','preparationSeconds','targetAreaM2','worldVersion','gridVersion','buildingActivityVersion','actualEvidenceWrites','predictedOnly')}
            report['forecast']={k:result.get('plan',{}).get(k) for k in ('predictedPercent','predictedFirstTargetSeconds','status')}
            plans=call('GET',f'/api/v1/missions/{mid}/plans');assert len(plans)==1
            assert call('GET',path+'/'+body['job_id'])['plan_id']==job['plan_id'];report['checks'].append('single_registered_plan')
            report['readiness']=call('GET',path+'/'+body['job_id']+'/readiness')
            output=ROOT/f'regional-stage-20261022/https-{a.region}-job.json';output.write_text(json.dumps(job,ensure_ascii=False),encoding='utf-8')
            assert job['state']=='READY',job['state']
            assert result.get('actualEvidenceWrites')==0 and result.get('predictedOnly') is True
        report['status']='PASS'
    except Exception as e:
        report['status']='FAIL';report['error']=type(e).__name__+': '+str(e)
    finally:
        identity.clear()
        if signed:
            try:call('POST','/api/v1/auth/logout',{});report['logout']=True
            except Exception:report['logout']=False
        output=ROOT/f'regional-stage-20261022/https-{a.mode if a.mode=="probe" else a.region}.json'
        output.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
        print(json.dumps(report,ensure_ascii=True),flush=True)


if __name__=='__main__':main()
