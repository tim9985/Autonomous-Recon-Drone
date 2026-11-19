"""Contract, isolation, journal recovery and worker checks; no flight or real model loading."""
import asyncio
import hashlib
from contextlib import nullcontext
from datetime import datetime,timezone,timedelta
import json
from pathlib import Path
import sys
import tempfile
import types
import unittest
from unittest.mock import patch
from uuid import uuid4

BASE=Path('/work')
sys.path[:0]=[str(BASE),str(BASE/'backend'),str(BASE/'scripts')]
if sys.platform=='win32':
    f=types.ModuleType('fcntl');f.LOCK_EX=2;f.LOCK_NB=4;f.LOCK_UN=8
    f.flock=lambda *args:(_ for _ in ()).throw(AssertionError('Linux media lock outside unit scope'))
    sys.modules['fcntl']=f
# Map-service handlers are outside this contract/worker unit scope; deployment uses the real module.
from fastapi import APIRouter
school_backend=types.ModuleType('school.backend');school_backend.router=APIRouter();sys.modules['school.backend']=school_backend
from drone_backend import contracts as dto,real_contracts,real,vision_runtime
from app import simulation_api as sim
from app.body_limit import BodyLimit
from app.vision_core.ingest import Outbox,State,IngestWorker
from app.vision_sim import observations,poll_once,poll_batch_once
from app import vision_ingest
from app.vision_core.detector import PersonDetector
from simulation_vision import frame_pose,FrameUploader
from fastapi import HTTPException
from pydantic import ValidationError
import cv2
import numpy as np
import httpx

class PoseTests(unittest.TestCase):
    def setUp(self):
        self.frame=dict(frame_id=str(uuid4()),mission_id=str(uuid4()),input_asset_id=str(uuid4()),stream_id='test',stream_epoch=0,
            frame_seq='1',capture_at='2026-10-14T00:00:00Z',width=640,height=480,format='PNG')
        self.pose={'frame_id':self.frame['frame_id'],'capture_at':self.frame['capture_at'],'clock_domain':'SIM','source_timestamp_ns':'10000000',
            'body_timestamp_ns':'12000000','sync_error_ms':2,'camera_attitude':{'reference':'CAMERA_FRD_TO_NED','quaternion':{'w':1,'x':0,'y':0,'z':0}}}
    def test_missing_pose_preserved(self):self.assertIsNone(dto.Frame(**self.frame).pose)
    def test_sim_pose_roundtrip(self):self.assertEqual(dto.Frame(**(self.frame|{'pose':self.pose})).pose.sync_error_ms,2)
    def test_real_same_contract(self):self.assertIsNotNone(real_contracts.Frame(**(self.frame|{'pose':self.pose|{'clock_domain':'UTC'},'producer_session_id':uuid4(),'time_source':'SIDECAR','source':'REAL'})).pose)
    def test_real_rejects_sim_clock(self):
        with self.assertRaises(ValidationError):real_contracts.Frame(**(self.frame|{'pose':self.pose,'producer_session_id':uuid4(),'time_source':'SIDECAR','source':'REAL'}))
    def test_cross_frame_rejected(self):
        with self.assertRaises(ValidationError):dto.Frame(**(self.frame|{'pose':self.pose|{'frame_id':uuid4()}}))
    def test_cross_time_rejected(self):
        with self.assertRaises(ValidationError):dto.Frame(**(self.frame|{'pose':self.pose|{'capture_at':'2026-10-14T00:00:01Z'}}))
    def test_unknown_pose_rejected(self):
        with self.assertRaises(ValidationError):dto.Frame(**(self.frame|{'pose':{'lat':36}}))
    def test_wrong_sync_error_rejected(self):
        with self.assertRaises(ValidationError):dto.FramePose(**(self.pose|{'sync_error_ms':0}))
    def test_image_geography_uses_capture_time_not_later_body_time(self):
        pose=self.pose|{'schema_version':'frame-pose/1.0','body_timestamp_ns':'510000000','sync_error_ms':0,
            'geographic_source':'image_camera_position','geographic_timestamp_ns':self.pose['source_timestamp_ns'],
            'geographic':{'latitude':36,'longitude':128,'altitude_m':50,'altitude_datum':'MSL'},
            'camera_position_ned':{'north_m':0,'east_m':0,'down_m':-10}}
        self.assertEqual(dto.FramePose(**pose).sync_error_ms,0)
        for invalid in ({'clock_domain':'UTC'},{'geographic_timestamp_ns':'11000000'},
                        {'sync_error_ms':500},{'camera_attitude':None},{'geographic':None},
                        {'geographic_source':'state_gps_location'}):
            with self.assertRaises(ValidationError):dto.FramePose(**(pose|invalid))
    def test_non_unit_quaternion_rejected(self):
        with self.assertRaises(ValidationError):dto.Quaternion(w=0,x=0,y=0,z=0)
    def test_nan_rejected(self):
        with self.assertRaises(ValidationError):dto.Position(latitude=float('nan'),longitude=128,altitude_m=10,altitude_datum='MSL')
    def test_wrong_orientation_reference(self):
        with self.assertRaises(ValidationError):dto.FramePose(**(self.pose|{'body_attitude':self.pose['camera_attitude']}))

class RunIsolation(unittest.TestCase):
    def setUp(self):
        self.mid=uuid4();self.sid=str(uuid4());self.request=types.SimpleNamespace(path_params={'rid':str(uuid4())},headers={'x-simulator-session':self.sid})
        self.row={'request':{'pipeline_config':{'mission_id':str(self.mid)}},'worker_session_id':self.sid,'state':'RUNNING','expires_at':datetime.now(timezone.utc)+timedelta(minutes=10)}
    def invoke(self):
        with patch.object(sim,'worker_run',return_value=({'id':'owner'},self.row)):return sim.frame_access(self.request,None,self.mid)
    def test_matching_run(self):self.assertEqual(self.invoke()[0]['id'],'owner')
    def test_other_mission(self):
        self.row['request']['pipeline_config']['mission_id']=str(uuid4())
        with self.assertRaises(HTTPException):self.invoke()
    def test_old_session(self):
        self.request.headers['x-simulator-session']=str(uuid4())
        with self.assertRaises(HTTPException):self.invoke()
    def test_expired_run(self):
        self.row['expires_at']=datetime.now(timezone.utc)-timedelta(seconds=1)
        with self.assertRaises(HTTPException):self.invoke()
    def test_queued_run(self):
        self.row['state']='QUEUED'
        with self.assertRaises(HTTPException):self.invoke()
    def test_new_reservation_after_completion_rejected(self):
        self.row['state']='COMPLETED'
        with self.assertRaises(HTTPException):self.invoke()

class WorkerTests(unittest.TestCase):
    def test_single_upload_lost_ack_preserves_same_ids(self):
        with tempfile.TemporaryDirectory() as temp:
            import base64
            u=FrameUploader.__new__(FrameUploader);u.folder=Path(temp);u.run={'run_id':str(uuid4())};u.metrics={'uploaded':0}
            fr={'frame_id':str(uuid4()),'mission_id':'m','input_asset_id':'a','frame_seq':'1','format':'JPEG'}
            value={'frame':fr,'producer_session_id':'s','analysis_run_id':'r','bundle_id':'b','sha256':hashlib.sha256(b'image').hexdigest()}
            (u.folder/'frame.json').write_text(json.dumps(value));(u.folder/'frame.jpg').write_bytes(b'image');seen=[]
            def upload(method,path,body=None,**kw):
                meta=json.loads(base64.b64decode(kw['headers']['X-Frame-Metadata']));seen.append(meta)
                if len(seen)==1:raise OSError('reply lost')
                return {'stored':True,'frame_id':fr['frame_id'],'analysis_run_id':'r'}
            u.api=types.SimpleNamespace(request=upload)
            with self.assertRaises(OSError):u.flush()
            self.assertTrue((u.folder/'frame.json').exists());u.flush()
            self.assertEqual(seen[0],seen[1]);self.assertEqual(u.metrics['uploaded'],1)
    def test_bundled_worker_input_preserves_completion_journal(self):
        with tempfile.TemporaryDirectory() as temp:
            import base64
            data=cv2.imencode('.jpg',np.zeros((48,64,3),np.uint8))[1].tobytes();sha=hashlib.sha256(data).hexdigest()
            job={'analysis_run_id':str(uuid4()),'claim_id':str(uuid4()),'attempt_no':1,'input_hash':sha}
            frame={'frame_id':str(uuid4()),'width':64,'height':48};paths=[]
            def handler(request):
                paths.append(request.url.path)
                return httpx.Response(200,content=data,headers={'X-Content-SHA256':sha,'X-Analysis-Metadata':base64.b64encode(json.dumps({'job':job,'frame':frame}).encode()).decode()})
            fake=types.SimpleNamespace(detect=lambda img:(np.empty((0,4)),np.array([]),1))
            with httpx.Client(base_url='https://backend.internal',transport=httpx.MockTransport(handler)) as api:
                poll_once(api,lambda:'unused',fake,{'model_config_id':str(uuid4())},Path(temp))
            pending=json.loads((Path(temp)/'sim-completion.json').read_text())
            self.assertEqual(paths,['/internal/v1/analysis-runs/next-input']);self.assertEqual(pending['body']['claim_id'],job['claim_id'])
            self.assertEqual(pending['body']['observations'],[])
    def test_batch_worker_journals_results_and_retries_exact_lost_reply(self):
        import struct
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);data=cv2.imencode('.jpg',np.zeros((48,64,3),np.uint8))[1].tobytes()
            entries=[{'job':{'analysis_run_id':str(uuid4()),'claim_id':str(uuid4()),'attempt_no':1,'input_hash':hashlib.sha256(data).hexdigest()},'frame':{'frame_id':str(uuid4()),'width':64,'height':48},'byte_size':len(data)} for _ in range(2)]
            metadata=json.dumps(entries).encode();payload=struct.pack('!I',len(metadata))+metadata+data*2;sent=[]
            def handler(request):
                if request.url.path.endswith('next-input-batch'):return httpx.Response(200,content=payload,headers={'content-type':'application/octet-stream'})
                value=json.loads(request.content);sent.append(value)
                if len(sent)==1:raise httpx.ReadError('reply lost')
                return httpx.Response(200,json={'completed':[r['analysis_run_id'] for r in value['results']]})
            fake=types.SimpleNamespace(detect=lambda img:(np.empty((0,4)),np.array([]),1));stats={'frames':0,'observations':0}
            with httpx.Client(base_url='https://backend.internal',transport=httpx.MockTransport(handler)) as api:
                poll_batch_once(api,lambda:'unused',fake,{'model_config_id':str(uuid4())},root,stats)
                self.assertTrue((root/'sim-completions-batch.json').exists())
                with self.assertRaises(httpx.ReadError):poll_batch_once(api,lambda:'unused',fake,{},root,stats)
                poll_batch_once(api,lambda:'unused',fake,{},root,stats)
            self.assertEqual(sent[0],sent[1]);self.assertEqual(stats['frames'],2)
            self.assertFalse((root/'sim-completions-batch.json').exists())
    def test_batch_worker_rejects_bad_content_before_result_journal(self):
        import struct
        with tempfile.TemporaryDirectory() as temp:
            entry={'job':{'input_hash':'a'*64,'analysis_run_id':str(uuid4()),'claim_id':str(uuid4()),'attempt_no':1},'frame':{},'byte_size':1};metadata=json.dumps([entry]).encode()
            def handler(request):return httpx.Response(200,content=struct.pack('!I',len(metadata))+metadata+b'x',headers={'content-type':'application/octet-stream'})
            with httpx.Client(base_url='https://backend.internal',transport=httpx.MockTransport(handler)) as api:
                with self.assertRaises(ValueError):poll_batch_once(api,lambda:'unused',None,{'model_config_id':str(uuid4())},Path(temp))
            self.assertFalse((Path(temp)/'sim-completions-batch.json').exists())
            self.assertTrue((Path(temp)/'sim-failed-inputs.json').exists())
    def test_batch_worker_preserves_good_results_when_one_inference_fails(self):
        import struct
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);data=b'fixture';entries=[{'job':{'analysis_run_id':str(uuid4()),'claim_id':str(uuid4()),'attempt_no':1,'input_hash':hashlib.sha256(data).hexdigest()},'frame':{},'byte_size':len(data)} for _ in range(3)]
            metadata=json.dumps(entries).encode();payload=struct.pack('!I',len(metadata))+metadata+data*3
            with httpx.Client(base_url='https://backend.internal',transport=httpx.MockTransport(lambda request:httpx.Response(200,content=payload,headers={'content-type':'application/octet-stream'}))) as api:
                with patch('app.vision_sim.observations',side_effect=[[],ValueError('bad image'),[]]):poll_batch_once(api,lambda:'unused',None,{'model_config_id':str(uuid4())},root)
            saved=json.loads((root/'sim-completions-batch.json').read_text())['results'];failed=json.loads((root/'sim-failed-inputs.json').read_text())['failures']
            self.assertEqual([x['analysis_run_id'] for x in saved],[entries[0]['job']['analysis_run_id'],entries[2]['job']['analysis_run_id']])
            self.assertEqual(failed[0]['analysis_run_id'],entries[1]['job']['analysis_run_id'])
    def test_batch_worker_quarantines_permanent_rejection_but_keeps_auth_failure(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);value={'results':[{'analysis_run_id':str(uuid4()),'result':{'claim_id':str(uuid4()),'attempt_no':1,'observations':[]}}]}
            pending=root/'sim-completions-batch.json';pending.write_text(json.dumps(value))
            with httpx.Client(base_url='https://backend.internal',transport=httpx.MockTransport(lambda request:httpx.Response(401))) as api:
                with self.assertRaises(httpx.HTTPStatusError):poll_batch_once(api,lambda:'unused',None,{},root)
            self.assertEqual(json.loads(pending.read_text()),value)
            with httpx.Client(base_url='https://backend.internal',transport=httpx.MockTransport(lambda request:httpx.Response(422))) as api:poll_batch_once(api,lambda:'unused',None,{},root)
            self.assertFalse(pending.exists());self.assertEqual(len(list(root.glob('sim-rejected-batch-*.json'))),1)
            self.assertTrue((root/'sim-failed-inputs.json').exists())
    def test_missing_motion_does_not_extend_stationary_claim(self):
        from app.vision_core.state import StateTracker,_Hist
        tracker=StateTracker.__new__(StateTracker);tracker.work_w=64
        tracker.stats={'ticks':0,'homography_fail':0,'id_jumps':0}
        tracker.orb=tracker.bf=None
        tracker.score_m=tracker.display_m=types.SimpleNamespace(proba=lambda wh:np.array([[.9,.05,.05]]))
        h=_Hist();h.sp=[0,0,0];h.still=9;h.seen=9;tracker.hist={1:h}
        tracker.prev=(0,np.zeros((48,64),np.uint8),{1:(1,2,30,40)})
        with patch('app.vision_core.state.homography',return_value=None):
            tracker._tick(1,np.zeros((48,64,3),np.uint8),{1:(0,(1,2,30,40))})
        self.assertFalse(h.state['motion']['measured']);self.assertEqual(h.still,0)
        self.assertNotIn(h.state['grade'],('URGENT','HIGH'))
    def test_legacy_observation_hash_shape(self):
        row={'observation_id':str(uuid4()),'candidate_id':str(uuid4()),'detection_index':0,'bbox':{},'confidence':.8,
             'geo_result':{'status':'PENDING','reason':'POSE_MISSING'},'class_name':'person'}
        o=dto.Observation(**row)
        self.assertEqual(o.model_dump(mode='json',exclude={'appearance','state','track_id'}-o.model_fields_set),row)
        enriched=dto.Observation(**(row|{'appearance':{'upper':{}},'state':{'grade':'CHECK'},'track_id':'1'}))
        self.assertEqual(enriched.state['grade'],'CHECK')
    def test_fast_capture_contract_bounds(self):
        cfg={'mission_id':uuid4(),'model_config_id':uuid4()}
        self.assertEqual(sim.VisionPipeline(**cfg).interval_s,.2)
        for value in (.1,.2):self.assertEqual(sim.VisionPipeline(**cfg,interval_s=value).interval_s,value)
        with self.assertRaises(ValidationError):sim.VisionPipeline(**cfg,interval_s=.01)
    def test_explicit_empty_query_does_not_fall_back(self):
        with tempfile.TemporaryDirectory() as temp:
            w=IngestWorker(None,lambda:'unused',None,uuid4(),scratch=temp,upload_crops=False)
            w.query_file.write_text(json.dumps({'*':{'upper':['red']}}))
            self.assertEqual(w.query_for({'appearance_query':{}}),{})
    def test_sim_uses_sim_clock(self):
        fr={'capture_at':'2026-10-14T00:00:00Z','pose':{'clock_domain':'SIM','source_timestamp_ns':'12345000000'}}
        self.assertEqual(IngestWorker.frame_time(fr),12.345)
    def test_upload_is_capture_order_and_reads_jpeg(self):
        with tempfile.TemporaryDirectory() as temp:
            u=FrameUploader.__new__(FrameUploader);u.folder=Path(temp);u.run={'run_id':str(uuid4())};u.metrics={'uploaded':0};seen=[]
            def upload(method,path,body=None,**kw):
                import base64
                value=json.loads(base64.b64decode(kw['headers']['X-Frame-Metadata']))
                values=value.get('frames',[value])
                seen.extend(v['frame']['frame_seq'] for v in values)
                acks=[{'frame_id':v['frame']['frame_id'],'analysis_run_id':v['analysis_run_id'],'stored':True} for v in values]
                return {'frames':acks} if 'frames' in value else acks[0]
            u.api=types.SimpleNamespace(request=upload)
            for name,seq,fmt in [('a',20,'PNG'),('z',10,'JPEG')]:
                fr={'frame_id':name,'mission_id':'m','input_asset_id':name,'frame_seq':str(seq),'format':fmt}
                (u.folder/(name+'.json')).write_text(json.dumps({'frame':fr,'producer_session_id':'s','analysis_run_id':'r','bundle_id':name,'sha256':'x'}))
                (u.folder/(name+('.jpg' if fmt=='JPEG' else '.png'))).write_bytes(b'frame')
            with patch.object(u.api,'request',return_value={'frames':[]}):
                with self.assertRaises(ValueError):u.flush()
            self.assertEqual(len(list(u.folder.glob('*.json'))),2)
            u.flush();self.assertEqual(seen,['10','20']);self.assertEqual(list(u.folder.iterdir()),[])
    def test_trace_durable_write_does_not_block_event_loop(self):
        import time
        from app.communication import CommunicationTrace
        marks=[]
        def emit(row):time.sleep(.08);marks.append('stored')
        async def application(scope,receive,send):
            await send({'type':'http.response.start','status':200,'headers':[]})
            await send({'type':'http.response.body','body':b'ok'})
        async def exercise():
            async def tick():await asyncio.sleep(.02);marks.append('tick')
            async def receive():return {'type':'http.request','body':b''}
            async def send(message):pass
            with patch('app.communication.spool',return_value=types.SimpleNamespace(emit=emit)):
                await asyncio.gather(CommunicationTrace(application,'test')({'type':'http','method':'GET','headers':[]},receive,send),tick())
        asyncio.run(exercise());self.assertEqual(marks,['tick','stored'])
    def test_trace_writes_are_bounded_and_identical_ids_stay_serialized(self):
        import os,time,threading
        from concurrent.futures import ThreadPoolExecutor
        from app.communication import Spool
        active=0;peak=0;lock=threading.Lock();fsync=os.fsync
        def slow(fd):
            nonlocal active,peak
            with lock:active+=1;peak=max(peak,active)
            try:time.sleep(.01);fsync(fd)
            finally:
                with lock:active-=1
        with tempfile.TemporaryDirectory() as temp:
            sink=Spool(temp)
            rows=[{'event_id':str(__import__('uuid').UUID(int=n+1)),'timings':{},'status':200} for n in range(8)]
            with patch('app.communication.os.fsync',side_effect=slow),ThreadPoolExecutor(max_workers=8) as pool:
                list(pool.map(sink.emit,rows))
                list(pool.map(sink.emit,[rows[0]]*8))
            self.assertGreater(peak,1);self.assertLessEqual(peak,4)
            self.assertEqual(len(list(Path(temp).glob('*.json'))),8)
            with self.assertRaises(ValueError):sink.emit(rows[0]|{'status':500})
    def test_registered_engine_required_for_readiness(self):
        with tempfile.TemporaryDirectory() as temp,patch.object(vision_runtime,'STORAGE',Path(temp)),patch.object(vision_runtime,'settings',return_value={'environment':'SIM'}),patch.object(vision_runtime,'one',return_value={'payload':{'environment':'SIM','artifact_sha256':'a'*64,'engine_sha256':'b'*64}}):
            p=Path(temp)/'vision-status.json';data={'received_at':datetime.now(timezone.utc).isoformat(),'model_loaded':True,'cuda_verified':True,'model_config_id':str(uuid4()),'artifact_sha256':'a'*64}
            p.write_text(json.dumps(data));self.assertFalse(vision_runtime.loaded(None))
            p.write_text(json.dumps(data|{'engine_sha256':'b'*64,'backend':'tensorrt'}));self.assertTrue(vision_runtime.loaded(None))
    def test_registry_hash_is_checked_before_model_deserialization(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);model=root/'model';model.mkdir();data=b'not a pickle';(model/'best.pt').write_bytes(data)
            (model/'model.json').write_text(json.dumps({'environment':'REAL','sha256':hashlib.sha256(data).hexdigest()}))
            (root/'active.json').write_text(json.dumps({'name':'model','model_config_id':str(uuid4())}))
            with patch.object(vision_ingest,'MODELS',root),patch.dict(sys.modules,torch=types.ModuleType('torch')):
                with self.assertRaisesRegex(ValueError,'Registered model hash mismatch'):vision_ingest.load_detector('b'*64)
    def test_capture_finish_waits_for_last_frame(self):
        with tempfile.TemporaryDirectory() as temp:
            worker=FrameUploader.__new__(FrameUploader);worker.folder=Path(temp)
            pending=worker.folder/'frame.json';pending.write_text('{}')
            with patch('simulation_vision.time.sleep',side_effect=lambda _:pending.unlink()):self.assertTrue(worker.finish())
    def test_capture_finish_preserves_untransmitted_frame(self):
        with tempfile.TemporaryDirectory() as temp:
            worker=FrameUploader.__new__(FrameUploader);worker.folder=Path(temp)
            pending=worker.folder/'frame.json';pending.write_text('{}')
            with patch('simulation_vision.time.monotonic',side_effect=[0,31]):self.assertFalse(worker.finish())
            self.assertTrue(pending.exists())
    def test_real_journal_recovers_committed_and_quarantines_tail(self):
        with tempfile.TemporaryDirectory() as temp:
            out=Outbox(temp);out.append('result',{'frame_id':'frame','sequence':'1'})
            with out.path.open('ab') as f:f.write(b'{partial')
            Outbox(temp)
            self.assertTrue(State(temp).seen('frame'))
            self.assertEqual(len(list(Path(temp).glob('outbox-incomplete-*.bin'))),1)
    def test_sim_detection_keeps_coordinates_pending(self):
        fake=types.SimpleNamespace(detect=lambda image:(np.array([[1,2,30,40]]),np.array([.9]),1))
        data=cv2.imencode('.png',np.zeros((48,64,3),np.uint8))[1].tobytes()
        rows=observations({'analysis_run_id':str(uuid4())},{'width':64,'height':48,'pose':{'reported':True}},data,fake)
        self.assertEqual(rows[0]['geo_result']['status'],'PENDING');self.assertNotIn('lat',rows[0]['geo_result'])
    def test_sim_bad_image_rejected(self):
        with self.assertRaises(ValueError):observations({'analysis_run_id':str(uuid4())},{'width':1,'height':1},b'bad',None)
    def test_real_pose_never_uses_default_geography(self):
        fake=types.SimpleNamespace(detect=lambda image:(np.array([[1,2,30,40]]),np.array([.9]),1))
        data=cv2.imencode('.png',np.zeros((48,64,3),np.uint8))[1].tobytes()
        with tempfile.TemporaryDirectory() as temp:
            w=IngestWorker(None,lambda:'unused',fake,uuid4(),scratch=temp,upload_crops=False)
            fr={'frame_id':str(uuid4()),'mission_id':str(uuid4()),'width':64,'height':48,'capture_at':None,'pose':{'lat':36,'lon':128,'relative_alt_m':10}}
            body=w.process(fr,data);self.assertEqual(body['observations'][0]['geo']['status'],'PENDING')
            self.assertIsNone(body['observations'][0]['geo'].get('lat'))
    def test_completion_retries_exact_payload(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);value={'rid':str(uuid4()),'body':{'claim_id':str(uuid4()),'attempt_no':1,'observations':[]}}
            (root/'sim-completion.json').write_text(json.dumps(value))
            seen=[]
            def handler(request):seen.append(json.loads(request.content));return httpx.Response(200,json={'completed':True})
            with httpx.Client(base_url='https://backend.internal',transport=httpx.MockTransport(handler)) as api:poll_once(api,lambda:'unused',None,{},root)
            self.assertEqual(seen,[value['body']]);self.assertFalse((root/'sim-completion.json').exists())
    def test_tensorRT_resized_boxes_back_to_original(self):
        det=PersonDetector.__new__(PersonDetector);det.conf=.15;det.backend='tensorrt'
        original=PersonDetector.detect
        # Verify the recursive resize branch preserves source pixel units without loading a model.
        with patch.object(PersonDetector,'detect',side_effect=lambda img,conf=None:original(det,img,conf) if img.shape[1]==640 else (np.array([[300.,300.,600.,600.]],np.float32),np.array([.9]),1)):
            boxes,_,_=det.detect(np.zeros((360,640,3),np.uint8))
        self.assertTrue(np.allclose(boxes,[[100,100,200,200]]))
    def test_stale_readiness_expires(self):
        with tempfile.TemporaryDirectory() as temp,patch.object(vision_runtime,'STORAGE',Path(temp)):
            (Path(temp)/'vision-status.json').write_text(json.dumps({'received_at':(datetime.now(timezone.utc)-timedelta(seconds=46)).isoformat(),'model_loaded':True,'cuda_verified':True}))
            self.assertFalse(vision_runtime.loaded(None))

if __name__=='__main__':unittest.main()
