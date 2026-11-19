import {mountIcons} from './local-dashboard-icons.mjs';
import {count,stage,estimatePosition,validId,nedPoint,analysisPresentation} from './local-postflight-model.mjs';
const $=id=>document.getElementById(id);
const labels={QUEUED:'연결 대기',CLAIMED:'준비 중',RUNNING:'정찰 중',COMPLETED:'정찰 완료',FAILED:'실패',CANCELLED:'중지됨',EXPIRED:'만료'};
const colors={black:'검정',white:'흰색',gray:'회색',grey:'회색',red:'빨강',orange:'주황',yellow:'노랑',green:'초록',blue:'파랑',purple:'보라',pink:'분홍',brown:'갈색',navy:'남색',beige:'베이지'};
const postures={standing:'서 있음',sitting:'앉음',lying:'누움',unknown:'판별 보류'};
let authenticated=false,selected='',snapshot=null,runRows=[],fresh=false,loading=false,generation=0,lastListAt=0;
let blackbox=null;
function runnerFailure(id){
 const execution=blackbox?.run_id===id?blackbox:control?.job?.run_id===id?control.job:null;
 return execution?.runner_failure?.error==='LOCAL_RUNNER_FAILED'?execution.runner_failure:null;
}
function executionLabel(id,state){return runnerFailure(id)?'실행기 오류로 중단':labels[state]||state||'—';}
function renderExecutionStatus(){
 const failure=runnerFailure(selected);
 $('status').hidden=!!snapshot&&fresh&&!failure;
 $('status').textContent=failure?(failure.cause==='PermissionError'?'상태 파일 접근 오류로 중단':'관제 실행기 오류로 중단')+' · 드론을 다시 연결하세요.':snapshot?executionLabel(selected,snapshot.run_state)+(fresh?'':' · 마지막 조회 내용'):selected?'기록 불러오는 중…':'저장된 기록이 없습니다.';
 const phase=telemetry.at(-1)?.data?.phase,phaseLabels={TAKEOFF:'이륙',ROUTE:'경로 비행',CAPTURE:'수집',RETURN:'복귀',LANDING:'착륙',LAND:'착륙',LANDED:'착륙 완료'};
 $('run-state').textContent=executionLabel(selected,snapshot?.run_state)+(phase&&!failure?' · '+(phaseLabels[phase]||phase):'');
 const row=runRows.find(r=>r.run_id===selected),option=[...$('run-select').options].find(o=>o.value===selected);
 if(row&&option)option.textContent=`${escapeDate(row.requested_at)} · ${row.world} · ${executionLabel(row.run_id,row.state)}`;
}
const fixtureRuns=new Set();
let telemetry=[],telemetryCursor='0',chosen=null,previewKey='',map=null,mapReady=false,fitPending=true,mapData=null,pollTimer,resultPopup=null,mapRenderKey='';
const escapeDate=value=>{if(!value)return '—';const d=new Date(value);return Number.isNaN(d.valueOf())?'시간 미확인':d.toLocaleString('ko-KR',{hour12:false});};
const percent=value=>Number.isFinite(value)?`${Math.round(value*100)}%`:'—';
function element(tag,text,className){const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);if(className)e.className=className;return e;}
function showError(message){$('error').textContent=message;$('error').hidden=!message;}
function assetUrl(id){return validId(id)?`/api/v1/media-assets/${encodeURIComponent(id)}/content`:null;}
// This review page intentionally has no mutation transport.
async function api(path){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{const response=await fetch('/api/v1/'+path,{method:'GET',credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:{'X-Request-ID':crypto.randomUUID()}});
  const result=await response.json().catch(()=>null);
  if(!response.ok){const e=new Error(result?.error?.code||result?.detail||'HTTP '+response.status);e.status=response.status;throw e;}return result;
 }finally{clearTimeout(timer);}
}
const motion=duration=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?0:duration;

function authLost(){authenticated=false;fresh=false;clearTimeout(pollTimer);clearTimeout(controlTimer);$('auth-needed').hidden=false;$('workspace').hidden=true;$('session-state').textContent='로그인 필요';}
async function readLocalJson(path){if(!path||typeof path!=='string')throw new Error('지도 자료 경로 없음');const url=new URL(path,location.origin);if(url.origin!==location.origin)throw new Error('외부 지도 자료 사용 안 함');const r=await fetch(url,{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw new Error(`지도 자료 ${r.status}`);return r.json();}
async function initMap(){
  if(map||!window.maplibregl)return;
  map=new window.maplibregl.Map({container:'map',center:[128.3916,36.14524],zoom:15.4,pitch:0,style:{version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#183039'}}]},attributionControl:false});
  map.addControl(new window.maplibregl.NavigationControl(),'top-right');
  map.addControl(new window.maplibregl.AttributionControl({compact:true,customAttribution:'저장된 캠퍼스 자료 · SIM 추정 위치'}));
  map.on('error',()=>{$('map-error').hidden=false;$('map-error').textContent='일부 지도 자료 표시 지연 · 검출 목록과 원본 프레임을 확인할 수 있습니다.';});
  map.on('load',async()=>{
    map.addSource('route',{type:'geojson',data:{type:'FeatureCollection',features:[]}});map.addLayer({id:'route',type:'line',source:'route',paint:{'line-color':'#53dcca','line-width':3}});
    map.addSource('positions',{type:'geojson',data:{type:'FeatureCollection',features:[]}});map.addLayer({id:'positions',type:'circle',source:'positions',paint:{'circle-color':'#ffb366','circle-radius':7,'circle-stroke-color':'#3f281a','circle-stroke-width':2}});
    map.on('click','positions',e=>{const observationId=e.features?.[0]?.properties?.observation_id;const result=snapshot?.results?.find(r=>r.observation_id===observationId);if(result)viewResult(result);});
    map.on('mouseenter','positions',()=>{map.getCanvas().style.cursor='pointer';});map.on('mouseleave','positions',()=>{map.getCanvas().style.cursor='';});mapReady=true;updateMap();
    try{const manifest=await readLocalJson('/api/environments/kumoh-campus-sim/manifest');mapData=manifest;if(fitPending&&Array.isArray(manifest.bounds)&&manifest.bounds.length===4)map.fitBounds(manifest.bounds,{padding:25,duration:0});
      const [buildings,facilities]=await Promise.all([readLocalJson(manifest.web?.buildingsUrl),manifest.web?.facilitiesUrl?readLocalJson(manifest.web.facilitiesUrl):null]);
      if(facilities){map.addSource('facilities',{type:'geojson',data:facilities});map.addLayer({id:'facilities',type:'fill',source:'facilities',filter:['==',['geometry-type'],'Polygon'],paint:{'fill-color':['match',['get','kind'],'water','#2d6073','wood','#264d3b','green','#466347','road','#60747b','parking','#4d626d','#344b4d'],'fill-opacity':.85}},'route');}
      map.addSource('buildings',{type:'geojson',data:buildings});map.addLayer({id:'buildings',type:'fill',source:'buildings',paint:{'fill-color':'#8aa2ad','fill-opacity':.7}},'route');map.addLayer({id:'building-lines',type:'line',source:'buildings',paint:{'line-color':'#b3c6cd','line-width':.5}},'route');updateMap();
    }catch(e){$('map-error').hidden=false;$('map-error').textContent='캠퍼스 배경 조회 지연 · 결과 좌표와 기록은 계속 표시합니다.';}
  });
}
function geoPoint(sample){const p=sample?.data?.position_geo,g=sample?.data?.geographic;const pair=Array.isArray(p)?p:[g?.longitude,g?.latitude];return Number.isFinite(pair[0])&&Number.isFinite(pair[1])&&Math.abs(pair[0])<=180&&Math.abs(pair[1])<=90?[pair[0],pair[1]]:null;}
function updateMap(){
  const estimates=(snapshot?.results||[]).map(r=>({r,point:estimatePosition(r.sim_estimate)})).filter(v=>v.point);
  const geoTrack=telemetry.map(geoPoint).filter(Boolean);
  $('map-caption').textContent=snapshot?`${analysisPresentation(snapshot).available?'위치 '+estimates.length+'건':'탐지 위치 미분석'} · ${geoTrack.length?'저장 경로 표시':telemetry.length?'로컬 경로는 상세 기록에서 확인':'경로 기록 없음'}`:'기록을 선택하면 경로와 탐지 위치를 표시합니다.';
  if(!mapReady)return;
  const nextKey=JSON.stringify([estimates.map(({r,point})=>[r.observation_id,point]),geoTrack]);
  if(nextKey!==mapRenderKey){
   map.getSource('positions').setData({type:'FeatureCollection',features:estimates.map(({r,point})=>({type:'Feature',geometry:{type:'Point',coordinates:point},properties:{observation_id:r.observation_id}}))});
   map.getSource('route').setData({type:'FeatureCollection',features:geoTrack.length>1?[{type:'Feature',geometry:{type:'LineString',coordinates:geoTrack},properties:{}}]:[]});
   mapRenderKey=nextKey;
  }
  if(fitPending&&(estimates.length||geoTrack.length)){fitPoints([...geoTrack,...estimates.map(v=>v.point)]);fitPending=false;}
}
function fitPoints(points){if(!mapReady||!points.length)return;const b=new window.maplibregl.LngLatBounds();points.forEach(p=>b.extend(p));map.fitBounds(b,{padding:60,maxZoom:18,duration:motion(250)});}
function renderNed(){
  const points=telemetry.map(nedPoint).filter(Boolean),svg=$('ned-track'),key=JSON.stringify(points);if(svg.dataset.renderKey===key)return;svg.dataset.renderKey=key;svg.replaceChildren();if(!points.length)return;
  const east=points.map(p=>p.east),north=points.map(p=>p.north),minE=Math.min(...east),maxE=Math.max(...east),minN=Math.min(...north),maxN=Math.max(...north);
  const scale=Math.min(550/Math.max(1,maxE-minE),170/Math.max(1,maxN-minN));const offsetE=(600-(maxE-minE)*scale)/2,offsetN=(220-(maxN-minN)*scale)/2;
  const path=document.createElementNS('http://www.w3.org/2000/svg','polyline');path.setAttribute('points',points.map(p=>`${offsetE+(p.east-minE)*scale},${220-offsetN-(p.north-minN)*scale}`).join(' '));path.setAttribute('fill','none');path.setAttribute('stroke','#53dcca');path.setAttribute('stroke-width','2.5');svg.append(path);
  const text=document.createElementNS('http://www.w3.org/2000/svg','text');text.setAttribute('x','14');text.setAttribute('y','20');text.setAttribute('fill','#aac4ce');text.setAttribute('font-size','11');text.textContent=`북 ↑  ·  ${points.length}개 수신 위치  ·  동서 ${(maxE-minE).toFixed(1)}m / 남북 ${(maxN-minN).toFixed(1)}m`;svg.append(text);
}
function preview(frame,result=null){
 const key=(result?.observation_id||frame?.frame_id||'')+':'+(frame?.asset_id||'');if(key===previewKey)return;previewKey=key;
 const src=assetUrl(frame?.asset_id);$('preview-title').textContent=result?'선택한 탐지 원본':'최근 저장 영상';$('latest-preview').hidden=!result;$('back-observations').hidden=!result;
 $('capture-time').textContent=escapeDate(frame?.capture_at);$('bbox').replaceChildren();$('expand-preview').disabled=true;
 const point=estimatePosition(result?.sim_estimate);$('observation-detail').hidden=!result;
 $('observation-detail').textContent=result?[colorText(result),postureText(result),'사람 탐지 '+percent(result.confidence),point?'SIM 추정 '+point[1].toFixed(6)+', '+point[0].toFixed(6):'위치 확인 안 됨'].join(' · '):'';
 $('image-wrap').hidden=true;$('preview-empty').hidden=false;
 if(!src){$('preview-empty').textContent=selected?'저장된 영상이 없습니다.':'정찰 기록을 선택하세요.';$('preview-caption').textContent='';return;}
 $('preview-empty').textContent='원본 불러오는 중…';$('preview-caption').textContent=result?'이 기록의 분석에 사용한 원본':'저장 프레임 · 실시간 영상 아님';
 $('preview-image').onload=()=>{if(key!==previewKey)return;$('image-wrap').hidden=false;$('preview-empty').hidden=true;$('expand-preview').disabled=false;};
 $('preview-image').onerror=()=>{if(key!==previewKey)return;$('image-wrap').hidden=true;$('preview-empty').hidden=false;$('preview-empty').textContent='영상 조회 실패 · 새로고침으로 다시 확인하세요.';previewKey='';};
 $('preview-image').src=src;
 const b=result?.bbox;
 if(b?.convention==='PIXEL_XYXY'&&[b.x1,b.y1,b.x2,b.y2,b.source_width,b.source_height].every(Number.isFinite)&&b.source_width>0&&b.source_height>0&&b.x2>b.x1&&b.y2>b.y1){
  $('bbox').setAttribute('viewBox','0 0 '+b.source_width+' '+b.source_height);const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');for(const [k,v]of Object.entries({x:b.x1,y:b.y1,width:b.x2-b.x1,height:b.y2-b.y1,fill:'none',stroke:'#ffb366','stroke-width':Math.max(2,b.source_width/300)}))rect.setAttribute(k,String(v));$('bbox').append(rect);
 }
}
function openMedia(){
 if($('expand-preview').disabled)return;
 $('full-image').src=$('preview-image').src;$('media-description').textContent=$('capture-time').textContent+' · '+$('preview-title').textContent;
 $('full-bbox').replaceChildren(...[...$('bbox').children].map(node=>node.cloneNode(true)));$('full-bbox').setAttribute('viewBox',$('bbox').getAttribute('viewBox')||'0 0 1 1');$('media-dialog').showModal();
}

function colorText(result){const upper=result.appearance?.upper;if(upper?.status!=='OK'||!upper.top?.length)return '상의색 보류';const top=upper.top[0];return `상의 ${colors[top.color]||top.color} ${percent(top.p)}`;}
function postureText(result){const p=result.posture;return p?.label?`${postures[p.label]||p.label} ${percent(p.p?.[p.label])}`:'자세 보류';}
function viewResult(result){chosen=result.observation_id;preview(result,result);renderResults();$('preview-panel').focus({preventScroll:true});$('preview-panel').scrollIntoView({behavior:motion(250)?'smooth':'instant',block:'start'});resultPopup?.remove();resultPopup=null;const pos=estimatePosition(result.sim_estimate);if(pos&&mapReady){map.flyTo({center:pos,zoom:18,duration:motion(250)});const node=element('div');node.append(element('strong','SIM 추정 위치'),element('p',colorText(result)),element('p',postureText(result)),element('p','수직 기준 미검증 · 확정 위치 아님'));resultPopup=new window.maplibregl.Popup({focusAfterOpen:false}).setLngLat(pos).setDOMContent(node).addTo(map);}}
function renderResults(){
  const term=$('result-search').value.trim().toLocaleLowerCase(),filter=$('result-location').value;
  const results=(snapshot?.results||[]).filter(r=>(!term||(colorText(r)+' '+postureText(r)).toLocaleLowerCase().includes(term))&&(filter==='all'||!!estimatePosition(r.sim_estimate)===(filter==='located'))),host=$('results');
  const key=JSON.stringify([selected,term,filter,results,snapshot?.results_total,snapshot?.analysis,snapshot?.capture?.frames_stored]);
  if(key===host.dataset.renderKey){for(const card of host.querySelectorAll('[data-observation-id]'))card.setAttribute('aria-pressed',String(chosen===card.dataset.observationId));return;}
  const analysis=analysisPresentation(snapshot);
  host.dataset.renderKey=key;host.replaceChildren();$('result-total').textContent=analysis.label;$('result-window').textContent=results.length?`${results.length}건 표시`:analysis.available?'분석 범위 내 탐지 없음':analysis.label;
  $('result-search').disabled=!analysis.available;$('result-location').disabled=!analysis.available;
  if(!results.length){host.append(element('p',analysis.available&&(term||filter!=='all')?'일치하는 관측이 없습니다.':analysis.message,'empty'));return;}
  results.forEach((r,i)=>{const card=element('button',undefined,'result-card');card.type='button';card.dataset.observationId=r.observation_id;card.setAttribute('aria-pressed',String(chosen===r.observation_id));card.setAttribute('aria-label',`관측 ${i+1} ${colorText(r)} ${postureText(r)} 증거 보기`);
    const src=assetUrl(r.asset_id);if(src){const img=element('img');img.src=src;img.loading='lazy';img.alt=`관측 ${i+1} 원본 프레임`;card.append(img);}
    const body=element('div',undefined,'card-body'),title=element('div',undefined,'card-title');title.append(element('strong',`관측 ${i+1}`),element('small',`사람 ${percent(r.confidence)}`));const tags=element('div',undefined,'tags');tags.append(element('span',colorText(r),'tag'),element('span',postureText(r),'tag'));const pos=estimatePosition(r.sim_estimate);tags.append(element('span',pos?'SIM 추정':'좌표 보류',pos?'tag estimate':'tag'));
    body.append(title,tags,element('p',escapeDate(r.capture_at)),element('p',pos?`${pos[1].toFixed(6)}, ${pos[0].toFixed(6)} · 수직 기준 미검증`:'좌표 검증 전 · 영상 결과는 유지'));card.append(body);card.addEventListener('click',()=>viewResult(r));host.append(card);
  });
}
function render(){
 const a=snapshot?.analysis||{},c=snapshot?.capture||{};
 renderExecutionStatus();
 for(const [id,value]of Object.entries({'frames-count':c.frames_stored,'pose-count':c.pose_present,'results-count':snapshot?.results_total}))$(id).textContent=snapshot?count(value).toLocaleString():'—';
 $('results-count').textContent=analysisPresentation(snapshot).label;
 $('analysis-summary').textContent=[count(a.completed),count(a.queued)+count(a.running),count(a.failed)].join(' / ');
 $('info-run').textContent=selected||'—';$('info-mission').textContent=snapshot?.mission_id||'—';$('pose-state').textContent=c.latest_frame?.pose?'촬영 자세 저장됨':'자세 기록 없음';$('track-time').textContent=escapeDate(telemetry.at(-1)?.captured_at);
 const result=(snapshot?.results||[]).find(r=>r.observation_id===chosen);if(result)preview(result,result);else{chosen=null;preview(c.latest_frame);}
 renderResults();renderNed();updateMap();renderProvenance();renderBlackbox();
}
function renderBlackbox(){
 const ready=blackbox?.run_id===selected&&blackbox.ready,video=$('record-video');
 $('record-blackbox').hidden=!ready;
 const url=ready?blackbox.video_url:'';
 if((video.dataset.source||'')!==url){video.pause();if(url)video.src=url;else video.removeAttribute('src');video.dataset.source=url;video.load();}
 if(blackbox?.run_id===selected&&blackbox?.mode==='BLACKBOX'){
  $('frames-count').textContent=count(blackbox.recorded_frames).toLocaleString();
  $('pose-count').textContent=count(blackbox.recorded_frames).toLocaleString();
  $('preview-panel').hidden=!chosen;
 }else $('preview-panel').hidden=false;
 $('record-drive-status').textContent=blackbox?.archive_state==='DRIVE_STAGED'?'Google Drive 폴더 저장됨':'Google Drive 저장 대기 · 로컬 영상 재생 가능';
}

async function loadRuns(){const list=await api('simulations/runs?limit=50');if(!Array.isArray(list))throw new Error('실행 목록 형식 확인 필요');for(const r of list)if((r.simulator_version||r.request?.simulator_version).match(/LOCAL_POSTFLIGHT_API_CONTRACT_FIXTURE_NO_FLIGHT|LOCAL_REALTIME_SMOKE_REPLAY_V1/))fixtureRuns.add(r.run_id);runRows=list.filter(r=>['POSTFLIGHT','LIVE'].includes(r.request?.pipeline_config?.analysis_policy)&&!fixtureRuns.has(r.run_id));const select=$('run-select');select.replaceChildren();const empty=element('option',runRows.length?'정찰 기록 선택':'정찰 기록이 아직 없습니다.');empty.value='';select.append(empty);
  runRows.forEach(r=>{const o=element('option',`${escapeDate(r.requested_at)} · ${r.world} · ${executionLabel(r.run_id,r.state)}`);o.value=r.run_id;select.append(o);});select.value=selected;lastListAt=Date.now();
  if(!selected&&runRows.length)selectRun(runRows[0].run_id);
}
function selectRun(id){if(!validId(id)){showError('올바른 실행 ID를 입력하세요.');return;}if(id===selected)return;generation++;selected=id;snapshot=null;fresh=false;telemetry=[];telemetryCursor='0';chosen=null;previewKey='';fitPending=true;loading=false;resultPopup?.remove();resultPopup=null;$('run-id').value=id;$('run-select').value=id;$('result-search').value='';$('result-location').value='all';const url=new URL(location.href);url.searchParams.set('run',id);history.replaceState(null,'',url);showError('');render();void refresh();}
async function readTelemetry(id,version){
  for(let page=0;page<5;page++){const result=await api(`simulations/runs/${id}/samples?kind=TELEMETRY&after=${encodeURIComponent(telemetryCursor)}&limit=200`);if(version!==generation)return;if(!Array.isArray(result.samples))throw new Error('경로 기록 형식 확인 필요');telemetry.push(...result.samples);telemetry=telemetry.slice(-10000);telemetryCursor=result.next_cursor;if(result.samples.length<200)break;}
}
async function refresh(){
  if(!authenticated||loading)return;const version=generation,id=selected;loading=true;
  try{if(Date.now()-lastListAt>15000)await loadRuns();if(!id||version!==generation)return;const [value,recording]=await Promise.all([api(`simulations/runs/${id}/postflight?limit=100`),api(`local-patrol/recordings/${id}`).catch(()=>null),readTelemetry(id,version)]);if(version!==generation)return;
    blackbox=recording;
    if(recording?.job_id){const track=await api(`local-patrol/${recording.job_id}/track`);if(version!==generation)return;if(track.run_id===id&&track.samples?.length)telemetry=track.samples;}
    if(value.run_id!==id||!['POSTFLIGHT','LIVE'].includes(value.analysis_policy)||value.realtime_vision_enabled!==(value.analysis_policy==='LIVE'))throw new Error('정찰 영상 수집 정책을 확인할 수 없습니다.');snapshot=value;fresh=true;$('info-update').textContent=escapeDate(new Date().toISOString());$('session-state').textContent='기록 연결됨';showError('');render();
  }catch(e){if(version!==generation)return;fresh=false;if(e.status===401){authLost();return;}showError(`조회 지연 · ${e.name==='AbortError'?'응답 시간 초과':e.message}`);$('session-state').textContent='갱신 지연';render();}
  finally{if(version===generation)loading=false;clearTimeout(pollTimer);if(authenticated)pollTimer=setTimeout(()=>void refresh(),3000);}
}
// Read the latest capture identity without following or changing the record the user is reviewing.
let control=null,controlTimer=null,controlBusy=false;
function renderProvenance(){
 const node=$('result-provenance'),source=control?.source_run_id;
 node.hidden=!selected;
 node.textContent=selected===source?'이전 분석 기록 · 이 기록의 영상·탐지·추정 위치입니다.':selected===control?.job?.run_id?'최근 수집 기록 · 새 영상 분석은 꺼져 있습니다.':'선택한 정찰의 저장 기록';
 $('current-capture').setAttribute('aria-pressed',String(!!selected&&selected===control?.job?.run_id));
 $('previous-results').setAttribute('aria-pressed',String(!!selected&&selected===source));
}
async function refreshControl(){
 if(!authenticated||controlBusy)return;controlBusy=true;
 try{control=await api('local-patrol');$('current-capture').disabled=!control.job?.registered;$('previous-results').disabled=!validId(control.source_run_id);renderProvenance();renderExecutionStatus();}
 catch(e){$('current-capture').disabled=true;$('previous-results').disabled=true;if(e.status===401)authLost();}
 finally{controlBusy=false;clearTimeout(controlTimer);if(authenticated)controlTimer=setTimeout(()=>void refreshControl(),5000);}
}
$('current-capture').addEventListener('click',()=>{if(control?.job?.registered)selectRun(control.job.run_id);});
$('previous-results').addEventListener('click',()=>{if(validId(control?.source_run_id))selectRun(control.source_run_id);});
$('result-search').addEventListener('input',renderResults);$('result-location').addEventListener('change',renderResults);
$('back-observations').addEventListener('click',()=>{const card=[...$('results').children].find(n=>n.dataset.observationId===chosen);if(card){card.focus({preventScroll:true});card.scrollIntoView({behavior:motion(250)?'smooth':'instant',block:'center'});}});
$('expand-preview').addEventListener('click',openMedia);$('close-media').addEventListener('click',()=>$('media-dialog').close());

$('run-form').addEventListener('submit',e=>{e.preventDefault();selectRun($('run-id').value.trim());});$('run-select').addEventListener('change',()=>{if($('run-select').value)selectRun($('run-select').value);});$('refresh').addEventListener('click',()=>{lastListAt=0;void refresh();});$('latest-preview').addEventListener('click',()=>{chosen=null;previewKey='';render();});$('fit-map').addEventListener('click',()=>{const points=[...telemetry.map(geoPoint).filter(Boolean),...(snapshot?.results||[]).map(r=>estimatePosition(r.sim_estimate)).filter(Boolean)];if(points.length)fitPoints(points);else if(mapData?.bounds)map.fitBounds(mapData.bounds,{padding:25,duration:motion(250)});});
async function boot(){try{const session=await api('auth/me');authenticated=true;$('workspace').hidden=false;$('session-state').textContent='로컬 연결';initMap();const requested=new URL(location.href).searchParams.get('run');if(requested&&validId(requested))selectRun(requested);await loadRuns();render();await refresh();void refreshControl();}catch(e){if(e.status===401)authLost();else{showError(`연결 확인 필요 · ${e.message}`);$('workspace').hidden=false;$('session-state').textContent='연결 확인 필요';}}}
mountIcons();
void boot();
