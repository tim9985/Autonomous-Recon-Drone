/** Mobile projection of the existing mission controls. Never authorizes a flight. */
export function mobileMissionState(doc, real=false) {
 const $=id=>doc.getElementById(id), text=id=>$(id)?.textContent.trim()||'', visible=id=>!!$(id)&&!$(id).hidden;
 const rows=$(real?'region-list':'selected-zones'),count=rows?.children.length||0,first=rows?.querySelector('strong')?.textContent.trim()||'';
 const mission=!!$('mission-select')?.value;
 const working=real?visible('cancel-plan'):$('mission-controls')?.dataset.stage==='planning';
 const route=real?visible('plan-summary'):visible('plan-panel');
 const ready=real?$('plan-summary')?.dataset.state==='READY'&&$('plan-summary')?.dataset.stale!=='true'&&visible('start-flight'):$('mission-controls')?.dataset.stage==='review';
 const stage=real?(working?'planning':ready?'review':route?'failed':'selection'):$('mission-controls')?.dataset.stage||'selection';
 const linked=!real&&$('connection-panel')?.dataset.state==='ready';
 const action=(id,label)=>({id,label,disabled:!$(id)||$(id).disabled});
 let primary;
 const landed=$('mission-controls')?.dataset.landed==='true',outcome=$('mission-controls')?.dataset.outcome||'';
 if(stage==='active'&&landed)primary={id:'map-stop-flight',label:'영상 저장 중',disabled:true};
 else if(stage==='active')primary=action('map-stop-flight',$('map-stop-flight')?.dataset.action==='resume'?'재개':'일시중지');
 else if(stage==='complete')primary=visible('review-capture')?action('review-capture','정찰 기록 확인'):action('tab-analysis','영상 확인');
 else if(!mission)primary=action(real?'new-mission':'edit-regions','새 임무 만들기');
 else if(!count)primary=action(real?'edit-selection':'edit-regions','지도에서 구역 선택');
 else if(real&&!text('launch-label').includes('변경'))primary=action('pick-launch','지도에서 출발지 지정');
 else if(working)primary={...action(real?'prepare-mission':'plan-route','경로 계산 중'),disabled:true};
 else if(ready&&real)primary=action('start-flight','실기체 연결 필요');
 else if(ready&&!linked)primary=action('review-drone-connection','드론 연결');
 else if(ready)primary=action('start-flight','임무 시작');
 else primary=action(real?'prepare-mission':'plan-route',stage==='failed'?'경로 다시 계산':'경로 계산');
 const issue=['error','prep-error','mission-context-lock','planning-availability','case-notice-text'].find(id=>visible(id)&&(!$(id).parentElement.hidden)&&text(id));
 const save=$(real?'save-status':'mission-save-status');
 const gate=ready&&!real&&linked&&$('start-flight')?.disabled?text('departure-lock-reason'):ready&&real?'실지도에서는 수색 준비만 가능합니다':working?'완성된 경로부터 지도에 표시합니다':'';
 return {mission,count,first,working,route,ready,stage,linked,primary,landed,outcome,coverageLabel:$('hud-coverage')?.dataset.scope||'현재 구역 관측률',
  colors:text(real?'target-summary':'mission-target-summary'),
  launch:real&&text('launch-label').includes('변경'),
  planTitle:text(real?'plan-summary-title':'plan-summary'),
  planDetail:real?text('plan-summary-detail'):[text('route-distance'),text('route-first-time')].filter(v=>v&&v!=='—'&&v!=='미산정').join(' · '),
  following:text('itinerary-count'),issue:issue?text(issue):save?.dataset.error==='true'?save.title||save.textContent:'',gate,
  current:text('current-zone-name'),coverage:text('hud-coverage'),completed:text('hud-regions'),elapsed:text('hud-elapsed'),phase:text('hud-phase'),
  edit:action(real?'edit-selection':'edit-regions','지도에서 구역 편집'),
 };
}

/** Fixed top guidance. All commands still pass through the original controls. */
export function mountMobileMission({doc,win,sidebar,head,closeButton,decorate,closeSheet,openSheet,mapAction=()=>null}) {
 const $=id=>doc.getElementById(id),real=doc.body.dataset.workspace==='real-map';
 const create=(tag,cls,value)=>{const e=doc.createElement(tag);if(cls)e.className=cls;if(value)e.textContent=value;return e;};
 const glyph=name=>{const e=create('i');e.dataset.icon=name;e.setAttribute('aria-hidden','true');return e;};
 const text=(e,value)=>{if(e.textContent!==value)e.textContent=value;};
 const attr=(e,key,value)=>{if(e.getAttribute(key)!==String(value))e.setAttribute(key,String(value));};
 const hide=(e,value)=>{if(e.hidden!==value)e.hidden=value;};
 const button=(label,icon,cls='')=>{const e=create('button',cls);e.type='button';e.setAttribute('aria-label',label);e.title=label;if(icon)e.append(glyph(icon));return e;};
 const symbol=(e,name)=>{if(e.firstChild?.dataset.icon!==name){e.firstChild.dataset.icon=name;decorate(e);}};
 const nav=sidebar.querySelector('.sidebar-nav'),picker=sidebar.querySelector('.mission-picker'),settings=$('mission-settings'),appbar=doc.querySelector('.appbar');
 let mobile=false,view='overview',frame=0,lastMission='',lastStage='',reviewed=false,lastReady=false;
 const anchors=[];
 const viewScroll=new Map();
 const guide=create('section','mobile-mission-guide');guide.setAttribute('aria-label','수색 임무 진행');
 const steps=create('ol','mobile-mission-steps');steps.setAttribute('aria-label','임무 준비 단계');
 const stepButtons=[];
 for(const [i,name] of ['구역','경로','연결·출발'].entries()){
  const li=create('li'),b=button(name,null);b.append(create('span','mobile-step-number',String(i+1)),create('b',null,name));li.append(b);steps.append(li);stepButtons.push(b);
 }
 const guidance=create('div','mobile-mission-guidance'),status=create('div','mobile-mission-state'),statusTitle=create('strong'),statusNote=create('span');
 status.append(statusTitle,statusNote);
 const order=button('구역 방문 순서','ClipboardList','mobile-mission-order');order.append(create('span',null,'순서'));
 const primary=button('다음','ArrowRight','mobile-mission-primary'),primaryText=create('span');primary.append(primaryText);
 guidance.append(status,order,primary);
 const notice=create('button','mobile-mission-notice');notice.type='button';notice.setAttribute('aria-label','안내 상세 보기');notice.setAttribute('role','status');
 guide.append(steps,guidance,notice);$('split').prepend(guide);
 const environment=create('details','mobile-environment'),environmentToggle=create('summary',null,real?'실지도':'로컬 SIM');environmentToggle.setAttribute('aria-label','관제 환경 선택');environment.append(environmentToggle);
 const tools=create('div','mobile-mission-tools'),newMission=button('새 임무','Plus','mobile-mission-new');newMission.append(create('span',null,'새 임무'));tools.append(newMission);
 const overview=create('section','mobile-mission-overview');overview.setAttribute('aria-label','임무 상세');
 const row=(icon,label)=>{const b=button(label,icon,'mobile-mission-row'),copy=create('span','mobile-mission-row-copy'),title=create('strong'),detail=create('small');copy.append(title,detail);b.append(copy,glyph('ChevronRight'));return{b,title,detail};};
 const regions=row('Map','구역 방문 순서'),route=row('Route','경로 상세'),flight=row('Drone','비행 상세'),launch=row('MapPin','출발지 지정');
 const metrics=create('dl','mobile-mission-metrics'),metricNodes={};
 for(const [id,label] of [['coverage','관측률'],['completed','완료 구역'],['elapsed','경과']]){const group=create('div'),value=create('dd',null,'—');group.append(create('dt',null,label),value);metrics.append(group);metricNodes[id]=value;}
 const detailNotice=create('p','mobile-mission-detail-notice');detailNotice.setAttribute('role','status');
 const retry=button('임무 저장 재시도','Refresh','mobile-mission-retry');retry.append(create('span',null,'저장 재시도'));
 overview.append(regions.b,launch.b,route.b,flight.b,metrics,detailNotice,retry);
 const pageHead=create('header','mobile-mission-pagehead'),back=button('임무 상세로','ArrowLeft','mobile-icon'),pageTitle=create('h2'),edit=button('지도에서 구역 편집','Edit','mobile-icon');
 const cancelEdit=button('선택 취소',null,'mobile-mission-cancel');cancelEdit.textContent='선택 취소';
 pageHead.append(back,pageTitle,edit,cancelEdit);sidebar.append(pageHead,overview,tools);
 function transfer(e,to){if(!e)return;const anchor=doc.createComment('mobile mission anchor');e.before(anchor);anchors.push({e,anchor});to.append(e);}
 function invoke(id,map=false){
  const original=$(id);if(!original||original.disabled||original.inert)return false;
  original.click();if(map)closeSheet();schedule();return true;
 }
 function patrol(){const b=$(real?'tab-patrol':'tab-flight');if(b&&b.getAttribute('aria-selected')!=='true'&&!b.disabled)b.click();}
 function selectedTab(){return nav?.querySelector('[aria-selected=true]')?.id;}
 function tabView(){const tab=selectedTab();return ['tab-video','tab-analysis'].includes(tab)?'video':['tab-results','tab-review'].includes(tab)?'results':'overview';}
 function setView(next,{focus=false}={}){
  if(!mobile)return;
  const scroll=sidebar.querySelector('.sidebar-scroll'),outgoing=view==='overview'?overview:scroll;
  const changed=view!==next;
  if(changed&&outgoing)viewScroll.set(view,outgoing.scrollTop);
  view=next;attr(sidebar,'data-mobile-view',view);
  hide(overview,view!=='overview');hide(tools,view!=='overview');hide(pageHead,['overview','video','results'].includes(view));
  text(pageTitle,({regions:'구역 방문 순서',route:'예상 경로',flight:'비행 상세'})[view]||'');
  hide(edit,!['regions','route'].includes(view));edit.disabled=mobileMissionState(doc,real).edit.disabled;
  const incoming=view==='overview'?overview:scroll;if(changed&&incoming)incoming.scrollTop=viewScroll.get(view)||0;
  schedule();if(focus)(view==='overview'?regions.b:back).focus({preventScroll:true});
 }
 function open(next=view){
  if(!['video','results'].includes(next))patrol();
  setView(next);openSheet?.();flush();
 }
 function editMap(){
  const s=mobileMissionState(doc,real);
  if(s.edit.disabled||s.working||s.stage==='active')return;
  reviewed=false;patrol();
  if(mapAction()?.kind!=='selection')invoke(s.edit.id,true);else closeSheet();
  schedule();
 }
 function nextAction(s,a){
  if(a?.kind==='selection')return{label:'선택 완료',kind:'selection',disabled:a.canFinish===false,icon:'ArrowRight'};
  if(a?.kind==='launch')return{label:'지도에 지정',kind:'launch',disabled:true,icon:'MapPin'};
  if(s.ready&&!reviewed)return{label:'경로 확인',kind:'review',disabled:false,icon:'Check'};
  const id=s.primary.id;
  return{...s.primary,kind:'command',label:({'지도에서 구역 선택':'구역 선택','지도에서 출발지 지정':'출발지 지정','실기체 연결 필요':'실기체 미연결','새 임무 만들기':'임무 만들기','경로 다시 계산':'다시 계산','경로 계산 중':'계산 중'})[s.primary.label]||s.primary.label,
   icon:s.stage==='active'?(s.landed?'Loader':$('map-stop-flight')?.dataset.action==='resume'?'PlayerPlay':'PlayerPause'):s.ready?(s.linked?'PlayerPlay':'PlugConnected'):s.working?'Loader':id==='pick-launch'?'MapPin':'ArrowRight'};
 }
 function refresh(){
  if(!mobile)return;
  const s=mobileMissionState(doc,real),a=mapAction(),id=$('mission-select')?.value||'';
  if(id!==lastMission){viewScroll.clear();lastMission=id;reviewed=false;setView(tabView());}
  if(s.stage!==lastStage){if(['active','complete'].includes(s.stage)&&!['video','results'].includes(view))setView(sidebar.hidden?'overview':'flight');lastStage=s.stage;}
  if(!s.ready||a)reviewed=false;
  if(s.ready&&!lastReady)reviewed=false;lastReady=s.ready;
  const flying=['active','complete'].includes(s.stage);
  const step=flying?2:a||!s.count||real&&!s.launch?0:s.ready&&reviewed?2:1;
  attr(guide,'data-step',step);attr(guide,'data-stage',s.stage);attr(guide,'data-editing',a?.kind||'none');
  for(const [i,b] of stepButtons.entries()){
   attr(b.parentElement,'data-state',i<step?'done':i===step?'current':'next');
   if(i===step)attr(b,'aria-current','step');else b.removeAttribute('aria-current');
   b.disabled=i===0?(s.edit.disabled||s.working||s.stage==='active'):i===1?(!s.count||a?.kind==='launch'||flying):!s.ready||!!a||flying;
  }
  let title,detail;
  if(s.stage==='active'){title=s.landed?'착륙 완료 · 영상 저장 중':s.phase||'정찰 중';detail=s.landed?'비행을 마쳤습니다. 저장 진행을 확인하세요.':[s.current,s.coverage&&'관측 '+s.coverage].filter(Boolean).join(' · ');}
  else if(s.stage==='complete'){title=s.outcome==='PARTIAL'?'부분 완료 · 복귀 완료':s.outcome==='COMPLETED'?'정찰 완료':s.outcome==='CANCELLED'?'정찰 중단':s.outcome?'정찰 종료 · 확인 필요':'정찰 종료';detail=[s.completed&&s.completed!=='—'&&s.completed+'구역 완료',s.elapsed].filter(Boolean).join(' · ');}
  else if(!s.mission){title='수색 임무를 만드세요';detail='구역과 경로가 임무에 저장됩니다';}
  else if(a?.kind==='launch'){title='지도에서 출발지를 지정하세요';detail='드론이 출발할 위치를 누르세요';}
  else if(a?.kind==='selection'||!s.count){title='지도에서 구역을 선택하세요';detail=s.count?s.count+'개 선택 · 시작 '+s.first:'구역을 누르면 추가·해제됩니다';}
  else if(real&&!s.launch){title='출발지를 지정하세요';detail=s.count+'개 구역 선택됨';}
  else if(s.working){title='첫 구역 경로를 계산합니다';detail=s.following||'완성된 경로부터 지도에 표시됩니다';}
  else if(s.ready&&!reviewed){title='예상 경로를 확인하세요';detail=s.following||s.planDetail||'첫 구역 출발 준비 완료';}
  else if(s.ready){title=s.linked?'출발 준비가 됐습니다':'드론을 연결하세요';detail=real?'실지도 수색 준비 완료':s.linked?'임무 시작을 누르면 출발합니다':'연결과 출발 조건을 확인합니다';}
  else if(s.stage==='failed'){title='경로를 다시 확인하세요';detail='상세에서 원인을 확인할 수 있습니다';}
  else{title='예상 경로를 만드세요';detail=s.count+'개 구역 · 시작 '+s.first;}
  text(statusTitle,title);text(statusNote,detail);statusNote.title=detail;
  const next=nextAction(s,a);primary.disabled=next.disabled;attr(primary,'data-command',next.id||next.kind);text(primaryText,next.label);attr(primary,'aria-label',next.label);symbol(primary,next.icon);attr(primary,'aria-busy',s.working);
  const secondary=s.stage==='active'&&!s.landed?['출발지 복귀','Home','복귀']:a?.kind==='launch'?['출발지 지정 취소','X','취소']:step===0?['구역 방문 순서','ClipboardList','순서']:step===1?['경로 상세','Route','상세']:['드론 연결 상세','Drone','상태'];
  attr(order,'aria-label',secondary[0]);order.title=secondary[0];symbol(order,secondary[1]);text(order.lastChild,secondary[2]);
  order.disabled=s.stage==='active'&&!s.landed?!!$('map-return-flight')?.disabled:a?.kind==='launch'?a.canCancel===false:step===0?!s.count:false;
  const message=s.issue||s.gate;hide(notice,!message||s.working&&!s.issue);text(notice,message);attr(notice,'data-error',!!s.issue);notice.title=message;
  // The persistent guide updates at most once per frame. Closed details do no work.
  if(sidebar.hidden)return;
  text(regions.title,s.count+'개 수색 구역');text(regions.detail,s.count?'시작 · '+s.first:'지도에서 선택');regions.b.disabled=!s.count;
  hide(launch.b,!real||!s.count);text(launch.title,s.launch?'출발지 변경':'출발지 지정');text(launch.detail,s.launch?'지도에서 위치 다시 지정':'계산 전에 위치 지정');launch.b.disabled=$('pick-launch')?.disabled??true;
  hide(route.b,!s.route&&!s.working);text(route.title,s.planTitle||'경로 계산');text(route.detail,[s.planDetail,s.following].filter(Boolean).join(' · '));
  hide(flight.b,!flying);text(flight.title,s.stage==='active'?'정찰 진행':'정찰 기록');text(flight.detail,s.current||'관측과 비행 상태');
  hide(metrics,!flying);for(const [key,n]of Object.entries(metricNodes))text(n,s[key]||'—');
  text(metricNodes.coverage.previousElementSibling,s.coverageLabel);
  text(detailNotice,message);hide(detailNotice,!message);
  retry.disabled=$('mission-retry')?.disabled??true;hide(retry,!$('mission-retry')||$('mission-retry').hidden);
  newMission.disabled=$(real?'new-mission':'mission-new')?.disabled??true;
  edit.disabled=s.edit.disabled||s.working||s.stage==='active';
  hide(cancelEdit,view!=='regions'||a?.kind!=='selection'||!a.cancel);
  cancelEdit.disabled=a?.canCancel===false;
  const cancelLabel=a?.cancelLabel||'선택 취소';text(cancelEdit,cancelLabel==='구역 편집 종료'?'편집 종료':cancelLabel);attr(cancelEdit,'aria-label',cancelLabel);
 }
 function schedule(){if(!mobile||frame)return;frame=win.requestAnimationFrame(()=>{frame=0;refresh();});}
 function flush(){if(frame)win.cancelAnimationFrame(frame);frame=0;refresh();}
 primary.onclick=()=>{
  const displayed=primary.dataset.command;
  flush();
  const s=mobileMissionState(doc,real),a=mapAction(),next=nextAction(s,a);
  if(next.disabled||displayed!==(next.id||next.kind))return;
  if(next.kind==='selection'){a.finish?.();closeSheet();schedule();return;}
  if(next.kind==='review'){reviewed=true;closeSheet();flush();primary.focus({preventScroll:true});return;}
  invoke(next.id,['edit-selection','edit-regions','pick-launch'].includes(next.id));
 };
 order.onclick=()=>{
  const s=mobileMissionState(doc,real),a=mapAction(),step=Number(guide.dataset.step);
  if(s.stage==='active'&&!s.landed)invoke('map-return-flight');
  else if(a?.kind==='launch')a.cancel?.();
  else if(step===0)open('regions');
  else if(step===1)open('route');
  else openSheet?.('drone');
 };
 stepButtons[0].onclick=editMap;
 stepButtons[1].onclick=()=>{
  const a=mapAction();if(a?.kind==='selection'){if(a.canFinish===false)return;a.finish?.();}
  reviewed=false;
  const s=mobileMissionState(doc,real);if(s.route||s.working)open('route');else{closeSheet();schedule();}
 };
 stepButtons[2].onclick=()=>{const s=mobileMissionState(doc,real);if(!s.ready||mapAction())return;reviewed=true;closeSheet();flush();primary.focus({preventScroll:true});};
 regions.b.onclick=()=>open('regions');route.b.onclick=()=>open('route');flight.b.onclick=()=>open('flight');launch.b.onclick=()=>invoke('pick-launch',true);
 back.onclick=()=>setView('overview',{focus:true});edit.onclick=editMap;notice.onclick=()=>open('overview');
 retry.onclick=()=>invoke('mission-retry');newMission.onclick=()=>{invoke(real?'new-mission':'mission-new');};
 cancelEdit.onclick=()=>{const a=mapAction();if(a?.kind!=='selection'||a.canCancel===false)return;a.cancel?.();closeSheet();schedule();};
 const click=e=>{if(!mobile)return;if(e.target.closest?.('.sidebar-nav'))setView(tabView());};
 const change=e=>{if(e.target.id==='mission-select'){reviewed=false;closeSheet();setView('overview');schedule();}};
 const syncTab=()=>{if(mobile)setView(tabView());};
 sidebar.addEventListener('school-tab-change',syncTab);sidebar.addEventListener('click',click);doc.addEventListener('change',change);
 return{
  enter(){
   mobile=true;
   transfer(picker,appbar);transfer(settings,appbar);
   const env=doc.querySelector('.environment-switch');transfer(env,environment);appbar.insertBefore(environment,settings||null);
   transfer($('app-actions'),tools);transfer(nav,sidebar);
   const scroll=sidebar.querySelector('.sidebar-scroll');for(const e of[nav,pageHead,overview,tools])sidebar.insertBefore(e,scroll);
   if(settings&&!settings.hasAttribute('aria-label'))settings.setAttribute('aria-label','임무 설정 · 이름과 상의색');
   setView(tabView());schedule();
  },
  leave(){
   mobile=false;if(frame)win.cancelAnimationFrame(frame);frame=0;environment.open=false;
   for(const {e,anchor}of anchors.splice(0))anchor.replaceWith(e);environment.remove();delete sidebar.dataset.mobileView;
  },
  open,refresh:schedule,flush,
  back(){if(!['regions','route','flight'].includes(view))return false;setView('overview',{focus:true});return true;},
  get view(){return view;},get keepSelectionOpen(){return view==='regions'&&!sidebar.hidden;},
  destroy(){this.leave();sidebar.removeEventListener('school-tab-change',syncTab);sidebar.removeEventListener('click',click);doc.removeEventListener('change',change);for(const n of[guide,pageHead,overview,tools])n.remove();},
 };
}
