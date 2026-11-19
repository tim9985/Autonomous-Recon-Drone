"""SIM DEM filtering checks with a deterministic detector; no GPU or database writes."""
import json,os,tempfile,uuid
from pathlib import Path
from unittest.mock import patch
import numpy as np
import cv2
from app.vision_core.ingest import IngestWorker
from app.vision_core.pose import DemTiles

class Detector:
 def detect(self,image):return np.array([[20,10,55,85]],dtype=float),np.array([.9]),1.

os.environ.update(VISION_DEM_DIR='/dem',VISION_MIN_AGL_M='10',VISION_GEO_CLAIMS='0',VISION_GEO_GROUPING='0')
dem=DemTiles('/dem');lat,lon=36.145778,128.391596
ground=dem(lat,lon)
assert ground is not None and 0<ground<300
assert dem(0,0) is None
assert dem(-90,0) is None and dem(90,0) is None
checks=[]
with tempfile.TemporaryDirectory() as folder:
 w=IngestWorker(None,lambda:'test',Detector(),str(uuid.uuid4()),scratch=folder,upload_crops=False,posture=None,environment='SIM')
 assert w.stats['dem_loaded'] and w.stats['min_agl_m']==10
 img=np.full((100,100,3),120,dtype=np.uint8)
 def pose(agl):return {'schema_version':'frame-pose/1.0','clock_domain':'SIM','source_timestamp_ns':'1000000000',
  'geographic':{'latitude':lat,'longitude':lon,'altitude_m':ground+agl,'altitude_datum':'MSL'},'sync_error_ms':333}
 # The AGL filter is independent of coordinate claims and the 333 ms image/body skew.
 with patch.object(w.pgeo,'locate',side_effect=AssertionError('Coordinate calculation must remain disabled')):
  for i,agl in enumerate((0,9.99,10,15)):
   obs=w.observe('m',img,1+i*.2,pose(agl),upload_crops=False)
   assert len(obs)==(0 if agl<10 else 1),(agl,obs)
   if agl>=10:assert obs[0]['geo']['status']=='PENDING' and obs[0]['geo']['lat'] is None
  checks.append('MSL minus actual DEM: 0m and 9.99m suppressed; 10m and 15m retained; geo calculation disabled')
  for i,p in enumerate((None,{'geographic':{'latitude':0,'longitude':0,'altitude_m':50,'altitude_datum':'MSL'}})):
   assert len(w.observe('m',img,2+i*.2,p,upload_crops=False))==1
  assert w.stats['agl_unknown_frames']==2
  checks.append('Missing pose and out-of-coverage DEM do not suppress candidates; unknown counter increases')
  assert w.frame_time({'pose':pose(15),'capture_at':'2099-01-01T00:00:00Z'})==1
  query=Path(folder)/'appearance_query.json';query.write_text(json.dumps({'*':{'upper':['green']}}))
  assert w.query_for({'appearance_query':{},'mission_id':'m'})=={}
  assert w.query_for({'mission_id':'m'})=={'upper':['green']}
  w.trk['m']=object();w.tcand[('m','track')]=object()
  w.observe('m',img,5,pose(0),upload_crops=False)
  assert 'm' not in w.trk and ('m','track') not in w.tcand
  checks.append('SIM source clock, explicit empty appearance query and tracking reset across a gap preserved')
  ok,encoded=cv2.imencode('.jpg',img);assert ok
  body=w.process({'mission_id':str(uuid.uuid4()),'frame_id':str(uuid.uuid4()),'width':100,'height':100,'pose':pose(0)},encoded.tobytes())
  assert body['analysis_state']=='SKIPPED' and body['reason'].startswith('LOW_ALTITUDE') and not body['observations']
  checks.append('Low AGL result records SKIPPED and a reason without observations')
with tempfile.TemporaryDirectory() as folder:
 os.environ['VISION_DEM_DIR']=''
 w=IngestWorker(None,lambda:'test',Detector(),str(uuid.uuid4()),scratch=folder,upload_crops=False,posture=None,environment='SIM')
 assert not w.stats['dem_loaded'] and len(w.observe('m',img,1,pose(0),upload_crops=False))==1
 checks.append('No DEM does not falsely suppress MSL frames')
print(json.dumps({'status':'PASS','checks':checks,'terrain_at_launch_m':ground},ensure_ascii=False))
