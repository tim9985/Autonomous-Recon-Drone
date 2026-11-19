import {changeControlTab,denseMapScreen} from './school-operations.mjs';
import {accountStorage,bindSchoolAccount} from './school-workspace.mjs';
const schoolLocal=accountStorage(window.localStorage),schoolSession=accountStorage(window.sessionStorage);
import {createMissionWorkspace} from './local-missions.mjs';
import {mountRecordTools} from './local-records.mjs';
import {mountMobileControls} from './local-mobile-controls.mjs';
import {createSearchWorkspace} from './local-search.mjs';
import {terminal,validId,actualPoint,estimatePoint,distance,along,canStart,sourceMode,droneConnectionReady,storageReady,storageIssue,receivedStorage} from './local-dashboard-model.mjs';
import {addCampusLayers} from './local-dashboard-map.mjs';
import {loadCampusDisplay} from './local-spatial-cache.mjs';
import {makeSimRouteLayer,displayPaths,primaryRoute3D,routeFeatures3D,groundTrack,valid3D} from './local-sim-route-3d.mjs';
import {selectionFeatures} from './local-dashboard-selection.mjs';
import {mountIcons} from './local-dashboard-icons.mjs';
import {scenePreparationNeeded,toggleZone,selectionLocked,selectionAfterChange,missionSummary,regionCoverage,mergeObservationProgress,VehicleMotion,vehiclePosition,mapLayerVisibility,panelLayout,flightActions,activeRegionRoute,routeDashFrame,droneStatus,routeTiming,simulatorStandby,casePlanIssue,regionVisitSequence,routePlanningRows,nextRouteStatus,formatDuration,missionElapsed,regionTiming,flightPhase,routeActivity,cameraFootprint} from './local-dashboard-ui.mjs';
const $=id=>document.getElementById(id),empty={type:'FeatureCollection',features:[]};
const S={auth:false,csrf:'',catalog:[],region:'',plan:null,control:null,fresh:false,busy:false,pending:false,mode:'current',capture:null,previous:null,previousTrack:[],chosen:null,track:[],cursor:'0',trackRun:null,imageKey:'',review:null,generation:0,polling:false,pick:false};
let map,mapReady=false,popup,pollTimer,mapBounds,mapHome;
let flight3D,previewMarker,simWorld,view3D=localStorage.getItem('local-sim-view-3d')!=='false';
const spatialEnabled=()=>view3D&&!!flight3D?.ready();
let storageTimer,storageRequest=null,storageEpoch=0;
const snapshotCache=new Map();
S.sessionEpoch=0;S.detailsPolling=false;
S.storage=null;
let droneMarker;
let vehicleMotion=new VehicleMotion(),vehicleAnimation=0,telemetryTimer;
S.telemetryFresh=false;S.telemetryPolling=false;
let routeMarkers=[],routeMarkerKey='';
const visitMarkers=new Map();let visitMarkerKey='';
let mediaRequest=0,mediaOpener=null;
let connectionOpener=null;
S.connectionError='';
S.mediaResult=null;S.mediaSourceRun=null;S.locatedObservation=null;
const renderedSources=new Map(),renderedLayers=new Map();
let renderedRegionMode;
let routeAnimation=0,routeAnimationStep=-1;
S.flightCommand=null;
S.mapMode='semantic';S.coverage=null;S.coverageError='';S.vehicle=null;S.mapPrepared=false;
S.priorityOrder=[];
S.inspectRegion='';
let searchWorkspace,missionWorkspace,mobileControls,recordTools;
S.zones=[];S.selected=[];S.preview=[];S.zoneVersion='';S.initial='';
const stages={flight:'flight-panel',analysis:'video-panel',review:'review-panel'};
S.step='flight';S.panelOpen=true;S.sidebarOpen=true;S.editing=false;S.editSnapshot=null;S.planningRequest=false;S.planningError='';
const compactScreen=()=>window.innerWidth<=1023;
const motion=duration=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?0:duration;
const formatDateTime=value=>value?new Date(typeof value==='number'?value*1000:value).toLocaleString('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}):'기록 없음';
function mapPadding(){
 // Applied only when the user requests a camera move, never on sidebar toggles.
 const topHeight=$('map-topbar').getBoundingClientRect().height;
 return compactScreen()?{top:topHeight+32,right:56,bottom:S.sidebarOpen?$('mission-sidebar').getBoundingClientRect().height+40:84,left:24}:{top:topHeight+32,right:60,bottom:60,left:S.sidebarOpen?$('mission-sidebar').getBoundingClientRect().width+60:60};
}
function mapFocusOptions(){
 const p=mapPadding();
 // flyTo padding persists in MapLibre; an offset leaves later bounds fitting intact.
 return {padding:{top:0,right:0,bottom:0,left:0},offset:[(p.left-p.right)/2,(p.top-p.bottom)/2]};
}
function updateSidebarToggle(){
 const label=S.sidebarOpen?'사이드바 접기':'사이드바 펼치기',notice=!$('error').hidden;
 $('sidebar-toggle').title=label;$('sidebar-toggle').setAttribute('aria-label',label+(notice?' · 상태 알림 있음':''));
 $('sidebar-toggle').setAttribute('aria-expanded',String(S.sidebarOpen));$('sidebar-toggle').dataset.error=String(notice);
 $('sidebar-toggle-label').hidden=S.sidebarOpen||!S.editing;
 $('sidebar-toggle-label').textContent=S.editing?'구역 편집 · '+S.selected.length+'개':'';
}
function setSidebarOpen(open,{restoreFocus=false,persist=true}={}){
 const ownedFocus=$('mission-sidebar').contains(document.activeElement);
 if(!open&&ownedFocus)$('sidebar-toggle').focus({preventScroll:true});
 S.sidebarOpen=open;$('mission-sidebar').hidden=!open;
 $('mission-sidebar').inert=!open;$('mission-sidebar').setAttribute('aria-hidden',String(!open));
 $('split').dataset.sidebar=open?'open':'closed';
 updateSidebarToggle();
 if(persist&&!compactScreen())localStorage.setItem('local-sidebar-open',String(open));
 if(restoreFocus||(!open&&ownedFocus))$('sidebar-toggle').focus({preventScroll:true});
}
function setPanelOpen(open,{restoreFocus=false,revealSidebar=true}={}){
 S.panelOpen=true;$('split').dataset.layout=panelLayout(S.step);$('control-pane').dataset.layout=panelLayout(S.step);$('control-pane').hidden=false;
 if(open&&revealSidebar)setSidebarOpen(true);
 for(const name of Object.keys(stages)){
  $('tab-'+name).setAttribute('aria-selected',String(S.step===name));$('tab-'+name).tabIndex=S.step===name?0:-1;
 }
 if(restoreFocus)$(S.sidebarOpen?'tab-'+S.step:'sidebar-toggle').focus({preventScroll:true});
}
function activateStep(key,{focus=false,open=true,revealSidebar=true}={}){
 if(!Object.hasOwn(stages,key))return;
 const changed=S.step!==key,tab=$('tab-'+key);
 changeControlTab(tab.closest('[role=tablist]'),tab,()=>{
  S.step=key;
  for(const [name,panel] of Object.entries(stages))$(panel).hidden=name!==key;
  setPanelOpen(open,{revealSidebar});
 },focus);
 if(key==='review'&&S.auth&&(changed||!S.previous))void loadPrevious().then(()=>{
  if(S.step==='review')renderResults();
 }).catch(e=>{if(S.step==='review')error(e.message);});
}
const connectionLocked=()=>S.connectionPending||S.control?.launch_mode==='CONNECT_THEN_START'&&['QUEUED','CONNECTING','READY','CLAIMED','LOST','DISCONNECTING'].includes(S.control?.connection?.state);
const editsLocked=()=>connectionLocked()||selectionLocked({flightActive:active(),busy:S.busy,pending:S.pending,planState:S.plan?.state});
const editKeys=['priorityOrder','selected','preview','initial','region','plan','planFinished','planningError','capture','track','cursor','trackRun','chosen','mode','imageKey','review','inspectRegion'];
function persistSelection(){
 if(S.selected.length&&S.zoneVersion)schoolLocal.setItem('local-zone-selection',JSON.stringify({ids:S.selected,initial:S.initial,priority:S.priorityOrder,version:S.zoneVersion}));
 else if(!S.selected.length)schoolLocal.removeItem('local-zone-selection');
 if(S.plan)schoolLocal.setItem('local-dashboard-plan',S.plan.plan_id);else schoolLocal.removeItem('local-dashboard-plan');
}
function beginSelectionEdit(){
 if(editsLocked()||S.editing)return;
 if(missionWorkspace&&!missionWorkspace.current){void missionWorkspace.edit(true,{begin:true});return;}
 S.editSnapshot=Object.fromEntries(editKeys.map(key=>[key,S[key]]));S.editZoneVersion=S.zoneVersion;S.editStep=S.step;
 activateStep('flight');S.editing=true;setSidebarOpen(true);$('control-content').scrollTop=0;error();renderSelection();render();
}
function finishSelectionEdit(commit=true){
 if(!S.editing||editsLocked())return;
 if(!commit){Object.assign(S,S.editSnapshot);S.generation++;if(missionWorkspace?.current&&S.plan?.selection?.mission_id===missionWorkspace.current.mission_id&&S.plan.selection.mission_route_revision!==missionWorkspace.current.route_revision)clearPlanBinding();}
 const restoreStep=!commit?S.editStep:'flight';
 S.editing=false;S.editSnapshot=null;S.editZoneVersion=null;persistSelection();missionWorkspace?.changed();renderSelection();render();
 activateStep(restoreStep||'flight',{revealSidebar:false});
 $(S.sidebarOpen?'edit-regions':'sidebar-toggle').focus({preventScroll:true});
}
function reusableEditedPlan(){
 const previous=S.editSnapshot,p=previous?.plan;
 if(missionWorkspace?.current&&p?.selection?.mission_route_revision!==missionWorkspace.current.route_revision)return null;
 if(!S.editing||p?.kind!=='GLOBAL'||p.state!=='READY'||casePlanIssue(p,searchWorkspace?.planContext())||S.zoneVersion!==S.editZoneVersion||p.package_id!==S.control?.regional?.package_id||S.control?.job?.plan_id===p.plan_id)return null;
 if(S.plan?.plan_id===p.plan_id&&S.plan.state!=='READY')return null;
 const sameZones=JSON.stringify([...S.selected].sort())===JSON.stringify([...previous.selected].sort());
 return sameZones&&S.initial===previous.initial&&JSON.stringify(S.priorityOrder)===JSON.stringify(previous.priorityOrder)?p:null;
}
async function advancePreparation(){
 if($('plan-route').hidden||$('plan-route').disabled)return;
 if(S.editing){
  const previous=reusableEditedPlan();
  if(previous)Object.assign(S,S.editSnapshot);
  finishSelectionEdit(true);
  if(previous){setPanelOpen(false);fitRegion();if(S.sidebarOpen)$('mission-name').focus({preventScroll:true});return;}
 }
 await makePlan();
 if(S.sidebarOpen)$('mission-name').focus({preventScroll:true});
}
function renderZoneList(){
 const term=$('zone-search').value.trim().toLocaleLowerCase(),supported=supportedIds();
 const zones=S.zones.filter(f=>term?f.properties.name.toLocaleLowerCase().includes(term):supported.has(f.properties.zoneId)||S.selected.includes(f.properties.zoneId));
 $('zone-list').replaceChildren(...zones.map(f=>{
  const id=f.properties.zoneId,b=el('button',undefined,'zone-option');b.type='button';b.dataset.zoneId=id;
  b.setAttribute('aria-label',f.properties.name);b.setAttribute('aria-pressed',String(S.selected.includes(id)));b.disabled=!S.editing||editsLocked();
  b.append(el('span',f.properties.name),el('small',id===S.initial?'시작 구역':supported.has(id)?'계획 가능':'계획 미지원'));
  b.onclick=()=>{const scroll=$('zone-list').scrollTop;applySelection(toggleZone(S.selected,id));$('zone-list').scrollTop=scroll;[...$('zone-list').children].find(n=>n.dataset.zoneId===id)?.focus({preventScroll:true});};return b;
 }),...(!zones.length?[el('p',term?'일치하는 구역이 없습니다.':'구역 자료를 불러오는 중…','empty')]:[]));
}
function clearPlanBinding(){
 S.generation++;S.plan=null;S.planFinished=null;S.planningError='';S.review=null;S.capture=null;S.track=[];S.cursor='0';S.trackRun=null;S.chosen=null;S.mode='current';S.imageKey='';
$('plan-position').value=0;$('plan-percent').textContent='0%';$('review-status').textContent='';
 if(!S.editing)schoolLocal.removeItem('local-dashboard-plan');popup?.remove();
}
const labels={OBSERVATION_WAIT:'관측 수신 대기',PAUSING:'제자리 대기 전환',PAUSED:'일시중지',RETURN_VALIDATING:'복귀 경로 검증',OPERATOR_RETURN:'요청에 따라 복귀',SAVING_FRAMES:'착륙 후 영상 저장',INGRESS:'구역 진입',DRAINING_OBSERVATIONS:'실제 관측 원장 확인',PARTIAL_RETURNED:'관측 미완료 · 복귀 확인',RECOVERY_REQUIRED:'이전 실행 확인 필요',PARTIAL:'일부 정찰 후 복귀',HANDOFF:'다음 구역 검증',WAITING_NEXT:'다음 계산 대기',QUEUED:'요청 대기',STARTING:'시뮬 준비',COLLECTING:'정찰·촬영',RUNNING:'정찰 중',PREPARING:'준비 중',ARMING:'무장 준비',TAKEOFF:'이륙',SEARCH:'구역 정찰',RETURN:'복귀',LANDING:'착륙',LANDED:'착륙 완료',LAND:'착륙',CAPTURED:'착륙 확인',COMPLETED:'정찰 완료',PREVIOUS_RESULTS_READY:'정찰 완료',FAILED:'실행 실패',CANCELLED:'중지됨',EXPIRED:'요청 만료',INTERRUPTED:'실행 중단'};
const reasons={OPERATOR_RETURN:'요청에 따라 남은 정찰을 종료하고 복귀했습니다.',LOCAL_FLIGHT_ACTION_UNAVAILABLE:'현재 비행 상태에서는 이 동작을 사용할 수 없습니다.',LOCAL_FLIGHT_CONTROL_STALE:'실행기 응답을 확인한 뒤 다시 시도하세요.',LOCAL_FLIGHT_COMMAND_PENDING:'앞선 명령의 적용을 확인 중입니다.',LOCAL_FLIGHT_NOT_ACTIVE:'이미 종료된 정찰입니다.',NO_FRESH_CHECKED_RETURN:'복귀 경로 검증 실패 · 안전 착륙으로 전환합니다.',ACTUAL_COVERAGE_BELOW_TARGET:'실제 관측이 목표 95%에 미달해 완료로 처리하지 않았습니다.',OBSERVATION_LEDGER_NOT_DRAINED:'관측 원장 배출이 확인되지 않아 완료를 보류했습니다.',VALID_OBSERVATION_FRAMES_REQUIRED:'유효한 실제 영상 관측이 부족합니다.',ACTUAL_EXIT_POSE_MISMATCH:'실제 구역 종료 위치·방향이 계획과 다릅니다.',LOCAL_INPUT_VERSION_MISMATCH:'지도·계획 입력이 변경됐습니다. 현재 입력으로 경로를 다시 계획하세요.',LOCAL_COORDINATE_BINDING_CHANGED:'좌표·시뮬레이터 설정이 입력 릴리스와 다릅니다.',LOCAL_SCENE_RECEIPT_CHANGED:'장면 검증 기록이 변경됐습니다.',GLOBAL_UNSUPPORTED_REGIONS:'선택한 구역 중 현재 계획 패키지에 없는 구역이 있습니다. 선택 목록에서 확인해 주세요.',GLOBAL_ZONE_VERSION_CHANGED:'구역 자료 버전이 변경됐습니다. 지도를 새로고침하고 다시 선택하세요.',NEXT_PLAN_NOT_READY:'다음 경로가 준비되지 않아 복귀합니다.',HANDOFF_VALIDATION_FAILED:'다음 구역 진입 검증에 실패해 복귀합니다.',GLOBAL_BUDGET_RESERVE:'남은 비행시간으로 다음 구역과 복귀를 보장할 수 없어 복귀합니다.',READY:'실행 준비 완료',LOCAL_PATROL_BUSY:'계획·정찰 실행 중',MEMORY_RESERVE_REQUIRED:'물리 RAM과 커밋 여유가 각각 8GiB 이상이어야 합니다.',RECORDING_SPACE_REQUIRED:'녹화 공간 10GiB 이상이 필요합니다.',SIMULATOR_ALREADY_RUNNING:'다른 로컬 시뮬레이터가 실행 중입니다.',LOCAL_RUNNER_NOT_READY:'로컬 실행기가 아직 준비되지 않았습니다.',REGIONAL_MEMORY_RESERVE:'출발 대기 · 시스템 메모리 여유 부족',REGIONAL_SCENE_PREPARATION_REQUIRED:'계획과 일치하는 건물 정보로 시뮬레이터 장면을 먼저 준비해야 합니다.',REGIONAL_SCENE_RECEIPT_CHANGED:'시뮬레이터 장면 검증 기록을 다시 확인해야 합니다.',REGIONAL_PREPARATION_REQUIRED:'시뮬레이터 준비 대기',LOCAL_PLAN_CHANGED:'계획이 변경됐습니다. 경로를 다시 확인하세요.',PLANNING_MEMORY_RESERVE:'경로 계산에 필요한 메모리 여유 4GiB를 확보해 주세요.',REGIONAL_PLANNER_FAILED:'경로 계산을 완료하지 못했습니다. 실행 기록에 오류를 보존했습니다.',LOCAL_PLANNER_INTERRUPTED:'경로 계산이 중단됐습니다. 다시 계획할 수 있습니다.',REGIONAL_SCENE_PREPARATION_FAILED:'장면 준비를 완료하지 못했습니다. 준비 기록을 확인하세요.',NETWORK:'연결이 지연되고 있습니다. 출발을 잠시 차단했습니다.'};
const colors={black:'검정',white:'흰색',gray:'회색',grey:'회색',red:'빨강',orange:'주황',yellow:'노랑',green:'초록',blue:'파랑',purple:'보라',pink:'분홍',brown:'갈색',navy:'남색',beige:'베이지'};
const postures={standing:'서 있음',sitting:'앉음',lying:'누움',unknown:'판별 보류'};
const formatTime=v=>v?new Date(typeof v==='number'?v*1000:v).toLocaleTimeString('ko-KR',{hour12:false}):'—';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(cls)n.className=cls;return n;};
const message=code=>reasons[code]||String(code||'연결 오류');
Object.assign(reasons,{RGB_CAPTURE_LOST:'영상 저장 응답이 지연되어 안전 착륙했습니다. 확보한 관측은 보존됩니다.',OBSERVATION_RECOVERY_TIMEOUT:'관측 수신이 제한 시간 내 복구되지 않아 안전 착륙했습니다.',OBSERVATION_RECOVERY_LIMIT:'반복된 관측 지연으로 안전 착륙했습니다.',OBSERVER_BACKLOG:'관측 처리 응답이 지연되어 정찰을 중단했습니다. 확보한 관측 기록은 유지됩니다.',NEXT_ENTRY_ORIGIN_MISMATCH:'현재 종료 위치가 다음 경로의 연결 조건과 다릅니다. 검증된 경로로 복귀합니다.',NO_CHECKED_NEXT_INGRESS:'안전한 다음 구역 진입 경로를 확인하지 못해 복귀합니다.'});
Object.assign(reasons,{STORAGE_QUOTA_EXCEEDED:'녹화 저장 한도 초과로 정찰이 중단됐습니다. 원본은 보존되어 있습니다.',RECORDING_QUOTA_RESERVE_REQUIRED:'녹화 저장 여유가 1GiB 미만입니다. 저장 공간을 확보한 뒤 출발하세요.',RECORDING_STORAGE_NOT_WRITABLE:'녹화 저장소에 쓸 수 없습니다. 저장 경로와 권한을 확인하세요.',RECORDING_STORAGE_UNAVAILABLE:'녹화 저장소 상태를 확인하지 못했습니다. 다시 확인하세요.',RECORDING_UPLOAD_FAILED:'녹화 저장에 실패해 정찰이 중단됐습니다. 원본과 실행 기록을 확인하세요.'});
Object.assign(reasons,{RECORDING_STORAGE_CHECKING:'녹화 저장소 확인 중…',RECORDING_STORAGE_STALE:'녹화 저장소 상태 갱신이 지연됐습니다. 다시 확인하세요.',RECORDING_STORAGE_CHECK_FAILED:'녹화 저장소 확인 요청이 실패했습니다. 다시 확인하세요.'});
function recordingIssue(){const issue=storageIssue(S.control?.storage);return issue?message(issue):'';}
function acceptStorage(value,started){
 if(!S.storage||started>=S.storage.checked_monotonic_ms)S.storage={...receivedStorage(value,started),checked_monotonic_ms:started};
 if(S.control)S.control.storage=S.storage;
 return S.storage;
}
function renderStorageRetry(){
 const button=$('connection-storage-retry');
 button.hidden=!recordingIssue()||active();button.disabled=!!storageRequest;
 button.textContent=storageRequest?'확인 중…':'저장소 다시 확인';
 $('readiness-retry').disabled=!!storageRequest||S.busy;
}
function pollStorage(){
 if(!S.auth)return Promise.resolve();
 if(storageRequest)return storageRequest;
 clearTimeout(storageTimer);storageTimer=null;
 const epoch=storageEpoch,started=performance.now();
 storageRequest=(async()=>{
  try{
   const value=await api('local-patrol/recording-storage',undefined,5000);
   if(!S.auth||epoch!==storageEpoch)return;
   acceptStorage(value,started);
  }catch(e){
   if(!S.auth||epoch!==storageEpoch)return;
   if(e.status===401){authLost();return;}
   acceptStorage({ready:false,checked_at:Date.now()/1000,reason:'RECORDING_STORAGE_CHECK_FAILED'},started);
  }finally{
   if(epoch===storageEpoch){
    storageRequest=null;
    if(S.auth){storageTimer=setTimeout(()=>void pollStorage(),5000);if(S.control&&recordingIssue()!==S.renderedStorageIssue)render();renderStorageRetry();}
   }
  }
 })();
 renderStorageRetry();
 return storageRequest;
}
function resetStorageCheck(){storageEpoch++;clearTimeout(storageTimer);storageTimer=null;storageRequest=null;S.storage=null;if(S.control)S.control.storage=null;}
function failureMessage(job){const detail=String(job?.upload_error||job?.error||'');const code=['OTHER_SIM_RUN_ACTIVE','STORAGE_QUOTA_EXCEEDED','RECORDING_QUOTA_RESERVE_REQUIRED','RECORDING_SPACE_REQUIRED','RECORDING_STORAGE_NOT_WRITABLE','RECORDING_STORAGE_UNAVAILABLE','RECORDING_UPLOAD_FAILED','OBSERVER_BACKLOG','RGB_CAPTURE_LOST','OBSERVATION_RECOVERY_TIMEOUT','OBSERVATION_RECOVERY_LIMIT','NEXT_ENTRY_ORIGIN_MISMATCH','NO_CHECKED_NEXT_INGRESS'].find(c=>detail.includes(c));return message(code||job?.error);}
Object.assign(reasons,{LOCAL_DRONE_CONNECT_INTERRUPTED:'연결 준비가 중단됐습니다. 연결을 해제한 뒤 다시 연결하세요.',LOCAL_DRONE_OWNERSHIP_CHANGED:'다른 SIM이 실행 중입니다. 현재 연결 상태를 확인하세요.'});
Object.assign(reasons,{LOCAL_STATE_UNAVAILABLE:'상태 파일을 갱신 중입니다. 잠시 후 다시 확인합니다.'});
Object.assign(reasons,{LOCAL_EXECUTION_INTERRUPTED:'관제 실행 서비스가 종료되어 임무가 중단됐습니다. 드론을 다시 연결해 주세요.'});
Object.assign(reasons,{LOCAL_RUNNER_FAILED:'관제 실행기 오류로 정찰이 중단됐습니다. 드론을 다시 연결해 주세요.'});
Object.assign(reasons,{OTHER_SIM_RUN_ACTIVE:'다른 정찰 실행의 점유가 남아 있습니다. 종료 상태를 확인한 뒤 다시 연결하세요.'});
Object.assign(reasons,{LOCAL_DRONE_CONNECTION_REQUIRED:'드론을 먼저 연결하고 상태를 확인하세요.',LOCAL_DRONE_CONNECTION_MISMATCH:'연결된 드론의 계획이 다릅니다. 연결 해제 후 다시 연결하세요.',LOCAL_DRONE_CONNECTION_BUSY:'현재 드론 연결을 먼저 해제하세요.',LOCAL_DRONE_TELEMETRY_STALE:'드론 상태 수신이 끊겼습니다. 연결을 확인하세요.',LOCAL_DRONE_TELEMETRY_TIMEOUT:'위치·착륙 상태를 확인하지 못했습니다. 다시 연결하세요.',LOCAL_DRONE_SIM_START_FAILED:'로컬 SIM을 시작하지 못했습니다. 실행 기록을 확인하세요.',LOCAL_DRONE_CONNECT_TIMEOUT:'드론 연결 시간이 초과되었습니다.',LOCAL_DRONE_CONNECT_EXPIRED:'대기 시간이 지나 연결을 해제했습니다. 다시 연결하세요.',LOCAL_DRONE_CONNECT_CANCELLED:'드론 연결을 취소했습니다.',LOCAL_DRONE_DISARM_NOT_CONFIRMED:'무장 해제를 확인하지 못했습니다. 드론 상태를 확인하세요.',LOCAL_DRONE_HANDOFF_FAILED:'출발 연결 인계에 실패했습니다. 연결을 다시 확인하세요.',LOCAL_DRONE_CONNECTION_CHANGED:'연결된 SIM의 입력이 변경됐습니다. 다시 연결하세요.'});
Object.assign(reasons,{SEARCH_PLAN_CASE_MISMATCH:'현재 사건에 연결되지 않은 경로입니다. 현재 사건의 조건으로 다시 계획하세요.',SEARCH_PLAN_CASE_REVISION:'사건 조건이 변경되었습니다. 현재 조건으로 다시 계획하세요.',SEARCH_CASE_CHANGED:'사건 조건이 변경되었습니다. 사건을 다시 선택한 뒤 경로를 만드세요.',SEARCH_CASE_ARCHIVED:'종료·보관 사건입니다. 사건을 재개한 뒤 다시 계획하세요.'});
const active=()=>!!S.control?.job&&!terminal.has(S.control.job.state);
const currentJob=()=>{const j=S.control?.job;return j&&(j.plan_id===S.plan?.plan_id||!S.plan&&!j.plan_id)?j:null;};
function error(text=''){
 $('error').textContent=text;$('error').hidden=!text;
 updateSidebarToggle();
}
async function api(path,body,timeout=18000,signal){
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),timeout),cancel=()=>abort.abort();
 signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
 const requestEpoch=S.sessionEpoch;
 const revalidate=body===undefined&&/^local-patrol\/[^/]+\/(coverage|track)$/.test(path),cached=revalidate?snapshotCache.get(path):null;
 try{
  const r=await fetch('/api/v1/'+path,{method:body===undefined?'GET':'POST',cache:'no-store',credentials:'same-origin',signal:abort.signal,
   headers:{'X-Request-ID':crypto.randomUUID(),...(cached?{'If-None-Match':cached.etag}:{}),...(body===undefined?{}:{'Content-Type':'application/json','X-CSRF-Token':S.csrf})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  if(r.status===304&&cached)return cached.data;
  const data=await r.json().catch(()=>null);
  if(!r.ok){const code=data?.error?.code||data?.detail||`HTTP ${r.status}`,e=new Error(message(code));e.status=r.status;throw e;}
  if(data===null)throw new Error('서비스 응답 형식을 확인하지 못했습니다. 다시 확인하세요.');
  const etag=revalidate&&r.headers?.get('etag');
  if(etag&&S.auth&&requestEpoch===S.sessionEpoch){snapshotCache.delete(path);snapshotCache.set(path,{etag,data});while(snapshotCache.size>6)snapshotCache.delete(snapshotCache.keys().next().value);}
  return data;
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
}
async function localJson(path){const url=new URL(path,location.origin);if(url.origin!==location.origin)throw new Error('외부 지도 자료 경로를 사용할 수 없습니다.');const r=await fetch(url,{cache:url.searchParams.get('view')==='map'?'no-cache':'no-store'});if(!r.ok)throw new Error('지도 자료 조회 실패');return r.json();}
function authLost(){bindSchoolAccount(null);if(S.auth){location.reload();return;}recordTools?.logout();if($('drone-connection-dialog').open)$('drone-connection-dialog').close();searchWorkspace?.logout();missionWorkspace?.logout();$('app-actions').hidden=true;$('start-flight').disabled=true;$('map-stop-flight').disabled=true;$('map-return-flight').disabled=true;$('flight-controls').hidden=true;$('boot-retry').hidden=true;$('connection-pill').textContent='로그인 필요';$('connection-pill').dataset.state='offline';S.auth=false;S.sessionEpoch++;snapshotCache.clear();S.fresh=false;S.telemetryFresh=false;resetStorageCheck();clearTimeout(pollTimer);clearTimeout(telemetryTimer);telemetryTimer=null;$('workspace').hidden=true;$('login-panel').hidden=false;$('logout').hidden=true;$('boot-status').hidden=true;if($('media-dialog').open)$('media-dialog').close();}
function setStep(id,state,text){const n=$('step-'+id);n.dataset.state=state;n.dataset.status=text;}
function region(){if(S.selected.length){const selected=selectionFeatures(S.zones,S.selected);return {id:S.plan?.kind==='GLOBAL'?S.plan.region_id:S.region,name:`선택 ${S.selected.length}개 구역`,kind:'GLOBAL',areaM2:selected.length===S.selected.length?selected.reduce((sum,f)=>sum+(f.properties.areaM2||0),0):null,geometry:{type:'MultiPolygon',coordinates:selected.flatMap(f=>f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[f.geometry.coordinates])}};}return S.catalog.find(r=>r.id===S.region);}
function supportedIds(){return new Set(S.catalog.filter(r=>r.kind==='REGIONAL').map(r=>r.id));}
function setRegionInspection(id){
 S.inspectRegion=S.selected.includes(id)&&S.inspectRegion!==id?id:'';renderRegionInspection();
}
function renderRegionInspection(){
 if(!S.selected.includes(S.inspectRegion))S.inspectRegion='';
 for(const n of document.querySelectorAll('[data-inspect-id]'))n.setAttribute('aria-pressed',String(n.dataset.inspectId===S.inspectRegion));
 for(const [id,value] of visitMarkers)value.node.dataset.inspected=String(id===S.inspectRegion);
 if(!mapReady)return;
 source('inspection',S.inspectRegion?collection(selectionFeatures(S.zones,[S.inspectRegion])):empty);
 visible('inspection-casing',!!S.inspectRegion);visible('inspection-line',!!S.inspectRegion);
}
function renderSelection(){
 const supported=supportedIds(),byId=new Map(selectionFeatures(S.zones,S.selected).map(f=>[f.properties.zoneId,f])),selected=visitOrder().map(id=>byId.get(id)).filter(Boolean),bad=S.selected.filter(i=>!supported.has(i));
 $('zone-selection-summary').textContent=bad.length?`계획 미지원 구역 ${bad.length}개를 해제해 주세요.`:'';
 $('supported-only').hidden=!bad.length;$('supported-only').disabled=active()||S.busy;
 $('selected-zones').replaceChildren(...selected.map((f,index)=>{
  const id=f.properties.zoneId,row=el('div',undefined,'selected-zone'),b=el('button',undefined,'zone-remove');
  row.dataset.initial=String(id===S.initial);
  const cross=el('span');cross.dataset.icon='X';cross.setAttribute('aria-hidden','true');b.append(cross);b.type='button';b.dataset.zoneId=id;
  b.setAttribute('aria-label',f.properties.name+' 선택 해제');b.setAttribute('aria-pressed','true');
  b.onclick=()=>{if(!S.editing)beginSelectionEdit();applySelection(S.selected.filter(i=>i!==id));$('selected-zones').querySelector('button')?.focus({preventScroll:true});};
  const start=el('button',undefined,'zone-start');start.type='button';start.dataset.initialId=id;
  const text=el('span',undefined,'zone-title');text.append(el('strong',f.properties.name+(supported.has(id)?'':' · 미지원')),el('span',id===S.initial?'시작':'','zone-start-action'));
  const reason=searchWorkspace?.reasonFor(id);start.title=id===S.initial?'현재 시작 구역':'시작 구역으로 지정';
  const flag=el('span',undefined,'zone-start-icon');flag.dataset.icon='Flag';flag.setAttribute('aria-hidden','true');
  start.append(flag);
  const inspect=el('button',undefined,'zone-inspect');inspect.type='button';inspect.dataset.inspectId=id;
  inspect.setAttribute('aria-label',f.properties.name+' 지도에서 강조');inspect.setAttribute('aria-pressed',String(S.inspectRegion===id));
  inspect.title='지도에서 강조'+(reason?' · '+reason:'');inspect.append(el('span',index+1,'visit-rank'),text);inspect.onclick=()=>setRegionInspection(id);
  start.setAttribute('aria-label',f.properties.name+' 시작 구역 지정');start.setAttribute('aria-pressed',String(id===S.initial));
  start.onclick=()=>{if(!S.editing)beginSelectionEdit();chooseInitial(id);[...$('selected-zones').querySelectorAll('[data-initial-id]')].find(n=>n.dataset.initialId===id)?.focus({preventScroll:true});};
  const arrows=el('span',undefined,'zone-reorder');for(const [delta,icon,label] of [[-1,'ChevronUp','앞 순서로'],[1,'ChevronDown','뒤 순서로']]){const a=el('button'),i=el('span');i.dataset.icon=icon;i.setAttribute('aria-hidden','true');a.type='button';a.append(i);a.dataset.orderId=id;a.dataset.delta=delta;a.dataset.edge=String(index+delta<0||index+delta>=selected.length);a.setAttribute('aria-label',f.properties.name+' '+label);a.onclick=()=>{if(!S.editing)beginSelectionEdit();moveRegion(id,delta);$('selected-zones').querySelector(`[data-order-id="${id}"][data-delta="${delta}"]`)?.focus({preventScroll:true});};arrows.append(a);}
  row.append(inspect,start,arrows,b);return row;
 }));mountIcons($('selected-zones'));
 const options=selected.map(f=>{const o=el('option',f.properties.name);o.value=f.properties.zoneId;return o;});
 if(!options.length){const o=el('option','구역 선택 후 지정');o.value='';options.push(o);}
 $('initial-region').replaceChildren(...options);$('initial-region').value=S.initial;$('initial-region').disabled=!selected.length||editsLocked();
 $('selection-inline-count').textContent='수색 구역 '+S.selected.length+'개';renderZoneList();
}
function visitOrder(){const ids=S.priorityOrder.length?S.priorityOrder:S.selected;return [S.initial,...ids.filter(id=>id!==S.initial),...S.selected.filter(id=>!ids.includes(id))].filter((id,i,a)=>S.selected.includes(id)&&a.indexOf(id)===i);}
function moveRegion(id,delta){
 if(!S.editing||editsLocked())return;const ids=visitOrder(),i=ids.indexOf(id),to=i+delta;if(i<0||to<0||to>=ids.length)return;
 [ids[i],ids[to]]=[ids[to],ids[i]];clearPlanBinding();S.priorityOrder=ids;S.initial=ids[0];missionWorkspace?.changed();renderSelection();render();
}
function chooseInitial(id){
 if(!S.editing||editsLocked()||!S.selected.includes(id)||id===S.initial)return;
 clearPlanBinding();S.initial=id;if(S.priorityOrder.length)S.priorityOrder=visitOrder();missionWorkspace?.changed();renderSelection();render();
}
function applySelection(ids){
 if(!S.editing||editsLocked())return;
 const known=new Set(S.zones.map(f=>f.properties.zoneId)),next=selectionAfterChange(ids.filter(id=>known.has(id)),S.initial);
 if(S.priorityOrder.length)S.priorityOrder=[...S.priorityOrder.filter(i=>next.selected.includes(i)),...next.selected.filter(i=>!S.priorityOrder.includes(i))];
 clearPlanBinding();S.selected=next.selected;S.preview=[...S.selected];S.initial=next.initial;S.region=S.selected.length?'selected-zones':'';
 missionWorkspace?.changed();renderSelection();render();
}
function renderGlobal(){
 const j=currentJob();
 const st=j?.global_status;const ev=st?.region_evidence?.at(-1);$('global-flight-status').hidden=!st;
 $('global-flight-status').textContent=st?.reason?st.reason.split(';').map(message).join(' '):'';
 $('global-flight-status').hidden=!$('global-flight-status').textContent;
 $('flight-sequence').hidden=!st||!$('itinerary-panel').hidden;
 $('current-zone-name').textContent=st?.current_name||'구역 확인 중';
 $('next-route-state').textContent=!S.fresh||!S.control?.runner?.online?'다음 경로 상태 확인 필요':nextRouteStatus(j);
 $('next-route-state').dataset.state=st?.next_state||'';
}

let itinerarySignature='';
function renderWorkflow(stage){
 const linked=S.fresh&&droneConnectionReady(S.control?.connection,S.plan);
 const index=stage==='selection'?0:['planning','failed'].includes(stage)?1:stage==='review'?(linked?3:2):stage==='active'?3:4;
 for(const [i,key] of ['selection','route','connection','flight','record'].entries()){
  const n=$('prep-step-'+key);n.dataset.state=i<index?'done':i===index?(stage==='failed'?'attention':'current'):'upcoming';
  if(i===3&&stage==='complete'&&currentJob()?.state!=='COMPLETED')n.dataset.state='attention';
  if(i===index)n.setAttribute('aria-current','step');else n.removeAttribute('aria-current');
 }
 $('prep-step-flight').querySelector('.step-label').textContent=stage==='review'?'출발':'정찰';
 $('prep-step-flight').setAttribute('aria-label','4단계 '+(stage==='review'?'출발':'정찰'));
 for(const n of document.querySelectorAll('[data-task-icon]'))n.hidden=n.dataset.taskIcon!==['Map','Route','Drone','Drone','Video'][index];
 $('selection-empty').hidden=stage!=='selection'||S.selected.length>0||S.editing;
 const visible=!S.editing&&S.selected.length>0&&stage!=='selection';$('itinerary-panel').hidden=!visible;
 const itineraryHost=['active','complete'].includes(stage)?$('flight-live-details'):$('prep-main');
 if($('itinerary-panel').parentElement!==itineraryHost)itineraryHost.insertBefore($('itinerary-panel'),itineraryHost===$('prep-main')?$('plan-inline-details'):itineraryHost.firstChild);
 if(!visible)return;
 const visits=regionVisitSequence(visitOrder(),S.zones,S.plan,S.control?.job,{connected:S.fresh&&S.control?.runner?.online,editing:S.editing}).regions;
 const connected=!!(S.fresh&&S.control?.runner?.online),rows=routePlanningRows(S.plan,currentJob(),visits,{stage,connected});
 const readyCount=rows.filter(v=>v.routeReady).length;
 $('itinerary-count').textContent=connected?`${readyCount} / ${rows.length} 경로 준비`:'상태 확인 중';
 $('planning-strategy').hidden=rows.length<2||stage==='complete';
 const phase=flightPhase(currentJob());
 let strategy='첫 구역 준비 후 출발 · 나머지는 정찰 중 한 구역씩 계산';
 if(stage==='active'){
  strategy=rows.some(v=>v.planState==='computing')?'현재 정찰과 다음 경로 계산을 병렬로 진행합니다.':'다음 구역 진입 전 연결·복귀 경로를 검증합니다.';
  if(rows.some(v=>v.planState==='resource'))strategy='메모리 확보 후 다음 경로 계산을 재개합니다.';
  if(rows.some(v=>v.planState==='failed'))strategy='경로가 준비되지 않은 구역에는 진입하지 않습니다.';
  if(rows.some(v=>v.planState==='validating'))strategy='현재 위치·진입 경로·복귀 경로를 확인합니다.';
  if(['PAUSED','PAUSING'].includes(phase))strategy='정찰 일시중지 · 다음 경로의 계산 상태를 확인할 수 있습니다.';
  if(['RETURN','RETURN_VALIDATING','OPERATOR_RETURN','LAND','LANDING'].includes(phase))strategy='복귀 중 · 남은 구역은 진행하지 않습니다.';
  const job=currentJob();
  if(job?.global_status?.total>0&&job.global_status.completed===job.global_status.total&&['RETURN','LAND','LANDING'].includes(phase))strategy='전체 구역 관측 완료 · 복귀·착륙 중';
  if(job?.landed_disarmed)strategy='착륙 확인 · 관측 기록 유지';
 }
 $('planning-strategy').textContent=connected?strategy:'마지막 수신 상태 · 연결을 확인하고 있습니다.';
 for(const v of rows)v.coverage=regionCoverage(currentJob(),S.coverage,v.id);
 const signature=JSON.stringify(rows.map(({id,number,name,state,detail,planState,icon,working,error,coverage})=>({id,number,name,state,detail,planState,icon,working,error,coverage})));
 if(signature===itinerarySignature)return;itinerarySignature=signature;
 const existing=new Map([...$('mission-itinerary').children].map(li=>[li.dataset.regionId,li]));
 for(const [index,v] of rows.entries()){
  let li=existing.get(v.id);
  if(!li){li=el('li');li.dataset.regionId=v.id;
   const button=el('button',undefined,'itinerary-region');button.type='button';button.dataset.inspectId=v.id;
   const body=el('span',undefined,'itinerary-body'),status=el('span',undefined,'itinerary-status'),icon=el('span',undefined,'itinerary-status-icon');icon.setAttribute('aria-hidden','true');
   status.append(icon,el('span',undefined,'itinerary-status-label'));body.append(el('strong'),status,el('span',undefined,'itinerary-coverage'),el('span',undefined,'itinerary-time'));
   const pin=el('span');pin.dataset.icon='MapPin';pin.setAttribute('aria-hidden','true');
   button.append(el('span',v.number,'itinerary-rank'),body,pin);button.onclick=()=>setRegionInspection(v.id);li.append(button);
  }
  existing.delete(v.id);li.dataset.state=v.state;li.dataset.planState=v.planState;li.dataset.working=String(v.working);
  const button=li.querySelector('button');button.setAttribute('aria-label',v.name+' 지도에서 강조');button.setAttribute('aria-pressed',String(S.inspectRegion===v.id));button.title=v.detail+(v.error?' · '+message(v.error):'')+' · 지도에서 강조';
  li.querySelector('.itinerary-rank').textContent=v.number;li.querySelector('strong').textContent=v.name;li.querySelector('.itinerary-status-label').textContent=v.detail;
  const observed=li.querySelector('.itinerary-coverage');observed.hidden=v.coverage===null;observed.textContent=v.coverage===null?'':`관측 ${v.coverage.toFixed(1)}%`;
  const icon=li.querySelector('.itinerary-status-icon');if(icon.dataset.icon!==v.icon){icon.dataset.icon=v.icon;mountIcons(button);}
  if($('mission-itinerary').children[index]!==li)$('mission-itinerary').insertBefore(li,$('mission-itinerary').children[index]||null);
 }
 for(const li of existing.values())li.remove();
 renderLiveMetrics();
}
function renderLiveMetrics(){
 const j=currentJob();$('hud-elapsed').textContent=formatDuration(missionElapsed(j));
 if(j)$('hud-phase').textContent=labels[flightPhase(j)]||labels[j.state]||j.state;
 const summary=missionSummary(j,S.capture,S.coverage);
 $('hud-coverage').textContent=summary.coverage===null?'—':summary.coverage.toFixed(1)+'%';
 $('hud-coverage').dataset.scope=summary.coverageLabel;$('hud-coverage').previousElementSibling.textContent=summary.coverageLabel;
 $('hud-frames').textContent=summary.frames.toLocaleString();
 $('observation-progress').value=summary.coverage??0;$('observation-progress').hidden=summary.coverage===null;
 for(const li of $('mission-itinerary').children){
  const value=regionCoverage(j,S.coverage,li.dataset.regionId),observed=li.querySelector('.itinerary-coverage');
  if(observed){observed.hidden=value===null;observed.textContent=value===null?'':`관측 ${value.toFixed(1)}%`;}
  const t=regionTiming(S.plan,j,li.dataset.regionId),node=li.querySelector('.itinerary-time');
  if(node)node.textContent=`구역 내 ${formatDuration(t.expected)}`+(t.elapsed===null?'':` · ${t.ended?'실제':'경과'} ${formatDuration(t.elapsed)}`);
 }
}
function mergeLiveJob(next,previous){
 if(!next||!previous||next.job_id!==previous.job_id||next.run_id!==previous.run_id)return next;
 next.observation_progress=mergeObservationProgress(previous.observation_progress,next.observation_progress);
 if((previous.telemetry?.timestamp||0)>(next.telemetry?.timestamp||0)){
  for(const key of ['telemetry','flight_timing','region_timing','global_status','recorded_frames'])if(previous[key]!=null)next[key]=previous[key];
 }
 return next;
}
function render(){
 S.renderedStorageIssue=recordingIssue();
 const loading=!!S.contextLoading||(!S.mapPrepared&&!S.mapFailed);$('workspace-loading').hidden=!loading;$('control-content').hidden=loading;$('control-content').inert=loading;
 const r=region(),p=S.plan,j=currentJob(),globalJob=S.control?.job,run=S.control?.runner,flightActive=active();
 const caseIssue=!flightActive&&p?.state==='READY'?casePlanIssue(p,searchWorkspace?.planContext()):'';
 const planReady=p?.state==='READY'&&!caseIssue,planning=S.planningRequest||['QUEUED','RUNNING'].includes(p?.state),bad=S.selected.some(i=>!supportedIds().has(i));
 const locked=editsLocked();
 const stage=flightActive?'active':S.editing?'selection':planning?'planning':j&&terminal.has(j.state)?'complete':planReady?'review':p||S.planningError?'failed':'selection';
 if($('mission-controls').dataset.stage!==stage&&S.step==='flight')$('control-content').scrollTop=0;
 const actionHost=stage==='complete'?$('completed-actions'):$('mission-controls');if($('prep-actions').parentElement!==actionHost)actionHost.append($('prep-actions'));$('completed-actions').hidden=stage!=='complete';
 $('mission-controls').dataset.stage=stage;$('region-panel').hidden=!(S.editing||(stage==='selection'&&S.selected.length));
 $('mission-controls').dataset.outcome=j?.state||'';$('mission-controls').dataset.landed=String(!!j?.landed_disarmed);
 $('selection-hint').hidden=!S.editing;$('region-panel').dataset.editing=String(S.editing);
 $('prep-steps').hidden=false; renderWorkflow(stage);
 for(const name of Object.keys(stages))$('tab-'+name).disabled=loading;
 updateSidebarToggle();$('map-video-preview').disabled=S.editing;
 $('mission-controls').dataset.editing=String(S.editing);$('mission-controls').dataset.planning=String(planning);
 $('mission-controls').dataset.preview=String(planReady&&!j&&!S.editing);
 $('mission-name').textContent=S.editing?'정찰 구역':stage==='active'?'정찰 진행':stage==='complete'?'정찰 기록':stage==='review'?(S.fresh&&droneConnectionReady(S.control?.connection,p)?'출발 준비':'드론 연결'):planning?'경로 계획':stage==='failed'?'경로 확인 필요':'정찰 준비';
 const initial=S.zones.find(f=>f.properties.zoneId===S.initial)?.properties.name;
 const area=Number.isFinite(r?.areaM2)?(r.areaM2>=10000?(r.areaM2/10000).toFixed(2)+' ha':Math.round(r.areaM2).toLocaleString()+' m²'):'';
 $('mission-overview').textContent=r?[S.editing?'':S.selected.length+'개 구역',area,!S.editing&&initial?'시작 '+initial:''].filter(Boolean).join(' · '):'정찰할 구역을 지도에서 선택하세요.';
 $('initial-region').disabled=!S.selected.length||locked;
 for(const b of document.querySelectorAll('#selected-zones button'))b.disabled=locked||b.dataset.edge==='true';
 for(const b of document.querySelectorAll('#zone-list button'))b.disabled=!S.editing||locked;
 $('clear-selection').disabled=locked||!S.selected.length;$('supported-only').disabled=locked;
 $('selection-cancel').disabled=locked;$('selection-cancel').hidden=!S.editing;
 $('edit-regions').disabled=locked;
 $('edit-regions').hidden=S.editing||planning||flightActive;
 $('edit-regions').querySelector('[data-action-label]').textContent=stage==='complete'?'새 정찰 준비':r?'구역 수정':'구역 선택';
 if(missionWorkspace&&!missionWorkspace.current&&!flightActive)$('edit-regions').querySelector('[data-action-label]').textContent='임무 만들기';
 $('edit-regions').classList.toggle('primary',!r||bad||stage==='complete');
 $('saved-plan').disabled=locked||S.editing||!!missionWorkspace?.current;$('mission-history').hidden=S.editing||planning||flightActive;
 $('plan-route').disabled=!r||bad||locked||!S.fresh||!run?.online;
 $('plan-route').hidden=['review','complete','active'].includes(stage)||(!S.editing&&!planning&&(!r||bad));
 $('plan-route').querySelector('[data-action-label]').textContent=planning?'경로 계산 중…':reusableEditedPlan()?'경로 확인':stage==='failed'?'다시 계획':'경로 만들기';
 const unsupported=S.zones.filter(f=>S.selected.includes(f.properties.zoneId)&&!supportedIds().has(f.properties.zoneId)).map(f=>f.properties.name);
 $('planning-availability').textContent=bad?'계획 미지원: '+unsupported.slice(0,2).join(', ')+(unsupported.length>2?` 외 ${unsupported.length-2}개`:''):!S.fresh?'연결 확인 중':!run?.online?'경로 계산 서비스 연결 대기':'';
 $('planning-availability').hidden=flightActive||!$('planning-availability').textContent;
 $('plan-panel').hidden=!['planning','review','failed'].includes(stage);
 $('plan-inline-details').hidden=!['planning','review','failed'].includes(stage);
 let planNotice=caseIssue?'사건 조건 확인 · 다시 계획 필요':p?.state==='STALE'?'입력 변경 · 다시 계획 필요':p?.state==='INCOMPLETE'?'관측 목표 미달':stage==='failed'?'경로 계획 실패':'';
 let planDescription=caseIssue?message(caseIssue):S.planningError||(p?.state==='INCOMPLETE'?'관측 목표를 충족하지 못해 출발할 수 없습니다.':p?.error?message(p.error):'');
 $('first-route-summary').hidden=!planReady;
 $('route-metrics').hidden=!planReady;$('plan-details').hidden=!p;
 $('route-distance').textContent=p?.route?.length?Math.round(distance(p.route)).toLocaleString()+' m':'—';
 $('route-altitude').textContent=p?.altitude_m?p.altitude_m+' m':'—';
 $('route-preview').hidden=!planReady;
 const continuous=p?.kind==='GLOBAL'&&(p.selection?.region_ids.length||0)>1;
 $('route-transition-rule').textContent=continuous?'현 위치 → 다음 구역 진입점':'선택 구역의 계획 경로';
 $('route-failure-rule').textContent=continuous?'대기 후 복귀 경로 검증':'검증 실패 시 출발 차단';
 $('route-validation-note').textContent=continuous?'구역 전환 전 진입·복귀 경로와 남은 시간 확인':'출발 전 경로와 복귀 조건 확인';
 $('plan-position').disabled=!planReady;
 $('departure-controls').hidden=stage!=='review';
 $('start-flight').hidden=stage!=='review';$('prep-actions').hidden=flightActive;
 $('review-capture').hidden=stage!=='complete'||!j?.registered;
 $('completion-next').hidden=stage!=='complete'||!j?.registered;
 const timing=routeTiming(p);$('route-time-label').textContent=timing.partial?'첫 구역 내 탐색':'구역 내 탐색';
 $('route-first-time').textContent=timing.seconds===null?'미산정':formatDuration(timing.seconds);
 $('route-time-note').textContent='진입·구역 이동·복귀 시간 별도';
 $('flight-controls').hidden=false;$('map-stop-flight').hidden=false;
 renderFlightControls();
 const controlPhase=globalJob?.operator_control?.phase;
 if(flightActive&&['PAUSING','PAUSED','RETURN_VALIDATING','RETURN'].includes(controlPhase))$('mission-name').textContent=({PAUSING:'제자리 대기 전환',PAUSED:'정찰 일시중지',RETURN_VALIDATING:'복귀 경로 검증',RETURN:'출발지 복귀'})[controlPhase];
 $('flight-live-details').hidden=!j;
 $('connection-pill').textContent=!S.fresh?'연결 확인 필요':flightActive?(globalJob?.landed_disarmed?'영상 저장 중':controlPhase==='PAUSED'?'일시중지':['RETURN','RETURN_VALIDATING'].includes(controlPhase)?'복귀 중':'정찰 진행 중'):planning?'경로 계산 중':run?.online?'운용 서비스 연결':'운용 서비스 대기';
 $('connection-pill').dataset.state=!S.fresh||!run?.online?'offline':flightActive?'active':'ready';
 let readyText='경로 계획 대기',ready=false;
 if(planReady){if(!S.fresh)readyText=message('NETWORK');else if(!run?.ready)readyText=message(run?.reason||'LOCAL_RUNNER_NOT_READY');else if(['REGIONAL','GLOBAL'].includes(p.kind)){const rr=S.control?.regional;ready=!!rr?.ready&&rr.package_id===p.package_id;readyText=ready?'출발 준비 완료':rr?.package_id!==p.package_id?'계획과 시뮬레이터 입력이 다릅니다. 다시 계획하세요.':(rr?.reasons||['REGIONAL_PREPARATION_REQUIRED']).map(message).join(' ');}else{ready=!!run?.ready;readyText=ready?'로컬 시뮬레이터 출발 가능':message(run?.reason||'LOCAL_RUNNER_NOT_READY');}}
 if(j?.state==='FAILED')readyText='최근 출발 요청 중단 · '+failureMessage(j)+'. '+readyText;
 if(planReady&&recordingIssue()){ready=false;readyText=recordingIssue();}
 if(flightActive)readyText='진행 중인 정찰을 확인하고 있습니다. 새 출발은 잠깐 차단됩니다.';
 if(planReady&&!S.mapPrepared)readyText='지도를 준비하고 있습니다.';
 $('execution-readiness').textContent=readyText;$('execution-readiness').dataset.ready=ready&&S.fresh&&S.mapPrepared;
 if(ready&&S.fresh&&S.mapPrepared&&!flightActive)$('execution-readiness').textContent='출발 조건 확인됨';
 $('readiness-retry').hidden=!planReady||ready&&S.fresh&&S.mapPrepared;
 $('readiness-retry').disabled=!!storageRequest||S.busy;
 $('prepare-scene').hidden=!planReady||!scenePreparationNeeded(S.control?.regional,p);
 $('prepare-scene').disabled=S.busy||flightActive||connectionLocked()||!S.fresh||!run?.ready;
 const connection=S.control?.connection,linked=S.fresh&&droneConnectionReady(connection,p);
 const connecting=S.connectionPending||['QUEUED','CONNECTING'].includes(connection?.state);
 $('connection-panel').hidden=stage!=='review'&&!connectionLocked()||flightActive;
 $('connection-panel').dataset.state=linked?'ready':connecting?'connecting':['FAILED','LOST'].includes(connection?.state)?'failed':'waiting';
 const connectionIcon=$('connection-panel').querySelector('.connection-heading>[data-icon]'),connectionSymbol=connecting?'Loader':linked?'PlugConnected':['FAILED','LOST'].includes(connection?.state)?'AlertTriangle':'PlugConnected';
 if(connectionIcon.dataset.icon!==connectionSymbol){connectionIcon.dataset.icon=connectionSymbol;mountIcons($('connection-panel'));}
 $('connection-title').textContent=linked?'드론·SIM 연결 완료':connecting?'드론 연결 중':connection?.state==='DISCONNECTING'?'연결 해제 중':['READY','LOST'].includes(connection?.state)?'드론 연결 확인 필요':connection?.state==='FAILED'?'드론 연결 실패':'드론 연결 필요';
 $('connection-description').textContent=linked?'시뮬레이터 통신 정상 · 착륙·무장 해제':connecting?connection?.phase==='SIM_STARTING'?'로컬 SIM을 준비하고 있습니다.':'통신과 위치 수신을 확인하고 있습니다.':connection?.error?message(connection.error):connection?.state==='DISCONNECTING'?'로컬 SIM을 정리하고 있습니다.':'연결만 진행하며 이륙하지 않습니다.';
 $('review-drone-connection').textContent=linked?'연결 관리':connecting?'진행 확인':'연결하기';
 $('connect-drone').hidden=stage!=='review'||!planReady||linked||connection?.state==='DISCONNECTING'||flightActive;
 $('connect-drone').disabled=stage!=='review'||!planReady||!S.mapPrepared||!S.fresh||!run?.ready||S.busy||S.pending||connecting||connectionLocked()||!ready;
 $('connect-drone').querySelector('[data-action-label]').textContent=connecting?'연결 중…':connection?.state==='FAILED'?'다시 연결':'연결 시작';
 $('disconnect-drone').hidden=!connectionLocked()||flightActive;
 $('disconnect-drone').disabled=S.busy||S.pending||S.connectionPending||!S.fresh||connection?.state==='DISCONNECTING';
 $('disconnect-drone').textContent=connecting?'연결 취소':'연결 해제';
 $('start-flight').hidden=stage!=='review';
 $('execution-readiness').hidden=stage==='review'&&(!linked||ready&&S.fresh&&S.mapPrepared);
 $('start-flight').disabled=stage!=='review'||!S.mapPrepared||S.busy||!canStart({plan:p,region:S.region,runner:run,regional:S.control?.regional,job:globalJob,confirmed:!S.editing,fresh:S.fresh,pending:S.pending,connection,storage:S.control?.storage});
 const departureAllowed=!$('start-flight').disabled;
 $('departure-lock-reason').hidden=stage!=='review'||departureAllowed;
 $('departure-lock-reason').textContent=recordingIssue()||(!linked?'드론 연결을 완료해야 출발할 수 있습니다.':readyText);
 $('start-flight').title=departureAllowed?'연결된 드론으로 정찰 출발':$('departure-lock-reason').textContent;
 renderConnectionDialog();
 const planState=caseIssue||stage==='failed'?'failed':planReady?(departureAllowed?'ready':connecting||!linked&&ready?'waiting':'blocked'):planning?(!S.fresh||!run?.online?'blocked':p?.state==='RUNNING'?'computing':'waiting'):'waiting';
 $('plan-panel').dataset.state=planState;
 const noticeIcon=planState==='ready'?'Check':planState==='computing'?'Loader':planState==='failed'?'AlertTriangle':'Clock';
 if($('plan-state-icon').dataset.icon!==noticeIcon){$('plan-state-icon').dataset.icon=noticeIcon;mountIcons($('plan-panel'));}
 if(planReady){planNotice=departureAllowed?'임무 시작 가능':S.pending?'출발 요청 확인 중':'첫 구역 경로 계산 완료';planDescription=departureAllowed?'드론 연결과 첫 경로 준비가 완료됐습니다.':S.pending?'실행기의 응답을 기다리고 있습니다.':connecting?'드론 연결을 확인하고 있습니다.':!linked&&ready?'드론 연결을 확인한 뒤 임무를 시작하세요.':readyText;}
 else if(planning){planNotice=!S.fresh||!run?.online?'계산 상태 확인 필요':p?.state==='QUEUED'?'첫 구역 계산 대기':p?.state==='RUNNING'?'첫 구역 경로 계산 중':'첫 구역 계산 요청 중';planDescription=!S.fresh||!run?.online?'계산 서비스 연결을 확인하고 있습니다.':'첫 경로가 준비되면 임무를 시작할 수 있습니다.';}
 // Keep the live announcement unchanged during identical polling responses.
 if($('plan-summary').textContent!==planNotice)$('plan-summary').textContent=planNotice;
 if($('plan-progress').textContent!==planDescription)$('plan-progress').textContent=planDescription;
 $('plan-progress').hidden=!planDescription;
 $('first-route-name').textContent=initial?'첫 구역 · '+initial:'첫 구역 경로';
 $('start-flight').querySelector('[data-action-label]').textContent=S.pending?'출발 요청 중…':'임무 시작';
 $('tab-flight').dataset.routeReady=String(stage==='review'&&departureAllowed);$('tab-flight').title=stage==='review'&&departureAllowed?'첫 경로 준비 완료 · 임무 시작 가능':'정찰';
 const t=j?.telemetry||S.track.at(-1)?.data,phase=terminal.has(j?.state)||j?.phase==='SAVING_FRAMES'?j.phase:flightPhase(j);
 $('flight-summary').textContent=j?.error?failureMessage(j):j?.phase==='SAVING_FRAMES'?'복귀·착륙 완료 · 영상 저장 중':'';
 $('flight-summary').hidden=!$('flight-summary').textContent;$('capture-details').hidden=!j;
 const alt=t?.relativeAltitudeM??(Number.isFinite(t?.position?.down_m)?-t.position.down_m:null);
 $('flight-altitude').textContent=(j?.state!=='COMPLETED'||j?.telemetry)&&Number.isFinite(alt)?alt.toFixed(1)+' m':'—';
 $('poses-count').textContent=S.capture?.capture?.pose_present??0;
 const live=S.control?.vision,age=live?.last_capture_at?Date.now()/1000-live.last_capture_at:null;
 const status=$('live-vision-status');if(status){status.textContent=currentJob()?.result_policy!=='LIVE'?'다음 정찰부터 실시간 분석':live?.state==='DEGRADED'?'분석 연결 확인 필요':active()&&age!==null&&age>5?'영상 입력 지연':live?.state==='BACKPRESSURE'?'분석 지연 · 최신 영상 우선':live?.uploaded?`GPU 분석 ${live.completed||0}프레임 · 탐지 ${live.observations||0}건`:active()?'GPU 준비 · 영상 대기':'GPU 분석 대기';status.title=live?.error||live?.worker_error||'최대 2 fps · 원본 녹화와 별도 처리';status.dataset.state=live?.state||'IDLE';}
 $('capture-provenance').textContent=['COMPLETED','PARTIAL'].includes(j?.state)?`영상 ${j.capture_frames}프레임 · 착륙·무장 해제 ${j.landed_disarmed?'확인':'확인 필요'} · ${j.result_policy==='LIVE'?'실시간 분석 기록':'새 분석 꺼짐'}`:j?`${labels[j.phase]||j.phase} · 촬영 시점의 카메라 자세를 함께 저장합니다.`:'';
 $('info-plan').textContent=p?.plan_id||'—';$('info-capture').textContent=j?.run_id||'—';$('info-source').textContent=S.control?.source_run_id||'—';
 setStep('flight',j?.state==='COMPLETED'?'done':j&&!terminal.has(j.state)?'active':j?'error':'',j?labels[j.state]||j.state:'대기');setStep('analysis','off','저장 프레임');setStep('review',S.review?'done':S.previous?'active':'',S.review?'확인 기록됨':'분석 기록');
 $('confirm-result').disabled=!S.mediaResult||S.busy||!!S.review;
 $('locate-result').disabled=!S.mediaResult||!estimatePoint(S.mediaResult)||!mapReady;
 $('review-summary').textContent=S.review?'확인 기록 저장됨':'';$('review-summary').hidden=!S.review;
 $('view-current').setAttribute('aria-pressed',String(S.mode==='current'));$('view-previous').setAttribute('aria-pressed',String(S.mode==='previous'));
 const summary=missionSummary(j,S.capture,S.coverage);
 $('hud-phase').textContent=j?labels[phase]||labels[j.state]||j.state:p?.state==='READY'?'경로 준비 완료':planning?'경로 계산 중':S.selected.length?'구역 선택 중':'임무 준비';
 $('hud-connection').textContent=S.fresh&&run?.online?'실행기 연결됨':'실행기 연결 대기';
 $('mission-hud').hidden=!j||S.editing;$('mission-hud').dataset.state=!S.fresh?'attention':j?.state==='COMPLETED'?'complete':terminal.has(j?.state)?'attention':['PAUSED','PAUSING','OBSERVATION_WAIT','RETURN_VALIDATING','WAITING_NEXT','SAVING_FRAMES','HANDOFF'].includes(phase)?'waiting':'active';
 $('hud-coverage').textContent=summary.coverage===null?'—':summary.coverage.toFixed(1)+'%';$('hud-frames').textContent=summary.frames.toLocaleString();$('hud-regions').textContent=summary.completed;
 $('hud-coverage').dataset.scope=summary.coverageLabel;$('hud-coverage').previousElementSibling.textContent=summary.coverageLabel;
 $('observation-progress').value=summary.coverage??0;$('observation-progress').hidden=summary.coverage===null;
 $('observation-progress').setAttribute('aria-label',summary.coverageLabel+' '+(summary.coverage===null?'기록 없음':summary.coverage.toFixed(1)+'%'));
 $('hud-landing').hidden=!summary.landed;$('hud-source').textContent=j?summary.landed?'착륙 확인':'현재 정찰':'출발 전';
 const preview=S.capture?.capture?.latest_frame,previewId=preview?.asset_id;
 $('video-record-link').hidden=!j?.registered;$('video-record-link').href=j?.registered?'/local-postflight.html?run='+encodeURIComponent(j.run_id):'/local-postflight.html';
 const archive=j?.archive,archiveText={PREPARING:'Drive 보관 준비 중',ENCODING:'Drive 보관용 영상 생성 중',COPYING:'Drive 보관 폴더에 저장 중',DRIVE_STAGED:'Drive 보관 폴더 저장됨 · 클라우드 동기화 확인 필요',RETRY_PENDING:'Drive 저장 재시도 대기 · 로컬 원본 보존'};
 $('video-storage-status').hidden=!archive;$('video-storage-status').textContent=archiveText[archive?.state]||'';
 $('video-back-mission').textContent=flightActive?'진행 관제로':stage==='complete'?'정찰 요약으로':'정찰 준비로';
 $('map-video-preview').hidden=true;
 $('map-preview-time').textContent=formatTime(preview?.capture_at);
 renderGlobal();renderImage();renderBlackbox();renderLiveMetrics();updateMap();searchWorkspace?.render();missionWorkspace?.render();recordTools?.render();
}
function renderBlackbox(){
 const j=currentJob(),current=S.mode==='current',ready=!!j?.archive?.video_ready;
 $('blackbox-viewer').hidden=!current;$('frame-viewer').hidden=current;
 const video=$('blackbox-video');video.hidden=!ready;
 if(!current&&!video.paused)video.pause();
 const url=ready?`/api/v1/local-patrol/${j.job_id}/recording`:'';
 if((video.dataset.source||'')!==url){video.pause();if(url)video.src=url;else video.removeAttribute('src');video.dataset.source=url;video.load();}
 $('blackbox-state').textContent=ready?'전체 비행 기록':active()?'블랙박스 기록 중 · 착륙 후 재생할 수 있습니다.':j?'전체 영상 준비 중 · 원본 프레임은 보존됩니다.':'정찰을 마치면 전체 영상을 확인할 수 있습니다.';
}
function setPlan(plan){
 if(S.plan?.plan_id!==plan.plan_id){S.generation++;S.track=[];S.trackRun=null;S.cursor='0';S.capture=null;S.imageKey='';S.chosen=null;S.review=null;S.mode='current';}
 S.plan=plan;S.planFinished=null;S.planningError='';
 S.priorityOrder=plan.selection?.priority_order||plan.order||[];
 if(plan.kind==='GLOBAL'){S.selected=[...plan.selection.region_ids];S.preview=[...S.selected];S.initial=plan.selection.initial_region_id;}
 else{S.selected=[];S.preview=[];S.initial='';}
 S.region=plan.region_id;missionWorkspace?.planAttached(plan);persistSelection();renderSelection();render();
}
async function makePlan(){
 if($('plan-route').disabled||S.editing||S.planningRequest)return;
 S.planningRequest=true;S.busy=true;render();
 try{await missionWorkspace?.flush();}catch(e){S.planningRequest=false;S.busy=false;error(e.message);render();return;}
 clearPlanBinding();S.planningRequest=true;S.busy=true;$('layer-planned').checked=true;error();render();
 const context={...searchWorkspace?.planContext(),...missionWorkspace?.planContext()},priority=S.selected.length?visitOrder():null;
 const generation=S.generation,key=S.selected.length?JSON.stringify([S.selected.slice().sort(),S.initial,S.zoneVersion,context,priority]):S.region;
 const id=schoolSession.getItem('local-plan-request:'+key)||crypto.randomUUID();schoolSession.setItem('local-plan-request:'+key,id);
 try{
  const p=await api(S.selected.length?'local-patrol/global-plans':'local-patrol/plans',S.selected.length?{request_id:id,region_ids:S.selected,initial_region_id:S.initial,zone_version:S.zoneVersion,...context,...(priority?{priority_order:priority}:{})}:{request_id:id,region_id:S.region});
  schoolSession.removeItem('local-plan-request:'+key);
  if(generation===S.generation){setPlan(p);setPanelOpen(false);if(p.state==='READY')fitRegion();}
 }catch(e){if(e.status&&e.status<500)schoolSession.removeItem('local-plan-request:'+key);S.planningError=e.message;}
 finally{S.busy=false;S.planningRequest=false;render();}
}
async function connectDrone(){
 if(S.editing||!S.fresh||S.plan?.state!=='READY'||$('connect-drone').disabled||casePlanIssue(S.plan,searchWorkspace?.planContext()))return;
 S.connectionPending=true;S.connectionError='';error();render();const key='local-connect:'+S.plan.plan_id,id=schoolSession.getItem(key)||crypto.randomUUID();schoolSession.setItem(key,id);
 try{S.control.connection=await api('local-patrol/connection',{request_id:id,plan_id:S.plan.plan_id,plan_hash:S.plan.plan_hash});schoolSession.removeItem(key);}
 catch(e){if(e.status&&e.status<500)schoolSession.removeItem(key);S.connectionError=message(e.message);if(!$('drone-connection-dialog').open)error(e.message);}finally{S.connectionPending=false;render();}
}
async function disconnectDrone(){
 if($('disconnect-drone').disabled||active()||!validId(S.control?.connection?.connection_id))return;
 S.busy=true;S.connectionError='';render();try{await api(`local-patrol/connection/${S.control.connection.connection_id}/disconnect`,{});S.control.connection={...S.control.connection,state:'DISCONNECTING',ready:false};}catch(e){S.connectionError=message(e.message);if(!$('drone-connection-dialog').open)error(e.message);}finally{S.busy=false;render();}
}
function openDroneConnection(opener){
 if(!S.auth||active())return;
 connectionOpener=opener||document.activeElement;S.connectionError='';renderConnectionDialog();
 if(!$('drone-connection-dialog').open)$('drone-connection-dialog').showModal();
}
function renderConnectionDialog(){
 renderStorageRetry();
 const c=S.control?.connection,t=c?.telemetry,flightActive=active(),saving=flightActive&&S.control?.job?.landed_disarmed,now=Date.now()/1000;
 const stage=$('mission-controls').dataset.stage,finished=stage==='complete';
 const planReady=stage==='review'&&S.plan?.state==='READY'&&!S.editing&&!casePlanIssue(S.plan,searchWorkspace?.planContext());
 const regional=S.control?.regional,regionalBlocked=planReady&&['REGIONAL','GLOBAL'].includes(S.plan.kind)&&(!regional?.ready||regional.package_id!==S.plan.package_id),needsScene=planReady&&scenePreparationNeeded(regional,S.plan),needsPlan=regionalBlocked&&regional?.package_id!==S.plan.package_id;
 const preparationIssue=recordingIssue()||(!S.mapPrepared?'지도 준비를 기다리고 있습니다.':!S.control?.runner?.ready?message(S.control?.runner?.reason||'LOCAL_RUNNER_NOT_READY'):regionalBlocked?(regional?.package_id!==S.plan.package_id?'계획과 시뮬레이터 입력이 다릅니다. 다시 계획하세요.':(regional?.reasons?.length?regional.reasons:['REGIONAL_PREPARATION_REQUIRED']).map(message).join(' ')):'');
 const linked=!!(planReady&&S.fresh&&droneConnectionReady(c,S.plan)),connecting=!!(S.connectionPending||['QUEUED','CONNECTING'].includes(c?.state));
 const failed=['FAILED','LOST'].includes(c?.state)||c?.state==='READY'&&!linked,disconnecting=c?.state==='DISCONNECTING';
 const fresh=!!(S.fresh&&t&&now-t.timestamp>=0&&now-t.timestamp<5&&!disconnecting&&c?.state!=='DISCONNECTED');
 const state=linked?'ready':connecting?'connecting':failed?'failed':disconnecting?'disconnecting':'waiting';
 $('drone-connection-dialog').dataset.state=state;
 const status=saving?'착륙 완료 · 영상 저장 중':flightActive?'정찰 중':!S.fresh?'서비스 연결 확인 필요':linked?'드론·SIM 연결 완료':disconnecting?'연결 해제 중':failed?'연결 확인 필요':connecting?(S.connectionPending||c?.state==='QUEUED'?'연결 요청 중':c?.phase==='SIM_STARTING'?'시뮬레이터 준비 중':'통신·기체 상태 확인 중'):finished?'새 정찰 준비 필요':planReady?(preparationIssue?'연결 준비 확인 필요':'연결을 시작하세요'):'첫 경로 준비 필요';
 if($('connection-dialog-status').textContent!==status)$('connection-dialog-status').textContent=status;
 $('connection-dialog-description').textContent=saving?'착륙과 무장 해제를 확인했습니다. 영상 저장을 마치면 다음 임무를 준비할 수 있습니다.':flightActive?'비행 중에는 관제 화면의 일시중지·복귀를 사용하세요.':!S.fresh?'서비스 응답을 확인한 뒤 연결할 수 있습니다.':linked?'통신·위치·착륙 및 무장 해제를 확인했습니다.'+(preparationIssue?' '+preparationIssue:''):disconnecting?'연결된 로컬 SIM을 정리하고 있습니다.':failed?message(c?.error||'LOCAL_DRONE_CONNECTION_MISMATCH'):connecting?'실제 수신 상태를 확인하고 있습니다.':finished?'새 정찰의 구역과 경로를 준비한 뒤 연결하세요.':!planReady?'첫 구역의 경로를 준비한 뒤 해당 임무의 드론을 연결합니다.':preparationIssue||'아래 연결 시작을 누르면 로컬 SIM에 연결합니다.';
 const initial=S.zones.find(f=>f.properties.zoneId===S.initial)?.properties.name;
 $('connection-plan-summary').textContent=planReady?'연결할 임무 · '+(initial||S.plan?.name||'첫 구역'):'연결할 임무 · 경로 준비 대기';
 const step=linked?3:connecting?(fresh&&typeof t?.armed==='boolean'?2:1):0;
 for(const [i,id] of ['target','link','check'].entries()){
  const n=$('connection-flow-'+id);n.dataset.state=i<step?'done':i===step?'current':'waiting';
  if(i===step)n.setAttribute('aria-current','step');else n.removeAttribute('aria-current');
 }
 for(const [id,ok] of [['link',fresh&&typeof t.armed==='boolean'],['position',fresh&&t.valid===true],['disarm',fresh&&t.armed===false&&t.landed===true]]){const n=$('connection-check-'+id);n.dataset.ready=String(!!ok);n.setAttribute('aria-label',n.dataset.label+(ok?' 확인':' 대기'));}
 const icon=$('connection-dialog-icon'),symbol=connecting||disconnecting?'Loader':linked?'Check':failed?'AlertTriangle':'PlugConnected';
 if(icon.dataset.icon!==symbol){icon.dataset.icon=symbol;mountIcons(icon.parentElement);}
 $('connection-dialog-error').hidden=!S.connectionError;$('connection-dialog-error').textContent=S.connectionError||'';
 $('connection-to-plan').hidden=planReady&&!needsScene&&!needsPlan||connectionLocked()||flightActive;
 $('connection-to-plan').textContent=finished?'새 정찰 준비로':needsScene?'실행 준비로':'경로 준비로';
 $('connection-to-mission').hidden=!linked||flightActive;
 $('open-drone-connection').disabled=!S.auth||flightActive;
 $('open-drone-connection').querySelector('[data-action-label]').textContent=saving?'영상 저장 중':flightActive?'정찰 중':linked?'연결 관리':connecting?'연결 확인':'드론 연결';
 $('open-connection-step').disabled=flightActive;
 if(linked&&document.activeElement===$('connect-drone'))$('connection-to-mission').focus({preventScroll:true});
}
function refreshConnectionGate(){
 if(S.control&&recordingIssue()!==S.renderedStorageIssue){render();return;}
 renderConnectionDialog();
 if($('mission-controls').dataset.stage==='review'&&!$('start-flight').disabled&&recordingIssue()){
  $('start-flight').disabled=true;$('departure-lock-reason').hidden=false;$('departure-lock-reason').textContent=recordingIssue();$('start-flight').title=recordingIssue();$('plan-panel').dataset.state='blocked';$('plan-summary').textContent='첫 구역 경로 계산 완료';return;
 }
 if($('mission-controls').dataset.stage!=='review'||$('start-flight').disabled||S.fresh&&droneConnectionReady(S.control?.connection,S.plan))return;
 $('start-flight').disabled=true;$('departure-lock-reason').hidden=false;$('departure-lock-reason').textContent='드론 연결을 완료해야 출발할 수 있습니다.';
 $('connection-panel').dataset.state='failed';$('connection-title').textContent='드론 연결 확인 필요';$('connection-description').textContent='최신 상태가 수신되지 않습니다. 연결을 다시 확인하세요.';
 $('review-drone-connection').textContent='연결 확인';$('start-flight').title=$('departure-lock-reason').textContent;
 $('plan-summary').textContent='첫 구역 경로 계산 완료';$('plan-panel').dataset.state='waiting';
 $('mission-name').textContent='드론 연결';renderWorkflow('review');
}
async function startFlight(){const issue=casePlanIssue(S.plan,searchWorkspace?.planContext());if(issue){error(message(issue));render();return;}if($('start-flight').disabled||!S.fresh||!droneConnectionReady(S.control?.connection,S.plan))return;S.pending=true;error();render();const key='local-flight:'+S.plan.plan_id,id=schoolSession.getItem(key)||crypto.randomUUID();schoolSession.setItem(key,id);try{const j=await api('local-patrol/start',{request_id:id,route:'kumoh-local-square-8m-v1',result_policy:'LIVE',plan_id:S.plan.plan_id,plan_hash:S.plan.plan_hash,connection_id:S.control?.connection?.connection_id});schoolSession.removeItem(key);S.control.job=j;S.capture=null;S.track=[];S.trackRun=j.run_id;S.cursor='0';S.mode='current';S.review=null;S.chosen=null;$('layer-results').checked=true;$('results-source').value='current';void searchWorkspace?.refreshResults();popup?.remove();popup=null;activateStep('flight',{open:false});$('review-status').textContent='';}catch(e){if(e.status&&e.status<500)schoolSession.removeItem(key);error(e.message);}finally{S.pending=false;render();}}
function flightCommandState(){
 const job=S.control?.job,local=S.flightCommand;
 if(local&&job&&local.job_id===job.job_id&&local.request_id!==job.operator_command?.request_id&&Date.now()/1000-local.requested_at<10)return {...job,operator_command:local};
 return job;
}
function renderFlightControls(){
 const job=flightCommandState(),control=flightActions(job,S.fresh&&S.control?.runner?.online),command=job?.operator_command;
 const pending=control.pending||S.pending&&!!S.flightCommand;
 const action=command?.action||S.flightCommand?.action;
 const live=job?.state==='RUNNING'&&!job.landed_disarmed,phase=job?.operator_control?.phase;
 const returning=live&&['RETURN_VALIDATING','RETURN'].includes(phase);
 $('pause-label').textContent=pending&&['pause','resume'].includes(action)?(action==='resume'?'재개 중…':'일시중지 중…'):control.paused&&live?'재개':'일시중지';
 $('return-label').textContent=pending&&action==='return'?'복귀 요청 중…':returning?'복귀 중':'복귀';
 $('pause-symbol').hidden=control.paused&&live;$('resume-symbol').hidden=!(control.paused&&live);
 $('map-stop-flight').disabled=S.pending||!control.actions.includes(control.paused?'resume':'pause');
 $('map-return-flight').disabled=S.pending||!control.actions.includes('return');
 $('map-stop-flight').dataset.action=control.paused&&live?'resume':'pause';
 $('map-stop-flight').setAttribute('aria-label',control.paused&&live?'정찰 재개':'정찰 일시중지 · 현재 위치에서 대기');
 const unavailable=job?.landed_disarmed?'착륙과 무장 해제를 확인했습니다.':!live?'정찰 중 사용할 수 있습니다.':!S.fresh||!S.control?.runner?.online?'드론 상태 수신을 확인해 주세요.':pending?'앞선 명령의 적용을 확인하고 있습니다.':phase==='LAND'?'착륙 중입니다.':returning?'출발지로 복귀 중입니다.':'현재 비행 단계에서는 사용할 수 없습니다.';
 $('map-stop-flight').title=$('map-stop-flight').disabled?unavailable:control.paused?'현재 경로에서 정찰 재개':'정찰을 일시중지하고 현재 위치에서 대기';
 $('map-return-flight').title=$('map-return-flight').disabled?unavailable:'남은 정찰을 종료하고 출발지로 복귀';
 const elapsed=command?.requested_at?` · ${Math.max(0,Math.floor(Date.now()/1000-command.requested_at))}초`:'';
 const text=pending?(({pause:'제자리 대기 확인 중',resume:'재개 확인 중',return:command?.state==='ACCEPTED'?'복귀 요청 접수 · 현재 위치 경로 검증 중':'복귀 요청 전송 중'}[command?.action||S.flightCommand?.action]||'요청 확인 중')+elapsed):
  ['REJECTED','FAILED','EXPIRED'].includes(command?.state)?(command.state==='EXPIRED'?'요청이 만료되었습니다. 다시 확인하세요.':message(command.reason||'LOCAL_FLIGHT_ACTION_UNAVAILABLE')):'';
 $('flight-command-status').textContent=text;$('flight-command-status').hidden=!text;
 $('flight-command-status').dataset.error=String(!pending&&!!text);
 $('flight-controls').setAttribute('aria-busy',String(pending));
}
async function sendFlightCommand(action){
 const job=flightCommandState(),available=flightActions(job,S.fresh&&S.control?.runner?.online);
 if(S.pending||!available.actions.includes(action))return;
 const request_id=crypto.randomUUID();S.pending=true;S.flightCommand={job_id:job.job_id,request_id,action,state:'PENDING',requested_at:Date.now()/1000};render();
 try{
  const result=await api(`local-patrol/${job.job_id}/commands`,{request_id,action});
  if(S.control?.job?.job_id===job.job_id)S.control.job.operator_command={...S.flightCommand,...result};
 }catch(e){S.flightCommand=null;error(e.message);}
 finally{S.pending=false;render();void poll();}
}
async function stopFlight(){if($('map-stop-flight').disabled)return;return sendFlightCommand(flightActions(flightCommandState(),S.fresh).paused?'resume':'pause');}
function resultRows(){const snapshot=searchWorkspace?.resultSnapshot();return snapshot?snapshot.groups.flatMap(g=>g.observations):[];}
function resultHistorical(){return searchWorkspace?.resultSnapshot()?.historical!==false;}
function mapResults(){const rows=resultRows().filter(estimatePoint);if(resultHistorical())return rows;const latest=[...new Map(rows.map(r=>[r.candidate_id,r]).reverse()).values()],focused=rows.find(r=>r.observation_id===S.locatedObservation);if(focused&&!latest.some(r=>r.observation_id===focused.observation_id))latest.push(focused);return latest;}
async function loadPrevious(){
 const id=S.control?.source_run_id,epoch=S.sessionEpoch;
 if(!id){S.previous=null;S.previousTrack=[];S.peopleError=false;return;}
 if(S.previous?.run_id===id)return;
 const [snapshot,samples]=await Promise.all([api(`simulations/runs/${id}/postflight?limit=200`),api(`simulations/runs/${id}/samples?kind=TELEMETRY&after=0&limit=200`)]);
 if(S.sessionEpoch!==epoch||S.control?.source_run_id!==id)return;
 S.previous=snapshot;S.previousTrack=samples.samples;S.peopleError=false;
}
async function previous(){try{await loadPrevious();S.mode='previous';renderResults();render();}catch(e){error(e.message);}}
function color(result){const upper=result.appearance?.upper;const key=upper?.status==='OK'?upper.top?.[0]?.color||'unknown':'unknown';return {key,label:colors[key]||'색상 보류'};}
function posture(result){return postures[result.posture?.label]||'자세 보류';}
function renderResults(){
 if(searchWorkspace?.renderResults())return;
 const focused=document.activeElement?.dataset?.observationId;
 const all=resultRows(),query=$('result-search').value.trim().toLocaleLowerCase(),locationFilter=$('result-location-filter').value;
 const renderKey=JSON.stringify([all,query,locationFilter,S.previous?.results_total,S.previous?.capture?.latest_frame?.capture_at]);
 if($('result-list').dataset.renderKey===renderKey)return;
 $('result-list').dataset.renderKey=renderKey;
 const values=all.filter(r=>(!query||(color(r).label+' '+posture(r)).toLocaleLowerCase().includes(query))&&(locationFilter==='all'||Boolean(estimatePoint(r))===(locationFilter==='located')));
 $('result-count').textContent=(query||locationFilter!=='all'?values.length+' / ':'')+(S.previous?.results_total??'—');
 $('results-source-date').textContent=formatDateTime(all[0]?.capture_at||S.previous?.capture?.latest_frame?.capture_at);
 const nodes=values.map(r=>{
  const b=el('button',undefined,'result-row');b.type='button';b.dataset.observationId=r.observation_id;
  b.setAttribute('aria-label',`관측 ${all.indexOf(r)+1} · ${color(r).label} · ${posture(r)} 원본 보기`);
  b.setAttribute('aria-haspopup','dialog');b.setAttribute('aria-controls','media-dialog');
  const sw=el('span',undefined,'color-swatch');sw.setAttribute('aria-hidden','true');
  if(Object.hasOwn(colors,color(r).key))sw.style.backgroundColor=color(r).key;
  const text=el('span');text.append(el('strong',`${color(r).label} · ${posture(r)}`),el('small',`${formatTime(r.capture_at)} · 탐지 신뢰 ${Number.isFinite(r.confidence)?Math.round(r.confidence*100)+'%':'확인 불가'}`));
  b.append(sw,text,el('span',estimatePoint(r)?'지도 표시':'좌표 없음','result-right'));
  b.addEventListener('click',()=>selectResult(r));return b;
 });
 $('result-list').replaceChildren(...(nodes.length?nodes:[el('p',query||locationFilter!=='all'?'조건에 맞는 관측이 없습니다.':'저장된 탐지 결과가 없습니다.','empty')]));
 if(focused&&!S.chosen)[...$('result-list').children].find(n=>n.dataset.observationId===focused)?.focus({preventScroll:true});
}
function selectResult(r){
 S.chosen=r.observation_id;
 if(S.review?.observation_id!==r.observation_id){S.review=null;$('review-status').textContent='';}
 $('review-status').dataset.error='false';
 showMedia(r,{result:r,previous:resultHistorical()});
}
function locateResult(){
 const r=S.mediaResult,p=r&&estimatePoint(r);if(!p||!mapReady)return;
 S.locatedObservation=r.observation_id;$('media-dialog').close();
 if(compactScreen())setSidebarOpen(false,{persist:false});
 updateMap();
 map.flyTo({center:p,zoom:18,...mapFocusOptions(),duration:motion(250)});popup?.remove();
 const node=el('div'),reopen=el('button','원본 보기','text-button');
 node.append(el('strong',`${color(r).label} · ${posture(r)}`),el('p',(resultHistorical()?'이전 분석':'이번 정찰')+' · SIM 추정 위치'),reopen);
 reopen.type='button';reopen.addEventListener('click',()=>selectResult(r));
 popup=new window.maplibregl.Popup({offset:16,focusAfterOpen:false}).setLngLat(p).setDOMContent(node).addTo(map);
}
function showMedia(frame,{result=null,previous=false}={}){
 const modal=$('media-dialog'),img=$('full-image'),key=++mediaRequest;
 if(!modal.open)mediaOpener=document.activeElement;
 $('confirm-result').hidden=false;
 $('media-view-tools').hidden=!result;$('candidate-actions').hidden=true;$('target-view').hidden=true;$('media-dialog').dataset.view='full';
 S.mediaResult=result;S.mediaSourceRun=result?searchWorkspace?.resultSnapshot()?.source_run_id:null;
 $('media-result').hidden=!result;
 const index=result?resultRows().findIndex(r=>r.observation_id===result.observation_id):-1;
 $('media-title').textContent=result?`${index>=0?'관측 '+(index+1)+' · ':''}${color(result).label} · ${posture(result)}`:'원본 프레임';
 $('media-description').textContent=(previous?'이전 분석 · 별도 기록':(result?'이번 정찰 · 실시간 분석':'이번 정찰 · 저장 프레임'))+' · '+formatDateTime(frame?.capture_at)+' 촬영';
 const p=result&&estimatePoint(result),facts=result?[['탐지 신뢰',Number.isFinite(result.confidence)?Math.round(result.confidence*100)+'%':'확인 불가']]:[];
 $('result-facts').replaceChildren(...facts.map(([label,value])=>{const n=el('div');n.append(el('dt',label),el('dd',value));return n;}));
 $('result-detail').textContent=p?`SIM 추정 위치 · ${p[1].toFixed(6)}, ${p[0].toFixed(6)}`:'좌표 없음 · 위치 이동 불가';
 $('locate-result').disabled=!p||!mapReady;$('confirm-result').disabled=!result||S.busy||!!S.review;
 const valid=validId(frame?.asset_id),src=valid?`/api/v1/media-assets/${frame.asset_id}/content`:'';
 $('full-frame-wrap').hidden=true;$('media-empty').hidden=false;$('media-viewport').setAttribute('aria-busy',String(valid));
 $('media-empty').textContent=valid?'원본 프레임 불러오는 중…':'저장된 원본이 없습니다.';
 $('full-bbox').replaceChildren();$('full-bbox').removeAttribute('viewBox');
 const b=result?.bbox,width=b?.source_width||result?.width,height=b?.source_height||result?.height;
 if(b&&Number.isFinite(width)&&width>0&&Number.isFinite(height)&&height>0&&[b.x1,b.y1,b.x2,b.y2].every(Number.isFinite)&&b.x2>b.x1&&b.y2>b.y1){
  $('full-bbox').setAttribute('viewBox',`0 0 ${width} ${height}`);
  const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');for(const [k,v]of Object.entries({x:b.x1,y:b.y1,width:b.x2-b.x1,height:b.y2-b.y1}))rect.setAttribute(k,String(v));$('full-bbox').append(rect);
 }
 img.onload=()=>{if(!valid||key!==mediaRequest)return;$('full-frame-wrap').hidden=false;$('media-empty').hidden=true;$('media-viewport').setAttribute('aria-busy','false');};
 img.onerror=()=>{if(!valid||key!==mediaRequest)return;$('full-frame-wrap').hidden=true;$('media-empty').hidden=false;$('media-empty').textContent='원본을 불러오지 못했습니다. 팝업을 닫고 다시 선택해 주세요.';$('media-viewport').setAttribute('aria-busy','false');};
 if(valid){if(img.getAttribute('src')===src&&img.complete&&img.naturalWidth>0)img.onload();else img.src=src;}else img.removeAttribute('src');
 if(!modal.open)modal.showModal();
 searchWorkspace?.renderMedia();
}
function renderImage(){
 if(S.mode==='current')return;
 const {snapshot:s,previous:old}=sourceMode(S.mode,S.capture,S.previous);
 const f=s?.capture?.latest_frame;
 const asset=f?.asset_id,valid=validId(asset),key=asset;
 $('source-banner').dataset.previous=String(old);
 $('source-banner').textContent=old?'이전 분석 · 별도 기록':'이번 정찰 · 원본 프레임';
 $('source-banner').title=old?'새 정찰 영상의 분석 결과가 아닙니다.':'실시간 GPU 분석';
 $('source-banner').hidden=!valid;$('image-meta').hidden=!valid;
 if(key!==S.imageKey){
  S.imageKey=key;S.imageLoading=valid;S.imageError=false;$('camera-image').style.visibility='hidden';
  if(valid)$('camera-image').src=`/api/v1/media-assets/${asset}/content`;
  $('bbox').replaceChildren();
 }
 const ready=valid&&!S.imageLoading&&!S.imageError;
 $('image-empty').hidden=ready;$('image-wrap').hidden=!ready;
 $('expand-image').hidden=!valid;$('expand-image').disabled=!ready;
 if(!ready){
  const title=S.imageError?'프레임을 불러오지 못했습니다':valid?'원본 프레임 불러오는 중':'저장된 영상이 없습니다';
  const detail=S.imageError?'다음 상태 갱신에서 다시 확인합니다.':valid?'':old?'이 기록의 원본 프레임이 없습니다.':'정찰 촬영 후 원본 프레임이 표시됩니다.';
  const messageKey=title+'|'+detail;
  if($('image-empty').dataset.message!==messageKey){
   $('image-empty').dataset.message=messageKey;
   const icon=el('span');icon.dataset.icon='Video';icon.setAttribute('aria-hidden','true');
   $('image-empty').replaceChildren(icon,el('strong',title),el('span',detail));mountIcons($('image-empty'));
  }
 }
 $('image-time').textContent=formatDateTime(f?.capture_at)+' 촬영';
}
function openMedia(){
 if($('expand-image').disabled||$('expand-image').hidden)return;
 const {snapshot,previous}=sourceMode(S.mode,S.capture,S.previous);showMedia(snapshot?.capture?.latest_frame,{previous});
}
async function confirmResult(){if($('confirm-result').disabled||!S.mediaResult)return;const result=S.mediaResult,source=S.mediaSourceRun;S.busy=true;render();try{const value=await api('local-patrol/reviews',{review_id:crypto.randomUUID(),source_run_id:source,observation_id:result.observation_id,plan_id:S.plan?.plan_id||null,capture_run_id:currentJob()?.registered?currentJob().run_id:null});if(S.mediaResult===result){S.review=value;$('review-status').dataset.error='false';$('review-status').textContent=`${formatTime(value.confirmed_at)} 확인 기록 저장 · 이전 분석의 원본과 SIM 추정 위치를 확인했습니다. 새 영상 분석 완료를 뜻하지 않습니다.`;}}catch(e){if(S.mediaResult===result){$('review-status').dataset.error='true';$('review-status').textContent=e.message;}}finally{S.busy=false;render();}}
async function savedPlans(){const epoch=S.sessionEpoch,data=await api('local-patrol/plans');if(!S.auth||epoch!==S.sessionEpoch)return;const opts=[el('option','계획 기록 선택')];opts[0].value='';for(const p of data.plans.filter(p=>!p.global_plan_id)){const o=el('option',`${p.name} · ${({STALE:'이전 입력 · 재계획 필요',READY:'계산 완료',FAILED:'계산 실패',INCOMPLETE:'목표 미달',QUEUED:'계산 대기',RUNNING:'계산 중'})[p.state]||p.state} · ${formatTime(p.created_at)}`);o.value=p.plan_id;opts.push(o);}$('saved-plan').replaceChildren(...opts);}
async function followActiveMission(){
 const job=S.control?.job,epoch=S.sessionEpoch;
 if(!active()||!job?.plan_id||job.plan_id===S.plan?.plan_id||S.editing)return false;
 const plan=await api(`local-patrol/plans/${job.plan_id}`);
 if(!S.auth||epoch!==S.sessionEpoch||S.control?.job?.job_id!==job.job_id||plan.plan_id!==job.plan_id||plan.plan_hash!==job.plan_hash)return false;
 setPlan(plan);S.planFinished=plan.plan_id;
 return true;
}
async function poll(){
 if(!S.auth||S.polling)return;S.polling=true;
 if(!storageRequest&&!storageTimer)void pollStorage();
 if(!S.telemetryPolling&&!telemetryTimer)void pollTelemetry();
 const controlStarted=performance.now(),epoch=S.sessionEpoch;
 try{
  const control=await api('local-patrol',undefined,5000);if(!S.auth||epoch!==S.sessionEpoch)return;
  control.storage=acceptStorage(control.storage,controlStarted);
  if(S.control?.job&&control.job&&((S.control.job.created_at||0)>(control.job.created_at||0)||(S.control.job.job_id===control.job.job_id&&(S.control.job.updated_at||0)>(control.job.updated_at||0))))control.job=S.control.job;
  control.job=mergeLiveJob(control.job,S.control?.job);S.control=control;
  rememberVehicle(control.job?.telemetry);rememberVehicle(control.connection?.telemetry);
  if(!S.fresh)error();S.fresh=true;$('updated').textContent='최근 확인 '+formatTime(Date.now()/1000);render();
  void pollDetails();
 }catch(e){if(epoch!==S.sessionEpoch)return;S.fresh=false;render();if(e.status===401)authLost();else error('상태 확인 지연 · '+e.message);}
 finally{S.polling=false;clearTimeout(pollTimer);if(S.auth&&epoch===S.sessionEpoch)pollTimer=setTimeout(()=>void poll(),document.hidden?10000:2200);}
}
async function pollDetails(){
 if(!S.auth||S.detailsPolling||document.hidden)return;S.detailsPolling=true;
 const epoch=S.sessionEpoch;let generation=S.generation;
 try{
  if(await followActiveMission())generation=S.generation;
  if(S.plan&&(S.plan.kind==='GLOBAL'||['QUEUED','RUNNING'].includes(S.plan.state))){
   const p=await api(`local-patrol/plans/${S.plan.plan_id}`);
   if(S.auth&&epoch===S.sessionEpoch&&generation===S.generation){S.plan=p;if(!['QUEUED','RUNNING'].includes(p.state)&&!S.planFinished){S.planFinished=p.plan_id;fitRegion();await savedPlans();}}
  }
  if(!S.auth||epoch!==S.sessionEpoch)return;
  render();await loadCoverage(S.control?.job);
  const j=currentJob();if(j?.registered){
   if(S.trackRun!==j.run_id){S.track=[];S.cursor='0';S.trackRun=j.run_id;S.capture=null;}const runId=j.run_id;
   const [capture,samples,nativeTrack]=await Promise.all([api(`simulations/runs/${runId}/postflight`),api(`simulations/runs/${runId}/samples?kind=TELEMETRY&after=${encodeURIComponent(S.cursor)}&limit=200`),api(`local-patrol/${j.job_id}/track`)]);
   if(S.auth&&epoch===S.sessionEpoch&&generation===S.generation&&currentJob()?.run_id===runId){S.capture=capture;if(nativeTrack.run_id===runId&&nativeTrack.samples.length)S.track=nativeTrack.samples.slice(-10000);else S.track=[...S.track,...samples.samples].slice(-10000);S.cursor=samples.next_cursor;}
  }
  if(S.auth&&epoch===S.sessionEpoch){if($('results-source').value==='current')await searchWorkspace?.refreshResults({quiet:true});render();updateMap();}
 }catch(e){
  if(S.auth&&epoch===S.sessionEpoch){if(e.status===401)authLost();else{S.coverageError='지도·기록 갱신 지연 · 마지막 자료 유지';render();}}
 }finally{S.detailsPolling=false;}
}
function collection(features){return {type:'FeatureCollection',features};}
function feature(geometry,properties={}){return {type:'Feature',geometry,properties};}
function line(points,properties={}){return points.length>=2?collection([feature({type:'LineString',coordinates:points},properties)]):empty;}
function source(name,data){
 const target=map.getSource(name);if(!target)return;
 const previous=renderedSources.get(name);
 if(previous?.target===target&&previous.data===data)return;
 const key=JSON.stringify(data);
 if(previous?.target===target&&previous.key===key){previous.data=data;return;}
 target.setData(data);renderedSources.set(name,{target,key,data});
}
function visible(layer,on){
 const target=map.getLayer(layer);if(!target)return;
 const value=on?'visible':'none',previous=renderedLayers.get(layer);
 if(previous?.target===target&&previous.value===value)return;
 map.setLayoutProperty(layer,'visibility',value);renderedLayers.set(layer,{target,value});
}
function rememberVehicle(telemetry){
 const fix=vehiclePosition(telemetry);
 if(fix&&(!S.vehicle||fix.timestamp>S.vehicle.timestamp)){
  S.vehicle={...telemetry,timestamp:fix.timestamp};vehicleMotion.push(fix,performance.now(),motion(600));
  renderVehicle();
 }
}
async function pollTelemetry(){
 if(!S.auth||S.telemetryPolling)return;
 clearTimeout(telemetryTimer);telemetryTimer=null;S.telemetryPolling=true;
 const started=performance.now(),epoch=S.sessionEpoch;
 try{
  const value=await api('local-patrol/telemetry',undefined,2500);
  if(!S.auth||epoch!==S.sessionEpoch)return;
  // A response for an old run cannot overwrite a newly started sortie.
  if(value.job_id===S.control?.job?.job_id&&value.run_id===S.control?.job?.run_id){
   const old=S.control.job.telemetry;
   if(value.telemetry&&(!old||value.telemetry.timestamp>=old.timestamp))S.control.job.telemetry=value.telemetry;
   S.control.job.observation_progress=mergeObservationProgress(S.control.job.observation_progress,value.observation_progress);
   if(!old||(value.telemetry?.timestamp||0)>=old.timestamp)for(const key of ['flight_timing','region_timing','global_status','recorded_frames'])if(value[key]!=null)S.control.job[key]=value[key];
   rememberVehicle(value.telemetry);
  }
  if(S.control&&value.connection&&value.connection.connection_id===S.control.connection?.connection_id){
   S.control.connection=value.connection;rememberVehicle(value.connection.telemetry);
  }
  S.telemetryFresh=true;renderVehicle();renderLiveMetrics();if(mapReady){updateSpatialPaths();animateActiveRoute(routeDisplayEnabled);}
 }catch(e){if(S.auth&&epoch===S.sessionEpoch){S.telemetryFresh=false;renderVehicle();if(e.status===401)authLost();}}
 finally{S.telemetryPolling=false;if(S.auth&&epoch===S.sessionEpoch)telemetryTimer=setTimeout(()=>void pollTelemetry(),document.hidden?10000:Math.max(50,500-(performance.now()-started)));}
}
async function loadCoverage(job){
 const epoch=S.sessionEpoch;
 if(!job){S.coverage=null;S.coverageError='';return;}
 if(S.coverage?.job_id!==job.job_id)S.coverage=null;
 try{
  const data=await api(`local-patrol/${job.job_id}/coverage`);
  if(!S.auth||epoch!==S.sessionEpoch||S.control?.job?.job_id!==job.job_id)return;
  if(data.run_id!==job.run_id||data.job_id!==job.job_id)throw new Error('관측 실행 정보 불일치');
  S.coverage=data;S.coverageError='';
 }catch(e){if(!S.auth||epoch!==S.sessionEpoch)return;if(e.status===401)throw e;if(S.control?.job?.job_id===job.job_id)S.coverageError=S.coverage?.features?.length?'관측 기록 유지 · 갱신 지연':'관측 기록 조회 지연';}
}
function renderVehicle(){
 renderDroneStatus();
 const fix=vehiclePosition(S.vehicle,Date.now()/1000,(S.telemetryFresh||S.fresh)&&(S.vehicle?.source!=='LOCAL_SITL_PREFLIGHT'||droneConnectionReady(S.control?.connection)));
 $('locate-drone').disabled=!fix;
 const stamp=fix?new Date(fix.timestamp*1000).toLocaleString('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}):'';
 $('vehicle-status').textContent=fix?(fix.live?'드론 위치 · 실시간':'마지막 위치 · '+formatDateTime(fix.timestamp)):'드론 위치 수신 대기';
 $('vehicle-status').title=fix?'마지막 수신 '+stamp:'아직 유효한 위치를 받지 못했습니다.';
 $('vehicle-status').dataset.live=String(!!fix?.live);
 if(!mapReady)return;
 if(!fix){flight3D?.forgetMarker(droneMarker);droneMarker?.remove();droneMarker=null;return;}
 if(!droneMarker){
  const node=el('button',undefined,'drone-marker');node.type='button';node.innerHTML='<span class="drone-symbol" data-icon="Drone" aria-hidden="true"></span><span class="drone-tag"></span>';mountIcons(node);
  node.onclick=e=>{e.stopPropagation();activateStep('flight');};
  droneMarker=new window.maplibregl.Marker({element:node,anchor:'center',subpixelPositioning:true}).setLngLat(fix.point).addTo(map);
 }
 const node=droneMarker.getElement();node.dataset.live=String(fix.live);node.title=$('vehicle-status').textContent;node.setAttribute('aria-label',$('vehicle-status').textContent+' · 비행 관제 열기');
 node.querySelector('.drone-tag').textContent=fix.live?'LIVE':'마지막 위치';
 animateVehicle();
}
function animateVehicle(){
 if(vehicleAnimation||!droneMarker)return;
 const draw=()=>{
  vehicleAnimation=0;if(!droneMarker)return;
  const point=vehicleMotion.at(performance.now());if(!point)return;
  droneMarker.setLngLat(point.point);droneMarker.getElement().querySelector('.drone-symbol').style.transform=`rotate(${point.yaw}deg)`;
  flight3D?.positionMarker(droneMarker,[...point.point,point.altitude]);
  renderCameraView(point);
  if(point.moving&&!document.hidden)vehicleAnimation=requestAnimationFrame(draw);
 };
 draw();
}
let cameraDrawAt=0,lastCameraView=null,cameraPaintState='';
function renderCameraView(point){
 if(!mapReady)return;
 const job=S.control?.job;
 if(lastCameraView?.run!==job?.run_id)lastCameraView=null;
 if(!point||S.mapMode!=='coverage'||job?.state!=='RUNNING'||job?.landed_disarmed||job?.telemetry?.armed===false){source('camera-view',empty);$('camera-view-legend').hidden=true;return;}
 const now=performance.now();if(now-cameraDrawAt<80)return;cameraDrawAt=now;
 let shape=cameraFootprint(point);const fresh=!!shape;
 if(shape)lastCameraView={shape,run:job.run_id};else shape=lastCameraView?.shape;
 source('camera-view',shape?collection([feature(shape)]):empty);
 $('camera-view-legend').hidden=!shape;
 $('camera-view-label').textContent=fresh?'카메라 범위 · 평면 추정':'마지막 카메라 범위 · 수신 대기';
 const style=fresh?'live':'retained';
 if(style!==cameraPaintState){map.setPaintProperty('camera-view-fill','fill-opacity',fresh ? .18 : .06);map.setPaintProperty('camera-view-edge','line-color',fresh?'#1569a8':'#7a8792');cameraPaintState=style;}
}
function renderDroneStatus(){
 const c=S.control?.connection,preflight=S.control?.launch_mode==='CONNECT_THEN_START'&&!active()&&S.fresh&&droneConnectionReady(c);
 const status=droneStatus(preflight?{state:'RUNNING',telemetry:c.telemetry}:S.control?.job,{connected:(S.telemetryFresh||S.fresh)&&S.control?.runner?.online});
 const standby=!preflight&&simulatorStandby(S.control,S.fresh);
 $('drone-status-card').dataset.link=standby?'standby':status.link;
 $('drone-link-state').textContent=standby?'SIM 대기':({live:'실시간',stale:'수신 중단',offline:'연결 끊김',waiting:'수신 대기'})[status.link];
 $('drone-flight-state').textContent=status.phase;
 $('drone-altitude').textContent=status.altitude===null?'—':status.altitude.toFixed(1)+' m';
 $('drone-speed').textContent=status.speed===null?'—':status.speed.toFixed(1)+' m/s';
 $('drone-battery').textContent=status.battery===null?'—':Math.round(status.battery)+'%';
 $('drone-battery').title=status.battery===null?'배터리 잔량 미수신':'수신된 배터리 잔량';
 $('drone-battery').dataset.level=status.battery===null?'unknown':status.battery<=20?'low':'normal';
 $('drone-received-label').textContent=status.timestamp===null?'수신 기록 없음':status.link==='live'?'최근 수신':'마지막 수신';
 const date=status.timestamp===null?null:new Date(status.timestamp*1000);
 $('drone-received-time').textContent=date?date.toLocaleString('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}):'';
 $('drone-status-summary').textContent=status.link==='live'?[status.phase,status.battery===null?'배터리 미수신':Math.round(status.battery)+'%',status.altitude===null?'':status.altitude.toFixed(1)+' m'].filter(Boolean).join(' · '):date?'마지막 기록 '+formatDateTime(status.timestamp)+' · 현재 값 아님':'드론의 상태 수신을 기다리고 있습니다.';
 if(standby)$('drone-status-summary').textContent='출발 전 드론 연결 필요 · 지도는 마지막 위치';
 if(!active()&&S.control?.launch_mode==='CONNECT_THEN_START'){
  $('drone-link-state').textContent=preflight?'연결됨':['QUEUED','CONNECTING'].includes(c?.state)?'연결 중':c?.state==='LOST'?'연결 끊김':c?.state==='DISCONNECTING'?'연결 해제 중':'미연결';
  if(!preflight)$('drone-status-summary').textContent='드론 연결 후 상태를 확인할 수 있습니다.';
 }
 if(S.control?.job?.landed_disarmed&&S.control.job.phase==='SAVING_FRAMES'){
  $('drone-status-card').dataset.link='standby';$('drone-link-state').textContent='착륙 확인';
  $('drone-status-summary').textContent='영상 저장 중 · 지도는 마지막 위치';
 }
 if(date)$('drone-received-time').dateTime=date.toISOString();else $('drone-received-time').removeAttribute('datetime');
 mobileControls?.refresh();
}
function setMapMode(mode){
 S.mapMode=mode==='coverage'?'coverage':'semantic';
 for(const key of ['semantic','coverage'])$('map-mode-'+key).setAttribute('aria-pressed',String(key===S.mapMode));
 $('coverage-legend').hidden=S.mapMode!=='coverage';
 updateMap();
}
function updateSpatialPaths(){
 if(!flight3D)return;
 flight3D.setPaths(displayPaths({plan:S.plan,world:simWorld,job:S.control?.job,zones:S.zones,track:S.track,previousTrack:S.previousTrack,
  planned:$('layer-planned').checked,actual:$('layer-actual').checked,previous:$('layer-results').checked&&resultHistorical(),editing:S.editing,
  connected:(S.fresh||S.telemetryFresh)&&S.control?.runner?.online}));
}
function setView3D(enabled,{animate=true,persist=true}={}){
 view3D=!!enabled;if(persist)localStorage.setItem('local-sim-view-3d',String(view3D));
 $('map-view-3d').setAttribute('aria-pressed',String(view3D));
 $('map-view-3d').title=view3D?'입체 경로 끄기 · 평면 보기':'입체 경로 켜기 · SIM 지형 기준 고도';
 if(!mapReady)return;
 flight3D?.setEnabled(view3D);
 if(map.getSource('terrain'))map.setTerrain(view3D?{source:'terrain',exaggeration:1}:null);
 map.easeTo({pitch:view3D?50:0,duration:animate?motion(360):0});
 updateMap();
}
function updatePreview(){
 const show=$('layer-planned').checked&&!S.editing,spatial=spatialEnabled()?primaryRoute3D(S.plan,simWorld):[];
 const point=show?along(spatial.length?spatial:S.plan?.route,Number($('plan-position').value)/100):null;
 source('preview',point&&!valid3D(point)?collection([feature({type:'Point',coordinates:point})]):empty);
 if(!point||!valid3D(point)||!window.maplibregl?.Marker){flight3D?.forgetMarker(previewMarker);previewMarker?.remove();previewMarker=null;return;}
 if(!previewMarker){const node=el('div',undefined,'route-preview-3d');node.setAttribute('aria-hidden','true');previewMarker=new window.maplibregl.Marker({element:node,subpixelPositioning:true}).setLngLat(point.slice(0,2)).addTo(map);}
 previewMarker.setLngLat(point.slice(0,2));flight3D.positionMarker(previewMarker,point);
}
function updateMap(){
 renderVehicle();
 const c=S.coverage?.job_id===S.control?.job?.job_id&&S.coverage?.run_id===S.control?.job?.run_id?S.coverage:null,old=S.control?.job&&terminal.has(S.control.job.state),count=c?.observed_cells||0;
 const date=c?.updated_at?new Date(c.updated_at*1000).toLocaleDateString('ko-KR',{month:'2-digit',day:'2-digit'}):'';
 const observedPercent=c?.target_area_m2>0?Math.round(c.observed_area_m2/c.target_area_m2*100):null;
 $('coverage-status').textContent=S.coverageError||(c?.state==='PARTIAL_DATA'?(count?'관측 기록 유지 · 일부 갱신 지연':'관측 기록 확인 중'):count?`${old?date+' 정찰 기록':'이번 정찰'}${observedPercent!==null?' · '+observedPercent+'% 관측':''}`:'관측 기록 없음');
 $('fit-coverage').disabled=!count;
 $('coverage-area').textContent=c?.target_area_m2?`실관측 ${Math.round(c.observed_area_m2).toLocaleString()} / 유효 대상 ${Math.round(c.target_area_m2).toLocaleString()} m²`:'';
 $('coverage-area').hidden=!c?.target_area_m2;
 $('people-status').textContent=`${resultHistorical()?'이전':'이번 정찰'} 탐지 ${new Set(resultRows().filter(estimatePoint).map(r=>r.candidate_id)).size}명 후보 · SIM 추정`;
 if(!mapReady)return;
 source('selection',S.preview.length?collection(selectionFeatures(S.zones,S.preview)):region()?.geometry?collection([feature(region().geometry)]):empty);
 source('initial',S.initial?collection(selectionFeatures(S.zones,[S.initial])):empty);
 source('coverage',c||empty);
 const visits=regionVisitSequence(visitOrder(),S.zones,S.plan,S.control?.job,{connected:S.fresh&&S.control?.runner?.online,editing:S.editing});
 const showVisits=$('layer-sequence').checked;
 source('visit-sequence',collection(visits.links.map(link=>feature({type:'LineString',coordinates:link.coordinates},{from:link.from,to:link.to,state:link.state}))));
 visible('visit-sequence-casing',showVisits);visible('visit-sequence-line',showVisits);
 updateVisitMarkers(showVisits?visits.regions:[]);$('sequence-legend').hidden=!showVisits||!visits.regions.length;
 renderRegionInspection();
 const elevated=spatialEnabled(),spatialRegions=new Set(elevated?routeFeatures3D(S.plan,simWorld).map(f=>f.properties.region_id):[]);
 source('planned',S.plan?.kind==='GLOBAL'?collection((S.plan.tasks||[]).filter(t=>t.route?.length>1&&!spatialRegions.has(t.region_id)).map(t=>feature({type:'LineString',coordinates:t.route}))):line(spatialRegions.has(S.plan?.region_id)?[]:S.plan?.route||[]));
 updateRouteMarkers($('layer-planned').checked&&!S.editing);
 visible('planned-casing',$('layer-planned').checked&&!S.editing);
 const activeRoute=activeRegionRoute(S.plan,S.control?.job,S.zones,{connected:S.fresh&&S.control?.runner?.online});
 source('active-route',collection(activeRoute.map(coordinates=>feature({type:'LineString',coordinates}))));
 const currentRegion=S.plan?.kind==='GLOBAL'?S.control?.job?.global_status?.current_region:S.plan?.region_id;
 const showActive=activeRoute.length>0&&$('layer-planned').checked&&!S.editing&&!spatialRegions.has(currentRegion);
 routeDisplayEnabled=showActive;visible('active-route-casing',showActive);visible('active-route-line',showActive);animateActiveRoute(showActive);
 const actual=S.track.map(actualPoint).filter(Boolean);source('actual',collection(groundTrack(S.track,elevated).map(coordinates=>feature({type:'LineString',coordinates}))));
 source('previous-route',collection(groundTrack(S.previousTrack,elevated).map(coordinates=>feature({type:'LineString',coordinates}))));
 updateSpatialPaths();updatePreview();
 source('previous',collection(mapResults().map(r=>feature({type:'Point',coordinates:estimatePoint(r)},{observation_id:r.observation_id,selected:r.observation_id===S.locatedObservation}))));
 for(const [id,on] of Object.entries(mapLayerVisibility(S.mapMode,{planned:$('layer-planned').checked&&!S.editing,actual:$('layer-actual').checked,previousRoute:$('layer-results').checked&&resultHistorical()})))visible(id,on);
 if(renderedRegionMode!==S.mapMode){map.setPaintProperty('regions-line','line-color',S.mapMode==='coverage'?'#aab7bc':['get','color']);renderedRegionMode=S.mapMode;}
 // Neutral surroundings distinguish coverage from the green land-cover base.
 visible('facility-tree',S.mapMode==='semantic');
 renderCameraView(vehicleMotion.at(performance.now()));
 $('map-caption').textContent=S.plan?.route?.length?`${S.plan.name} · 계획 ${Math.round(distance(S.plan.route))}m · 실제 경로 ${actual.length}개 기록`:region()?`${region().name} 선택됨 · 경로 계획을 시작하세요.`:'구역을 선택해 경로계획을 시작하세요.';
}
function updateVisitMarkers(regions){
 if(!window.maplibregl?.Marker)return;
 const entries=regions.filter(r=>r.point),key=JSON.stringify(entries);if(key===visitMarkerKey)return;visitMarkerKey=key;
 const retained=new Set(entries.map(r=>r.id));for(const [id,value] of visitMarkers)if(!retained.has(id)){value.marker.remove();visitMarkers.delete(id);}
 for(const region of entries){
  let value=visitMarkers.get(region.id);
  if(!value){
   const node=el('div',undefined,'region-visit-marker');node.setAttribute('role','img');node.dataset.regionId=region.id;
   const number=el('span',undefined,'region-visit-number'),label=el('span',undefined,'region-visit-label');node.append(number,label);
   value={node,number,label,marker:new window.maplibregl.Marker({element:node,anchor:'center'}).setLngLat(region.point).addTo(map),point:JSON.stringify(region.point)};visitMarkers.set(region.id,value);
  }
  const point=JSON.stringify(region.point);if(value.point!==point){value.marker.setLngLat(region.point);value.point=point;}
  value.node.dataset.state=region.state;value.node.dataset.initial=String(region.number===1);
  value.node.setAttribute('aria-label',`${region.number}번 · ${region.name}${region.label?' · '+region.label:''}`);
  value.number.textContent=region.number;value.label.textContent=region.label;value.label.hidden=!region.label;
 }
}
function updateRouteMarkers(show){
 if(!window.maplibregl?.Marker)return;
 const spatial=spatialEnabled()?primaryRoute3D(S.plan,simWorld):[],route=spatial.length?spatial:S.plan?.route,key=JSON.stringify([show,route]);if(key===routeMarkerKey)return;routeMarkerKey=key;
 for(const marker of routeMarkers){flight3D?.forgetMarker(marker);marker.remove();}routeMarkers=[];
 if(!show||!route?.length)return;
 const add=(point,label,icon,rotation=0)=>{const e=el('div',undefined,label?'route-endpoint':'route-direction');e.setAttribute('aria-hidden','true');const i=el('span');i.dataset.icon=icon;e.append(i);if(label)e.append(el('span',label));mountIcons(e);const marker=new window.maplibregl.Marker({element:e,rotation,rotationAlignment:label?'viewport':'map',subpixelPositioning:true}).setLngLat(point.slice(0,2)).addTo(map);routeMarkers.push(marker);flight3D?.positionMarker(marker,point);};
 const loop=distance([route[0],route.at(-1)])<=8;add(route[0],loop?'경로 진입·끝':'경로 진입','Flag');if(!loop)add(route.at(-1),'경로 끝','MapPin');
 for(const f of [.22,.5,.78]){const a=along(route,f),b=along(route,Math.min(1,f+.003));if(!a||!b)continue;const rotation=Math.atan2(-(b[1]-a[1]),(b[0]-a[0])*Math.cos(a[1]*Math.PI/180))*180/Math.PI;add(a,'','ArrowRight',rotation);}
}
let routeDisplayEnabled=false;
function animateActiveRoute(enabled){
 const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 if(!enabled||document.hidden||reduce||!routeActivity(currentJob()).animated){
  if(routeAnimation)cancelAnimationFrame(routeAnimation);routeAnimation=0;routeAnimationStep=-1;
  if(enabled&&map.getLayer('active-route-line'))map.setPaintProperty('active-route-line','line-dasharray',[0,0,2,4]);
  return;
 }
 if(routeAnimation)return;
 const frame=now=>{
  const activity=routeActivity(currentJob());
  if(document.hidden||!activity.animated){
   routeAnimation=0;if(!activity.visible){visible('active-route-line',false);visible('active-route-casing',false);}return;
  }
  const step=Math.floor(now/60)%24;
  if(step!==routeAnimationStep){map.setPaintProperty('active-route-line','line-dasharray',routeDashFrame(now));routeAnimationStep=step;}
  routeAnimation=requestAnimationFrame(frame);
 };
 routeAnimation=requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange',()=>{if(mapReady)updateMap();});
window.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change',()=>{if(mapReady)updateMap();});
window.addEventListener('pagehide',()=>{if(routeAnimation)cancelAnimationFrame(routeAnimation);routeAnimation=0;});
function geometryPoints(g){return g?.type==='Polygon'?g.coordinates.flat():g?.type==='MultiPolygon'?g.coordinates.flat(2):[];}
function fitRegion(){if(!mapReady)return;const pts=[...geometryPoints(region()?.geometry),...(S.plan?.route||[])];if(!pts.length){if(mapBounds)map.fitBounds(mapBounds,{padding:mapPadding(),duration:0});return;}const b=new window.maplibregl.LngLatBounds();pts.forEach(p=>b.extend(p));map.fitBounds(b,{padding:mapPadding(),maxZoom:18.3,duration:motion(250)});}
async function initMap(){if(map)return;map=new window.maplibregl.Map({container:'map',canvasContextAttributes:{antialias:denseMapScreen(window)},center:[128.3916,36.14524],zoom:15.3,pitch:view3D?50:0,bearing:0,attributionControl:false,style:{version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#e8eee3'}}]}});map.addControl(new window.maplibregl.NavigationControl(),'top-right');map.addControl(new window.maplibregl.AttributionControl({compact:true,customAttribution:'VWorld · 환경공간정보서비스 2025 · 저장된 연구 자료 · SIM'}),'bottom-right');map.on('error',()=>{$('map-message').hidden=false;$('map-message').textContent='일부 지도 자료 표시 지연 · 구역 및 정찰 기록은 보존됩니다.';});map.on('load',async()=>{
 for(const name of ['regions','selection','initial','inspection','visit-sequence','planned','active-route','actual','previous','previous-route','preview','coverage','camera-view'])map.addSource(name,{type:'geojson',data:empty});
 map.addLayer({id:'regions-fill',type:'fill',source:'regions',paint:{'fill-color':['get','color'],'fill-opacity':.12}});
 map.addLayer({id:'coverage-base',type:'fill',source:'regions',layout:{visibility:'none'},paint:{'fill-color':'#cbd1d8','fill-opacity':.88}});
 map.addLayer({id:'coverage-observed',type:'fill',source:'coverage',layout:{visibility:'none'},paint:{'fill-color':'#28a66a','fill-opacity':.9}});
 map.addLayer({id:'coverage-edge',type:'line',source:'coverage',layout:{visibility:'none'},paint:{'line-color':'#a7f6bc','line-width':.6,'line-opacity':.6}});
 map.addLayer({id:'camera-view-fill',type:'fill',source:'camera-view',paint:{'fill-color':'#3488cf','fill-opacity':.18}});
 map.addLayer({id:'camera-view-edge',type:'line',source:'camera-view',paint:{'line-color':'#1569a8','line-width':2,'line-dasharray':[4,2]}});
 map.addLayer({id:'regions-casing',type:'line',source:'regions',paint:{'line-color':'#ffffff','line-width':4.5,'line-opacity':.9}});
 map.addLayer({id:'regions-line',type:'line',source:'regions',paint:{'line-color':['get','color'],'line-width':2.2,'line-opacity':1}});
 map.addLayer({id:'selection-fill',type:'fill',source:'selection',paint:{'fill-color':'#a6edff','fill-opacity':.12}});
 map.addLayer({id:'selection-line',type:'line',source:'selection',paint:{'line-color':'#087985','line-width':3,'line-dasharray':[4,2]}});
 map.addLayer({id:'initial-boundary',type:'line',source:'initial',paint:{'line-color':'#006b78','line-width':3.6,'line-dasharray':[2,1.5]}});
 map.addLayer({id:'inspection-casing',type:'line',source:'inspection',paint:{'line-color':'#ffffff','line-width':8,'line-opacity':.95}});
 map.addLayer({id:'inspection-line',type:'line',source:'inspection',paint:{'line-color':'#233e4c','line-width':4.2}});
 map.addLayer({id:'visit-sequence-casing',type:'line',source:'visit-sequence',paint:{'line-color':'#ffffff','line-width':5.5,'line-opacity':.9}});
 map.addLayer({id:'visit-sequence-line',type:'line',source:'visit-sequence',paint:{'line-color':['match',['get','state'],'active','#087a88','incoming','#087a88','paused','#a76b21','waiting','#a76b21','complete','#4c887d','stale','#7d8792','#7a7795'],'line-width':2.5,'line-dasharray':[2,2],'line-opacity':.9}});
 map.addLayer({id:'planned-casing',type:'line',source:'planned',paint:{'line-color':'#fff','line-width':6,'line-opacity':.95}});
 map.addLayer({id:'planned-line',type:'line',source:'planned',paint:{'line-color':'#6153ba','line-width':3.2}});
 map.addLayer({id:'actual-line',type:'line',source:'actual',paint:{'line-color':'#67e0cc','line-width':3,'line-dasharray':[2,1.7]}});
 map.addLayer({id:'active-route-casing',type:'line',source:'active-route',paint:{'line-color':'#ffffff','line-width':7,'line-opacity':.88}});
 map.addLayer({id:'active-route-line',type:'line',source:'active-route',paint:{'line-color':'#087a88','line-width':4,'line-dasharray':[0,0,2,4],'line-dasharray-transition':{duration:0}}});
 map.addLayer({id:'previous-route-line',type:'line',source:'previous-route',paint:{'line-color':'#d49c6b','line-width':2,'line-dasharray':[1,2],'line-opacity':.8}});
 map.addLayer({id:'preview-point',type:'circle',source:'preview',paint:{'circle-color':'#82b8ff','circle-radius':5,'circle-stroke-color':'#102330','circle-stroke-width':2}});
 map.addLayer({id:'previous-halo',type:'circle',source:'previous',paint:{'circle-color':['case',['get','selected'],'#7c3aed','#ffffff'],'circle-radius':['case',['get','selected'],13,8],'circle-opacity':.5}});
 map.addLayer({id:'previous-points',type:'circle',source:'previous',layout:{'circle-sort-key':['case',['get','selected'],1,0]},paint:{'circle-color':['case',['get','selected'],'#7c3aed','#f59e0b'],'circle-radius':['case',['get','selected'],9,5],'circle-stroke-color':'#ffffff','circle-stroke-width':['case',['get','selected'],3,2]}});
 source('regions',collection(S.catalog.filter(r=>r.geometry).map(r=>feature(r.geometry,{id:r.id,name:r.name,color:r.color||'#50d0ad'}))));
 map.on('click',e=>{
  if(searchWorkspace?.isPicking()){searchWorkspace.mapClick(e);return;}
  if(S.editing){
   if(editsLocked())return;
   const hit=map.queryRenderedFeatures(e.point,{layers:[S.mapMode==='coverage'?'coverage-base':'regions-fill']}).find(f=>f.properties?.id);
   if(hit)applySelection(toggleZone(S.selected,hit.properties.id));
   return;
  }
  const person=map.queryRenderedFeatures(e.point,{layers:['previous-points']})[0];
  const result=resultRows().find(r=>r.observation_id===person?.properties?.observation_id);
  if(result){selectResult(result);return;}
  searchWorkspace?.mapClick(e);
 });
 map.on('mousemove',e=>{if(searchWorkspace?.isPicking()){map.getCanvas().style.cursor='crosshair';return;}const layers=['previous-points',...(S.editing&&!editsLocked()?[S.mapMode==='coverage'?'coverage-base':'regions-fill']:[])];map.getCanvas().style.cursor=map.queryRenderedFeatures(e.point,{layers}).length?'pointer':'';});
 flight3D=makeSimRouteLayer(window.maplibregl,{onError:()=>queueMicrotask(()=>{
  setView3D(false,{animate:false,persist:false});$('map-view-3d').disabled=true;
  $('map-message').hidden=false;$('map-message').textContent='입체 표시를 사용할 수 없어 평면 경로로 표시합니다.';
 })});map.addLayer(flight3D);flight3D.setEnabled(view3D);
 $('map-view-3d').setAttribute('aria-pressed',String(view3D));
 $('map-view-3d').title=view3D?'입체 경로 끄기 · 평면 보기':'입체 경로 켜기 · SIM 지형 기준 고도';
 mapReady=true;updateMap();try{const manifest=await localJson('/api/environments/kumoh-campus-sim/manifest');simWorld=manifest;mapBounds=manifest.bounds;mapHome={center:manifest.center,zoom:15.3};
 const displayStarted=performance.now();let displayBuildings=null;
 addCampusLayers(map,manifest,null,null,location.origin);if(!view3D)map.setTerrain(null);
 const displayResults=await loadCampusDisplay(manifest,localJson,{
 buildings:buildings=>{displayBuildings=buildings;addCampusLayers(map,manifest,buildings,null,location.origin);searchWorkspace?.setSpatialData(buildings,S.zones);$('map').dataset.buildingsReadyMs=String(Math.round(performance.now()-displayStarted));},
 facilities:facilities=>{addCampusLayers(map,manifest,null,facilities,location.origin);$('map').dataset.facilitiesReadyMs=String(Math.round(performance.now()-displayStarted));},
 regions:zones=>{
 if(zones){S.zones=zones.features.filter(f=>f.properties?.representativePoint);S.zoneVersion=zones.metadata?.zoneVersion||S.zones[0]?.properties.gridVersion;
 source('regions',collection(S.zones.map(f=>feature(f.geometry,{...f.properties,id:f.properties.zoneId}))));
 if(!S.plan&&!missionWorkspace?.current){try{const saved=JSON.parse(schoolLocal.getItem('local-zone-selection'));if(saved?.version===S.zoneVersion&&saved.ids.every(i=>S.zones.some(f=>f.properties.zoneId===i))){S.selected=saved.ids;S.preview=[...S.selected];S.initial=saved.initial;S.priorityOrder=Array.isArray(saved.priority)&&saved.priority.length===saved.ids.length&&saved.priority.every(i=>saved.ids.includes(i))?saved.priority:[];S.region='selected-zones';}}catch{}}
 renderSelection();render();}
 searchWorkspace?.setSpatialData(displayBuildings,S.zones);$('map').dataset.regionsReadyMs=String(Math.round(performance.now()-displayStarted));}
 });
 if(displayResults.some(result=>result.status==='rejected'))throw new Error('일부 지도 자료 조회 실패');
 S.mapPrepared=true;render();
 searchWorkspace?.attachMap();$('map-message').hidden=true;if(S.plan?.kind!=='SHORT'&&(S.plan?.route?.length||S.selected.length))fitRegion();else map.easeTo({...mapHome,duration:0});}catch(e){S.mapFailed=true;render();$('map-message').textContent='기본 지도 일부를 불러오지 못했습니다. 구역과 경로는 별도 표시됩니다.';}
 });new ResizeObserver(()=>map.resize()).observe($('map'));}
async function boot(){S.contextLoading=true;$('boot-retry').hidden=true;try{const me=await api('auth/me');bindSchoolAccount(me.user_id);S.csrf=me.csrf_token;S.auth=true;void pollStorage();$('app-actions').hidden=false;$('login-panel').hidden=true;$('logout').hidden=false;const [catalog,control]=await Promise.all([api('local-patrol/catalog'),api('local-patrol')]);S.catalog=catalog.regions;control.storage=S.storage;S.control=control;S.fresh=true;rememberVehicle(control.job?.telemetry);rememberVehicle(control.connection?.telemetry);const stored=active()&&control.job.plan_id?control.job.plan_id:schoolLocal.getItem('local-dashboard-plan');if(validId(stored)){try{setPlan(await api('local-patrol/plans/'+stored));}catch{schoolLocal.removeItem('local-dashboard-plan');}}render();$('workspace').hidden=false;$('boot-status').hidden=true;initMap();void searchWorkspace?.boot().then(()=>missionWorkspace?.boot()).then(()=>{const url=new URL(location.href);if(url.searchParams.get('view')==='case-summary'){searchWorkspace.openSummary();url.searchParams.delete('view');history.replaceState(null,'',url);}}).catch(e=>error(e.message)).finally(()=>{S.contextLoading=false;render();});void savedPlans().catch(e=>{if(S.auth)error('계획 기록 조회 지연 · '+e.message);});void loadPrevious().then(()=>{renderResults();updateMap();}).catch(()=>{S.peopleError=true;updateMap();});if(S.plan){const reviewPlan=S.plan.plan_id,reviewRun=currentJob()?.registered?currentJob().run_id:null;const reviews=(await api('local-patrol/reviews')).reviews;const reviewed=S.plan?.plan_id===reviewPlan?reviews.find(r=>r.plan_id===reviewPlan&&r.capture_run_id===reviewRun):null;if(reviewed){S.review=reviewed;$('review-status').textContent='최근 확인 기록 · '+formatTime(reviewed.confirmed_at)+' · 이전 분석 결과';}}activateStep('flight',{revealSidebar:false});render();void poll();}catch(e){if(e.status===401||e.status===403){authLost();if(e.status===403)$('login-error').textContent='이 계정에는 관제 권한이 없습니다.';}else{$('workspace').hidden=true;$('boot-status').hidden=false;$('boot-status').textContent='로컬 서비스에 연결하지 못했습니다. 실행 상태를 확인하고 다시 연결하세요.';$('boot-retry').hidden=false;}}}
searchWorkspace=createSearchWorkspace({document,api,getTargetColors:()=>missionWorkspace?.current?.target_colors??null,getState:()=>({...S,busy:S.busy||connectionLocked()}),onError:error,getMap:()=>mapReady?map:null,mapFocus:mapFocusOptions,estimatePoint,openResult:selectResult,icons:mountIcons,
 getLiveRun:()=>currentJob()?.registered?currentJob().run_id:null,
 onShowReview:()=>activateStep('review'),
 onCaseChange:()=>{const c=searchWorkspace?.planContext()||{},p=S.plan?.selection;if(!active()&&!missionWorkspace?.loading&&S.plan&&(p?.case_id!==c.case_id||p?.case_revision!==c.case_revision))clearPlanBinding();missionWorkspace?.changed();renderSelection();render();},
 onRecommendations:()=>{renderSelection();render();},
 onApply:(ids,priority,{commit=false}={})=>{if(editsLocked())return;beginSelectionEdit();applySelection(ids);S.priorityOrder=priority||[];if(priority?.length)chooseInitial(priority[0]);renderSelection();if(commit)finishSelectionEdit(true);render();}
});
missionWorkspace=createMissionWorkspace({document,api,getState:()=>S,onError:error,icons:mountIcons,onCreateCase:done=>searchWorkspace.createCase(done),
 locked:()=>active()||connectionLocked()||S.busy||S.pending||S.planningRequest,
 getCases:()=>searchWorkspace.cases(),getCaseId:()=>searchWorkspace.currentCase()?.case_id,
 getResults:()=>searchWorkspace.resultSnapshot(),openResult:selectResult,onPlanInvalidated:clearPlanBinding,onBeginSelection:beginSelectionEdit,
 onLoad:async(m,{preserve=false}={})=>{
  if((m?.case_id||null)!==(searchWorkspace.currentCase()?.case_id||null)){try{await searchWorkspace.selectCase(m?.case_id||'');}catch(e){if((searchWorkspace.currentCase()?.case_id||null)!==(m?.case_id||null))throw e;error('사건의 추가 자료 확인 지연 · '+e.message);}}
  if(preserve){if(S.plan?.selection?.mission_id===m?.mission_id&&S.plan.selection.mission_route_revision!==m.route_revision)clearPlanBinding();renderResults();render();return;}
  S.editing=false;S.editSnapshot=null;clearPlanBinding();S.selected=[...(m?.region_ids||[])];S.preview=[...S.selected];S.initial=m?.initial_region_id||'';S.priorityOrder=[...(m?.priority_order||[])];S.region=S.selected.length?'selected-zones':'';
  if(m?.zone_version&&!S.zoneVersion)S.zoneVersion=m.zone_version;
  if(m?.plan_id){try{const p=await api('local-patrol/plans/'+m.plan_id);if(p.selection?.mission_id===m.mission_id&&p.selection.mission_route_revision===m.route_revision&&!casePlanIssue(p,searchWorkspace.planContext()))setPlan(p);}catch(e){error('저장된 경로 확인 필요 · '+e.message);}}
  persistSelection();renderSelection();activateStep('flight',{revealSidebar:false});render();
 }
});
recordTools=mountRecordTools({doc:document,api:(path,body)=>api('local-search/records'+path,body,45000),icons:mountIcons,onError:error,
 getCurrent:()=>missionWorkspace?.current?{kind:'mission',id:missionWorkspace.current.mission_id}:null,
 onBeforeOpen:async()=>{if(!active()&&!connectionLocked()&&!S.editing)await missionWorkspace.flush();},
 onChanged:async()=>{await missionWorkspace.refreshRecords();await searchWorkspace.refreshRecords();render();}});
$('login-form').addEventListener('submit',async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{await api('auth/login',{login_id:$('login-id').value,password:$('login-password').value});$('login-password').value='';$('login-error').textContent='';await boot();}catch(e){$('login-error').textContent=e.message;}finally{b.disabled=false;}});
$('boot-retry').addEventListener('click',()=>void boot());
$('logout').addEventListener('click',async()=>{try{await api('auth/logout',{});authLost();}catch(e){error(e.message);}});
$('initial-region').addEventListener('change',()=>{
 chooseInitial($('initial-region').value);
});
$('zone-search').addEventListener('input',renderZoneList);$('clear-selection').addEventListener('click',()=>{if(!S.editing)beginSelectionEdit();applySelection([]);});
$('drone-status-toggle').addEventListener('click',()=>{const open=$('drone-status-toggle').getAttribute('aria-expanded')!=='true';$('drone-status-toggle').setAttribute('aria-expanded',String(open));$('drone-status-toggle').setAttribute('aria-label','드론 상태 상세 '+(open?'접기':'펼치기'));$('drone-status-detail').hidden=!open;});
$('map-video-preview').addEventListener('click',()=>{S.mode='current';S.chosen=null;S.imageKey='';activateStep('analysis');render();});
$('edit-regions').addEventListener('click',beginSelectionEdit);
$('review-capture').addEventListener('click',()=>{S.mode='current';activateStep('analysis');render();});
$('video-back-mission').addEventListener('click',()=>activateStep('flight'));
$('readiness-retry').addEventListener('click',()=>{void pollStorage();void poll();});
$('connection-storage-retry').addEventListener('click',()=>void pollStorage());
for(const id of ['open-drone-connection','review-drone-connection','open-connection-step'])$(id).addEventListener('click',e=>openDroneConnection(e.currentTarget));
$('close-drone-connection').addEventListener('click',()=>$('drone-connection-dialog').close());
$('drone-connection-dialog').addEventListener('close',()=>{if(connectionOpener?.isConnected&&!connectionOpener.closest('[hidden],[inert]'))connectionOpener.focus({preventScroll:true});connectionOpener=null;});
$('connection-to-plan').addEventListener('click',()=>{activateStep('flight');connectionOpener=['prepare-scene','readiness-retry','plan-route','edit-regions'].map($).find(n=>!n.hidden&&!n.disabled)||$('tab-flight');$('drone-connection-dialog').close();});
$('connection-to-mission').addEventListener('click',()=>{activateStep('flight');connectionOpener=$('start-flight').disabled?$('review-drone-connection'):$('start-flight');$('drone-connection-dialog').close();});
$('connect-drone').addEventListener('click',()=>void connectDrone());
$('disconnect-drone').addEventListener('click',()=>void disconnectDrone());
$('selection-cancel').addEventListener('click',()=>finishSelectionEdit(false));
$('map-stop-flight').addEventListener('click',()=>void stopFlight());
$('map-return-flight').addEventListener('click',()=>void sendFlightCommand('return'));
$('supported-only').addEventListener('click',()=>applySelection(S.selected.filter(i=>supportedIds().has(i))));
$('plan-route').addEventListener('click',()=>void advancePreparation());$('start-flight').addEventListener('click',()=>void startFlight());
$('prepare-scene').addEventListener('click',async()=>{S.busy=true;render();try{await api(`local-patrol/plans/${S.plan.plan_id}/prepare`,{});$('execution-readiness').textContent='장면 준비 요청됨 · 완료 후 출발 조건을 다시 확인합니다.';}catch(e){error(e.message);}finally{S.busy=false;render();}});
$('view-previous').addEventListener('click',()=>void previous());$('view-current').addEventListener('click',()=>{S.mode='current';S.chosen=null;S.imageKey='';popup?.remove();render();});$('confirm-result').addEventListener('click',()=>void confirmResult());
$('map-view-3d').addEventListener('click',()=>setView3D(!view3D));
$('plan-position').addEventListener('input',()=>{$('plan-percent').textContent=$('plan-position').value+'%';updateMap();});$('fit-map').addEventListener('click',()=>{popup?.remove();fitRegion();});
// Reveal only the expanded sidebar content; never fit, resize or move the map.
for(const id of ['plan-details','route-preview'])$(id).addEventListener('toggle',()=>{
 if(!$(id).open)return;
 setTimeout(()=>{
  if(!$(id).open||!S.sidebarOpen)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scroller=matchMedia('(max-width:1023px)').matches?$('sidebar-scroll'):$('control-content');
  const box=$(id).getBoundingClientRect(),view=scroller.getBoundingClientRect();
  const top=Math.max(view.top,$('sidebar-tools').getBoundingClientRect().bottom)+12;
  const bottom=Math.min(view.bottom,$('prep-actions').getBoundingClientRect().top)-12;
  const delta=box.top<top||box.height>bottom-top?box.top-top:Math.max(0,box.bottom-bottom);
  if(Math.abs(delta)>1)scroller.scrollBy({top:delta,behavior:reduced?'auto':'smooth'});
 },240);
});
for(const id of ['layer-sequence','layer-planned','layer-actual','layer-results'])$(id).addEventListener('change',async()=>{if(id==='layer-results'&&$(id).checked&&!S.previous){try{await loadPrevious();renderResults();}catch(e){$(id).checked=false;error(e.message);}}updateMap();});
for(const mode of ['semantic','coverage'])$('map-mode-'+mode).addEventListener('click',()=>setMapMode(mode));
$('locate-drone').addEventListener('click',()=>{const fix=vehiclePosition(S.vehicle);if(mapReady&&fix)map.flyTo({center:fix.point,zoom:17.5,...mapFocusOptions(),duration:motion(250)});});
$('fit-coverage').addEventListener('click',()=>{popup?.remove();if(!mapReady||!S.coverage?.features?.length)return;const b=new window.maplibregl.LngLatBounds();for(const f of S.coverage.features)for(const p of geometryPoints(f.geometry))b.extend(p);map.fitBounds(b,{padding:mapPadding(),maxZoom:19,duration:motion(250)});});
$('sidebar-toggle').addEventListener('click',()=>setSidebarOpen(!S.sidebarOpen,{restoreFocus:true}));
document.addEventListener('keydown',e=>{if(e.defaultPrevented||document.querySelector('dialog[open]')||searchWorkspace?.isPicking())return;if(e.key==='Escape'&&$('app-menu').open){$('app-menu').open=false;return;}if(e.key==='Escape'&&$('map-tools').open){$('map-tools').open=false;return;}if(e.key==='Escape'&&S.editing){e.preventDefault();finishSelectionEdit(false);}else if(e.key==='Escape'&&S.sidebarOpen){e.preventDefault();setSidebarOpen(false,{restoreFocus:true});}});
$('saved-plan').addEventListener('change',async()=>{if(editsLocked()||S.editing||!validId($('saved-plan').value))return;const generation=++S.generation;try{const p=await api('local-patrol/plans/'+$('saved-plan').value);if(generation!==S.generation)return;S.capture=null;S.track=[];S.cursor='0';S.trackRun=null;S.review=null;S.mode='current';setPlan(p);activateStep('flight');$('app-menu').open=false;fitRegion();}catch(e){error(e.message);}});
$('camera-image').addEventListener('load',()=>{S.imageLoading=false;S.imageError=false;$('camera-image').style.visibility='visible';renderImage();});
$('camera-image').addEventListener('error',()=>{S.imageLoading=false;S.imageError=true;renderImage();S.imageKey='';});

for(const key of Object.keys(stages)){
 $('tab-'+key).addEventListener('click',()=>activateStep(key));
 $('tab-'+key).addEventListener('keydown',e=>{
  const keys=Object.keys(stages),index=keys.indexOf(key);
  const target=e.key==='ArrowRight'?keys[(index+1)%keys.length]:e.key==='ArrowLeft'?keys[(index+keys.length-1)%keys.length]:e.key==='Home'?keys[0]:e.key==='End'?keys.at(-1):null;
  if(target){e.preventDefault();activateStep(target,{focus:true});}
 });
}
$('people-shortcut').addEventListener('click',()=>activateStep('review'));
$('result-search').addEventListener('input',renderResults);
$('result-location-filter').addEventListener('change',renderResults);
$('locate-result').addEventListener('click',locateResult);
$('expand-image').addEventListener('click',openMedia);
$('close-media').addEventListener('click',()=>$('media-dialog').close());
$('media-dialog').addEventListener('close',()=>{
 if($('media-dialog').open)return;
 mediaRequest++;S.mediaResult=null;S.mediaSourceRun=null;S.chosen=null;
 if(mediaOpener?.isConnected&&!mediaOpener.closest('[hidden],[inert]'))mediaOpener.focus({preventScroll:true});
 mediaOpener=null;
});
$('show-password').addEventListener('click',()=>{const visible=$('login-password').type==='password';$('login-password').type=visible?'text':'password';$('show-password').setAttribute('aria-pressed',String(visible));$('show-password').textContent=visible?'숨김':'표시';$('show-password').setAttribute('aria-label',visible?'비밀번호 숨기기':'비밀번호 표시');});
for(const id of ['fit-map','locate-drone'])$(id).addEventListener('click',()=>$('map-tools').open=false);
mountIcons();
// Observe only the overlay: the map container never changes when this height changes.
if(typeof ResizeObserver!=='undefined')new ResizeObserver(entries=>{
 const height=entries[0]?.borderBoxSize?.[0]?.blockSize??$('mission-sidebar').getBoundingClientRect().height;
 $('split').style.setProperty('--sheet-height',height+'px');
}).observe($('mission-sidebar'));
if(typeof ResizeObserver!=='undefined')new ResizeObserver(entries=>{
 const height=entries[0]?.borderBoxSize?.[0]?.blockSize??$('map-topbar').getBoundingClientRect().height;
 if(height>0)$('split').style.setProperty('--map-topbar-height',height+'px');
}).observe($('map-topbar'));
// Expire live status even while a slow request is still pending. No map/API work.
const droneStatusTimer=setInterval(()=>{if(!$('workspace').hidden&&!document.hidden){renderVehicle();renderLiveMetrics();refreshConnectionGate();}},1000);
window.addEventListener('pagehide',()=>{clearInterval(droneStatusTimer);resetStorageCheck();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&S.auth){clearTimeout(pollTimer);clearTimeout(telemetryTimer);refreshConnectionGate();void pollStorage();void poll();void pollTelemetry();}});
setSidebarOpen(!compactScreen()&&localStorage.getItem('local-sidebar-open')!=='false',{persist:false});
mobileControls=mountMobileControls({decorate:mountIcons,setSidebar:open=>setSidebarOpen(open,{persist:false}),flightActive:active,mapAction:()=>S.editing?{kind:'selection',label:`정찰 구역 ${S.selected.length}개`,canFinish:!!S.selected.length&&!editsLocked(),canCancel:!editsLocked(),finish:()=>finishSelectionEdit(true),cancel:()=>finishSelectionEdit(false)}:null});
void boot();
