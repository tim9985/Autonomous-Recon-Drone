import {accountStorage} from './school-workspace.mjs';
import {mountPlaceSearch,parseCoordinates} from './local-place-search.mjs';
export {parseCoordinates} from './local-place-search.mjs';
import {colorMatch} from './local-target-colors.mjs';
const labels={black:'검정',white:'흰색',gray:'회색',red:'빨강',orange:'주황',yellow:'노랑',green:'초록',blue:'파랑',navy:'남색',purple:'보라',pink:'분홍',brown:'갈색',unknown:'미상'};
const statuses={PENDING:'미검토',REVIEWED:'원본 확인',DISMISSED:'오탐',NEEDS_FIELD_CHECK:'현장 확인 필요',FIELD_CHECKING:'현장 확인 중',FIELD_CONFIRMED:'현장 확인 완료',DEFERRED:'보류'};
const unresolved=new Set(['PENDING','NEEDS_FIELD_CHECK','FIELD_CHECKING','DEFERRED']);
export function reviewCounts(rows,reviews={}){
 const counts=Object.fromEntries(Object.keys(statuses).map(k=>[k,0]));
 for(const id of new Set(rows.map(r=>r.observation_id))){const key=reviews[id]?.status||'PENDING';counts[key in counts?key:'PENDING']++;}
 return {...counts,total:Object.values(counts).reduce((a,b)=>a+b,0),field:counts.NEEDS_FIELD_CHECK+counts.FIELD_CHECKING};
}
// Status tabs count candidate groups, while judgement and case totals remain observations.
export function reviewGroupCounts(groups,reviews={}){
 const counts={all:groups.length,pending:0,field:0,deferred:0};
 for(const group of groups){const c=reviewCounts(group.observations,reviews);if(c.PENDING)counts.pending++;if(c.field)counts.field++;if(c.DEFERRED)counts.deferred++;}
 return counts;
}

export function pointInside(point,geometry){
 const ring=r=>{let inside=false;for(let i=0,j=r.length-1;i<r.length;j=i++)if(((r[i][1]>point[1])!==(r[j][1]>point[1]))&&(point[0]<(r[j][0]-r[i][0])*(point[1]-r[i][1])/(r[j][1]-r[i][1])+r[i][0]))inside=!inside;return inside;};
 const polys=geometry?.type==='Polygon'?[geometry.coordinates]:geometry?.type==='MultiPolygon'?geometry.coordinates:[];
 return polys.some(p=>ring(p[0])&&!p.slice(1).some(ring));
}
export function cropWindow(row,ratio=1,padding=1.8){
 const b=row?.bbox,w=b?.source_width||row?.width,h=b?.source_height||row?.height;
 if(!b||![w,h,ratio,padding,b.x1,b.y1,b.x2,b.y2].every(Number.isFinite)||w<=0||h<=0||ratio<=0||padding<1||b.x1<0||b.y1<0||b.x2>w||b.y2>h||b.x2<=b.x1||b.y2<=b.y1)return null;
 const bw=b.x2-b.x1,bh=b.y2-b.y1;
 let cw=Math.max(bw*padding,bh*padding*ratio),ch=cw/ratio;
 if(cw>w){cw=w;ch=cw/ratio;}if(ch>h){ch=h;cw=ch*ratio;}
 if(cw<bw||ch<bh)return null;
 const x=Math.max(0,Math.min(w-cw,(b.x1+b.x2-cw)/2)),y=Math.max(0,Math.min(h-ch,(b.y1+b.y2-ch)/2));
 return {x,y,width:cw,height:ch,sourceWidth:w,sourceHeight:h};
}
export function createSearchWorkspace({document:d,api,getState,getLiveRun=()=>null,getTargetColors=()=>null,onError,onCaseChange,onApply,openResult,getMap,mapFocus,estimatePoint,icons=()=>{},onRecommendations=()=>{},onShowReview=()=>{}}){
 const $=id=>d.getElementById(id),win=d.defaultView;
 const node=(tag,text,cls)=>{const n=d.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const button=(text,fn,cls)=>{const b=node('button',text,cls);b.type='button';b.onclick=fn;return b;};
 const when=t=>t?new Date(typeof t==='number'?t*1000:t).toLocaleString('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}):'기록 없음';
 const FC=features=>({type:'FeatureCollection',features});
 let reviewQueue=[],drafts=new Map(),mediaView='target',spatialVersion=0,resultsRequest=0;
 let summaryData=null,summaryOpener=null,caseEditorDone=null,caseEditorOpener=null,caseEditorActivate=true;
 let current=null,allCases=[],results=null,recommendation=null,order=[],checked=new Set(),resultKey='',version=0,searchVersion=0,urgent=false,editingId=null,draftPoint=null,picking=false,searchIndex=[],mapPopup=null,mapSignature='',requestBusy=false,ready=false;
 const caseUrl=()=>`local-search/cases/${current.case_id}`;
 const errorText=e=>/SEARCH_CASE_CHANGED/.test(e.message)?'다른 창에서 변경되었습니다. 다시 확인한 뒤 저장하세요. 입력 내용은 유지됩니다.':/SEARCH_SOURCE_LINK_REQUIRED/.test(e.message)?'먼저 이전 분석을 사건에 연결하세요.':/SEARCH_CASE_READ_ONLY/.test(e.message)?'종료·보관된 사건입니다. 사건을 다시 열어 수정하세요.':/SEARCH_CASE_IN_FLIGHT/.test(e.message)?'정찰과 영상 저장이 끝난 뒤 사건을 종료하거나 수정할 수 있습니다.':/SEARCH_REVIEW_NOTE_REQUIRED/.test(e.message)?'현장 확인 결과 또는 보류 사유를 메모에 입력하세요.':e.message;
 const attempt=async(fn,target)=>{if(requestBusy)return;requestBusy=true;render();try{await fn();}catch(e){if(target){$(target).textContent=errorText(e);$(target).dataset.error='true';}else onError(errorText(e));if(e.status===401||e.status===403)logout();}finally{requestBusy=false;render();}};
 async function refreshCases(){allCases=(await api('local-search/cases')).cases;}
 async function refreshRecords(){await refreshCases();if(current&&!allCases.some(c=>c.case_id===current.case_id))await selectCase('');else render();}
 async function selectCase(id){
  const v=++version;const next=id?await api('local-search/cases/'+id):null;if(v!==version)return;
  current=next;summaryData=null;results=null;resultKey='';recommendation=null;order=[];checked.clear();accountStorage(win.localStorage).setItem('local-search-case',id||'');onCaseChange();render();updateMap();
  reviewQueue=[];drafts.clear();await Promise.all([refreshResults(),refreshRecommendations()]);
 }
 async function boot(){ready=true;await refreshCases();const saved=accountStorage(win.localStorage).getItem('local-search-case');await selectCase(allCases.some(c=>c.case_id===saved)?saved:'');}
 async function refreshResults({quiet=false}={}){
  const requestId=++resultsRequest,v=version,source=$('results-source')?.value,run=source==='current'?getLiveRun():null;
  const params=new URLSearchParams();if(current)params.set('case_id',current.case_id);if(run)params.set('run_id',run);
  const data=source==='current'&&!run?{source_run_id:null,historical:false,linked:false,groups:[],reviews:{},total:0}:await api('local-search/results?'+params);
  if(requestId!==resultsRequest||v!==version||source!==$('results-source')?.value||(source==='current'&&run!==getLiveRun()))return;
  results=data;resultKey='';const s=getState();if(data.historical&&s.previous)s.previous.results=data.groups.flatMap(g=>g.observations);
  renderResults();if(!quiet||!$('media-dialog').open)renderMedia();
 }
 async function refreshRecommendations(){
  if(!current)return;const v=version;
  $('recommend-note').textContent='관측 기록과 목격 근거 계산 중…';
  const data=await api(caseUrl()+'/recommendations');if(v!==version)return;recommendation=data;order=data.regions.map(r=>r.region_id);checked=new Set(order.slice(0,3));
  renderRecommendations();onRecommendations();updateMap();
 }
 function editCase(isNew=false,point=null,label='',{onDone=null,activate=true}={}){
  if(locked()||requestBusy||(!isNew&&current?.status==='CLOSED'))return false;
  caseEditorDone=onDone;caseEditorActivate=activate;caseEditorOpener=d.activeElement;
  editingId=isNew?null:current?.case_id;const c=editingId?current:null;
  draftPoint=point?{point,label}:c?.last_seen?{point:c.last_seen.point,label:c.last_seen.label}:null;
  $('case-title').textContent=c?'사건 편집':'사건 등록';$('case-name').value=c?.title||'';$('case-kind').value=c?.kind||'MISSING';$('case-color').value=c?.upper_color||'unknown';
  const t=c?.last_seen?.at?new Date(c.last_seen.at):null;$('case-time').value=t?new Date(t.getTime()-t.getTimezoneOffset()*60000).toISOString().slice(0,16):'';
  $('case-state-field').hidden=!c;
  $('case-speed').value=c?.speed_mps??1.2;$('case-revisit').value=c?.revisit_minutes??30;$('case-state').value=c?.status||'ACTIVE';$('case-error').textContent='';locationLabel();$('case-dialog').showModal();$('case-name').focus();return true;
 }
 function finishCaseEditor(value=null){
  const done=caseEditorDone,opener=caseEditorOpener;caseEditorDone=null;caseEditorOpener=null;$('case-dialog').close();
  // Resume the parent after attempt() releases its request lock.
  if(done)win.setTimeout(()=>{if(ready)done(value);},0);else if(opener?.isConnected)opener.focus({preventScroll:true});
 }
 function locationLabel(){$('case-location-label').textContent=draftPoint?(draftPoint.label||'지도 지정 위치')+' · '+draftPoint.point[1].toFixed(5)+', '+draftPoint.point[0].toFixed(5):'위치 미지정';$('case-clear-point').disabled=!draftPoint;$('case-time').required=!!draftPoint;$('case-time-hint').textContent=draftPoint?'필수 · 실제 목격 시각':'위치 지정 시 필수';}
 async function saveCase(){
  const at=$('case-time').value?new Date($('case-time').value):null;
  if(draftPoint&&(!at||!Number.isFinite(at.getTime())||at.getTime()>Date.now()+60000))throw new Error('목격 시각을 현재 이전으로 입력하세요.');
  const body={title:$('case-name').value,kind:$('case-kind').value,upper_color:$('case-color').value,last_seen:draftPoint?{...draftPoint,at:at.toISOString()}:null,speed_mps:Number($('case-speed').value),revisit_minutes:Number($('case-revisit').value),status:$('case-state').value,...(editingId?{revision:current.revision}:{})};
  const value=await api('local-search/cases'+(editingId?'/'+editingId:''),body);
  allCases=[value,...allCases.filter(c=>c.case_id!==value.case_id)];
  if(caseEditorActivate)await selectCase(value.case_id);
  finishCaseEditor(value);
 }
 function pickLocation(){picking=true;$('case-dialog').close();$('map-pick-message').hidden=false;getMap()?.getCanvas().style.setProperty('cursor','crosshair');}
 function endPick(point){picking=false;$('map-pick-message').hidden=true;if(point)draftPoint={point,label:'지도 지정 위치'};locationLabel();$('case-dialog').showModal();getMap()?.getCanvas().style.removeProperty('cursor');}
 function setSpatialData(buildings,zones){
  spatialVersion++;
  searchIndex=zones.map(f=>({name:f.properties.name,point:f.properties.representativePoint,geometry:f.geometry,region_id:f.properties.zoneId,source:'의미 구역'}));
  for(const f of buildings?.features||[]){const name=f.properties?.name||f.properties?.buildingName;if(!name)continue;const rings=f.geometry?.type==='Polygon'?f.geometry.coordinates:f.geometry?.coordinates?.[0];const pts=rings?.[0];if(!pts?.length)continue;searchIndex.push({name,point:[0,1].map(i=>pts.reduce((sum,p)=>sum+p[i],0)/pts.length),source:'캠퍼스 건물'});}
  renderResults();
 }
 const placeSearch=mountPlaceSearch({doc:d,win,request:(path,body,options)=>api(path,body,10000,options.signal),localItems:()=>searchIndex,select:placePopup,isReady:()=>ready,mapCenter:()=>{const c=getMap()?.getCenter?.();return c?[c.lng,c.lat]:null;}});

 function popupAt(point,content){const map=getMap();if(!map)return;mapPopup?.remove();mapPopup=new win.maplibregl.Popup({offset:14,focusAfterOpen:false}).setLngLat(point).setDOMContent(content).addTo(map);}
 function placePopup(item){
  searchVersion++;setSearchOpen(false);$('place-results').hidden=true;$('place-status').textContent=item.source+' · '+item.name;
  const box=node('div',undefined,'search-popup');box.append(node('h3',item.name),node('p',item.address||item.source));
  const supported=getState().catalog.filter(r=>r.kind==='REGIONAL'&&(r.id===item.region_id||pointInside(item.point,r.geometry)));
  const assign=button('목격 지점으로 지정',()=>editCase(!current,item.point,item.name));assign.disabled=locked()||getState().editing||!!current&&current.status!=='ACTIVE';box.append(assign);
  if(supported.length){const b=button('이 구역 수색에 추가',()=>{onApply([...new Set([...getState().selected,...supported.map(r=>r.id)])]);mapPopup?.remove();});b.disabled=locked()||!!current&&current.status!=='ACTIVE';box.append(b);}else box.append(node('p','현재 실행 구역 밖 · 위치 기록만 가능'));
  popupAt(item.point,box);const map=getMap();map?.flyTo({center:item.point,zoom:17,...mapFocus(),duration:win.matchMedia?.('(prefers-reduced-motion: reduce)').matches?0:250});
 }
 function locked(){const s=getState();return !!s.busy||!!s.pending||!!s.planningRequest||['QUEUED','RUNNING'].includes(s.plan?.state)||!!(s.control?.job&&!['COMPLETED','FAILED','PARTIAL','CANCELLED','INTERRUPTED','EXPIRED'].includes(s.control.job.state));}
 function renderRecommendations(){
  const count=Math.min(3,recommendation?.regions.length||0);
  $('recommend-apply').textContent=count?`추천 ${count}개 적용`:'추천 준비 중';
  $('recommend-note').textContent=recommendation?(recommendation.coverage_state==='UNLINKED'?'목격 위치 기준 · 관측 기록 미연결':`관측 기록 반영 · ${when(recommendation.generated_at)}`):'추천 계산 중…';
  render();
 }
 function reasonFor(id){return recommendation?.regions.find(r=>r.region_id===id)?.reasons.join(' · ')||'';}
 function render(){
  const state=getState(),busy=locked()||requestBusy,archived=!!current&&current.status!=='ACTIVE';
  $('case-edit').disabled=!current||busy||state.editing||current.status==='CLOSED';
  for(const id of ['case-save','case-cancel','case-close'])$(id).disabled=requestBusy;
  const context=current?[current.last_seen?.label|| (current.last_seen?'지도 지정 위치':''),current.last_seen?when(current.last_seen.at):''].filter(Boolean).join(' · '):'';
  $('case-target-label').textContent=current?.upper_color&&current.upper_color!=='unknown'?'신고 상의색 · '+labels[current.upper_color]:'신고 상의색 미상';
  $('case-context').textContent=context;$('case-context').hidden=!context;$('case-context').title=context;
  $('case-notice').hidden=!archived;$('case-resume').disabled=busy||state.editing;
  $('case-notice-text').textContent=current?.status==='CLOSED'?'종료된 사건 · 다시 열면 정찰·검토를 이어갑니다.':'보관된 사건입니다.';
  $('mission-case-name').textContent=current?.title||'';$('case-summary-open').title=current?'연결 사건 기록: '+current.title:'';
  $('case-summary-open').disabled=!current||requestBusy;
  $('review-case-summary').disabled=!current||requestBusy;$('complete-case-summary').disabled=!current||requestBusy;
  $('summary-review').disabled=requestBusy||!summaryData?.review;
  $('case-finish-open').disabled=busy||!summaryData||!!summaryData.in_flight;
  $('case-finish-save').disabled=busy||!summaryData||!!summaryData.in_flight;
  $('summary-research').disabled=busy||!summaryData||current?.status!=='ACTIVE';
  $('summary-reopen').disabled=busy;$('summary-refresh').disabled=requestBusy;
  $('case-summary-footer').hidden=!summaryData||!$('case-finish-form').hidden;
  $('case-summary-actions').hidden=!summaryData||archived;
  $('summary-research-note').hidden=!summaryData;
  if(archived&&!locked()){$('plan-route').disabled=true;$('start-flight').disabled=true;$('edit-regions').disabled=true;$('clear-selection').disabled=true;for(const b of d.querySelectorAll('#selected-zones button'))b.disabled=true;}
  $('case-save').disabled=requestBusy;
  $('recommend-apply').disabled=busy||!recommendation?.regions.length||!current||archived;
  $('recommend-refresh').disabled=busy||archived;
  $('source-link').hidden=!current||!!results?.linked;$('source-link').disabled=busy||archived||!results?.source_run_id;
  $('coverage-link').disabled=busy||archived||!state.control?.job;
  const stage=$('mission-controls').dataset.stage;
  $('search-recommend').hidden=!current||archived||['active','complete','review','planning'].includes(stage);
  for(const b of $('candidate-actions').querySelectorAll('button'))b.disabled=requestBusy||b.dataset.blocked==='true';
  updateMap();
 }
 async function resumeCase(){
  if(current.status==='CLOSED'){await api(caseUrl()+'/reopen',{revision:current.revision});await refreshCases();await selectCase(current.case_id);return;}
  const body=Object.fromEntries(['title','kind','last_seen','upper_color','speed_mps','revisit_minutes','revision'].map(k=>[k,current[k]]));
  await api(caseUrl(),{...body,status:'ACTIVE'});await refreshCases();await selectCase(current.case_id);
 }
 function remainingRegions(){
  const rows=summaryData?.coverage?.regions||[],ids=getState().selected.length?getState().selected:rows.map(r=>r.region_id);
  return ids.filter(id=>{const value=rows.find(r=>r.region_id===id);return !Number.isFinite(value?.actual_percent)||value.actual_percent<95;});
 }
 function renderSummary(){
  const host=$('case-summary-facts');host.replaceChildren();if(!summaryData||!current)return;
  const closed=current.status!=='ACTIVE',review=summaryData.review,cov=summaryData.coverage;
  $('case-summary-name').textContent=current.title;
  $('case-summary-status').textContent=summaryData.in_flight?'정찰·저장 진행 중 · 종료는 착륙과 저장 후 가능합니다.':closed?current.status==='CLOSED'?'종료된 사건':'보관된 사건':'진행 중인 사건';
  const stats=node('div',undefined,'summary-stats');
  for(const [label,value]of [['미검토',review?.counts.PENDING],['현장 확인 대기',review?.field_open],['보류',review?.deferred]]){const item=node('div');item.append(node('span',label),node('strong',value===undefined?'—':String(value)));stats.append(item);}host.append(stats);
  host.append(node('p',review?`연결한 분석 · 관측 ${review.total}건${review.truncated?' · 일부만 조회됨':''}`:'연결한 탐지 결과가 없습니다.','summary-provenance'));
  const coverage=node('section',undefined,'summary-coverage');coverage.append(node('h3','실제 관측'));
  if(cov?.regions?.length){for(const row of cov.regions){const name=getState().catalog.find(r=>r.id===row.region_id)?.name||row.region_id;coverage.append(node('p',`${name} · ${Number.isFinite(row.actual_percent)?row.actual_percent.toFixed(1)+'%':'관측 확인 필요'}`));}coverage.append(node('small','이 사건에 연결된 관측 기록 · 대상 부재를 뜻하지 않습니다.'));}
  else coverage.append(node('p','이 사건에 연결된 관측 기록이 없습니다.'));
  host.append(coverage);
  if(current.closure){const closure=node('section',undefined,'summary-closure');closure.append(node('h3',closed?'종료 기록':'이전 종료 기록'),node('p',current.closure.reason),node('small',`${when(current.closure.at)} · 당시 미처리 ${current.closure.remaining?.unresolved??'미연결'}${current.closure.remaining?'건':''}`));host.append(closure);}
  $('case-finish-open').hidden=closed;$('summary-reopen').hidden=!closed;$('case-summary-actions').hidden=closed;
  const remaining=remainingRegions();$('summary-research').disabled=closed||locked()||requestBusy;
  $('summary-research').textContent=cov?.regions?.length&&remaining.length?'미완료 구역 다시 선택':'정찰 구역 편집';
  $('summary-research-note').textContent=closed?'사건을 다시 열면 정찰과 판단을 이어갈 수 있습니다.':cov?.regions?.length?remaining.length?`선택 구역 중 ${remaining.length}개 · 관측 목표 95% 미달 또는 기록 없음`:'선택한 구역의 관측 목표를 충족했습니다. 추가 수색은 지도에서 구역을 수정하세요.':'관측 기록이 없어 미완료 여부를 판정하지 않습니다.';
  if(closed)$('case-finish-form').hidden=true;
  render();
 }
 async function refreshSummary(){
  if(!current)return;const v=version,id=current.case_id;$('summary-error').textContent='';
  const [freshCase,data]=await Promise.all([api(caseUrl()),api(caseUrl()+'/summary')]);
  if(v!==version||id!==current?.case_id)return;
  if(freshCase.revision!==data.revision||freshCase.review_revision!==data.review_revision)throw new Error('SEARCH_CASE_CHANGED');
  current=freshCase;summaryData=data;onCaseChange();renderSummary();
 }
 function openSummary(){
  if(!current){onError('임무 설정에서 사건을 연결하면 검토·종료 기록을 볼 수 있습니다.');$('mission-settings').focus();return;}summaryOpener=d.activeElement;summaryData=null;$('case-summary-name').textContent=current.title;$('case-summary-facts').replaceChildren();$('case-summary-status').textContent='사건 기록 확인 중…';$('summary-error').textContent='';$('case-finish-form').hidden=true;$('case-finish-reason').value='';
  $('case-summary-dialog').showModal();void attempt(refreshSummary,'summary-error');
 }
 async function finishCase(){
  if(!summaryData||!current||!$('case-finish-reason').value.trim())throw new Error('종료 사유를 입력하세요.');
  current=await api(caseUrl()+'/close',{revision:summaryData.revision,review_revision:summaryData.review_revision,reason:$('case-finish-reason').value.trim()});
  $('case-finish-form').hidden=true;await refreshCases();onCaseChange();await refreshSummary();await refreshResults();
 }
 function setSearchOpen(open){
  $('map-search').hidden=!open;$('place-toggle').setAttribute('aria-expanded',String(open));
  $('place-toggle').setAttribute('aria-label','장소 검색 '+(open?'닫기':'열기'));
  if(open){placeSearch.open();$('place-query').focus({preventScroll:true});}else placeSearch.cancel();
 }
 function thumbnail(row,cls='candidate-crop',ratio=1){
  const box=node('span',undefined,cls),crop=cropWindow(row,ratio);box.dataset.cropped=String(!!crop);
  if(!row.asset_id){box.append(node('span','영상 없음','crop-empty'));return box;}
  const img=node('img');img.alt=crop?'탐지 대상 확대':'전체 영상';img.loading='lazy';img.src=`/api/v1/media-assets/${row.asset_id}/content`;
  if(crop){img.style.width=crop.sourceWidth/crop.width*100+'%';img.style.height=crop.sourceHeight/crop.height*100+'%';img.style.left=-crop.x/crop.width*100+'%';img.style.top=-crop.y/crop.height*100+'%';}
  img.onerror=()=>{box.replaceChildren(node('span','영상 확인 필요','crop-empty'));};box.append(img);return box;
 }
 function regionName(row){const point=estimatePoint(row);if(!point)return '위치 미상';return searchIndex.find(r=>r.geometry&&pointInside(point,r.geometry))?.name||getState().catalog.find(r=>r.geometry&&pointInside(point,r.geometry))?.name||'캠퍼스';}
 const wantedColors=()=>getTargetColors()??(current?.upper_color&&current.upper_color!=='unknown'?[current.upper_color]:[]);
 function colorName(row){return labels[row.appearance?.upper?.top?.[0]?.color]||'색상 미상';}
 function matchesObservation(r){
  const query=$('result-search').value.toLowerCase(),filter=$('result-location-filter').value,reviewFilter=$('result-review-filter').value;
  const status=results?.reviews[r.observation_id]?.status||'PENDING',matches=reviewFilter==='all'||reviewFilter==='pending'&&status==='PENDING'||reviewFilter==='field'&&['NEEDS_FIELD_CHECK','FIELD_CHECKING'].includes(status)||reviewFilter==='deferred'&&status==='DEFERRED'||reviewFilter==='resolved'&&!unresolved.has(status);
  return matches&&(filter==='all'||!!estimatePoint(r)===(filter==='located'))&&(!query||`${colorName(r)} ${regionName(r)} ${r.posture?.label||''} ${{lying:'누움',standing:'서 있음',sitting:'앉음'}[r.posture?.label?.toLowerCase()]||''}`.toLowerCase().includes(query));
 }
 function representative(g){const matches=g.observations.filter(matchesObservation),rows=matches.length?matches:g.observations;return rows.find(r=>g.evidence_ids.includes(r.observation_id))||rows.at(-1);}
 function visibleGroups(){return (results?.groups||[]).filter(g=>(!urgent||g.urgent_pending)&&g.observations.some(matchesObservation));}
 function openCandidate(g){reviewQueue=visibleGroups().map(g=>g.id);openResult(representative(g));}
 function adjacent(g,delta){
  if(!reviewQueue.includes(g.id))reviewQueue=visibleGroups().map(g=>g.id);
  const available=reviewQueue.filter(id=>results.groups.some(x=>x.id===id)),index=available.indexOf(g.id);
  return index<0?null:results.groups.find(x=>x.id===available[index+delta]);
 }
 function setMediaView(view){
  const row=getState().mediaResult,canCrop=!!cropWindow(row,16/9);mediaView=view==='target'&&canCrop?'target':'full';
  $('media-dialog').dataset.view=mediaView;$('target-view').hidden=mediaView!=='target';
  $('media-view-target').disabled=!canCrop;$('media-view-target').setAttribute('aria-pressed',String(mediaView==='target'));$('media-view-full').setAttribute('aria-pressed',String(mediaView==='full'));
  $('media-view-note').textContent=canCrop?(mediaView==='target'?'원본 확대':'전체 촬영 범위'):'확대 영역 없음';
 }

 async function linkSource(kind){
  const body={revision:current.revision,source_run_id:current.source_run_id,coverage_job_id:current.coverage_job_id};
  if(kind==='results')body.source_run_id=results?.source_run_id;else body.coverage_job_id=getState().control.job.job_id;
  current=await api(caseUrl()+'/sources',body);onCaseChange();await Promise.all([refreshResults(),refreshRecommendations()]);
 }
 function renderResults(){
  if(!results)return false;
  const s=getState();if(results.historical&&s.previous)s.previous.results=results.groups.flatMap(g=>g.observations);
  const key=JSON.stringify([results,$('result-search').value,$('result-location-filter').value,$('result-review-filter').value,urgent,current?.upper_color,wantedColors(),spatialVersion]);if(key===resultKey)return true;resultKey=key;
  const counts=reviewCounts(results.groups.flatMap(g=>g.observations),results.reviews);
  $('review-progress').textContent=results.linked?`미검토 ${counts.PENDING} · 현장 확인 대기 ${counts.field} · 보류 ${counts.DEFERRED}`:results.historical?'과거 분석 기록 · 사건 연결 전':results.source_run_id?'이번 정찰 · 사건 연결 전':'정찰을 시작하면 탐지 결과가 표시됩니다.';
  const groupCounts=reviewGroupCounts(results.groups,results.reviews);$('queue-all-count').textContent=groupCounts.all;
  for(const [key,count] of [['pending',groupCounts.pending],['field',groupCounts.field],['deferred',groupCounts.deferred]]){
   $('queue-'+key+'-count').textContent=count;$('queue-'+key).setAttribute('aria-pressed',String($('result-review-filter').value===key));
   $('queue-'+key).disabled=!results.linked;
  }
  const groups=visibleGroups();$('result-count').textContent=results.total;$('candidate-count').textContent=groups.length;
  const filtered=!!$('result-search').value||$('result-location-filter').value!=='all'||$('result-review-filter').value!=='all'||urgent;
  $('clear-result-filters').hidden=!filtered;
  const advanced=$('result-location-filter').value!=='all'||$('result-review-filter').value==='resolved';
  $('candidate-filters').dataset.active=String(advanced);$('candidate-filter-label').textContent=advanced?'상세 필터 적용 중':'상세 필터';
  $('urgent-count').textContent=results.groups.filter(g=>g.urgent_pending).length;
  $('candidates-all').setAttribute('aria-pressed',String(!filtered));$('candidates-urgent').setAttribute('aria-pressed',String(urgent));
  $('candidates-urgent').setAttribute('aria-label','자세 확인 후보 '+$('urgent-count').textContent+'개');
  $('candidate-context').textContent=results.truncated?'최근 관측 범위':urgent?(results.historical?'과거 분석의 자세 확인 목록':'이번 정찰의 자세 확인 후보'):'';
  const context=$('archive-context');if(context){context.querySelector('strong').textContent=results.historical?'이전 분석 기록':'이번 정찰 탐지';context.querySelector(':scope > div > span').textContent=results.historical?'이번 정찰과 별도':results.source_run_id?(results.run_state==='RUNNING'?'실시간 갱신 중':'저장된 실시간 분석'):'정찰 대기';}
  $('results-source-date').textContent=when(results.groups[0]?.last_at).split(' ').slice(0,2).join(' ');
  $('result-list').replaceChildren(...(groups.length?groups.map(g=>{
   const r=representative(g),b=button('',()=>openCandidate(g),'candidate-card');b.dataset.observationId=r.observation_id;b.dataset.urgent=String(g.urgent_pending);b.setAttribute('aria-haspopup','dialog');b.setAttribute('aria-controls','media-dialog');
   b.append(thumbnail(r));const text=node('span',undefined,'candidate-text');
   text.append(node('strong',regionName(r)),node('small',`${colorName(r)} 상의 · ${when(g.last_at)}`));
   const badges=node('span',undefined,'candidate-badges');
   const groupCounts=reviewCounts(g.observations,results.reviews),field=groupCounts.field>0;
   const status=groupCounts.FIELD_CHECKING?'현장 확인 중':groupCounts.NEEDS_FIELD_CHECK?'현장 확인 필요':groupCounts.DEFERRED?'보류':groupCounts.PENDING?g.urgent_pending?(g.urgency==='REPEATED_LYING'?'누운 자세 반복':'자세 확인'):'미검토':groupCounts.FIELD_CONFIRMED?'현장 확인 완료':'검토 완료';
   b.dataset.review=field?'field':g.urgent_pending?'urgent':g.reviewed===g.count?'reviewed':'pending';
   const badge=node('span',status,'candidate-badge');badge.dataset.tone=field||g.urgent_pending?'urgent':g.reviewed===g.count?'reviewed':'';badges.append(badge);
   if(wantedColors().length&&(getTargetColors()===null?g.condition==='MATCH':g.observations.some(r=>colorMatch(r,wantedColors())))){const match=node('span','상의색 일치','candidate-badge');match.dataset.tone='match';badges.append(match);}
   text.append(badges);b.append(text);b.setAttribute('aria-label',`${regionName(r)} · ${colorName(r)} 상의 · ${status} · 후보 ${g.display_id||g.id}`);return b;
  }):[node('p',urgent?'확인이 필요한 후보가 없습니다.':'조건에 맞는 후보가 없습니다.','search-empty')]));
  return true;
 }
 function renderMedia(){
  const r=getState().mediaResult,host=$('candidate-detail'),actions=$('candidate-actions'),g=results?.groups.find(g=>g.observations.some(o=>o.observation_id===r?.observation_id));host.hidden=!g;actions.hidden=!g;if(!g)return;
  $('confirm-result').hidden=true;host.replaceChildren();actions.replaceChildren();$('media-view-tools').hidden=false;
  $('media-title').textContent=`${regionName(r)} · ${colorName(r)} 상의`;
  const crop=thumbnail(r,'target-crop',16/9);$('target-view').replaceChildren(crop);setMediaView(mediaView);
  const index=g.observations.findIndex(o=>o.observation_id===r.observation_id),top=node('div',undefined,'candidate-review-top');
  top.append(node('strong',`관측 ${index+1} / ${g.count}`),node('span',g.urgency==='REPEATED_LYING'?'누운 자세 반복 · 원본 확인 필요':g.urgency==='POSTURE_REVIEW'?'누운 자세 기록 · 연속성 미확인':'원본을 확인하고 판단하세요.','search-note'));host.append(top);
  const strip=node('div',undefined,'candidate-strip');strip.setAttribute('aria-label','시각별 원본');
  for(const o of g.observations){const b=button('',()=>openResult(o));b.setAttribute('aria-current',String(o.observation_id===r.observation_id));b.setAttribute('aria-label',when(o.capture_at)+' 원본 보기');b.append(thumbnail(o,'frame-crop'),node('span',when(o.capture_at).split(' ').at(-1)));strip.append(b);}host.append(strip);
  if(wantedColors().length){const count=getTargetColors()===null?g.match_ids.length:g.observations.filter(r=>colorMatch(r,wantedColors())).length;host.append(node('p',`수색 조건: 상의 ${wantedColors().map(c=>labels[c]).join(' · ')} · 일치 관측 ${count}/${g.count}`,'condition-evidence'));}
  const prev=adjacent(g,-1),next=adjacent(g,1),nav=node('div',undefined,'candidate-nav');
  for(const [target,text,icon]of[[prev,'이전 후보','ArrowLeft'],[next,'다음 후보','ArrowRight']]){const b=button('',()=>{openResult(representative(target));$('media-title').focus({preventScroll:true});});b.setAttribute('aria-label',text);b.title=text;b.dataset.blocked=String(!target);b.disabled=!target;const i=node('span');i.dataset.icon=icon;i.setAttribute('aria-hidden','true');b.append(i);nav.append(b);}actions.append(nav);
  const writable=results.linked&&current?.status==='ACTIVE';
  if(!writable){const reason=node('span',current&&current.status!=='ACTIVE'?'종료·보관 사건 · 기록 열람':current?'이 분석을 사건에 연결하면 판단을 저장할 수 있습니다.':'임무 설정에서 사건을 연결하면 판단을 저장할 수 있습니다.','review-unavailable');actions.append(reason);}
  else{
   const saved=results.reviews[r.observation_id],draftKey=current.case_id+':'+r.observation_id,draft=drafts.get(draftKey)||saved||{},form=node('form',undefined,'review-form'),select=node('select'),note=node('input');form.id='candidate-review-form';
   select.setAttribute('aria-label','관측 판단');note.setAttribute('aria-label','판단 메모');note.placeholder='메모 (선택)';note.maxLength=1000;note.value=draft.note||'';
   for(const [value,label]of Object.entries(statuses)){const o=node('option',label);o.value=value;select.append(o);}select.value=draft.status||'PENDING';
   const remember=()=>{drafts.set(draftKey,{status:select.value,note:note.value});note.required=['FIELD_CONFIRMED','DEFERRED'].includes(select.value);note.placeholder=note.required?'확인 결과·보류 사유 (필수)':'판단 메모 (선택)';};select.onchange=remember;note.oninput=remember;remember();
   const scope=node('label',undefined,'review-scope'),all=node('input');all.type='checkbox';scope.append(all,node('span',`이 후보의 ${g.count}건 모두 적용`));scope.hidden=g.count===1;
   form.append(select,note,scope);host.append(form);
   const save=async advance=>{
    const ids=all.checked?g.observations.map(o=>o.observation_id):[r.observation_id];
    current=await api(caseUrl()+'/reviews',{revision:results.review_revision,observation_ids:ids,status:select.value,note:note.value});
    for(const id of ids)drafts.delete(current.case_id+':'+id);await refreshResults();
    if(advance&&next){openResult(representative(next));$('media-title').focus({preventScroll:true});}
    $('review-status').textContent='판단을 저장했습니다.';$('review-status').dataset.error='false';
   };
   const submit=advance=>{if(select.value==='PENDING'){$('review-status').textContent='관측 판단을 선택하세요.';select.focus();return;}if(['FIELD_CONFIRMED','DEFERRED'].includes(select.value)&&!note.value.trim()){$('review-status').textContent='확인 결과 또는 보류 사유를 입력하세요.';note.focus();return;}void attempt(()=>save(advance),'review-status');};
   form.onsubmit=e=>{e.preventDefault();submit(false);};
   if(next)actions.append(button('저장',()=>submit(false),'review-save'));
   actions.append(button(next?'저장 후 다음':'판단 저장',()=>submit(!!next),'review-save-next search-primary'));
  }
  const edit=node('details',undefined,'group-editor');edit.append(node('summary','묶음 정보·편집'),node('p',`후보 ${g.display_id||g.id} · ${g.basis==='MANUAL_GROUP'?'사용자 묶음':'후보 ID 묶음'} · 동일인 미확정`));
  if(writable){
   const regroup=async(action,ids)=>{current=await api(caseUrl()+'/groups',{revision:results.review_revision,action,observation_ids:ids});reviewQueue=[];await refreshResults();};
   const controls=node('div',undefined,'search-secondary');controls.append(button('이 관측 분리',()=>void attempt(()=>regroup('SPLIT',[r.observation_id]),'review-status')),button('자동 묶음으로 복원',()=>void attempt(()=>regroup('RESET',g.observations.map(o=>o.observation_id)),'review-status')));edit.append(controls);
   const merge=node('div',undefined,'group-merge'),other=node('select');other.setAttribute('aria-label','합칠 후보');const placeholder=node('option','합칠 후보 선택');placeholder.value='';other.append(placeholder);
   for(const candidate of results.groups){if(candidate.id===g.id)continue;const o=node('option',`${regionName(representative(candidate))} · ${candidate.count}건 · ${candidate.display_id||candidate.id}`);o.value=candidate.id;other.append(o);}
   merge.append(other,button('합치기',()=>{const target=results.groups.find(c=>c.id===other.value);if(target)void attempt(()=>regroup('MERGE',[...g.observations,...target.observations].map(o=>o.observation_id)),'review-status');}));edit.append(merge);
  }
  host.append(edit);icons(actions);render();
 }

 function mapClick(e){
  if(picking){endPick([e.lngLat.lng,e.lngLat.lat]);return true;}
  const located=getMap()?.getLayer('search-last-seen')&&getMap().queryRenderedFeatures(e.point,{layers:['search-last-seen']}).length;
  if(located&&current?.last_seen&&!getState().editing){const box=node('div',undefined,'search-popup');box.append(node('h3','마지막 목격'),node('p',current.last_seen.label||current.title),node('p',when(current.last_seen.at)));const edit=button('사건 편집',()=>editCase());edit.disabled=locked()||current.status!=='ACTIVE';box.append(edit);popupAt(current.last_seen.point,box);return true;}
  if(getState().mapMode!=='coverage'||getState().editing)return false;
  const map=getMap(),cell=map.queryRenderedFeatures(e.point,{layers:['coverage-observed']})[0],region=map.queryRenderedFeatures(e.point,{layers:['coverage-base']})[0];if(!cell&&!region)return false;
  const id=cell?.properties.region_id||region?.properties.id,r=getState().catalog.find(r=>r.id===id),box=node('div',undefined,'search-popup'),p=cell?.properties;
  box.append(node('h3',r?.name||region?.properties.name||'관측 영역'));
  const at=p?.observed_at,age=at?Math.max(0,Date.now()/1000-(typeof at==='number'?at:Date.parse(at)/1000)):null,stale=age!==null&&age>(current?.revisit_minutes||30)*60;
  const capture=getState().capture,run=getState().coverage?.run_id,matchingCapture=capture?.run_id===run;
  const analysis=!cell?'영상 없음':matchingCapture&&capture.analysis?.completed===0?'미실행 · GPU 꺼짐':'셀별 분석 연결 미확인';
  const linked=results?.linked&&results.source_run_id===run;
  const observations=linked?results.groups.flatMap(g=>g.observations).filter(r=>estimatePoint(r)&&cell&&pointInside(estimatePoint(r),cell.geometry)):[];
  const reviewed=observations.filter(r=>results.reviews[r.observation_id]?.status&&results.reviews[r.observation_id].status!=='PENDING').length;
  const review=observations.length?`위치 추정 후보 ${reviewed}/${observations.length}건 검토`:linked?'연결된 후보 없음':'이 촬영의 후보 검토 없음';
  const facts=node('dl');for(const [k,v] of [['촬영',cell?'유효 관측 기록':'미관측'],['시각',when(at)],['분석',analysis],['검토',review]])facts.append(node('dt',k),node('dd',v));box.append(facts);
  if(stale)box.append(node('p',`${Math.floor(age/60)}분 경과 · 재수색 권고`));box.append(node('p','초록 영역은 대상 부재를 뜻하지 않습니다.'));
  if(r){const b=button('재수색 구역에 추가',()=>{onApply([...new Set([...getState().selected,id])]);mapPopup?.remove();});b.disabled=locked()||!!current&&current.status!=='ACTIVE';box.append(b);}popupAt([e.lngLat.lng,e.lngLat.lat],box);
  if(cell&&run&&!matchingCapture){const v=version;void api(`simulations/runs/${run}/postflight?limit=1`).then(data=>{if(v!==version||!box.isConnected)return;facts.querySelectorAll('dd')[2].textContent=data.analysis?.completed===0?'이 비행 분석 미실행 · GPU 꺼짐':`비행 내 ${data.analysis?.completed??0}프레임 분석 · 셀 매칭 미확인`;}).catch(()=>{if(box.isConnected)facts.querySelectorAll('dd')[2].textContent='분석 상태 조회 지연';});}
  return true;
 }
 function attachMap(){const map=getMap();if(!map||map.getSource('search-last-seen'))return;
  map.addSource('search-last-seen',{type:'geojson',data:FC([])});map.addLayer({id:'search-last-seen',source:'search-last-seen',type:'circle',paint:{'circle-color':'#0d7184','circle-radius':8,'circle-stroke-color':'#fff','circle-stroke-width':3}});
  mapSignature='';updateMap();
 }
 function updateMap(){if(!ready&&!mapSignature)return;const map=getMap();if(typeof map?.getSource!=='function'||!map.getSource('search-last-seen'))return;const s=getState(),threshold=(current?.revisit_minutes||30)*60;
  const stale=s.mapMode==='coverage'?(s.coverage?.features||[]).filter(f=>{const t=f.properties.observed_at,n=typeof t==='number'?t:Date.parse(t)/1000;return Number.isFinite(n)&&Date.now()/1000-n>threshold;}):[];
  const key=document.getElementById('coverage-stale-key');if(key){key.hidden=!stale.length;key.textContent='재관측 권고';key.title='관측 완료 영역은 초록색으로 유지됩니다. 설정한 재관측 시간이 지난 영역이 있습니다.';}
  // Age is a separate operational cue. Dense per-cell outlines must never
  // cover the green evidence layer or imply previously observed cells vanished.
  const signature=JSON.stringify(current?.last_seen);if(signature===mapSignature)return;mapSignature=signature;
  map.getSource('search-last-seen').setData(FC(current?.last_seen?[{type:'Feature',geometry:{type:'Point',coordinates:current.last_seen.point},properties:{}}]:[]));
 }
 function planContext(){if(!current||current.status!=='ACTIVE')return {};return {case_id:current.case_id,case_revision:current.revision};}
 function logout(){ready=false;placeSearch.clear();caseEditorDone=null;caseEditorOpener=null;version++;searchVersion++;current=results=recommendation=summaryData=null;allCases=[];resultKey='';mapPopup?.remove();if($('case-dialog').open)$('case-dialog').close();if($('case-summary-dialog').open)$('case-summary-dialog').close();$('candidate-detail').replaceChildren();$('place-results').replaceChildren();$('place-results').hidden=true;$('map-pick-message').hidden=true;picking=false;reviewQueue=[];drafts.clear();setSearchOpen(false);updateMap();}
 $('case-edit').onclick=()=>{const opener=summaryOpener;$('case-summary-dialog').close();editCase(false,null,'',{onDone:()=>{openSummary();summaryOpener=opener;}});};
 $('case-close').onclick=$('case-cancel').onclick=()=>{if(!requestBusy)finishCaseEditor();};
 $('case-dialog').addEventListener('cancel',e=>{e.preventDefault();if(!requestBusy)finishCaseEditor();});
$('case-form').onsubmit=e=>{e.preventDefault();void attempt(saveCase,'case-error');};$('case-pick').onclick=pickLocation;$('case-clear-point').onclick=()=>{draftPoint=null;locationLabel();};$('map-pick-cancel').onclick=()=>endPick();

 $('case-resume').onclick=()=>void attempt(resumeCase);
 for(const id of ['case-summary-open','review-case-summary','complete-case-summary'])$(id).onclick=openSummary;
 $('case-summary-dismiss').onclick=()=>$('case-summary-dialog').close();
 $('case-summary-dialog').addEventListener('close',()=>{if(summaryOpener?.isConnected)summaryOpener.focus({preventScroll:true});});
 $('summary-refresh').onclick=()=>void attempt(refreshSummary,'summary-error');
 $('summary-review').onclick=()=>{$('case-summary-dialog').close();urgent=false;$('result-search').value='';$('result-location-filter').value='all';$('result-review-filter').value=summaryData?.review?.counts.PENDING?'pending':summaryData?.review?.field_open?'field':summaryData?.review?.deferred?'deferred':'all';$('candidate-filters').open=false;renderResults();onShowReview();};
 $('summary-research').onclick=()=>{if(locked()||current?.status!=='ACTIVE')return;const remaining=remainingRegions(),ids=remaining.length?remaining:getState().selected;$('case-summary-dialog').close();onApply(ids,ids);};
 $('case-finish-open').onclick=()=>{$('case-finish-form').hidden=false;render();$('case-finish-reason').focus();};
 $('case-finish-cancel').onclick=()=>{$('case-finish-form').hidden=true;render();$('case-finish-open').focus();};
 $('case-finish-form').onsubmit=e=>{e.preventDefault();void attempt(finishCase,'summary-error');};
 $('summary-reopen').onclick=()=>void attempt(async()=>{await resumeCase();await refreshSummary();},'summary-error');
 $('media-view-target').onclick=()=>setMediaView('target');$('media-view-full').onclick=()=>setMediaView('full');
 $('place-toggle').onclick=()=>setSearchOpen($('map-search').hidden);$('place-close').onclick=()=>{setSearchOpen(false);$('place-toggle').focus({preventScroll:true});};
 d.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('map-search').hidden){e.preventDefault();e.stopPropagation();setSearchOpen(false);$('place-toggle').focus({preventScroll:true});}},true);
 $('recommend-refresh').onclick=()=>void attempt(refreshRecommendations,'recommend-note');$('recommend-apply').onclick=()=>{if(locked())return;const ids=order.slice(0,3);onApply(ids,ids,{commit:true});$('recommend-details').open=false;};$('coverage-link').onclick=()=>void attempt(()=>linkSource('coverage'));$('source-link').onclick=()=>void attempt(()=>linkSource('results'));
 function resetResultFilters(){urgent=false;$('result-search').value='';$('result-location-filter').value='all';$('result-review-filter').value='all';$('candidate-filters').open=false;renderResults();}
 d.addEventListener('pointerdown',e=>{if(!$('candidate-filters').contains(e.target))$('candidate-filters').open=false;});
 d.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('candidate-filters').open&&!d.querySelector('dialog[open]')){e.preventDefault();e.stopPropagation();$('candidate-filters').open=false;$('candidate-filters').querySelector('summary').focus({preventScroll:true});}},true);
 $('candidates-all').onclick=resetResultFilters;$('clear-result-filters').onclick=resetResultFilters;
 $('candidates-urgent').onclick=()=>{urgent=!urgent;$('result-review-filter').value='all';$('result-search').value='';$('result-location-filter').value='all';renderResults();};
 $('results-source')?.addEventListener('change',()=>{resultKey='';results=null;getState().chosen=null;void attempt(async()=>{await refreshResults();onRecommendations();});});
 $('load-results').addEventListener('click',()=>{if(ready)void attempt(refreshResults);});
 $('result-review-filter').onchange=()=>{urgent=false;renderResults();};
 for(const key of ['pending','field','deferred'])$('queue-'+key).onclick=()=>{
  if(!results?.linked)return;
  $('result-review-filter').value=$('result-review-filter').value===key?'all':key;
  $('result-search').value='';$('result-location-filter').value='all';urgent=false;renderResults();
 };
 return {cases:()=>allCases,currentCase:()=>current,selectCase,refreshRecords,createCase:done=>editCase(true,null,'',{onDone:done,activate:false}),resultSnapshot:()=>results,boot,render,renderResults,renderMedia,logout,mapClick,attachMap,setSpatialData,planContext,refreshResults,reasonFor,openSummary,isPicking:()=>picking};
}
