const API='/api/v1/local-search/real-map';
const blank=()=>({type:'FeatureCollection',features:[]});
export const planningKey=m=>JSON.stringify([m?.mission_id,m?.release_id,m?.regions?.map(r=>r.id)||[],m?.launch||null]);
export const stageLabel=state=>({PENDING:'대기',CALCULATING:'계산 중',READY:'경로 준비',INCOMPLETE:'관측 목표 미달',BLOCKED:'검증 실패'}[state]||'');

export function mountRealFeatures({S,$,doc,win,json,changed,flush,selection,error,remember,remembered,decorate,renderWorkspace}){
 let map,frame,frameReady=false,frameLoading=false,frameTimer,engine='2d',nonce=win.crypto.randomUUID(),lastView=null,launchMarker,planTimer,planId='',inputKey='',routeKey='',disposed=false,submitting=false;
 let watchdog,lastHeartbeat=0,lastPosted='',watchAt=0;
 let frameShown=false,viewRevision=0,paintedRevision=-1,revealTimer,hidePreviewTimer;
 let previewData=null,previewOn=false,previewAbort,previewTimeout,previewGeneration=0;
 const buildingOrigins=[];
 function buildingOrigin(point,kind){
  if(!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite)||Math.abs(point[0])>180||Math.abs(point[1])>85)return;
  const id=Math.floor(point[0]*100)+'/'+Math.floor(point[1]*100);
  if(!buildingOrigins.some(o=>o.id===id))buildingOrigins.push({id,point:[...point],kind});
 }
 const reduced=()=>win.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const route=()=>S.plan&&!S.plan.stale?S.plan.route||blank():blank();
 const busy=()=>['QUEUED','RUNNING'].includes(S.plan?.state)&&!S.plan?.stale;
 function setBuildingLayers(){
  if(!map)return;
  const enabled=engine!=='3d'&&!$('buildings-toggle').hasAttribute('data-off'),raised=engine==='2.5d';
  for(const [id,visible] of [['real-building-outline',enabled],['real-building-height',enabled&&raised&&!previewOn],['real-building-preview',enabled&&raised&&previewOn]])
   if(map.getLayer(id))map.setLayoutProperty(id,'visibility',visible?'visible':'none');
 }
 function finishPreview(e){
  if(e?.sourceId&&e.sourceId!=='real-buildings')return;
  if(previewOn&&map?.isSourceLoaded?.('real-buildings')){
   previewOn=false;previewData=null;setBuildingLayers();map.getSource('real-building-preview')?.setData(blank());
   $('map').dataset.previewRetiredMs=win.performance.now().toFixed(1);
  }
 }
 function prime(view){
  if(!buildingOrigins.length)buildingOrigin(view?.center,'initial');
  previewAbort?.abort();win.clearTimeout(previewTimeout);const generation=++previewGeneration;
  disposed=false;previewData=null;previewOn=false;
  delete $('map').dataset.previewDataMs;delete $('map').dataset.previewRetiredMs;
  if(!['2d','2.5d'].includes(remembered('engine')))return;
  const b=S.buildings,p=view?.center;if(!b||!Array.isArray(p)||view.zoom<13||p[0]<b.bounds[0]||p[0]>b.bounds[2]||p[1]<b.bounds[1]||p[1]>b.bounds[3])return;
  previewAbort=new AbortController();const signal=previewAbort.signal;
  previewTimeout=win.setTimeout(()=>previewAbort?.abort(),1800);
  void json(`/api/map/real-buildings/${b.build_id}/cells/${Math.floor(p[0]*100)}/${Math.floor(p[1]*100)}`,undefined,signal).then(data=>{
   if(disposed||signal.aborted||generation!==previewGeneration||!Array.isArray(data.features)||!data.features.length||data.features.length>1000)return;
   if(map?.getSource('real-buildings')&&map.isSourceLoaded?.('real-buildings'))return;
   // The version-pinned cell contains the original footprints/height policy.
   // It is only an early display source; mission/obstacle inputs never read it.
   previewData=data;$('map').dataset.previewDataMs=win.performance.now().toFixed(1);
   if(map?.getSource('real-building-preview')&&!map.isSourceLoaded?.('real-buildings')){
    previewOn=true;map.getSource('real-building-preview').setData(data);setBuildingLayers();
   }
  }).catch(()=>{}).finally(()=>{if(generation===previewGeneration)win.clearTimeout(previewTimeout);});
 }
 function post(extra={}){
  if(!frameReady||!frame?.contentWindow)return;
  const value={type:'real-map-config',nonce,viewRevision,buildingOrigins,release:S.release.release_id,regions:S.current?.regions||[],launch:S.current?.launch||null,editing:!!S.editing,pickLaunch:!!S.pickLaunch,mode:S.mode,buildings:!$('buildings-toggle').hasAttribute('data-off'),route:route(),active:engine==='3d'&&!doc.hidden,frameVisible:frameShown&&$('map').style.visibility==='hidden'&&engine==='3d'&&!doc.hidden,...extra};
  const signature=JSON.stringify(value);if(signature===lastPosted)return;lastPosted=signature;
  frame.contentWindow.postMessage(value,win.location.origin);
 }
 function mapNotice(text,failed=false){$('engine-status').textContent=text;$('engine-status').dataset.error=String(failed);$('engine-retry').hidden=!failed;}
 function cameraRequest(){const c=map.getCenter();paintedRevision=-1;return{viewRevision:++viewRevision,center:[c.lng,c.lat],range:Math.max(250,1200*2**(15-map.getZoom())),cameraView:{zoom:map.getZoom(),pitch:map.getPitch?.()??30,bearing:map.getBearing()}};}
 function armFrameTimeout(){win.clearTimeout(frameTimer);frameTimer=win.setTimeout(()=>{if(!frameShown&&engine==='3d')recover3d(frameReady?'3D 지형 준비 지연':'3D 연결 지연');},45000);}
 function revealFrame(){
  win.clearTimeout(revealTimer);
  if(frameShown||!frameReady||paintedRevision!==viewRevision||engine!=='3d'||map?.isMoving?.()||doc.hidden)return;
  revealTimer=win.setTimeout(()=>{
   if(disposed||!map||map.isMoving?.()||engine!=='3d'||paintedRevision!==viewRevision)return;
   frameShown=true;$('real-3d-host').dataset.ready='true';$('real-3d-host').dataset.shownMs=win.performance.now().toFixed(1);win.clearTimeout(frameTimer);
   hidePreviewTimer=win.setTimeout(()=>{if(frameShown&&engine==='3d'){
    $('map').style.visibility='hidden';$('real-3d-host').dataset.visibleAckMs=win.performance.now().toFixed(1);
    mapNotice('3D 지도 준비 완료 · 건물 불러오는 중');post();
   }},reduced()?0:240);
  },reduced()?0:160);
 }
 function previewMoving(){if(!frameShown)win.clearTimeout(revealTimer);}
 function previewSettled(){if(engine==='3d'&&frameReady&&!frameShown){armFrameTimeout();post(cameraRequest());}}
 function releaseFrame(){win.clearTimeout(frameTimer);win.clearTimeout(revealTimer);win.clearTimeout(hidePreviewTimer);win.clearInterval(watchdog);frame?.remove();frame=null;frameReady=false;frameShown=false;paintedRevision=-1;lastPosted='';$('real-3d-host').dataset.ready='false';}
 function recover3d(message){const selected=engine;releaseFrame();if(selected==='3d'){void setEngine('2.5d');mapNotice(message+' · 2.5D로 복구했습니다.',true);}}
 async function setEngine(value){
  if(!map)return;
  const previous=engine;engine=value;remember('engine',engine);
  for(const v of ['2d','2.5d','3d'])$('engine-'+v.replace('.','')).setAttribute('aria-pressed',String(v===engine));
  if(previous!==engine){win.clearTimeout(revealTimer);win.clearTimeout(hidePreviewTimer);frameShown=false;paintedRevision=-1;}
  $('map').style.visibility=engine==='3d'&&frameShown?'hidden':'visible';$('real-3d-host').hidden=engine!=='3d';
  $('real-3d-host').dataset.ready=String(frameShown);
  $('split').dataset.engine=engine;
  setBuildingLayers();
  if(engine==='3d'){
   if(!frameReady){
    if(Math.abs((map.getPitch?.()??0)-30)>.1)map.easeTo({pitch:30,duration:reduced()?0:240});
   }
   if(!frame&&!frameLoading){
    frameLoading=true;
    mapNotice('VWorld 3D 지도 불러오는 중');
    try{
     const config=await json('/api/map/vworld3d/config');if(disposed||engine!=='3d')return;if(!config.configured)throw Error('VWorld 3D 키 설정이 필요합니다.');
     frame=doc.createElement('iframe');frame.id='real-3d-frame';frame.loading='eager';frame.title='VWorld 3D 지도 · 구역 선택과 예상 경로';
     const c=map.getCenter(),b=map.getBounds();
     const view={center:[c.lng,c.lat],bounds:[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()]};
     frame.src='/api/map/vworld3d/real-frame#'+new URLSearchParams({view:JSON.stringify(view)});
     frame.addEventListener('load',()=>{$('real-3d-host').dataset.frameLoaded=String(frame?.contentDocument?.documentElement?.lang==='ko');});
     $('real-3d-host').replaceChildren(frame);
     armFrameTimeout();
    }catch(e){mapNotice(e.message,true);}finally{frameLoading=false;}
   }else if(frameReady){mapNotice('VWorld 3D · 실제 지형·건물');post(previous==='3d'?{}:cameraRequest());revealFrame();}
  }else{
   mapNotice(engine==='2.5d'?'2.5D · 높이 자료 기반 건물':'2D · 건물 윤곽');
   const view=previous==='3d'&&lastView?{center:lastView.center,zoom:Math.max(5,Math.min(19,Math.log2(40075016.686*Math.cos(lastView.center[1]*Math.PI/180)/(512*(lastView.groundResolution||3)))))}:{};
   map.easeTo({...view,pitch:engine==='2.5d'?52:0,bearing:engine==='2d'?0:map.getBearing(),duration:reduced()?0:420});
   setBuildingLayers();
   post();
  }
 }
 function focus(point,range=850,source='focus'){
  if(source==='search')buildingOrigin(point,'search');
  if(engine!=='3d'||!frameShown){if(source==='search')post();return false;}
  post({center:point,range});return true;
 }
 async function poll(){
  const wanted=planId,missionId=S.current?.mission_id;if(!wanted||disposed)return;
  try{const value=await json(API+'/plans/'+wanted);if(wanted!==planId||missionId!==S.current?.mission_id||disposed)return;S.plan=value;render();update();
   if(['QUEUED','RUNNING'].includes(value.state))planTimer=win.setTimeout(()=>void poll(),1200);
  }catch(e){if(wanted===planId){error(e.message);planTimer=win.setTimeout(()=>void poll(),4000);}}
 }
 function update(){
  if(!map)return;
  const key=planningKey(S.current),nextId=S.current?.plan_id||'';
  let refreshed=false;
  if(inputKey!==key){inputKey=key;S.plan=null;routeKey='';refreshed=true;}
  if(nextId!==planId){win.clearTimeout(planTimer);planId=nextId;S.plan=null;refreshed=true;if(planId)void poll();}
  const value=route(),rk=JSON.stringify(value);
  if(rk!==routeKey){routeKey=rk;map.getSource('real-route')?.setData(value);if(value.features.length)map.getSource('sequence')?.setData(blank());}
  const launch=S.current?.launch;
  if(launch){
   if(!launchMarker){const node=doc.createElement('span');node.className='real-launch-marker';node.textContent='출발';launchMarker=new win.maplibregl.Marker({element:node}).setLngLat(launch).addTo(map);}
   launchMarker.setLngLat(launch);
  }else{launchMarker?.remove();launchMarker=null;}
  post();
  if(refreshed)render();
 }
 function render(){
  const m=S.current,has=!!m?.regions.length,p=S.plan,working=busy()||submitting,hasRoute=!!route().features.length;
  $('launch-row').hidden=!has;$('pick-launch').disabled=!has||!S.canEdit||!S.ready;
  $('pick-launch').setAttribute('aria-pressed',String(!!S.pickLaunch));
  $('launch-label').textContent=m?.launch?'출발지 변경':'출발지 지정';
  $('launch-status').textContent=S.pickLaunch?'지도에서 출발할 지점을 클릭하세요.':m?.launch?'지도에 지정됨':'경로 계산 전에 지도에서 지정하세요.';
  const notice=$('launch-notice'),currentPlan=p&&!p.stale&&JSON.stringify(p.launch)===JSON.stringify(m?.launch)?p:null;
  notice.hidden=!has||(!m?.launch&&!S.pickLaunch);
  notice.textContent=currentPlan?.safety_notice||'드론 위쪽 이륙 공간을 확보하세요.';
  notice.dataset.canopy=String(currentPlan?.canopy_collision_verified===false);
  $('selection-actions').hidden=!m;$('initial-region').disabled=!S.canEdit;
  $('edit-prepared').hidden=true;$('prepare-mission').hidden=false;
  $('prepare-mission').disabled=!has||!m?.launch||working||!S.canEdit||!S.ready;
  $('prepare-mission').textContent=working?(S.plan?.state==='QUEUED'?'서버 계산 대기…':'경로 계산 중…'):hasRoute?'경로 다시 계산':'경로 계산';
  $('cancel-plan').hidden=!working;$('plan-summary').hidden=!p;
  $('start-flight').hidden=!hasRoute;$('start-flight').disabled=true;
  $('departure-note').hidden=!hasRoute;$('departure-note').textContent=currentPlan?.canopy_collision_verified===false?'예상 경로 · 수목 회피 미검증. 실기체 연결과 현장 확인 후 출발할 수 있습니다.':'예상 경로입니다. 실기체 연결과 현장 검증 후 출발할 수 있습니다.';
  $('route-note').hidden=!hasRoute&&!(has&&m.regions.length>1);
  $('route-note').textContent=hasRoute?'실선: 수색 · 보라 점선: 이동 · 주황 점선: 복귀':'점선은 방문 순서입니다. 출발지를 지정하면 비행 경로를 계산합니다.';
  if(m){$('prep-title').textContent=working?'예상 경로 계산 중':hasRoute?'예상 경로 검토':'수색 구역 선택';
   $('prep-description').textContent=working?'완성된 구역부터 지도에서 확인할 수 있습니다.':hasRoute?'구역을 누르면 해당 경로로 이동합니다.':'구역을 선택하고 출발지를 지정하세요.';}
  if(p){
   const done=p.regions.filter(r=>['READY','INCOMPLETE'].includes(r.state)).length;
   $('plan-summary-title').textContent=working?(p.state==='QUEUED'?'학교서버 계산 대기':`경로 ${done} / ${p.regions.length} 완료`):p.state==='READY'?'예상 경로 계산 완료':p.state==='PARTIAL'?'일부 구역의 관측 목표 미달':p.state==='CANCELLED'?'계산 취소':p.state==='INTERRUPTED'?'계산 중단':'경로 계산 실패';
   $('plan-summary').dataset.state=p.state;
   $('plan-summary').dataset.stale=String(!!p.stale);
   $('plan-summary-detail').textContent=p.stale?'구역이나 출발지가 변경되었습니다. 다시 계산하세요.':p.error|| (p.predicted_seconds?`예상 ${Math.ceil(p.predicted_seconds/60)}분 · 실제 관측 0%`:'지형·건물·진입·복귀 경로를 확인하고 있습니다.');
   $('plan-progress').max=Math.max(1,p.regions.length);$('plan-progress').value=done;
  }
  for(const [index,li] of [...$('region-list').children].entries()){
   let badge=li.querySelector('.real-plan-state');const row=p?.regions[index];if(!row||p.stale){badge?.remove();continue;}
   if(!badge){badge=doc.createElement('span');badge.className='real-plan-state';li.querySelector('.real-region-copy')?.append(badge);}
   if(badge.dataset.state!==row.state)badge.dataset.state=row.state;
   const label=stageLabel(row.state)+(row.predicted_percent!=null?` · 예상 ${row.predicted_percent.toFixed(1)}%`:'');if(badge.textContent!==label)badge.textContent=label;
  }
  $('step-select').removeAttribute('aria-current');$('step-review').removeAttribute('aria-current');$(hasRoute||working?'step-review':'step-select').setAttribute('aria-current','step');
  if(map)map.getCanvas().style.cursor=S.pickLaunch||S.editing?'crosshair':'';
 }
 function chooseLaunch(point){if(!S.current||!S.canEdit)return;S.current.launch=point;S.current.prepared=false;delete S.current.plan_id;S.pickLaunch=false;changed();}
 async function calculate(){
  if(!S.current?.regions.length||!S.current.launch||busy()||submitting)return;
  const mid=S.current.mission_id,submittedKey=planningKey(S.current);
  submitting=true;
  S.editing=false;S.pickLaunch=false;S.current.prepared=true;changed();
  try{await flush();if(planningKey(S.current)!==submittedKey)return;const plan=await json(API+'/missions/'+mid+'/plan',{revision:S.current.revision});
   if(planningKey(S.current)!==submittedKey)return;S.current.plan_id=plan.plan_id;S.plan=plan;planId=plan.plan_id;inputKey=submittedKey;render();update();void poll();
  }catch(e){error(e.message);}finally{submitting=false;render();}
 }
 const receive=e=>{
  if(e.origin!==win.location.origin||e.source!==frame?.contentWindow)return;
  if(e.data?.type==='real-3d-ready'){
   frameReady=true;lastPosted='';lastHeartbeat=watchAt=Date.now();$('real-3d-host').dataset.sdkReadyMs=win.performance.now().toFixed(1);
   post(cameraRequest());
   win.clearInterval(watchdog);watchdog=win.setInterval(()=>{const now=Date.now(),gap=now-watchAt;watchAt=now;if(doc.hidden||engine!=='3d'){lastHeartbeat=now;return;}if(gap>10000||now-lastHeartbeat>15000)recover3d('3D 응답 지연');},2000);return;
  }
  if(!frameReady&&e.data?.type==='real-3d-error'){recover3d(e.data.message);return;}
  if(e.data?.nonce!==nonce)return;
  if(e.data.type==='real-3d-painted'){if(e.data.viewRevision===viewRevision){paintedRevision=viewRevision;revealFrame();}return;}
  if(e.data.type==='real-3d-heartbeat'){lastHeartbeat=Date.now();return;}
  if(e.data.type==='real-3d-view'){lastView=e.data.view;return;}
  if(e.data.type==='real-3d-error'){recover3d(e.data.message);return;}
  if(e.data.type==='real-3d-notice'){if(engine==='3d')mapNotice(e.data.message);return;}
  if(e.data.type==='real-3d-launch'&&S.pickLaunch)chooseLaunch(e.data.point);
  if(e.data.type==='real-3d-region'&&S.editing&&S.current&&S.canEdit){const r=e.data.region;try{selection(S.current.regions.some(v=>v.id===r.id)?S.current.regions.filter(v=>v.id!==r.id):[...S.current.regions,r]);}catch(e){error(e.message);}}
 };
 win.addEventListener('message',receive);
 for(const v of ['2d','2.5d','3d'])$('engine-'+v.replace('.','')).onclick=()=>void setEngine(v);
 $('engine-retry').onclick=()=>{releaseFrame();void setEngine('3d');};
 const visibility=()=>{lastHeartbeat=watchAt=Date.now();post();};doc.addEventListener('visibilitychange',visibility);
 $('buildings-toggle').onclick=()=>{
  const off=$('buildings-toggle').toggleAttribute('data-off');$('buildings-toggle').setAttribute('aria-pressed',String(!off));
  setBuildingLayers();post();
 };
 $('pick-launch').onclick=()=>{S.pickLaunch=!S.pickLaunch;S.editing=false;(renderWorkspace||render)();post();};
 $('prepare-mission').onclick=()=>void calculate();$('cancel-plan').onclick=async()=>{try{await json(API+'/plans/'+planId+'/cancel',{});}catch(e){error(e.message);}};
 function init(value){
  map=value;disposed=false;inputKey=planningKey(S.current);
  if(!buildingOrigins.length&&map.getCenter){const c=map.getCenter();buildingOrigin([c.lng,c.lat],'initial');}
  map.on?.('movestart',previewMoving);map.on?.('moveend',previewSettled);
  map.addSource('real-route',{type:'geojson',data:blank()});
  map.addLayer({id:'real-route-halo',type:'line',source:'real-route',paint:{'line-color':'#fff','line-width':6,'line-opacity':.85}});
  for(const [kind,color] of [['search','#087d80'],['transit','#7760ad'],['return','#bb751e']])map.addLayer({id:'real-route-'+kind,type:'line',source:'real-route',filter:['==',['get','kind'],kind],paint:{'line-color':color,'line-width':kind==='search'?3.5:2.5,...(kind==='search'?{}:{'line-dasharray':[3,2]})}});
  const b=S.buildings;
  if(b){
   previewOn=!!previewData;
   map.addSource('real-building-preview',{type:'geojson',data:previewData||blank(),tolerance:0});
   map.addLayer({id:'real-building-preview',type:'fill-extrusion',source:'real-building-preview',minzoom:13,layout:{visibility:'none'},paint:{'fill-extrusion-color':'#a4b6bd','fill-extrusion-height':['get','height'],'fill-extrusion-opacity':.94}},'sequence-casing');
   map.addSource('real-buildings',{type:'vector',tiles:[`recon-map://buildings/${b.build_id}/{z}/{x}/{y}.pbf`],minzoom:b.minzoom,maxzoom:b.maxzoom,bounds:b.bounds,promoteId:'buildingId'});
   map.addLayer({id:'real-building-height',type:'fill-extrusion',source:'real-buildings','source-layer':'buildings',minzoom:13,layout:{visibility:'none'},paint:{'fill-extrusion-color':'#a4b6bd','fill-extrusion-height':['get','height'],'fill-extrusion-opacity':.94}},'sequence-casing');
   map.addLayer({id:'real-building-outline',type:'line',source:'real-buildings','source-layer':'buildings',minzoom:13,paint:{'line-color':'#536e7a','line-width':1.25,'line-opacity':.8}},'sequence-casing');
   map.on?.('sourcedata',finishPreview);
  }
  update();void setEngine(['2d','2.5d','3d'].includes(remembered('engine'))?remembered('engine'):'3d');finishPreview();
 }
 function destroy(){disposed=true;previewGeneration++;previewAbort?.abort();win.clearTimeout(previewTimeout);previewData=null;previewOn=false;win.clearTimeout(planTimer);releaseFrame();map?.off?.('sourcedata',finishPreview);map?.off?.('movestart',previewMoving);map?.off?.('moveend',previewSettled);launchMarker?.remove();launchMarker=null;map=null;planId='';S.plan=null;}
 return {init,prime,render,update,destroy,calculate,focus,get engine(){return engine;},get center(){if(engine==='3d'&&lastView?.center)return lastView.center;const c=map?.getCenter?.();return c?[c.lng,c.lat]:null;},handleClick(point){if(!S.pickLaunch)return false;chooseLaunch([point.lng,point.lat]);return true;}};
}
