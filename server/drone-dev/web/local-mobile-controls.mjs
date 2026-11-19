import {mountMobileMission} from './local-mobile-mission.mjs';
/** Mobile presentation only. Reuses the original controls and never owns map/flight state. */
export function mountMobileControls({doc=document,win=window,decorate=()=>{},setSidebar,flightActive=()=>false,mapAction=()=>null}={}){
 const $=id=>doc.getElementById(id),sidebar=$('mission-sidebar'),split=$('split'),drone=$('drone-status-card'),search=$('map-search');
 const media=win.matchMedia?.('(max-width:1023px)')||{matches:false};
 const real=doc.body.dataset.workspace==='real-map',labels={mission:'임무 정보 · 영상 · 결과',drone:'드론 상태',layers:'지도 설정',search:'장소 검색'};
 let mobile=false,current=null,changing=false,desktopSidebar=true,desktopDetail=false,actionKind='',disposed=false,refreshFrame=0;
 const moved=[],details=[];
 const node=(tag,cls,text)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
 const icon=name=>{const n=node('i');n.dataset.icon=name;n.setAttribute('aria-hidden','true');return n;};
 const button=(name,glyph)=>{const b=node('button','mobile-icon');b.type='button';b.setAttribute('aria-label',name);b.title=name;b.append(icon(glyph));return b;};
 const text=(n,value)=>{if(n&&n.textContent!==value)n.textContent=value;};
 const attr=(n,key,value)=>{if(n&&n.getAttribute(key)!==String(value))n.setAttribute(key,String(value));};
 const dock=node('nav','mobile-dock');dock.setAttribute('aria-label','지도 도구');
 const triggers={};
 for(const [name,glyph] of [['drone','Drone'],['search','Search'],['layers','Stack2'],['mission','ClipboardList']]){
  const b=button(labels[name],glyph);b.id='mobile-'+name;b.setAttribute('aria-controls',name==='mission'?'mission-sidebar':'mobile-detail');b.setAttribute('aria-expanded','false');
  b.onclick=()=>name==='mission'&&current!=='mission'?mission.open():show(current===name?null:name,{focus:true});triggers[name]=b;
  dock.append(b);
 }
 const shade=node('div','mobile-dismiss');shade.hidden=true;shade.setAttribute('aria-hidden','true');shade.onclick=()=>show(null,{focus:true});
 const panel=node('section','mobile-detail');panel.id='mobile-detail';panel.setAttribute('role','region');panel.setAttribute('aria-labelledby','mobile-detail-title');panel.setAttribute('aria-hidden','true');panel.inert=true;
 const heading=node('header','mobile-sheet-heading'),title=node('h2',null,'');title.id='mobile-detail-title';
 const close=button('상세 닫기','X');close.onclick=()=>show(null,{focus:true});heading.append(title,close);panel.append(heading);
 const slots={};for(const name of ['drone','layers','search']){slots[name]=node('div','mobile-detail-content');slots[name].dataset.content=name;slots[name].hidden=true;panel.append(slots[name]);}
 const mobileLink=real?null:node('span','mobile-connection-state');if(mobileLink)slots.drone.append(mobileLink);
 if(real)slots.layers.append(node('p','mobile-map-credit','VWorld · 구미시 공간자료\n지도와 주제도는 참고용입니다.'));
 const missionHead=node('header','mobile-sheet-heading'),missionClose=button('임무 상세 닫기','X');missionHead.append(node('h2',null,'임무 상세'),missionClose);missionClose.onclick=()=>show(null,{focus:true});sidebar.prepend(missionHead);
 const mission=mountMobileMission({doc,win,sidebar,head:missionHead,closeButton:missionClose,decorate,closeSheet:()=>show(null,{focus:true}),openSheet:(name='mission')=>show(name,{focus:true}),mapAction});
 const modes=node('div','mobile-map-modes');modes.setAttribute('aria-label','지도 레이어');
 split.append(shade,panel,dock,modes);decorate(split);
 // Icons replace only the compact header copy; desktop text remains intact.
 for(const [el,glyph,label] of [[real?$('logout'):doc.querySelector('#app-menu>summary'),real?'Logout':'Dots','계정 메뉴']]){
  if(!el)continue;const copy=node('span','mobile-header-copy');while(el.firstChild)copy.append(el.firstChild);el.append(copy,icon(glyph));el.lastChild.className='mobile-header-icon';if(!el.hasAttribute('aria-label'))el.setAttribute('aria-label',real?'로그아웃':label);decorate(el);
 }
 function transfer(el,to){if(!el)return;const anchor=doc.createComment('mobile presentation anchor');el.before(anchor);moved.push({el,anchor});to.append(el);}
 function openSearch(open){if(!search||search.hidden===!open)return;$(open?'place-toggle':'place-close')?.click();}
 function paint(){
  doc.body.dataset.mobilePanel=current||'none';
  dock.inert=current==='mission';
  for(const [name,b] of Object.entries(triggers))attr(b,'aria-expanded',name===current);
  const detailsOpen=current&&current!=='mission';panel.dataset.open=String(!!detailsOpen);panel.inert=!detailsOpen;attr(panel,'aria-hidden',!detailsOpen);
  shade.hidden=!current;
  if(detailsOpen){text(title,labels[current]);for(const [name,slot] of Object.entries(slots))slot.hidden=name!==current;}
 }
 function show(name,{focus=false}={}){
  if(!mobile||disposed)return;const previous=current,ownedFocus=sidebar.contains(doc.activeElement)||panel.contains(doc.activeElement);changing=true;current=name;paint();
  try{
   if((!sidebar.hidden)!==(name==='mission'))setSidebar(name==='mission');
   openSearch(name==='search');
   if(name==='drone'&&$('drone-status-detail')?.hidden)$('drone-status-toggle')?.click();
   if(name==='layers')for(const d of details)d.el.open=true;
   if(name&&$('color-match-body')&&!$('color-match-body').hidden)$('color-match-toggle')?.click();
  }finally{changing=false;}
  refresh();
  if(name==='mission')mission.flush();
  if(focus||(!name&&ownedFocus)){const target=name==='mission'?(sidebar.querySelector('[role=tab][aria-selected=true]')||missionClose):name==='search'?$('place-query'):name?close:triggers[previous||'mission'];target?.focus({preventScroll:true});}
 }
 function refresh(){
  if(!mobile||disposed)return;
  mission.refresh();
  const link=drone?.dataset.link||'waiting',state=drone?.querySelector('.drone-link-state')?.textContent.trim()||'수신 대기';
  attr(triggers.drone,'data-link',link);attr(triggers.drone,'aria-label','드론 상태 · '+state);triggers.drone.title='드론 상태 · '+state;
  text(mobileLink,state);attr(mobileLink,'data-link',link);
  attr(triggers.mission,'data-alert',!!(($('error')&&!$('error').hidden)||($('prep-error')&&!$('prep-error').hidden)));
  attr(triggers.layers,'data-alert',!!doc.querySelector('#engine-status[data-error=true]')||($('map-retry')&&!$('map-retry').hidden));
  attr($('color-match-queue'),'data-mobile-empty',$('color-match-count')?.textContent.trim()==='0'&&$('color-match-toggle')?.getAttribute('aria-expanded')!=='true');
  const a=mapAction();
  const kind=a?.kind||'',previous=actionKind;actionKind=kind;
  if(!changing&&kind!==previous&&kind&&!mission.keepSelectionOpen)show(null);
 }
 function restoreDesktop(){
  changing=true;current=null;openSearch(false);mobile=false;delete doc.body.dataset.mobileUi;delete doc.body.dataset.mobilePanel;
  mission.leave();
  for(const {el,anchor} of moved.splice(0)){anchor.replaceWith(el);}for(const d of details.splice(0))d.el.open=d.open;
  if($('drone-status-toggle')&&($('drone-status-toggle').getAttribute('aria-expanded')==='true')!==desktopDetail)$('drone-status-toggle').click();
  panel.inert=true;attr(panel,'aria-hidden',true);shade.hidden=true;setSidebar(desktopSidebar);changing=false;
 }
 function changeViewport(){
  if(disposed||mobile===media.matches)return;
  if(media.matches){
   desktopSidebar=!sidebar.hidden;desktopDetail=$('drone-status-toggle')?.getAttribute('aria-expanded')==='true';mobile=true;doc.body.dataset.mobileUi='true';
   transfer($('save-status')||$('mission-save-status'),missionHead);missionHead.append(missionClose);
   mission.enter();
   transfer(drone,slots.drone);
   transfer(doc.querySelector('.map-modes'),modes);
   for(const selector of real?['.real-engine-switch','.real-tool-row','.real-map-notice']:['.map-mode-control','.map-view-actions','.map-footnote'])transfer(doc.querySelector(selector),slots.layers);
   if(real)slots.layers.append(slots.layers.querySelector('.mobile-map-credit'));
   transfer(search,slots.search);
   for(const el of slots.layers.querySelectorAll('details')){details.push({el,open:el.open});el.open=true;}
   show(null);refresh();mission.flush();
  }else restoreDesktop();
 }
 const observer=typeof win.MutationObserver==='function'?new win.MutationObserver(records=>{
  if(!mobile||changing)return;
  for(const r of records){if(r.target===sidebar&&r.attributeName==='hidden'){if(!sidebar.hidden&&current!=='mission')show('mission');else if(sidebar.hidden&&current==='mission')show(null);}
   if(r.target===search&&r.attributeName==='hidden'){if(!search.hidden&&current!=='search')show('search');else if(search.hidden&&current==='search')show(null);}}
  if(!refreshFrame)refreshFrame=win.requestAnimationFrame(()=>{refreshFrame=0;refresh();});
 }):null;
 observer?.observe(sidebar,{attributes:true,attributeFilter:['hidden']});if(search)observer?.observe(search,{attributes:true,attributeFilter:['hidden']});
 if(drone)observer?.observe(drone,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['data-link','disabled','hidden']});
 for(const id of ['error','prep-error','engine-status','map-retry','mission-controls','region-list','selected-zones','edit-selection','pick-launch','finish-selection','mission-select','plan-summary','plan-summary-title','plan-progress','launch-label','connection-panel','mission-target-summary','target-summary','start-flight','departure-lock-reason','color-match-count','color-match-toggle'])if($(id))observer?.observe($(id),{attributes:true,childList:true,subtree:['selected-zones','mission-select'].includes(id),attributeFilter:['hidden','data-error','data-editing','data-stage','data-state','aria-pressed','aria-expanded','disabled']});
 const escape=e=>{if(!mobile||!current||e.key!=='Escape'||doc.querySelector('dialog[open]'))return;e.preventDefault();e.stopImmediatePropagation();if(current==='mission'&&mission.back())return;show(null,{focus:true});};
 const candidate=e=>{if(!mobile||!e.target.closest?.('#color-match-toggle'))return;if($('color-match-body')?.hidden)show(null);};
 doc.addEventListener('keydown',escape,true);doc.addEventListener('click',candidate,true);media.addEventListener?.('change',changeViewport);changeViewport();
 return{show,refresh,mission,get isMobile(){return mobile;},get panel(){return current;},destroy(){if(mobile)restoreDesktop();disposed=true;if(refreshFrame)win.cancelAnimationFrame(refreshFrame);mission.destroy();observer?.disconnect();media.removeEventListener?.('change',changeViewport);doc.removeEventListener('keydown',escape,true);doc.removeEventListener('click',candidate,true);for(const n of [dock,panel,shade,missionHead,modes])n.remove();}};
}
