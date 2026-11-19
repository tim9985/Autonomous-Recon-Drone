import {accountStorage} from './school-workspace.mjs';
import {cropWindow} from './local-search.mjs';
import {bindMissionPickerRefresh,renderMissionPicker} from './local-mission-picker.mjs';

import {targetPalette,colorMatch,matchedCandidates} from './local-target-colors.mjs';
export {targetPalette,colorMatch,matchedCandidates};
const palette=new Map(targetPalette.map(c=>[c.id,c]));
export function missionInput(m,s,caseId){
 const ids=[...s.selected],order=[s.initial,...(s.priorityOrder||[]),...ids].filter((id,i,a)=>ids.includes(id)&&a.indexOf(id)===i);
 return {title:m.title,target_colors:m.target_colors||[],region_ids:ids,initial_region_id:ids.length?s.initial:null,priority_order:order,zone_version:s.zoneVersion||m.zone_version||'',case_id:caseId||null};
}

export function createMissionWorkspace({document:d,api,getState,onLoad,onError,locked,getCases,getCaseId,getResults,onPlanInvalidated,openResult,icons=()=>{},onBeginSelection=()=>{},onCreateCase=done=>{done(null);}}){
 const $=id=>d.getElementById(id),win=d.defaultView,store=accountStorage(win.localStorage);
 const node=(tag,text,cls)=>{const n=d.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const icon=name=>{const n=node('span');n.dataset.icon=name;n.setAttribute('aria-hidden','true');return n;};
 let current=null,all=[],ready=false,loading=false,busy=false,saving=null,timer=null,saved='',saveError='',queueKey='',dialogNew=false,dialogColors=[],opener=null,beginAfterCreate=false;
 let dialogSuspended=false;
 let queueOpen=store.getItem('mission-matches-open')==='true',seen=new Set();
 const draftKey=id=>'local-mission-draft:'+id,seenKey=()=>`local-mission-seen:${current?.mission_id}:${getResults()?.source_run_id||getState().control?.source_run_id}`;
 const input=()=>current?missionInput(current,getState(),getCaseId()):null;
 const pretty=e=>/MISSION_CHANGED/.test(e.message)?'다른 창에서 임무가 변경되었습니다. 현재 편집은 이 브라우저에 보관했습니다. 새 임무로 저장하거나 새로고침해 확인하세요.':/MISSION_IN_FLIGHT/.test(e.message)?'정찰이 끝난 뒤 임무를 수정할 수 있습니다.':e.message;
 function readSeen(){try{seen=new Set(JSON.parse(store.getItem(seenKey())||'[]'));}catch{seen=new Set();}}
 const readMissions=async()=>(await api('local-search/missions')).missions;
 const invalidatePicker=bindMissionPickerRefresh($('mission-select'),readMissions,missions=>{
  all=missions;choices();
 },e=>onError(pretty(e)));
 function choices(){invalidatePicker();renderMissionPicker($('mission-select'),all,current);}
 async function refresh(){all=await readMissions();choices();}
 function remember(){if(current){store.setItem('local-mission-id',current.mission_id);if(input()&&JSON.stringify(input())!==saved)store.setItem(draftKey(current.mission_id),JSON.stringify({revision:current.revision,data:input()}));}}
 function changed(){
  if(!ready||loading||!current)return;
  remember();clearTimeout(timer);timer=win.setTimeout(()=>void flush().catch(e=>onError(pretty(e))),450);render();
 }
 async function flush(){
  clearTimeout(timer);if(saving){await saving;if(current&&JSON.stringify(input())!==saved)return flush();return current;}
  if(!current||loading||JSON.stringify(input())===saved)return current;
  if(saveError)throw new Error(saveError);
  const id=current.mission_id;
  saving=(async()=>{
   while(current?.mission_id===id&&JSON.stringify(input())!==saved){
    const data=input(),signature=JSON.stringify(data);remember();
    const next=await api('local-search/missions/'+id,{...data,revision:current.revision});
    if(current?.mission_id!==id)return;
    current={...next,title:current.title,target_colors:current.target_colors};saved=signature;
    const plan=getState().plan;if(plan?.selection?.mission_id===id&&plan.selection.mission_route_revision!==next.route_revision)onPlanInvalidated();
    all=all.map(m=>m.mission_id===id?current:m);store.removeItem(draftKey(id));remember();
   }
  })();render();
  try{await saving;}catch(e){saveError=pretty(e);remember();throw e;}finally{saving=null;render();}
  return current;
 }
 async function select(id,{skipFlush=false}={}){
  if(busy)return;if(locked()&&!skipFlush)throw new Error('현재 작업 완료 후 임무를 전환할 수 있습니다.');busy=true;render();
  let previous=current,previousSaved=saved,transitionStarted=false;
  try{
   if(!skipFlush)await flush();previous=current;previousSaved=saved;loading=true;
   const value=id?await api('local-search/missions/'+id):null;
   transitionStarted=true;
   current=value;saved=value?JSON.stringify(missionInput(value,{selected:value.region_ids,initial:value.initial_region_id,priorityOrder:value.priority_order,zoneVersion:value.zone_version},value.case_id)):'';saveError='';
   await onLoad(value);readSeen();queueKey='';store.setItem('local-mission-id',id||'');choices();
   if(value){
    const local=JSON.parse(store.getItem(draftKey(id))||'null');
    if(local&&local.revision===value.revision){current={...value,...local.data};await onLoad({...current,plan_id:null});}
    else if(local){saveError='다른 창의 변경과 저장하지 못한 편집이 함께 있습니다. 새 임무로 저장해 복구하세요.';current={...value,...local.data};await onLoad({...current,plan_id:null});onError(saveError);}
   }
  }catch(e){
   if(transitionStarted){current=previous;saved=previousSaved;saveError='임무 전환을 완료하지 못했습니다. 새로고침 후 다시 선택하세요.';try{await onLoad(previous);}catch{}store.setItem('local-mission-id',previous?.mission_id||'');}
   throw e;
  }finally{loading=false;busy=false;render();if(!saveError)changed();}
 }
 async function boot(){
  ready=true;await refresh();const s=getState(),activeId=s.control?.job&&!['COMPLETED','FAILED','PARTIAL','CANCELLED','INTERRUPTED','EXPIRED'].includes(s.control.job.state)?s.control.job.search_context?.mission_id:null;
  const id=activeId||store.getItem('local-mission-id');
  if(all.some(m=>m.mission_id===id))await select(id,{skipFlush:true});else{current=null;saved='';render();}
 }
 function render(){
  if(!$('mission-select'))return;
  const lock=locked()||busy;
  $('case-summary-open').hidden=!current?.case_id;
  $('mission-settings').hidden=!current;
  $('case-new').disabled=lock;
  $('mission-select').disabled=lock;$('mission-new').disabled=lock;$('mission-settings').disabled=lock;
  $('mission-save-status').textContent=saveError?'저장 확인 필요':saving?'저장 중…':current?(JSON.stringify(input())===saved?'저장됨':'편집 중'):'새 임무를 만들어 시작하세요';
  $('mission-save-status').dataset.error=String(!!saveError);$('mission-save-status').title=saveError;
  $('mission-retry').hidden=!saveError;$('mission-retry').disabled=lock;
  $('mission-settings').setAttribute('aria-label','임무 설정: 이름, 상의색, 연결 사건');
  $('mission-target-summary').textContent=current?.target_colors.length?'상의 '+current.target_colors.map(c=>palette.get(c)?.label).join(' · '):'상의색 미지정';
  $('mission-target-swatches').replaceChildren(...(current?.target_colors||[]).map(c=>{const n=node('i');n.style.backgroundColor=palette.get(c)?.hex;n.setAttribute('aria-hidden','true');return n;}));
  $('mission-context-lock').hidden=!locked();$('mission-context-lock').textContent=getState().control?.connection?.state==='READY'?'드론 연결됨 · 해제 후 임무 전환':'현재 작업 완료 후 임무 전환';
  renderQueue();
 }
 function renderPalette(){
  $('mission-colors').replaceChildren(...targetPalette.map(c=>{
   const label=node('label',undefined,'target-color'),checkbox=node('input');checkbox.type='checkbox';checkbox.value=c.id;checkbox.checked=dialogColors.includes(c.id);checkbox.setAttribute('aria-label',c.label);
   const swatch=node('span',undefined,'target-color-swatch');swatch.style.backgroundColor=c.hex;swatch.append(icon('Check'));label.append(checkbox,swatch,node('span',c.label));
   checkbox.onchange=()=>{dialogColors=checkbox.checked?[...dialogColors,c.id]:dialogColors.filter(k=>k!==c.id);$('mission-colors-note').textContent=dialogColors.length?`${dialogColors.length}개 선택 · 하나라도 일치하면 표시`:'지정하지 않으면 모든 색을 검색합니다.';};return label;
  }));icons($('mission-colors'));$('mission-colors-note').textContent=dialogColors.length?`${dialogColors.length}개 선택 · 하나라도 일치하면 표시`:'지정하지 않으면 모든 색을 검색합니다.';
 }
 function caseChoices(value){
  const blank=node('option','연결하지 않음');blank.value='';
  $('mission-case').replaceChildren(blank,...getCases().filter(c=>c.status==='ACTIVE'||c.case_id===current?.case_id).map(c=>{const n=node('option',c.title+(c.status==='ACTIVE'?'':' · 종료/보관'));n.value=c.case_id;return n;}));
  $('mission-case').value=value||'';
 }
 async function edit(isNew=false,{begin=false}={}){
  if(locked()||busy)return;beginAfterCreate=begin;opener=d.activeElement;
  try{if(!saveError)await flush();}catch(e){onError(pretty(e));return;}
  dialogNew=isNew||!current;beginAfterCreate=begin||dialogNew;
  $('mission-dialog-title').textContent=dialogNew?'새 정찰 임무':'임무 설정';
  $('mission-title-input').value=dialogNew?'':current.title;
  dialogColors=dialogNew?[]:[...current.target_colors];
  caseChoices(dialogNew?'':current.case_id);dialogSuspended=false;
  $('mission-dialog-error').textContent='';$('mission-submit').textContent=dialogNew?'임무 만들기':'저장';renderPalette();$('mission-dialog').showModal();$('mission-title-input').focus();$('mission-title-input').select();
 }
 async function submit(){
  if(busy)return;if(locked()){$('mission-dialog-error').textContent='현재 작업 완료 후 저장할 수 있습니다.';return;}busy=true;$('mission-submit').disabled=true;
  try{
   const s=getState(),adopt=!current||!!saveError;
   if(!$('mission-title-input').value.trim())throw new Error('임무 이름을 입력하세요.');
   const base=dialogNew&&!adopt?{selected:[],initial:'',priorityOrder:[],zoneVersion:s.zoneVersion}:s;
   const data=missionInput({title:$('mission-title-input').value.trim(),target_colors:dialogColors},base,$('mission-case').value);
   const value=await api('local-search/missions'+(dialogNew?'':'/'+current.mission_id),{...data,...(dialogNew?{}:{revision:current.revision})});
   current=value;saved=JSON.stringify(data);saveError='';store.removeItem(draftKey(value.mission_id));
   loading=true;await onLoad(value,{preserve:!dialogNew});loading=false;await refresh();store.setItem('local-mission-id',value.mission_id);readSeen();queueKey='';$('mission-dialog').close();
   if(beginAfterCreate)onBeginSelection();
  }catch(e){$('mission-dialog-error').textContent=pretty(e);}finally{loading=false;busy=false;$('mission-submit').disabled=false;render();}
 }
 function renderQueue(){
  const data=getResults(),colors=current?.target_colors||[];const host=$('color-match-queue');if(!host)return;host.hidden=!ready||!current||!colors.length;
  if(host.hidden)return;
  const candidates=matchedCandidates(data,colors),unseen=candidates.filter(g=>g.matches.some(m=>!seen.has(m.row.observation_id)));
  $('color-match-count').textContent=String(candidates.length);$('color-match-new').textContent=unseen.length?`새 항목 ${unseen.length}`:'';
  $('color-match-toggle').setAttribute('aria-expanded',String(queueOpen));$('color-match-toggle').setAttribute('aria-label',`${data?.historical===false?'이번 정찰':'이전 분석'}의 상의색 일치 후보 ${candidates.length}개 ${queueOpen?'접기':'펼치기'}`);
  const provenance=$('color-match-toggle').querySelector('.match-provenance');if(provenance)provenance.textContent=data?.historical===false?'이번 정찰':'이전';
  $('color-match-body').hidden=!queueOpen;$('color-match-body').inert=!queueOpen;$('color-match-source').textContent=getResults()?.historical===false?'이번 정찰 · 상의색 일치 후보':'이전 분석 · 이번 비행과 별도';
  for(const b of $('color-match-list').children){const g=candidates.find(g=>g.id===b.dataset.candidateId);if(g)b.dataset.unseen=String(g.matches.some(m=>!seen.has(m.row.observation_id)));}
  const key=JSON.stringify([current.mission_id,colors,candidates.map(g=>[g.id,g.matches.map(m=>[m.row.observation_id,m.match])]),data?.truncated]);
  if(key===queueKey)return;queueKey=key;
  $('color-match-list').replaceChildren(...candidates.map(g=>{
   const b=node('button',undefined,'color-match-card');b.type='button';b.dataset.candidateId=g.id;b.dataset.unseen=String(g.matches.some(m=>!seen.has(m.row.observation_id)));b.setAttribute('aria-haspopup','dialog');b.setAttribute('aria-controls','media-dialog');
   const pic=node('span',undefined,'color-match-crop'),img=node('img');img.src='/api/v1/media-assets/'+encodeURIComponent(g.row.asset_id)+'/content';img.alt='';img.loading='lazy';
   const crop=cropWindow(g.row,1);if(crop){img.style.width=crop.sourceWidth/crop.width*100+'%';img.style.height=crop.sourceHeight/crop.height*100+'%';img.style.left=-crop.x/crop.width*100+'%';img.style.top=-crop.y/crop.height*100+'%';}img.onerror=()=>{img.hidden=true;};pic.append(img);
   const text=node('span',undefined,'color-match-description');text.append(node('strong',`상의 ${palette.get(g.match.color)?.label} · 후보 ${g.display_id||g.id.slice(-6)}`),node('small',`색상 점수 ${Math.round(g.match.p*100)}% · 관측 ${g.matches.length}건`));
   b.append(pic,text,icon('ChevronRight'));b.title='원본 확인 · 동일인 여부는 미확정';
   b.onclick=()=>{for(const m of g.matches)seen.add(m.row.observation_id);store.setItem(seenKey(),JSON.stringify([...seen]));renderQueue();openResult(g.row);};return b;
  }));
  $('color-match-empty').hidden=!!candidates.length;$('color-match-empty').textContent=data?(data.historical?'이전 분석에 일치 후보가 없습니다.':'이번 정찰에서 일치 후보를 기다리고 있습니다.'):'분석 기록을 확인하는 중…';
  $('color-match-note').textContent=data?.truncated?'일부 기록만 표시 중 · 고유 인원 수가 아닙니다.':'후보별로 묶은 관측입니다. 동일인 여부는 확인이 필요합니다.';
  icons(host);
 }
 $('mission-select').onchange=()=>void select($('mission-select').value).catch(e=>{choices();onError(pretty(e));});
 $('mission-new').onclick=()=>void edit(true);$('mission-settings').onclick=()=>void edit(false);
 $('mission-retry').onclick=()=>{saveError='';void flush().catch(e=>onError(pretty(e)));};
 $('mission-form').onsubmit=e=>{e.preventDefault();void submit();};
 for(const id of ['mission-dialog-close','mission-dialog-cancel'])$(id).onclick=()=>$('mission-dialog').close();
 $('mission-dialog').addEventListener('close',()=>{if(!dialogSuspended&&!$('mission-dialog').open&&opener?.isConnected)opener.focus({preventScroll:true});});
 $('case-new').onclick=()=>{
  if(locked()||busy)return;const previous=$('mission-case').value;dialogSuspended=true;$('mission-dialog').close();
  const resume=value=>{if(!ready||!dialogSuspended)return;dialogSuspended=false;caseChoices(value?.case_id||previous);$('mission-dialog').showModal();$('mission-case').focus();};
  if(onCreateCase(resume)===false)resume(null);
 };
 $('mission-colors-clear').onclick=()=>{dialogColors=[];renderPalette();};
 $('color-match-toggle').onclick=()=>{queueOpen=!queueOpen;store.setItem('mission-matches-open',String(queueOpen));renderQueue();};
 d.addEventListener('keydown',e=>{if(e.key==='Escape'&&queueOpen&&!$('color-match-queue').hidden&&!d.querySelector('dialog[open]')){e.preventDefault();e.stopPropagation();queueOpen=false;store.setItem('mission-matches-open','false');renderQueue();$('color-match-toggle').focus({preventScroll:true});}},true);
 win.addEventListener('beforeunload',e=>{if(current&&JSON.stringify(input())!==saved){remember();e.preventDefault();e.returnValue='';}});
 async function refreshRecords(){
  await refresh();if(!current)return;
  const id=current.mission_id,next=all.find(m=>m.mission_id===id);
  if(next?.revision===current.revision)return;
  if(!next)store.removeItem(draftKey(id));
  await select(next?id:'',{skipFlush:true});
 }
 return {boot,render,changed,flush,edit,refreshRecords,get current(){return current;},get loading(){return loading;},
  planContext:()=>current?{mission_id:current.mission_id,mission_route_revision:current.route_revision}:{},
  planAttached:p=>{if(current&&p.selection?.mission_id===current.mission_id){current.plan_id=p.plan_id;current.plan_ids=[...new Set([...current.plan_ids,p.plan_id])];}},
  logout:()=>{ready=false;dialogSuspended=false;current=null;all=[];choices();clearTimeout(timer);$('mission-dialog').close();$('color-match-queue').hidden=true;},
  routeChanged:()=>{onPlanInvalidated();changed();}
 };
}
