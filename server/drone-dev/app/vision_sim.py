"""SIM detector using the existing leased analysis API, with durable completion retry.

v1.2 (비전 · 10-14): worker 가 주어지면 같은 IngestWorker.observe 로 임무마다 후보 · 추적 · 색 · 상태를 이어 간다
  · candidate_id = 임무 안에서 같은 사람이면 같은 id (v1.1 은 프레임마다 새 id)
  · geo_result: 기본은 v1.1 그대로 (PENDING · 사유) · VISION_GEO_CLAIMS=1 이면 pose 로 계산한 주장 (공식 승격은 백엔드)
  · SIM_RICH_FIELDS=1 이면 appearance · state · track_id 도 보냄 — **백엔드 SIM Observation 계약에 칸이 생긴 뒤에만** (지금은 extra=forbid)
"""
import hashlib
import base64
import json
import os
import struct
from uuid import UUID,uuid5
import cv2
import numpy as np

def save(path,value):
    tmp=path.with_suffix('.tmp')
    with tmp.open('w') as f:json.dump(value,f);f.flush();os.fsync(f.fileno())
    os.replace(tmp,path)
    if hasattr(os,'O_DIRECTORY'):
        directory=os.open(path.parent,os.O_RDONLY|os.O_DIRECTORY)
        try:os.fsync(directory)
        finally:os.close(directory)

def observations(job,frame,data,detector,worker=None):
    image=cv2.imdecode(np.frombuffer(data,np.uint8),cv2.IMREAD_COLOR)
    if image is None or (image.shape[1],image.shape[0])!=(frame['width'],frame['height']):raise ValueError('Frame decode/size mismatch')
    if worker is not None:return rich_observations(job,frame,image,worker)
    boxes,scores,_=detector.detect(image)
    result=[];ns=UUID(job['analysis_run_id'])
    for i in np.argsort(-scores)[:128]:
        x1,y1,x2,y2=map(float,boxes[i]);w,h=frame['width'],frame['height']
        x1,y1=max(0,x1),max(0,y1);x2,y2=min(w,x2),min(h,y2)
        if x1>=x2 or y1>=y2:continue
        index=len(result)
        result.append({'observation_id':str(uuid5(ns,'observation/'+str(index))),
            'candidate_id':str(uuid5(ns,'candidate/'+str(index))),'detection_index':index,
            'bbox':{'convention':'PIXEL_XYXY','source_width':w,'source_height':h,'x1':x1,'y1':y1,'x2':x2,'y2':y2},
            'confidence':float(scores[i]),'geo_result':{'status':'PENDING','reason':'SIM_PHYSICAL_VALIDATION_REQUIRED' if frame.get('pose') else 'POSE_MISSING'}})
    return result

def rich_observations(job,frame,image,worker):
    from app.school_vision_context import geometry
    with geometry(worker,job):return _rich_observations(job,frame,image,worker)

def _rich_observations(job,frame,image,worker):
    """v1.2 — 임무 단위 기억 (후보 · 추적 · 색 · 상태) · SIM 계약 칸에 맞춰 줄인다"""
    from datetime import datetime
    import time as _t
    coordinate = postflight_coordinate(worker, job, frame) if os.environ.get('SCHOOL_LOCAL_POSTFLIGHT_GPU') == '1' or os.environ.get('SCHOOL_LOCAL_REALTIME_GPU') == '1' or str(job.get('coordinate_config_id')) == os.environ.get('SCHOOL_COORDINATE_CONFIG_ID') else None
    t=worker.frame_time(frame)
    obs=worker.observe(str(frame.get('mission_id') or job.get('mission_id') or 'sim'),image,t,frame.get('pose'),query=worker.query_for(frame),upload_crops=False)
    ns=UUID(job['analysis_run_id']);w,h=frame['width'],frame['height'];rich=os.environ.get('SIM_RICH_FIELDS','0')=='1'
    out=[]
    for o in obs:
        b=o['bbox'];g=o['geo']
        geo={'status':'PENDING','reason':'SIM_PHYSICAL_VALIDATION_REQUIRED' if frame.get('pose') else 'POSE_MISSING','worker_claim':g}
        if coordinate is not None:
            geo['sim_estimate'] = ({'status':'ESTIMATED','lat':g['lat'],'lon':g['lon'],
                'error_ellipse':g.get('error_ellipse'),'method':g.get('method'),
                'coordinate_config_id':str(job['coordinate_config_id']),
                'source_world_version':coordinate['source_world_version'],
                'validation':'SIM_GEOMETRY_ONLY','vertical_reference_verified':False}
                if g.get('status')=='VALID' and g.get('lat') is not None and g.get('lon') is not None else None)
        row={'observation_id':str(uuid5(ns,'observation/'+str(len(out)))),'candidate_id':o['candidate_id'],'detection_index':len(out),
             'bbox':{'convention':'PIXEL_XYXY','source_width':w,'source_height':h,'x1':b['x1'],'y1':b['y1'],'x2':b['x2'],'y2':b['y2']},
             'confidence':o['confidence'],'geo_result':geo}
        if rich:row.update(appearance=o['appearance'],state=o['state'],track_id=o['track_id'])
        out.append(row)
    return out

def postflight_coordinate(worker, job, frame):
    """Verify the registered coordinate contract before local GPU inference."""
    expected_mode = 'LIVE_DETECT' if os.environ.get('SCHOOL_REMOTE_SIM') == '1' or os.environ.get('SCHOOL_LOCAL_REALTIME_GPU') == '1' else 'HISTORICAL'
    if job.get('analysis_mode') != expected_mode or worker.pgeo.env != 'SIM':
        raise ValueError('GPU postflight worker only accepts SIM HISTORICAL analysis')
    cid = job.get('coordinate_config_id')
    if not cid:
        raise ValueError('Postflight coordinate configuration is required')
    cache = getattr(worker, '_postflight_coordinates', {})
    if str(cid) not in cache:
        response = worker.api.get('/internal/v1/vision/coordinate-configs/'+str(cid), headers=worker._h())
        response.raise_for_status()
        record = response.json()
        if str(record['config_id']) != str(cid) or record.get('status') != 'APPROVED':
            raise ValueError('Coordinate configuration identity or approval mismatch')
        cache[str(cid)] = record['payload']
        worker._postflight_coordinates = cache
    cfg = cache[str(cid)]
    camera, terrain = cfg['camera'], cfg['terrain']
    if cfg.get('environment') != 'SIM' or cfg.get('output_policy') != 'SIM_ESTIMATE_ONLY':
        raise ValueError('Coordinate output policy must remain SIM estimate only')
    if cfg.get('source_world_version') != os.environ.get('VISION_SOURCE_WORLD_VERSION'):
        raise ValueError('Coordinate source world mismatch')
    if (frame['width'], frame['height']) != (camera['width'], camera['height']):
        raise ValueError('Frame dimensions differ from registered camera')
    if abs(float(camera['hfov_deg'])-float(worker.pgeo.cam.hfov_deg)) > 1e-8:
        raise ValueError('Camera field of view mismatch')
    dem = worker.pgeo.dem
    if dem is None or getattr(dem, 'sha256', None) != terrain['sha256'] or getattr(dem, 'crs', None) != terrain['crs']:
        raise ValueError('Coordinate DEM artifact mismatch')
    if terrain.get('vertical_reference_verified') is not False or not worker.geo_claims:
        raise ValueError('Postflight requires unverified SIM estimate output')
    pose = frame.get('pose')
    if pose and (pose.get('clock_domain') != 'SIM' or pose.get('geographic_source') != camera['pose_source']):
        raise ValueError('Postflight camera pose must come from the same simulator image')
    return cfg


def poll_once(api,token,detector,active,root,stats=None,worker=None):
    headers={'Authorization':'Bearer '+token()};pending=root/'sim-completion.json'
    if pending.exists():
        value=json.loads(pending.read_text())
        r=api.post('/internal/v1/analysis-runs/'+value['rid']+'/completion',json=value['body'],headers=headers)
        if r.status_code==409:
            os.replace(pending,root/('sim-expired-'+value['body']['claim_id']+'.json'))
        else:
            r.raise_for_status();pending.unlink()
            if stats is not None:
                stats['frames']+=1;stats['observations']+=len(value['body']['observations'])
        return 1
    data=api.post('/internal/v1/analysis-runs/next-input',params={'model_config_id':active['model_config_id']},headers=headers)
    data.raise_for_status()
    encoded=data.headers.get('X-Analysis-Metadata')
    if not encoded:
        if data.json()=={'job':None}:return 0
        raise ValueError('Missing analysis input metadata')
    metadata=json.loads(base64.b64decode(encoded,validate=True));job=metadata['job'];frame=metadata['frame']
    rid=job['analysis_run_id'];base='/internal/v1/analysis-runs/'+rid
    try:
        if hashlib.sha256(data.content).hexdigest()!=job['input_hash'] or data.headers.get('X-Content-SHA256')!=job['input_hash']:raise ValueError('Input hash mismatch')
        body={'claim_id':job['claim_id'],'attempt_no':job['attempt_no'],'observations':observations(job,frame,data.content,detector,worker)}
        save(pending,{'rid':rid,'body':body})
    except Exception:
        api.post(base+'/attempt-failures',headers=headers,json={'claim_id':job['claim_id'],'attempt_no':job['attempt_no'],'reason':'INFERENCE_OR_INPUT_FAILED'}).raise_for_status()
        raise
    return 1

def poll_batch_once(api,token,detector,active,root,stats=None,worker=None):
    if (root/'sim-completion.json').exists():return poll_once(api,token,detector,active,root,stats,worker)
    headers={'Authorization':'Bearer '+token()};pending=root/'sim-completions-batch.json';failed=root/'sim-failed-inputs.json'
    if pending.exists():
        value=json.loads(pending.read_text())
        response=api.post('/internal/v1/analysis-runs/completion-batch',json=value,headers=headers)
        if response.status_code in (409,404,413,422):
            previous=json.loads(failed.read_text())['failures'] if failed.exists() else []
            save(failed,{'failures':previous+[{'analysis_run_id':r['analysis_run_id'],'body':{k:r['result'][k] for k in ('claim_id','attempt_no')}|{'reason':'COMPLETION_REJECTED'}} for r in value['results']]})
            os.replace(pending,root/('sim-rejected-batch-'+value['results'][0]['result']['claim_id']+'.json'))
        else:
            response.raise_for_status()
            if response.json()!={'completed':[r['analysis_run_id'] for r in value['results']]}:raise ValueError('Completion batch acknowledgement mismatch')
            pending.unlink()
            if stats is not None:
                stats['frames']+=len(value['results']);stats['observations']+=sum(len(r['result']['observations']) for r in value['results'])
        return 1
    if failed.exists():
        value=json.loads(failed.read_text())
        for item in value['failures']:
            response=api.post('/internal/v1/analysis-runs/'+item['analysis_run_id']+'/attempt-failures',json=item['body'],headers=headers)
            if response.status_code not in (404,409):response.raise_for_status()
        failed.unlink()
        if stats is not None:stats['dropped']=stats.get('dropped',0)+len(value['failures'])
        return 1
    response=api.post('/internal/v1/analysis-runs/next-input-batch',params={'model_config_id':active['model_config_id']},headers=headers)
    response.raise_for_status()
    if response.headers.get('content-type','').startswith('application/json'):
        if response.json()=={'jobs':[]}:return 0
        raise ValueError('Invalid analysis batch response')
    raw=response.content
    if len(raw)<4 or len(raw)>41943040+65540:raise ValueError('Invalid analysis batch size')
    length=struct.unpack('!I',raw[:4])[0]
    if length>65536 or length+4>len(raw):raise ValueError('Invalid analysis metadata size')
    entries=json.loads(raw[4:4+length]);offset=4+length;results=[];failures=[];inputs=[]
    if not isinstance(entries,list) or not 1<=len(entries)<=5:raise ValueError('Invalid analysis batch count')
    try:
        for entry in entries:
            job=entry['job'];frame=entry['frame'];size=entry['byte_size']
            if type(size) is not int or not 0<size<=8388608:raise ValueError('Input size mismatch')
            data=raw[offset:offset+size];offset+=size
            if len(data)!=size or hashlib.sha256(data).hexdigest()!=job['input_hash']:raise ValueError('Input hash/size mismatch')
            inputs.append((job,frame,data))
        if offset!=len(raw):raise ValueError('Trailing analysis bytes')
    except ValueError:
        save(failed,{'failures':[{'analysis_run_id':e['job']['analysis_run_id'],'body':{'claim_id':e['job']['claim_id'],'attempt_no':e['job']['attempt_no'],'reason':'INPUT_INVALID'}} for e in entries]})
        raise
    for job,frame,data in inputs:
        try:found=observations(job,frame,data,detector,worker)
        except Exception:
            failures.append({'analysis_run_id':job['analysis_run_id'],'body':{'claim_id':job['claim_id'],'attempt_no':job['attempt_no'],'reason':'INFERENCE_OR_INPUT_FAILED'}})
            continue
        body={'claim_id':job['claim_id'],'attempt_no':job['attempt_no'],'observations':found}
        results.append({'analysis_run_id':job['analysis_run_id'],'result':body})
    if results:save(pending,{'results':results})
    if failures:save(failed,{'failures':failures})
    return 1
