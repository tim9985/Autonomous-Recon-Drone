import {cropWindow} from './local-search.mjs';
import {missionCreationClock,missionCreationLabel,missionsByCreationDay} from './local-mission-picker.mjs';

const blank=()=>({type:'FeatureCollection',features:[]});
const stateName=s=>({COMPLETED:'완료',PARTIAL:'일부 완료',FAILED:'실패',CANCELLED:'취소',INTERRUPTED:'중단',RUNNING:'진행 중',QUEUED:'대기',READY:'계획 준비'}[s]||s||'준비');
const typeName=k=>({'mission':'로컬 SIM','real-mission':'실지도','case':'사건'}[k]);
const date=t=>t?new Date(t*1000).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}):'—';
const clock=t=>new Date(t*1000).toLocaleTimeString('ko-KR',{hour12:false});
const seconds=t=>Math.max(0,Number(t)||0),duration=t=>`${Math.floor(seconds(t)/60)}분 ${Math.floor(seconds(t)%60)}초`;
const finitePoint=p=>Array.isArray(p)&&p.length>=2&&p.slice(0,2).every(Number.isFinite);

export function timelineModel(data){
 const cells=(data.coverage?.features||[]).filter(f=>Number.isFinite(f.properties?.observed_at)&&Number.isFinite(f.properties?.area_m2)).sort((a,b)=>a.properties.observed_at-b.properties.observed_at);
 const events=[];let area=0;for(const f of cells){area+=f.properties.area_m2;events.push({at:f.properties.observed_at,area});}
 const track=(data.track||[]).filter(p=>Number.isFinite(p.at)&&finitePoint(p.point)).sort((a,b)=>a.at-b.at);
 const detections=(data.detections||[]).filter(p=>Number.isFinite(p.at)).sort((a,b)=>a.at-b.at);
 const starts=[data.job?.started_at??data.job?.created_at,events[0]?.at,track[0]?.at,detections[0]?.at].filter(Number.isFinite);
 const ends=[data.job?.finished_at,events.at(-1)?.at,track.at(-1)?.at,detections.at(-1)?.at].filter(Number.isFinite);
 const start=starts.length?Math.min(...starts):0,end=ends.length?Math.max(start,...ends):start;
 const target=data.coverage?.complete_scope?data.coverage.target_area_m2:0;
 const upper=(list,at)=>{let lo=0,hi=list.length;while(lo<hi){const mid=(lo+hi)>>1;if(list[mid].at<=at)lo=mid+1;else hi=mid;}return lo;};
 return{start,end,events,track,detections,target,cells,
  at(time){const count=upper(events,time),observed=events[count-1]?.area||0,people=new Map();
   for(let i=0,n=upper(detections,time);i<n;i++){const r=detections[i];people.set(r.candidate_id||r.track_id||r.observation_id,r);}
   return{area:observed,percent:target>0?Math.min(100,100*observed/target):null,count,people:[...people.values()].reverse(),track:track.slice(0,upper(track,time))};}
 };
}

export function mountRecordTools({doc=document,api,getCurrent,onBeforeOpen=async()=>{},onChanged=async()=>{},onError=()=>{},icons=()=>{}}){
 const win=doc.defaultView,node=(tag,text,cls)=>{const e=doc.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 const button=(label,icon,cls='')=>{const e=node('button',undefined,cls);e.type='button';e.setAttribute('aria-label',label);e.title=label;const i=node('span');i.dataset.icon=icon;i.setAttribute('aria-hidden','true');e.append(i,node('span',label));return e;};
 const style=node('link');style.rel='stylesheet';style.href='/local-records.css';doc.head.append(style);
 const toolbar=node('div',undefined,'record-toolbar'),summaryButton=button('임무 요약','ChartBar'),libraryButton=button('기록 관리','Folder');
 toolbar.append(summaryButton,libraryButton);doc.querySelector('.mission-identity')?.append(toolbar);icons(toolbar);
 const summary=node('dialog',undefined,'record-summary-dialog'),library=node('dialog',undefined,'record-library-dialog');
 summary.setAttribute('aria-labelledby','record-summary-title');library.setAttribute('aria-labelledby','record-library-title');
 summary.innerHTML=`<header class="record-dialog-header">
 <div class="record-summary-heading">
   <button type="button" id="record-summary-back" aria-label="기록 목록으로 돌아가기" title="기록 목록으로 돌아가기" hidden><span data-icon="ArrowLeft" aria-hidden="true"></span>목록</button>
   <div><small id="record-summary-kind"></small><h2 id="record-summary-title">임무 요약</h2></div>
 </div>
 <div class="record-header-actions"><button type="button" id="record-refresh" aria-label="요약 새로고침" title="새로고침"><span data-icon="Refresh" aria-hidden="true"></span></button><button type="button" id="record-summary-close" aria-label="임무 요약 닫기"><span data-icon="X" aria-hidden="true"></span></button></div></header>
 <div class="record-run-bar"><label for="record-run">실행 회차</label><select id="record-run"></select><span id="record-run-state"></span></div>
 <div id="record-summary-error" class="record-error" role="alert" hidden></div><div id="record-loading" class="record-loading" role="status">기록을 불러오는 중…</div>
 <div id="record-summary-content" hidden><div class="record-summary-layout"><section class="record-map-stage" aria-label="임무 지도"><div id="record-summary-map" aria-label="정찰 기록 지도"></div><div class="record-map-legend"><span><i class="record-gray"></i>정찰 구역</span><span><i class="record-green"></i>실제 관측</span><span><i class="record-blue"></i>사람 후보</span><span><i class="record-line"></i>예상 경로</span><span><i class="record-track-key"></i>비행 궤적</span></div><div id="record-person-detail" class="record-person-detail" hidden></div></section>
 <aside class="record-summary-side"><div id="record-stats" class="record-stats"></div><h3>사람 탐지 <span id="record-people-count"></span></h3><div id="record-people" class="record-people"></div><h3>구역 진행</h3><div id="record-regions" class="record-regions"></div></aside></div>
 <section id="record-timeline" class="record-timeline" aria-label="시간순 관측 진행"><div class="record-time-heading"><button id="record-play" type="button" aria-label="시간순 기록 재생"><span data-icon="PlayerPlay" aria-hidden="true"></span><span>재생</span></button><strong id="record-time-value"></strong><span id="record-time-progress"></span></div><svg id="record-progress-chart" viewBox="0 0 1000 48" preserveAspectRatio="none" role="img" aria-label="시간순 실제 관측 면적"></svg><input id="record-time" type="range" min="0" max="1000" value="1000" aria-label="관측 기록 시각"><div class="record-time-labels"><span id="record-start-time"></span><span id="record-end-time"></span></div></section><p id="record-notices" class="record-notices"></p></div>`;
 library.innerHTML=`<header class="record-dialog-header"><div><small>저장된 임무와 사건</small><h2 id="record-library-title">기록 관리</h2></div><button type="button" id="record-library-close" aria-label="기록 관리 닫기"><span data-icon="X" aria-hidden="true"></span></button></header><div class="record-library-tabs" role="tablist" aria-label="기록 분류"><button type="button" role="tab" data-kind="mission" aria-selected="true">임무</button><button type="button" role="tab" data-kind="case" aria-selected="false" tabindex="-1">사건</button><button type="button" role="tab" data-kind="trash" aria-selected="false" tabindex="-1">휴지통</button></div><label class="record-library-search"><span data-icon="Search" aria-hidden="true"></span><input id="record-filter" type="search" placeholder="기록 이름 검색" aria-label="기록 이름 검색"></label><p id="record-library-status" role="status"></p><div id="record-list" class="record-list" role="tabpanel"></div><section id="record-delete-confirm" class="record-delete-confirm" hidden><strong id="record-delete-title"></strong><p id="record-delete-description"></p><div><button type="button" id="record-delete-cancel">취소</button><button type="button" id="record-delete-submit" class="record-danger">휴지통으로 이동</button></div></section><p class="record-library-note">삭제한 기록은 휴지통에서 복원할 수 있습니다. 녹화와 원본 관측 자료는 유지됩니다.</p>`;
 doc.body.append(summary,library);icons(summary);icons(library);
 const $=id=>doc.getElementById(id);
 let current=null,data=null,model=null,map=null,mapReady=false,sequence=0,libraryVersion=0,timer=null,raf=null,summaryOpener=null,rows=[],tab='mission',pending=null,mutating=false,detailId=null;
 const valid=seq=>summary.open&&seq===sequence;
 function stop(){win.clearInterval(timer);timer=null;$('record-play').firstElementChild.dataset.icon='PlayerPlay';icons($('record-play'));$('record-play').setAttribute('aria-label','시간순 기록 재생');$('record-play').lastElementChild.textContent='재생';}
 const mobileQuery=win.matchMedia?.('(max-width:1023px)');
 function render(){
  summaryButton.disabled=!getCurrent();
  const phone=mobileQuery?.matches&&doc.querySelector('.mobile-mission-overview');
  const target=phone||doc.querySelector('.mission-identity');
  if(target&&toolbar.parentElement!==target){if(phone)target.prepend(toolbar);else target.append(toolbar);}
 }
 mobileQuery?.addEventListener?.('change',render);
 function closeSummary(){
  if(!summary.open)return;
  stop();sequence++;win.cancelAnimationFrame?.(raf);map?.remove();map=null;mapReady=false;data=null;model=null;detailId=null;
  summary.close();
  const target=summaryOpener?.isConnected?summaryOpener:(library.open?$('record-filter'):summaryButton);
  target.focus({preventScroll:true});
  summaryOpener=null;
 }
 function closeRecords(){
  closeSummary();
  if(library.open)library.close();
 }
 function mapData(id,value){map?.getSource(id)?.setData(value);}
 function focusPoint(point){if(mapReady&&finitePoint(point))map.easeTo({center:point,zoom:Math.max(map.getZoom(),18),duration:win.matchMedia?.('(prefers-reduced-motion: reduce)').matches?0:350});}
 function showPerson(row){
  detailId=row.observation_id;const host=$('record-person-detail');host.replaceChildren();host.hidden=false;
  const close=button('탐지 상세 닫기','X');close.onclick=()=>{detailId=null;host.hidden=true;};
  const head=node('div',undefined,'record-person-heading');head.append(node('strong','사람 후보 · '+clock(row.at)),close);host.append(head);
  if(row.asset_id){const media=node('div',undefined,'record-person-image'),img=node('img');img.alt='탐지된 사람 객체';img.src='/api/v1/media-assets/'+encodeURIComponent(row.asset_id)+'/content';const crop=cropWindow(row,1.3);
   if(crop){img.style.width=crop.sourceWidth/crop.width*100+'%';img.style.height=crop.sourceHeight/crop.height*100+'%';img.style.left=-crop.x/crop.width*100+'%';img.style.top=-crop.y/crop.height*100+'%';}media.append(img);host.append(media);}
  host.append(node('small',finitePoint(row.point)?'지도 위치는 영상과 자세 정보로 계산한 추정치입니다.':'이 탐지는 위치 좌표가 없습니다.'));
  const locate=button('해당 위치 보기','MapPin');locate.disabled=!finitePoint(row.point);locate.onclick=()=>{focusPoint(row.point);mapData('record-focus',{type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Point',coordinates:row.point},properties:{}}]});};host.append(locate);icons(host);
 }
 function updateTime(){
  if(!model||!data)return;const time=model.start+(model.end-model.start)*Number($('record-time').value)/1000,snapshot=model.at(time);
  $('record-time-value').textContent=model.start?clock(time):'실행 전';$('record-time-progress').textContent=snapshot.percent===null?`관측 ${Math.round(snapshot.area).toLocaleString()} m²`:`실제 관측 ${snapshot.percent.toFixed(1)}%`;
  const known=data.actual&&(!data.detection_state||data.detection_state==='AVAILABLE');
  const facts=[['실행',data.job?stateName(data.job.state):'계획만 저장'],['경과',data.actual?duration(time-model.start):'—'],['실제 관측',snapshot.percent===null?'—':snapshot.percent.toFixed(1)+'%'],['사람 후보',known?String(snapshot.people.length):'—']];
  $('record-stats').replaceChildren(...facts.map(([label,value])=>{const n=node('div');n.append(node('small',label),node('strong',value));return n;}));
  $('record-people-count').textContent=known?String(snapshot.people.length):'';const people=$('record-people');people.replaceChildren();
  for(const row of snapshot.people.slice(0,80)){const b=node('button',undefined,'record-person-row');b.type='button';const tag=node('span',finitePoint(row.point)?'●':'○','record-person-dot');const text=node('span');text.append(node('strong','후보 '+String(row.candidate_id||row.track_id||row.observation_id).slice(-6)),node('small',clock(row.at)+(finitePoint(row.point)?'':' · 위치 미상')));b.append(tag,text);b.onclick=()=>showPerson(row);people.append(b);}
  if(!snapshot.people.length)people.append(node('p',data.detection_state==='UNAVAILABLE'?'탐지 기록을 불러오지 못했습니다.':known?'해당 시각까지 사람 탐지 기록이 없습니다.':'탐지 기록이 없습니다.','record-empty'));
  if(snapshot.people.length>80)people.append(node('p','최근 후보 80개 표시','record-empty'));
  if(detailId&&!snapshot.people.some(p=>p.observation_id===detailId)){$('record-person-detail').hidden=true;detailId=null;mapData('record-focus',blank());}
  const regionArea=new Map();for(let i=0;i<snapshot.count;i++){const f=model.cells[i];regionArea.set(f.properties.region_id,(regionArea.get(f.properties.region_id)||0)+f.properties.area_m2);}
  $('record-regions').replaceChildren(...(data.coverage?.regions||[]).map(r=>{const n=node('div'),p=r.target_area_m2>0?Math.min(100,(regionArea.get(r.region_id)||0)*100/r.target_area_m2):null;n.append(node('span',r.name||r.region_id),node('strong',p===null?'기록 없음':p.toFixed(1)+'%'));return n;}));
  if(!data.coverage?.regions?.length){
   const regions=data.region_refs?.length?data.region_refs:(data.regions?.features||[]).map(f=>f.properties);
   if(!data.actual&&regions.length)for(const [i,r] of regions.entries()){const n=node('div');n.append(node('span',r.name||r.id),node('strong',(i+1)+'번 · 계획'));$('record-regions').append(n);}
   else $('record-regions').append(node('p','실제 관측 기록 없음','record-empty'));
  }
  if(mapReady){map.setFilter('record-observed-fill',['<=',['get','observed_at'],time]);
   mapData('record-track',{type:'FeatureCollection',features:snapshot.track.length>1?[{type:'Feature',geometry:{type:'LineString',coordinates:snapshot.track.map(p=>p.point)},properties:{}}]:[]});
   mapData('record-people',{type:'FeatureCollection',features:snapshot.people.filter(p=>finitePoint(p.point)).map(p=>({type:'Feature',geometry:{type:'Point',coordinates:p.point},properties:{id:p.observation_id}}))});
   mapData('record-drone',{type:'FeatureCollection',features:snapshot.track.length?[{type:'Feature',geometry:{type:'Point',coordinates:snapshot.track.at(-1).point},properties:{}}]:[]});}
 }
 function chart(){
  const target=model.target||Math.max(1,model.events.at(-1)?.area||0),span=model.end-model.start||1;
  let path='M 0 48';for(const e of model.events){const x=1000*(e.at-model.start)/span,y=48-46*Math.min(1,e.area/target);path+=` H ${x.toFixed(1)} V ${y.toFixed(1)}`;}path+=' H 1000 V 48 Z';
  const p=doc.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',path);$('record-progress-chart').replaceChildren(p);
 }
 function createMap(){
  map?.remove();map=null;mapReady=false;const host=$('record-summary-map');host.replaceChildren();
  if(!win.maplibregl){host.append(node('p','지도 표시 모듈을 불러오지 못했습니다.','record-empty'));return;}
  const defaults=data.mode==='REAL'?[128.391,36.146]:[128.3916,36.1458];
  map=new win.maplibregl.Map({container:host,center:defaults,zoom:16,attributionControl:false,style:{version:8,sources:{base:{type:'raster',tiles:[win.location.origin+'/api/v1/local-search/real-map/tiles/{z}/{x}/{y}.png'],tileSize:256,maxzoom:19}},layers:[{id:'background',type:'background',paint:{'background-color':'#e9eeeb'}},{id:'base',type:'raster',source:'base',paint:{'raster-opacity':.75}}]}});
  map.addControl(new win.maplibregl.NavigationControl({showCompass:false}),'top-right');map.addControl(new win.maplibregl.AttributionControl({compact:true,customAttribution:'© VWorld · 정찰 기록'}),'bottom-right');
  const ownedMap=map,seq=sequence;
  map.on('load',()=>{if(!valid(seq)||map!==ownedMap||!data)return;mapReady=true;
   for(const [id,value]of [['record-regions',data.regions],['record-route',data.route],['record-observed',{type:'FeatureCollection',features:data.coverage?.features||[]}],['record-track',blank()],['record-people',blank()],['record-focus',blank()],['record-drone',blank()]])map.addSource(id,{type:'geojson',data:value||blank()});
   map.addLayer({id:'record-region-fill',type:'fill',source:'record-regions',paint:{'fill-color':'#8c969d','fill-opacity':.38}});
   map.addLayer({id:'record-region-line',type:'line',source:'record-regions',paint:{'line-color':'#4e6972','line-width':2}});
   map.addLayer({id:'record-observed-fill',type:'fill',source:'record-observed',paint:{'fill-color':'#2ca87b','fill-opacity':.62}});
   map.addLayer({id:'record-route-line',type:'line',source:'record-route',paint:{'line-color':'#69778a','line-width':2,'line-dasharray':[3,3]}});
   map.addLayer({id:'record-track-line',type:'line',source:'record-track',paint:{'line-color':'#006b75','line-width':3}});
   map.addLayer({id:'record-people-dot',type:'circle',source:'record-people',paint:{'circle-color':'#2879d2','circle-radius':7,'circle-stroke-color':'white','circle-stroke-width':2}});
   map.addLayer({id:'record-focus-dot',type:'circle',source:'record-focus',paint:{'circle-color':'#e28a28','circle-radius':11,'circle-stroke-color':'white','circle-stroke-width':3}});
   map.addLayer({id:'record-drone-dot',type:'circle',source:'record-drone',paint:{'circle-color':'#075d67','circle-radius':5,'circle-stroke-color':'white','circle-stroke-width':2}});
   map.on('click','record-people-dot',event=>{const id=event.features?.[0]?.properties?.id,row=model.detections.find(r=>r.observation_id===id);if(row)showPerson(row);});
   fitRecord();updateTime();});
 }
 function fitRecord(){
  const bounds=new win.maplibregl.LngLatBounds();const walk=p=>{if(finitePoint(p))bounds.extend(p.slice(0,2));else if(Array.isArray(p))p.forEach(walk);};
  for(const f of [...(data.regions?.features||[]),...(data.route?.features||[]),...(data.coverage?.features||[])])walk(f.geometry?.coordinates);
  for(const region of data.region_refs||[])walk(region.point);
  walk(data.launch);model.track.forEach(r=>walk(r.point));model.detections.forEach(r=>walk(r.point));
  if(!bounds.isEmpty())map.fitBounds(bounds,{padding:36,maxZoom:18,duration:0});
 }
 async function outlines(value){
  const read=async url=>{const r=await win.fetch(url,{credentials:'same-origin',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error();return r.json();};
  const releases=await read('/api/v1/spatial-releases');
  if(!releases.some(r=>r.environment_id==='gumi-city'&&r.release_id===value.release_id))throw Error();
  return read('/api/map/real-regions?ids='+encodeURIComponent(value.region_refs.map(r=>r.id).join(',')));
 }
 async function loadSummary(job){
  stop();map?.remove();map=null;mapReady=false;const seq=++sequence;$('record-loading').hidden=false;$('record-summary-error').hidden=true;$('record-summary-content').hidden=true;detailId=null;$('record-person-detail').hidden=true;
  try{const next=await api(`/${current.kind}/${current.id}/summary`+(job?'?job_id='+encodeURIComponent(job):''));if(!valid(seq))return;
   data=next;model=timelineModel(data);$('record-summary-title').textContent=data.record.title;
   $('record-summary-kind').textContent=data.record.kind==='case'?'사건 · 정찰 기록':typeName(data.record.kind)+' · 임무 요약 · '+missionCreationLabel(data.record);
   $('record-run').replaceChildren(...data.runs.map((r,i)=>{const o=node('option',`${data.runs.length-i}회 · ${date(r.started_at||r.created_at)} · ${stateName(r.state)}`);o.value=r.job_id;return o;}));
   $('record-run').disabled=!data.runs.length;if(data.job)$('record-run').value=data.job.job_id;else{const o=node('option','실행 기록 없음');$('record-run').append(o);}
   $('record-run-state').textContent=data.actual?'실제 수집 기록':'예상 경로';$('record-notices').textContent=data.notices.join(' ');
   $('record-start-time').textContent=date(model.start);$('record-end-time').textContent=date(model.end);$('record-time').value='1000';$('record-time').disabled=!data.actual||model.end<=model.start;$('record-play').disabled=$('record-time').disabled;
   $('record-timeline').hidden=!data.actual;$('record-summary-content').hidden=false;chart();updateTime();createMap();
   $('record-loading').hidden=true;
   if(data.mode==='REAL'&&data.region_refs?.length){try{const geo=await outlines(data);if(valid(seq)&&geo?.features){data.regions=geo;if(mapReady)mapData('record-regions',geo);}}catch{if(valid(seq))$('record-notices').textContent+=' 저장 당시 버전의 구역 경계는 확인할 수 없습니다.';}}
  }catch(e){if(valid(seq)){$('record-summary-error').textContent=e.message;$('record-summary-error').hidden=false;}}
  finally{if(valid(seq))$('record-loading').hidden=true;}
 }
 async function openSummary(value=getCurrent(),rowButton=null){
  if(!value||summary.open)return;
  if(!rowButton){
   try{await onBeforeOpen();}catch(e){onError(e.message);return;}
   if(summary.open||library.open)return;
  }
  summaryOpener=rowButton||summaryButton;
  $('record-summary-back').hidden=!rowButton;
  const closeLabel=rowButton?'기록 관리 닫기':'임무 요약 닫기';
  $('record-summary-close').setAttribute('aria-label',closeLabel);
  $('record-summary-close').title=closeLabel;
  current={...value};
  $('record-summary-title').textContent=value.title||(value.kind==='case'?'사건 요약':'임무 요약');
  $('record-summary-kind').textContent=typeName(value.kind);
  $('record-run').replaceChildren();
  $('record-run').disabled=true;
  $('record-run-state').textContent='';
  summary.showModal();
  void loadSummary();
 }
 async function refreshLibrary(){
  const v=++libraryVersion;$('record-library-status').textContent='기록을 불러오는 중…';
  try{const next=(await api('')).records;if(!library.open||v!==libraryVersion)return;rows=next;renderList();$('record-library-status').textContent='';}catch(e){if(library.open&&v===libraryVersion)$('record-library-status').textContent=e.message;}
 }
 function recordRow(r){
   const item=node('div',undefined,'record-list-row'),copy=node('div');
   const timestamp=tab==='mission'?missionCreationClock(r):date(r.deleted_at||r.updated_at);
   const details=[typeName(r.kind),timestamp,r.busy?'작업 중':''].filter(Boolean).join(' · ');
   copy.append(node('strong',r.title),node('small',details));const actions=node('div',undefined,'record-list-actions');
   const view=button('요약','ChartBar');view.disabled=mutating;view.onclick=()=>void openSummary(r,view);actions.append(view);
   const change=button(r.deleted_at?'복원':'삭제',r.deleted_at?'History':'Trash');change.disabled=mutating||r.busy;change.onclick=()=>{if(r.deleted_at)void mutate(r,'restore');else{pending=r;$('record-delete-title').textContent='“'+r.title+'” 삭제';$('record-delete-description').textContent=r.kind==='case'?'사건은 휴지통으로 이동합니다. 연결된 임무는 남습니다. 복원하면 그 사이 수정되지 않은 수색 경로의 사건 연결도 돌아옵니다.':'임무는 휴지통으로 이동합니다. 녹화·관측·실행 기록은 보존됩니다.';$('record-delete-confirm').hidden=false;$('record-delete-submit').focus();}};actions.append(change);item.append(copy,actions);return item;
 }
 function renderList(){
  const q=$('record-filter').value.trim().toLowerCase(),list=rows.filter(r=>(tab==='trash'?!!r.deleted_at:!r.deleted_at&&(tab==='case'?r.kind==='case':r.kind!=='case'))&&r.title.toLowerCase().includes(q));
  const host=$('record-list');
  const content=doc.createDocumentFragment();
  if(!list.length){
   content.append(node('p',tab==='trash'?'휴지통이 비어 있습니다.':'해당 기록이 없습니다.','record-empty'));
  }else if(tab==='mission'){
   for(const [day,missions] of missionsByCreationDay(list)){
    const section=node('section',undefined,'record-day');
    section.append(node('h3',day),...missions.map(recordRow));
    content.append(section);
   }
  }else{
   content.append(...list.map(recordRow));
  }
  host.replaceChildren(content);
  icons(host);
 }
 async function mutate(row,action){
  if(mutating)return;mutating=true;$('record-delete-submit').disabled=true;renderList();
  try{const result=await api(`/${row.kind}/${row.id}/${action}`,{revision:row.revision});pending=null;$('record-delete-confirm').hidden=true;await onChanged(row,action);await refreshLibrary();$('record-library-status').textContent=action==='restore'?(result.reconnected_missions?'복원했습니다. 임무 '+result.reconnected_missions+'개의 사건 연결도 복원했습니다.':'복원했습니다.'):'휴지통으로 이동했습니다.';}
  catch(e){if(e.status===409){pending=null;$('record-delete-confirm').hidden=true;await refreshLibrary();}$('record-library-status').textContent=/RECORD_IN_USE/.test(e.message)?'진행 중인 작업이 끝난 뒤 삭제할 수 있습니다.':/RECORD_CHANGED/.test(e.message)?'기록이 변경되었습니다. 목록을 다시 확인하세요.':e.message;}
  finally{mutating=false;$('record-delete-submit').disabled=false;renderList();render();}
 }
 summaryButton.onclick=()=>void openSummary();
 libraryButton.onclick=async()=>{
  try{await onBeforeOpen();}catch(e){onError(e.message);return;}
  if(library.open||summary.open)return;
  library.showModal();void refreshLibrary();
 };
 $('record-summary-back').onclick=closeSummary;
 $('record-summary-close').onclick=closeRecords;
 summary.addEventListener('cancel',e=>{e.preventDefault();closeSummary();});
 $('record-library-close').onclick=()=>library.close();
 library.addEventListener('close',()=>{
  if(library.open)return;
  pending=null;$('record-delete-confirm').hidden=true;
  if(!summary.open)libraryButton.focus({preventScroll:true});
 });
 $('record-refresh').onclick=()=>void loadSummary(data?.job?.job_id);$('record-run').onchange=()=>void loadSummary($('record-run').value);
 $('record-time').oninput=()=>{stop();win.cancelAnimationFrame(raf);raf=win.requestAnimationFrame(updateTime);};
 $('record-play').onclick=()=>{if(timer){stop();return;}if(Number($('record-time').value)>=1000)$('record-time').value='0';$('record-play').firstElementChild.dataset.icon='PlayerPause';icons($('record-play'));$('record-play').setAttribute('aria-label','시간순 기록 일시정지');$('record-play').lastElementChild.textContent='일시정지';timer=win.setInterval(()=>{$('record-time').value=String(Math.min(1000,Number($('record-time').value)+10));updateTime();if(Number($('record-time').value)>=1000)stop();},120);};
 $('record-filter').oninput=renderList;$('record-delete-cancel').onclick=()=>{pending=null;$('record-delete-confirm').hidden=true;};$('record-delete-submit').onclick=()=>{if(pending)void mutate(pending,'delete');};
 for(const b of library.querySelectorAll('[role=tab]')){b.onclick=()=>{tab=b.dataset.kind;pending=null;$('record-delete-confirm').hidden=true;for(const x of library.querySelectorAll('[role=tab]')){x.setAttribute('aria-selected',String(x===b));x.tabIndex=x===b?0:-1;}renderList();};b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const tabs=[...library.querySelectorAll('[role=tab]')],i=tabs.indexOf(b),next=tabs[(i+(e.key==='ArrowRight'?1:2))%3];next.click();next.focus();};}
 win.addEventListener('pagehide',()=>{stop();map?.remove();});render();
 return{render,openSummary,logout(){libraryVersion++;closeRecords();rows=[];$('record-list').replaceChildren();$('record-summary-content').hidden=true;},get summary(){return summary;}};
}
