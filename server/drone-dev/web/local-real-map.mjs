import {changeControlTab,denseMapScreen} from './school-operations.mjs';
import {bindSchoolAccount} from './school-workspace.mjs';
import {mountPlaceSearch,parseCoordinates} from './local-place-search.mjs';
export {parseCoordinates} from './local-place-search.mjs';
import {mountIcons} from './local-dashboard-icons.mjs';
import {mountRecordTools} from './local-records.mjs';
import {bindMissionPickerRefresh,renderMissionPicker} from './local-mission-picker.mjs';
import {mountMobileControls} from './local-mobile-controls.mjs';
import {targetPalette} from './local-target-colors.mjs';
import {TileResourceCache,tilePath} from './local-map-tiles.mjs';
import {mountRealFeatures} from './local-real-features.mjs';

const API='/api/v1/local-search/real-map';
const empty=()=>({type:'FeatureCollection',features:[]});
const copy=value=>JSON.parse(JSON.stringify(value));
export function regionReference(feature){
 const p=feature.properties,id=p.zoneId||p.id||feature.id;
 return {id:String(id),name:p.name||'수색 구역',point:p.representativePoint||[Number(p.centerLon),Number(p.centerLat)],
  area_m2:Number(p.areaM2||p.totalAreaM2||0)};
}
export function toggleRegion(regions,region){
 if(regions.some(r=>r.id===region.id))return regions.filter(r=>r.id!==region.id);
 if(regions.length>=32)throw new Error('한 임무에서 최대 32개 구역을 선택할 수 있습니다.');
 return [...regions,region];
}
export function initialFirst(regions,id){return [...regions.filter(r=>r.id===id),...regions.filter(r=>r.id!==id)];}
export function moveRegion(regions,id,offset){
 const next=[...regions],index=next.findIndex(r=>r.id===id),target=index+offset;
 if(index<0||target<0||target>=next.length)return next;
 [next[index],next[target]]=[next[target],next[index]];return next;
}
export function preparationBody(mission){
 return {title:mission.title,release_id:mission.release_id,regions:mission.regions,
  initial_region_id:mission.regions[0]?.id||null,target_colors:mission.target_colors,
  prepared:!!mission.prepared,revision:mission.revision??null,launch:mission.launch||null};
}

export function createRealMapWorkspace({doc=document,win=window,fetcher=window.fetch.bind(window),decorate=mountIcons}={}){
 const $=id=>doc.getElementById(id);
 const S={auth:false,csrf:null,user:null,release:null,city:null,missions:[],current:null,dirty:false,serial:0,
  editing:false,mode:'semantic',features:new Map(),visible:[],markers:[],canEdit:false,ready:false,
  viewVersion:0,searchVersion:0,hydrateVersion:0,tileError:false,saveError:false};
 let map=null,popup=null,saveTimer=null,savePromise=null,dialogNew=false,dialogOpener=null,tileCache=null;
 let features=null,mobile=null,recordTools=null;
 const sourceKeys=new Map();let markerKey='',filterKey='';
 const invalidatePicker=bindMissionPickerRefresh($('mission-select'),async()=>(await json(API+'/missions')).missions,missions=>{
  S.missions=missions;refreshPicker();
 },e=>error(e.message));
 const reduced=()=>win.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const storageKey=name=>'real-map:'+S.user+':'+name;
 function remembered(name){try{return win.localStorage.getItem(storageKey(name));}catch{return null;}}
 function remember(name,value){try{win.localStorage.setItem(storageKey(name),value);}catch{}}
 const el=(tag,text,className)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
 const icon=name=>{const n=el('i');n.dataset.icon=name;n.setAttribute('aria-hidden','true');return n;};
 function error(text){$('prep-error').textContent=text;$('prep-error').hidden=!text;}
 function feedback(text,failed=false){$('save-status').textContent=text;$('save-status').dataset.error=String(failed);}
 async function json(path,body,signal,timeout=18000){
  const abort=new AbortController(),timer=win.setTimeout(()=>abort.abort(),timeout);
  const cancel=()=>abort.abort();signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
  try{
   const r=await fetcher(path,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:body===undefined&&path.includes('view=map')?'no-cache':'no-store',signal:abort.signal,
    headers:{...(body===undefined?{}:{'Content-Type':'application/json','X-CSRF-Token':S.csrf})},...(body===undefined?{}:{body:JSON.stringify(body)})});
   const data=await r.json().catch(()=>null);
   if(r.status===401){authLost();throw Object.assign(new Error('로그인이 만료되었습니다. 다시 로그인하세요.'),{status:401});}
   if(!r.ok){const code=data?.error?.code;throw Object.assign(new Error(({RECORD_CHANGED:'기록이 변경되었습니다. 목록에서 다시 확인하세요.',RECORD_IN_USE:'진행 중인 작업이 끝난 뒤 삭제할 수 있습니다.',REAL_MAP_LAUNCH_REQUIRED:'지도에서 출발지를 지정하세요.',SCHOOL_CITY_PLANNER_UNAVAILABLE:'학교서버 경로 계산기를 준비 중입니다. 잠시 후 다시 시도하세요.',REAL_MAP_PLANNER_BUSY:'다른 경로를 계산 중입니다. 잠시 후 다시 시도하세요.',REAL_MAP_MISSION_CHANGED:'다른 화면에서 임무가 변경되었습니다. 새로고침 후 다시 확인하세요.'})[code]||(r.status===403?'이 계정에 필요한 권한이 없습니다.':r.status===422?'입력한 정보를 확인하세요.':'연결을 확인하고 다시 시도하세요.')),{status:r.status});}
   if(data===null)throw new Error('서버 응답을 확인하지 못했습니다. 다시 시도하세요.');
   return data;
  }finally{win.clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
 }
 function authLost(){bindSchoolAccount(null);if(S.auth){location.reload();return;}
  recordTools?.logout();
  placeSearch.clear();features?.destroy();
  S.auth=false;S.ready=false;S.current=null;S.user=null;S.missions=[];S.dirty=false;S.serial++;refreshPicker();
  S.viewVersion++;S.hydrateVersion++;S.searchVersion++;win.clearTimeout(saveTimer);
  map?.remove();map=null;tileCache?.close();tileCache=null;win.maplibregl?.removeProtocol?.('recon-map');S.features.clear();S.markers=[];sourceKeys.clear();markerKey='';filterKey='';
  if($('mission-dialog').open)$('mission-dialog').close();
  $('workspace').hidden=true;$('app-actions').hidden=true;$('login-panel').hidden=false;$('boot-status').hidden=true;$('boot-retry').hidden=true;
 }
 function refreshPicker(){
  invalidatePicker();
  renderMissionPicker($('mission-select'),S.missions,S.current);
 }
 async function flush(){
  win.clearTimeout(saveTimer);
  if(savePromise)return savePromise;
  savePromise=(async()=>{
   while(S.auth&&S.current&&S.dirty){
    const current=S.current,id=current.mission_id,serial=S.serial,payload=preparationBody(current);
    feedback('저장 중…');
    try{
     const saved=await json(API+'/missions/'+id,payload);
     if(!S.auth||S.current?.mission_id!==id)return;
     S.current.revision=saved.revision;S.current.updated_at=saved.updated_at;S.current.created_at=saved.created_at;
     S.missions=[saved,...S.missions.filter(m=>m.mission_id!==id)];
     if(serial===S.serial)S.dirty=false;
     S.saveError=false;feedback(S.dirty?'저장 중…':'저장됨');refreshPicker();
    }catch(e){S.saveError=true;feedback('저장 실패',true);error(e.message);throw e;}
   }
  })().finally(()=>{savePromise=null;});
  return savePromise;
 }
 function changed(){
  S.dirty=true;S.serial++;S.saveError=false;feedback('저장 대기');error('');render();updateMap();
  win.clearTimeout(saveTimer);saveTimer=win.setTimeout(()=>void flush().catch(()=>{}),450);
 }
 function selection(regions){if(!S.current||!S.canEdit)return;if(regions.length>32){error('한 임무에서 최대 32개 구역을 선택할 수 있습니다.');return;}S.current.regions=regions;S.current.initial_region_id=regions[0]?.id||null;S.current.prepared=false;delete S.current.plan_id;S.plan=null;changed();}
 let regionRenderKey='';
 function render(){
  recordTools?.render();
  const m=S.current,regions=m?.regions||[],prepared=!!m?.prepared,has=regions.length>0;
  $('new-mission').disabled=!S.canEdit;$('mission-settings').disabled=!m||!S.canEdit;
  const colors=(m?.target_colors||[]).map(id=>targetPalette.find(c=>c.id===id)?.label).filter(Boolean);
  $('target-summary').textContent=colors.length?'상의 '+colors.slice(0,2).join(' · ')+(colors.length>2?` 외 ${colors.length-2}`:''):'상의색 미지정';
  $('prep-title').textContent=prepared?(S.dirty?'수색 준비 저장 중…':'수색 준비 완료'):m?'수색 구역 선택':'수색을 준비하세요';
  $('prep-description').textContent=prepared?(S.dirty?'선택한 구역과 시작 순서를 저장하고 있습니다.':'구역과 시작 순서를 저장했습니다.'):m?'지도에서 구역을 선택하고 시작 구역을 지정하세요.':'새 임무를 만들고 지도에서 수색 구역을 선택하세요.';
  $('selected-count').textContent=regions.length+'개 구역';
  $('selection-actions').hidden=!m||prepared;$('edit-selection').disabled=!S.canEdit||!S.ready;
  $('edit-selection').setAttribute('aria-pressed',String(S.editing));$('edit-selection').lastElementChild.textContent=S.editing?'선택 완료':'구역 선택';
  $('clear-selection').disabled=!has||!S.canEdit;$('initial-field').hidden=!has;
  const regionKey=JSON.stringify([regions,prepared,S.canEdit]);
  if(regionKey!==regionRenderKey)$('initial-region').replaceChildren(...regions.map(r=>{const o=el('option',r.name);o.value=r.id;return o;}));
  $('initial-region').value=regions[0]?.id||'';$('initial-region').disabled=prepared||!S.canEdit;
  $('region-empty').hidden=has;$('route-note').hidden=regions.length<2;
  $('real-edit-hint').hidden=!S.editing||!m;$('finish-selection').disabled=!has;
  $('fit-selection').disabled=!has;$('prepare-mission').disabled=!has||!S.canEdit||!S.ready;
  $('prepare-mission').hidden=prepared;$('start-flight').hidden=!prepared;$('start-flight').disabled=true;
  $('edit-prepared').hidden=!prepared;$('departure-note').hidden=!prepared;
  $('step-select').toggleAttribute('aria-current',!prepared);if(!prepared)$('step-select').setAttribute('aria-current','step');
  $('step-review').toggleAttribute('aria-current',prepared);if(prepared)$('step-review').setAttribute('aria-current','step');
  if(regionKey!==regionRenderKey){
  regionRenderKey=regionKey;
  $('region-list').replaceChildren(...regions.map((r,index)=>{
   const li=el('li'),focus=el('button',undefined,'region-focus'),number=el('span',String(index+1),'real-region-number');
   focus.type='button';focus.setAttribute('aria-label',r.name+' 지도에서 보기');
   const text=el('span',undefined,'real-region-copy');text.append(el('strong',r.name),el('small',(index===0?'시작 구역':'방문 '+(index+1))+(r.area_m2>0?' · '+(r.area_m2/10000).toFixed(2)+' ha':'')));
   focus.append(number,text);focus.onclick=()=>focusRegion(r);li.append(focus);
   if(!prepared&&S.canEdit){
    const order=el('span',undefined,'region-order-controls');
    for(const [offset,label,glyph] of [[-1,'앞으로','ChevronUp'],[1,'뒤로','ChevronDown']]){
     const button=el('button',undefined,'region-order');button.type='button';button.dataset.regionId=r.id;button.dataset.direction=String(offset);
     button.setAttribute('aria-label',r.name+' 방문 순서 '+label);button.title='방문 순서 '+label;button.disabled=index+offset<0||index+offset>=regions.length;
     button.append(icon(glyph));button.onclick=()=>{selection(moveRegion(S.current.regions,r.id,offset));const next=[...$('region-list').querySelectorAll('.region-order')].find(b=>b.dataset.regionId===r.id&&b.dataset.direction===String(offset));(next?.disabled?next.parentElement.querySelector('button:not(:disabled)'):next)?.focus({preventScroll:true});};order.append(button);
    }
    li.append(order);
    const remove=el('button',undefined,'region-remove');remove.type='button';remove.setAttribute('aria-label',r.name+' 선택 해제');remove.append(icon('X'));remove.onclick=()=>selection(S.current.regions.filter(v=>v.id!==r.id));li.append(remove);
   }
   return li;
  }));decorate($('region-list'));
  }
  if(map)map.getCanvas().style.cursor=S.editing?'crosshair':'';
  features?.render();mobile?.refresh();
 }
 function setEditing(value){if(!S.current||!S.canEdit)return;S.editing=value;if(value&&S.current.prepared){S.current.prepared=false;changed();}else{render();updateMap();}}
 function setSidebar(open,{persist=true}={}){
  $('mission-sidebar').hidden=!open;$('mission-sidebar').inert=!open;$('split').dataset.sidebar=open?'open':'closed';
  $('sidebar-toggle').setAttribute('aria-expanded',String(open));$('sidebar-toggle').setAttribute('aria-label','사이드바 '+(open?'접기':'펼치기'));
  if(persist&&!mobile?.isMobile)remember('sidebar',open?'open':'closed');
 }
 function setTab(name,{focus=false}={}){
  const target=$('tab-'+name);
  changeControlTab(target.closest('[role=tablist]'),target,()=>{
   for(const tab of ['patrol','video','results']){
    const active=tab===name,b=$('tab-'+tab);
    b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;$(tab+'-panel').hidden=!active;
   }
  },focus);
 }
 function setMode(mode){
  S.mode=mode;for(const v of ['semantic','coverage'])$('map-mode-'+v).setAttribute('aria-pressed',String(mode===v));
  $('coverage-note').hidden=mode!=='coverage';remember('mode',mode);updateMap();
 }
 function source(name,features){
  const key=name==='sequence'?JSON.stringify(features):features.map(f=>f.id).join('|');
  if(sourceKeys.get(name)===key)return;sourceKeys.set(name,key);
  map?.getSource(name)?.setData({type:'FeatureCollection',features});
 }
 function updateMap(){
  if(!S.ready||!map)return;
  const selected=S.current?.regions||[],ids=selected.map(r=>r.id),key=JSON.stringify(ids);
  if(filterKey!==key){
   filterKey=key;const chosen=['in',['get','zoneId'],['literal',ids]];
   map.setFilter('selected-fill',chosen);map.setFilter('selected-line',chosen);map.setFilter('initial-line',['==',['get','zoneId'],ids[0]||'']);
  }
  source('sequence',selected.length>1&&!S.plan?.route?.features?.length?[{type:'Feature',geometry:{type:'LineString',coordinates:selected.map(r=>r.point)},properties:{}}]:[]);
  map.setPaintProperty('regions-fill','fill-color',S.mode==='coverage'?'#b7c2c9':['get','color']);
  map.setPaintProperty('regions-fill','fill-opacity',S.mode==='coverage'?.65:.12);
  map.setPaintProperty('regions-line','line-color',S.mode==='coverage'?'#7f919a':['get','color']);
  features?.update();
  const nextMarkerKey=selected.map(r=>r.id).join('|')+':'+S.editing;
  if(markerKey===nextMarkerKey)return;markerKey=nextMarkerKey;
  S.markers.forEach(marker=>marker.remove());S.markers=[];
  selected.forEach((r,index)=>{
   const marker=el('button',String(index+1),'real-order-marker');marker.type='button';marker.dataset.initial=String(index===0);marker.setAttribute('aria-label',`${index+1}번 · ${r.name}${index===0?' · 시작 구역':''}`);
   marker.onclick=e=>{e.stopPropagation();if(S.editing&&S.canEdit)selection(S.current.regions.filter(v=>v.id!==r.id));else focusRegion(r);};
   S.markers.push(new win.maplibregl.Marker({element:marker}).setLngLat(r.point).addTo(map));
  });
 }
 function boundsOf(regions,pad=.0003){const xs=regions.map(r=>r.point[0]),ys=regions.map(r=>r.point[1]);return [Math.min(...xs)-pad,Math.min(...ys)-pad,Math.max(...xs)+pad,Math.max(...ys)+pad];}
 function focusRegion(region){if(features?.focus(region.point))return;map?.easeTo({center:region.point,zoom:Math.max(16,map.getZoom()),duration:reduced()?0:350});}
 function fitSelected(){if(!S.current?.regions.length)return;const b=boundsOf(S.current.regions,.001);if(features?.focus([(b[0]+b[2])/2,(b[1]+b[3])/2],Math.max(1000,(b[3]-b[1])*140000)))return;map?.fitBounds([[b[0],b[1]],[b[2],b[3]]],{padding:80,maxZoom:16,duration:reduced()?0:400});}
 function mapStatus(text){$('map-data-status').textContent=S.tileError?'배경 지도 재연결 중 · 구역과 선택은 유지됩니다.':text;$('map-retry').hidden=!S.tileError&&!S.regionError;}
 function mapState(){
  if(!map||!S.ready)return;
  const b=map.getBounds(),c=S.city.bounds,inside=b.getWest()<=c[2]&&b.getEast()>=c[0]&&b.getSouth()<=c[3]&&b.getNorth()>=c[1];
  $('map').dataset.zoom=map.getZoom().toFixed(2);
  $('map').dataset.renderedRegions=String(map.queryRenderedFeatures({layers:['regions-fill']}).length);
  $('map').dataset.regionSource='vector';
  $('map').dataset.mapMoving=String(map.isMoving());
  mapStatus(S.regionError?'구역 지도 재연결 중 · 기존 표시 유지':inside?'구미시 의미구역 · 수색 준비용':'이 지역은 의미구역 자료가 없습니다 · 장소 탐색 가능');
 }
 function initMap(){
  if(map)return;
  delete $('map').dataset.firstBuildingRenderMs;
  $('map').dataset.createdMs=win.performance.now().toFixed(1);
  let view={center:[128.3916,36.14524],zoom:15.1};
  try{const saved=JSON.parse(remembered('camera'));if(saved&&Array.isArray(saved.center)&&saved.center.every(Number.isFinite)&&Math.abs(saved.center[0])<=180&&Math.abs(saved.center[1])<=85&&saved.zoom>=5&&saved.zoom<=19)view=saved;}catch{}
  features?.prime(view);
  tileCache=new TileResourceCache({fetcher,onUnauthorized:authLost,onUpdate:stats=>{for(const [key,value] of Object.entries(stats))$('map').dataset['tile'+key[0].toUpperCase()+key.slice(1)]=String(value);}});
  win.maplibregl.addProtocol('recon-map',async(params,controller)=>{
   const building=/^recon-map:\/\/buildings\/([a-f0-9]{16})\/(\d+)\/(\d+)\/(\d+)\.pbf$/.exec(params.url);
   const path=building?'/api/v1/spatial-releases/'+S.release.release_id+'/buildings/'+building.slice(1).join('/')+'.pbf':tilePath(params.url,S.release.release_id,S.display),data=await tileCache.get(path,controller.signal);
   if(params.url.startsWith('recon-map://base/'))S.tileError=false;else S.regionError=false;
   return {data};
  });
  const initialEngine=remembered('engine')||'3d';
  map=new win.maplibregl.Map({container:'map',canvasContextAttributes:{antialias:denseMapScreen(win)},...view,pitch:initialEngine==='2d'?0:initialEngine==='2.5d'?52:30,maxPitch:65,bearing:0,dragRotate:true,minZoom:5,maxZoom:19,maxTileCacheSize:256,refreshExpiredTiles:false,attributionControl:false,style:{version:8,sources:{basemap:{type:'raster',tiles:['recon-map://base/{z}/{x}/{y}.png'],tileSize:denseMapScreen(win)?128:256,minzoom:0,maxzoom:19}},layers:[{id:'background',type:'background',paint:{'background-color':'#e8edef'}},{id:'base',type:'raster',source:'basemap',paint:{'raster-fade-duration':reduced()?0:150}}]}});
  map.touchZoomRotate?.disableRotation();
  const firstBuildings=()=>{
   if(!map||$('map').style.visibility==='hidden'||$('map').dataset.firstBuildingRenderMs)return;
   const layers=['real-building-height','real-building-preview'].filter(id=>map.getLayer(id)&&map.getLayoutProperty(id,'visibility')!=='none');
   if(!layers.length||!map.queryRenderedFeatures({layers}).length)return;
   map.off('render',firstBuildings);
   win.requestAnimationFrame(()=>{if(map){$('map').dataset.firstBuildingRenderMs=win.performance.now().toFixed(1);$('map').dispatchEvent(new win.Event('real-buildings-ready'));}});
  };
  map.on('render',firstBuildings);
  map.addControl(new win.maplibregl.NavigationControl({showCompass:false}),'bottom-right');
  map.addControl(new win.maplibregl.AttributionControl({compact:true,customAttribution:'© VWorld · 구미시 저장 의미구역 · 수색 준비용'}),'bottom-right');
  map.on('error',e=>{if(e.sourceId==='basemap')S.tileError=true;if(e.sourceId==='regions')S.regionError=true;mapState();});
  map.on('style.load',()=>{
   if(!S.auth||S.ready)return;
   map.addSource('regions',{type:'vector',tiles:['recon-map://regions/{z}/{x}/{y}.pbf'],bounds:S.display.bounds,minzoom:S.display.minzoom,maxzoom:S.display.maxzoom,promoteId:'zoneId'});
   map.addSource('sequence',{type:'geojson',data:empty()});
   map.addLayer({id:'regions-fill',type:'fill',source:'regions','source-layer':'regions',paint:{'fill-color':['get','color'],'fill-opacity':.12}});
   map.addLayer({id:'regions-casing',type:'line',source:'regions','source-layer':'regions',paint:{'line-color':'#fff','line-width':['interpolate',['linear'],['zoom'],5,.4,12,2,16,4],'line-opacity':.8}});
   map.addLayer({id:'regions-line',type:'line',source:'regions','source-layer':'regions',paint:{'line-color':['get','color'],'line-width':['interpolate',['linear'],['zoom'],5,.2,12,.9,16,1.9]}});
   map.addLayer({id:'selected-fill',type:'fill',source:'regions','source-layer':'regions',filter:['==',['get','zoneId'],''],paint:{'fill-color':'#007b86','fill-opacity':.18}});
   map.addLayer({id:'selected-line',type:'line',source:'regions','source-layer':'regions',filter:['==',['get','zoneId'],''],paint:{'line-color':'#006b78','line-width':3}});
   map.addLayer({id:'initial-line',type:'line',source:'regions','source-layer':'regions',filter:['==',['get','zoneId'],''],paint:{'line-color':'#004650','line-width':4,'line-dasharray':[3,1.5]}});
   map.addLayer({id:'sequence-casing',type:'line',source:'sequence',paint:{'line-color':'#fff','line-width':5}});
   map.addLayer({id:'sequence-line',type:'line',source:'sequence',paint:{'line-color':'#367b88','line-width':2.5,'line-dasharray':[2,2]}});
   S.ready=true;features?.init(map);render();updateMap();mapState();
  });
  map.on('moveend',()=>{if(!S.auth)return;const p=map.getCenter();remember('camera',JSON.stringify({center:[p.lng,p.lat],zoom:map.getZoom()}));mapState();});
  map.on('movestart',()=>{$('map').dataset.mapMoving='true';});
  map.on('idle',mapState);
  map.on('click',e=>{
   if(features?.handleClick(e.lngLat))return;
   if(!S.ready||!S.current||!S.editing||!S.canEdit)return;
   const hit=map.queryRenderedFeatures(e.point,{layers:['regions-fill']})[0];
   if(hit)try{selection(toggleRegion(S.current.regions,regionReference(hit)));}catch(e){error(e.message);}
  });
 }
 async function loadMission(id,{focus=false}={}){
  await flush();const value=S.missions.find(m=>m.mission_id===id);
  if(value&&value.release_id!==S.release.release_id)throw new Error('지도 자료 버전이 달라 새 수색 임무가 필요합니다. 기존 임무는 보존됩니다.');
  S.current=value?copy(value):null;S.dirty=false;S.editing=!!value&&!value.prepared&&!mobile?.isMobile;S.hydrateVersion++;
  remember('mission',id||'');feedback(value?'저장됨':'실지도 전용');error('');refreshPicker();render();updateMap();if(focus&&value?.regions.length)fitSelected();
 }
 function openMission(create){
  dialogNew=create;dialogOpener=doc.activeElement;$('mission-dialog-title').textContent=create?'새 수색 임무':'임무 설정';
  $('mission-name').value=create?'':S.current.title;
  for(const input of $('target-colors').querySelectorAll('input'))input.checked=!create&&S.current.target_colors.includes(input.value);
  $('mission-dialog-error').textContent='';$('mission-dialog').showModal();$('mission-name').focus();
 }
 async function saveDialog(){
  await flush();const title=$('mission-name').value.trim();if(!title)throw new Error('임무 이름을 입력하세요.');
  const colors=[...$('target-colors').querySelectorAll('input:checked')].map(e=>e.value);
  if(dialogNew){S.current={mission_id:win.crypto.randomUUID(),title,release_id:S.release.release_id,regions:[],target_colors:colors,prepared:false,revision:null};S.editing=true;}
  else{S.current.title=title;S.current.target_colors=colors;}
  changed();await flush();remember('mission',S.current.mission_id);$('mission-dialog').close();refreshPicker();render();updateMap();
 }
 function searchOpen(open){$('map-search').hidden=!open;$('place-toggle').setAttribute('aria-expanded',String(open));$('place-toggle').setAttribute('aria-label','장소 검색 '+(open?'닫기':'열기'));if(open){placeSearch.open();$('place-query').focus();}else{placeSearch.cancel();S.searchVersion++;$('place-toggle').focus();}}
 function showPlace(item){
  if(features?.focus(item.point,850,'search')){searchOpen(false);return;}
  searchOpen(false);const box=el('div',undefined,'real-map-popup');box.append(el('h3',item.name),el('p',item.address||'입력 좌표'));
  popup?.remove();popup=new win.maplibregl.Popup({offset:10,focusAfterOpen:false}).setLngLat(item.point).setDOMContent(box).addTo(map);
  map.flyTo({center:item.point,zoom:16,duration:reduced()?0:400});
 }
 const placeSearch=mountPlaceSearch({doc,win,request:(path,body,options)=>json('/api/v1/'+path,body,options.signal),
  mapCenter:()=>features?.center||null,
  localItems:()=>[...S.features.values()].map(f=>({...regionReference(f),point:regionReference(f).point,source:'의미 구역'})),select:showPlace,isReady:()=>S.auth});

 async function boot(){
  $('boot-retry').hidden=true;
  try{
   const me=await json('/api/v1/auth/me');S.auth=true;S.csrf=me.csrf_token;S.user=me.user_id;bindSchoolAccount(me.user_id);S.canEdit=(me.permissions||[]).some(p=>p.drone_id==='sim-pi-01'&&p.scopes?.includes('edit'));$('map').dataset.authReadyMs=win.performance.now().toFixed(1);
   const [releases,city,saved,buildings]=await Promise.all([json('/api/v1/spatial-releases'),json('/api/city/47190'),json(API+'/missions'),json('/api/map/real-buildings').catch(()=>null)]);S.buildings=buildings;
   S.release=releases.find(r=>r.environment_id==='gumi-city');if(!S.release)throw new Error('실지도 의미구역 자료가 없습니다.');S.city=city;S.missions=saved.missions;S.display=await json('/api/v1/spatial-releases/'+S.release.release_id+'/display');$('map').dataset.metadataReadyMs=win.performance.now().toFixed(1);
   const wanted=remembered('mission');S.current=copy(S.missions.find(m=>m.mission_id===wanted)||null);S.editing=!!S.current&&!S.current.prepared&&!mobile?.isMobile;
   if(S.current&&S.current.release_id!==S.release.release_id){S.current=null;error('지도 자료 버전이 달라 새 수색 임무가 필요합니다. 기존 임무는 보존됩니다.');}
   $('login-panel').hidden=true;$('app-actions').hidden=false;$('boot-status').hidden=true;$('workspace').hidden=false;
   setSidebar(!mobile?.isMobile&&remembered('sidebar')!=='closed',{persist:false});setMode(remembered('mode')==='coverage'?'coverage':'semantic');refreshPicker();feedback(S.current?'저장됨':'실지도 전용');render();initMap();
  }catch(e){if(!$('login-panel').hidden)return;$('workspace').hidden=true;$('boot-status').hidden=false;$('boot-status').textContent=e.message;$('boot-retry').hidden=false;}
 }

 decorate(doc);
 for(const color of targetPalette){const label=el('label',undefined,'target-color'),input=el('input');input.type='checkbox';input.value=color.id;input.setAttribute('aria-label',color.label);const swatch=el('span',undefined,'target-color-swatch');swatch.style.backgroundColor=color.hex;swatch.append(icon('Check'));label.append(input,swatch,el('span',color.label));$('target-colors').append(label);}decorate($('target-colors'));
 $('sidebar-toggle').onclick=()=>setSidebar($('mission-sidebar').hidden);
 for(const name of ['patrol','video','results'])$('tab-'+name).onclick=()=>setTab(name);
 doc.querySelector('[role=tablist]').onkeydown=e=>{const names=['patrol','video','results'],index=names.findIndex(n=>$('tab-'+n)===doc.activeElement);if(index<0)return;let next;if(e.key==='ArrowRight')next=(index+1)%3;if(e.key==='ArrowLeft')next=(index+2)%3;if(e.key==='Home')next=0;if(e.key==='End')next=2;if(next!==undefined){e.preventDefault();setTab(names[next],{focus:true});}};
 for(const mode of ['semantic','coverage'])$('map-mode-'+mode).onclick=()=>setMode(mode);
 $('edit-selection').onclick=()=>setEditing(!S.editing);$('finish-selection').onclick=()=>setEditing(false);$('edit-prepared').onclick=()=>setEditing(true);
 $('clear-selection').onclick=()=>selection([]);$('initial-region').onchange=()=>selection(initialFirst(S.current.regions,$('initial-region').value));
 $('fit-selection').onclick=fitSelected;
 $('prepare-mission').onclick=async()=>{if(!S.current?.regions.length)return;S.current.prepared=true;S.editing=false;changed();try{await flush();}catch{if(S.current)S.current.prepared=false;}finally{render();}};
 $('new-mission').onclick=()=>openMission(true);$('mission-settings').onclick=()=>openMission(false);
 $('mission-select').onchange=()=>void loadMission($('mission-select').value,{focus:true}).catch(e=>{error(e.message);refreshPicker();});
 $('mission-form').onsubmit=async e=>{e.preventDefault();$('save-mission').disabled=true;try{await saveDialog();}catch(e){$('mission-dialog-error').textContent=e.message;}finally{$('save-mission').disabled=false;}};
 $('cancel-mission').onclick=()=>$('mission-dialog').close();$('mission-dialog').addEventListener('close',()=>dialogOpener?.focus());
 $('place-toggle').onclick=()=>searchOpen($('map-search').hidden);$('place-close').onclick=()=>searchOpen(false);$('open-place-search').onclick=()=>searchOpen(true);

 $('map-retry').onclick=()=>{map?.getSource('basemap')?.setTiles(['recon-map://base/{z}/{x}/{y}.png']);map?.getSource('regions')?.setTiles(['recon-map://regions/{z}/{x}/{y}.pbf']);mapStatus('지도 재연결 중…');};
 $('login-form').onsubmit=async e=>{e.preventDefault();e.submitter.disabled=true;try{await json('/api/v1/auth/login',{login_id:$('login-id').value,password:$('login-password').value});$('login-password').value='';$('login-error').textContent='';await boot();}catch(e){$('login-error').textContent=e.message;}finally{e.submitter.disabled=false;}};
 $('boot-retry').onclick=()=>void boot();
 $('logout').onclick=async()=>{try{await flush();await json('/api/v1/auth/logout',{});authLost();}catch(e){error(e.message);}};
 doc.querySelector('a[data-environment=sim]').onclick=async e=>{if(!S.dirty&&!savePromise)return;e.preventDefault();try{await flush();win.location.assign('/');}catch{setSidebar(true);}};
 win.addEventListener('beforeunload',e=>{if(S.dirty){e.preventDefault();e.returnValue='';}});
 doc.addEventListener('keydown',e=>{if(e.key==='Escape'&&!doc.querySelector('dialog[open]')&&!$('map-search').hidden){e.preventDefault();searchOpen(false);}});
 features=mountRealFeatures({S,$,doc,win,json,changed,flush,selection,error,remember,remembered,decorate,renderWorkspace:render});
 mobile=mountMobileControls({doc,win,decorate,setSidebar:open=>setSidebar(open,{persist:false}),mapAction:()=>S.pickLaunch?{kind:'launch',label:'지도에서 출발지 선택',cancel:()=>$('pick-launch').click(),cancelLabel:'출발지 지정 취소'}:S.editing?{kind:'selection',label:`정찰 구역 ${S.current?.regions.length||0}개`,canFinish:!!S.current?.regions.length,finish:()=>setEditing(false),cancel:()=>setEditing(false),cancelLabel:'구역 편집 종료'}:null});
 recordTools=mountRecordTools({doc,api:(path,body)=>json('/api/v1/local-search/records'+path,body,undefined,45000),icons:decorate,onError:error,
  getCurrent:()=>S.current?{kind:'real-mission',id:S.current.mission_id}:null,onBeforeOpen:flush,
  onChanged:async()=>{S.missions=(await json(API+'/missions')).missions;if(S.current&&!S.missions.some(m=>m.mission_id===S.current.mission_id)){S.dirty=false;S.plan=null;await loadMission('');}else{refreshPicker();render();}}});
 return {boot,S,render,flush,selection,setMode,setSidebar,loadMission,saveDialog,openMission,updateMap,mobile};
}
if(typeof document!=='undefined'&&document.body?.dataset.workspace==='real-map')void createRealMapWorkspace().boot();
