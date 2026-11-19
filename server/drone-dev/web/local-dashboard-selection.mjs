// Same rule as the original directMapSelection.ts: select whole source zones
// by their representative point. Never clip, union or use the point as a waypoint.
export function inRectangle(features, a, b, project) {
  const left=Math.min(a.x,b.x), right=Math.max(a.x,b.x);
  const top=Math.min(a.y,b.y), bottom=Math.max(a.y,b.y);
  return features.filter(f=>{
    const p=f.properties?.representativePoint;
    if(!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite))return false;
    const q=project(p);
    return Number.isFinite(q.x)&&Number.isFinite(q.y)&&q.x>=left&&q.x<=right&&q.y>=top&&q.y<=bottom;
  }).map(f=>f.properties.zoneId);
}
export function selectionFeatures(features, ids) {
  const chosen=new Set(ids);
  return features.filter(f=>chosen.has(f.properties.zoneId));
}
export function createZonePicker({map, features, getSelected, onPreview, onConfirm, onEditing}) {
  const $=id=>document.getElementById(id), surface=$('zone-drag'), rect=$('zone-rectangle');
  let editing=false, selected=[], history=[], anchor=null, cursor={x:100,y:100}, before=[], pointers=new Map(), gesture=null;
  function draw(a,b){rect.hidden=!a;if(a){Object.assign(rect.style,{left:Math.min(a.x,b.x)+'px',top:Math.min(a.y,b.y)+'px',width:Math.abs(a.x-b.x)+'px',height:Math.abs(a.y-b.y)+'px'});}}
  function publish(){onPreview(selected);$('selection-count').textContent=`${selected.length}개 구역 선택`;$('selection-confirm').disabled=!selected.length;$('selection-undo').disabled=!history.length;}
  function point(e){const r=surface.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
  function finish(commit){editing=false;anchor=null;pointers.clear();gesture=null;surface.hidden=true;draw(null);$('selection-toolbar').hidden=true;map.dragPan.enable();map.boxZoom.enable();map.doubleClickZoom.enable();onEditing(false);if(commit)onConfirm(selected);else onPreview(getSelected());$('pick-region').focus();}
  function choose(a,b){selected=inRectangle(features(),a,b,p=>map.project(p));draw(a,b);publish();}
  function undo(){if(history.length){selected=history.pop();draw(null);publish();}}
  surface.addEventListener('pointerdown',e=>{
    if(!editing||e.button>0)return;e.preventDefault();surface.focus();surface.setPointerCapture(e.pointerId);pointers.set(e.pointerId,point(e));
    if(pointers.size===1){anchor=point(e);before=[...selected];cursor=anchor;}
    else{selected=before;anchor=null;draw(null);publish();const [a,b]=[...pointers.values()];gesture={x:(a.x+b.x)/2,y:(a.y+b.y)/2,d:Math.hypot(a.x-b.x,a.y-b.y)};}
  });
  surface.addEventListener('pointermove',e=>{
    if(!editing||!pointers.has(e.pointerId))return;e.preventDefault();pointers.set(e.pointerId,point(e));
    if(pointers.size>=2){const [a,b]=[...pointers.values()],g={x:(a.x+b.x)/2,y:(a.y+b.y)/2,d:Math.hypot(a.x-b.x,a.y-b.y)};if(gesture){map.panBy([gesture.x-g.x,gesture.y-g.y],{duration:0});if(g.d&&gesture.d)map.setZoom(map.getZoom()+Math.log2(g.d/gesture.d));}gesture=g;return;}
    if(anchor){cursor=point(e);choose(anchor,cursor);}
  });
  surface.addEventListener('pointerup',e=>{
    if(!pointers.has(e.pointerId))return;const p=point(e);pointers.delete(e.pointerId);
    if(anchor){if(Math.hypot(p.x-anchor.x,p.y-anchor.y)>=5){history.push(before);choose(anchor,p);}else{selected=before;draw(null);publish();}}
    anchor=null;gesture=null;
  });
  surface.addEventListener('pointercancel',()=>{selected=before;anchor=null;gesture=null;pointers.clear();draw(null);publish();});
  surface.addEventListener('wheel',e=>{e.preventDefault();if(anchor){selected=before;anchor=null;publish();}draw(null);map.setZoom(map.getZoom()-e.deltaY/600);},{passive:false});
  surface.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();finish(false);return;}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo();return;}
    if(e.key==='Enter'){e.preventDefault();if(!anchor){before=[...selected];anchor={...cursor};draw(anchor,cursor);}else{history.push(before);choose(anchor,cursor);anchor=null;}return;}
    const d=e.shiftKey?50:10,delta={ArrowLeft:[-d,0],ArrowRight:[d,0],ArrowUp:[0,-d],ArrowDown:[0,d]}[e.key];
    if(delta){e.preventDefault();cursor={x:Math.max(0,Math.min(surface.clientWidth,cursor.x+delta[0])),y:Math.max(0,Math.min(surface.clientHeight,cursor.y+delta[1]))};$('selection-cursor').hidden=false;Object.assign($('selection-cursor').style,{left:cursor.x+'px',top:cursor.y+'px'});if(anchor)choose(anchor,cursor);}
  });
  $('selection-cancel').addEventListener('click',()=>finish(false));$('selection-confirm').addEventListener('click',()=>finish(true));$('selection-undo').addEventListener('click',undo);
  return {get editing(){return editing;},begin(){if(editing)return;selected=[...getSelected()];before=[...selected];history=[];editing=true;surface.hidden=false;$('selection-toolbar').hidden=false;$('selection-cursor').hidden=true;map.dragPan.disable();map.boxZoom.disable();map.doubleClickZoom.disable();onEditing(true);publish();surface.focus();},cancel(){if(editing)finish(false);}};
}
