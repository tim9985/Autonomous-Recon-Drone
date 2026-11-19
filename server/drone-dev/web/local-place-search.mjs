export const normalizePlaceQuery=value=>String(value||'').normalize('NFKC').trim().replace(/\s+/g,' ');
const matchKey=value=>normalizePlaceQuery(value).toLocaleLowerCase().replace(/\s/g,'');
const addressMatch=(value,key)=>{const text=matchKey(value),at=text.indexOf(key);return at>=0&&(!/\d$/.test(key)||!/[\d-]/.test(text[at+key.length]||''));};
export function parseCoordinates(query){
 const match=normalizePlaceQuery(query).match(/^([+-]?\d+(?:\.\d+)?)\s*(?:,\s*|\s+)([+-]?\d+(?:\.\d+)?)$/);
 if(!match)return null;
 let lat=Number(match[1]),lon=Number(match[2]);
 if(Math.abs(lat)>90&&Math.abs(lat)<=180&&Math.abs(lon)<=90)[lat,lon]=[lon,lat];
 return Math.abs(lat)<=90&&Math.abs(lon)<=180?[lon,lat]:null;
}
function validPlace(row){return typeof row?.name==='string'&&Array.isArray(row.point)&&row.point.length>=2&&row.point.every(Number.isFinite)&&Math.abs(row.point[0])<=180&&Math.abs(row.point[1])<=90;}
export function placeDistance(a,b){
 if(!validPlace({name:'',point:a})||!validPlace({name:'',point:b}))return null;
 const rad=Math.PI/180,dlat=(b[1]-a[1])*rad,dlon=(b[0]-a[0])*rad;
 return 12742000*Math.asin(Math.min(1,Math.sqrt(Math.sin(dlat/2)**2+Math.cos(a[1]*rad)*Math.cos(b[1]*rad)*Math.sin(dlon/2)**2)));
}
export function placeMatches(rows,query,context={}){const key=matchKey(query);return key?rankedPlaces(rows.filter(r=>validPlace(r)&&matchKey([r.name,r.address].filter(Boolean).join(' ')).includes(key)&&(!context.center||placeDistance(context.center,r.point)<=context.radius_m)),query,context).slice(0,12):[];}
export function rankedPlaces(rows,query,context={}){
 const key=matchKey(query),accepted=[];
 return rows.filter(validPlace)
  .map((row,index)=>{const addresses=[row.address,row.road_address,row.parcel_address].filter(Boolean);return {row,index,distance:placeDistance(context.center,row.point)??Infinity,rank:matchKey(row.name)===key?0:addresses.some(v=>matchKey(v)===key)?1:addresses.some(v=>addressMatch(v,key))?2:matchKey(row.name).includes(key)?3:4};})
  .sort((a,b)=>(context.sort==='distance'&&context.center?a.distance-b.distance:0)||a.rank-b.rank||Number(!!b.row.address)-Number(!!a.row.address)||a.distance-b.distance||a.index-b.index).map(v=>v.row)
  .filter(row=>{
   const duplicate=accepted.some(prior=>matchKey(prior.name)===matchKey(row.name)&&(
    row.point.every((v,i)=>Math.abs(v-prior.point[i])<.00001)
    ||row.address&&prior.address&&matchKey(row.address)===matchKey(prior.address)
    ||!row.region_id&&!prior.region_id&&(row.source==='캠퍼스 건물'||prior.source==='캠퍼스 건물')&&row.point.every((v,i)=>Math.abs(v-prior.point[i])<.01)));
   if(duplicate)return false;accepted.push(row);return true;
  }).slice(0,30);
}

// Shared by SIM and real maps. No flight or mission mutation is performed here.
export function mountPlaceSearch({doc,win=doc.defaultView,request,localItems=()=>[],select,isReady=()=>true,mapCenter=()=>null}){
 const $=id=>doc.getElementById(id),input=$('place-query'),form=$('place-form'),results=$('place-results'),status=$('place-status');
 const category=$('place-category'),cache=new Map();let version=0,active=null;
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const node=(tag,text)=>{const n=doc.createElement(tag);n.textContent=text;return n;};
 const controls=node('div','');controls.className='place-context';
 const chooser=(id,label,options)=>{const n=node('select','');n.id=id;n.setAttribute('aria-label',label);for(const [value,text]of options){const o=node('option',text);o.value=value;n.append(o);}controls.append(n);return n;};
 const origin=chooser('place-origin','검색 기준 위치',[['device','내 위치 기준'],['map','지도 중심 기준']]);
 const radius=chooser('place-radius','주변 검색 반경',[['10000','주변 10km'],['2000','주변 2km'],['5000','주변 5km'],['20000','주변 20km']]);
 const sort=chooser('place-sort','검색 결과 정렬',[['distance','가까운 순'],['relevance','관련도순']]);
 const locateButton=node('button','');locateButton.type='button';locateButton.className='place-locate';locateButton.title='현재 위치 다시 확인';locateButton.setAttribute('aria-label','현재 위치 다시 확인');
 locateButton.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="1.5"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>';controls.append(locateButton);
 const locationNote=node('p','검색을 열면 현재 위치를 확인합니다.');locationNote.id='place-location';locationNote.className='place-location';locationNote.setAttribute('role','status');
 const shortcuts=node('div','');shortcuts.className='place-shortcuts';shortcuts.setAttribute('aria-label','주변 시설 빠른 검색');
 for(const label of ['병원','경찰서','소방서']){const b=node('button',label);b.type='button';b.onclick=()=>{input.value=label;category.value='PLACE';if(!category.value)category.value='AUTO';void search();};shortcuts.append(b);}
 form.after(controls,locationNote,shortcuts);
 let device=null,locationPromise=null,locationCancel=null,locationVersion=0,locationAt=0,locationFailure='';
 function context(){const center=origin.value==='device'&&device?device.point:mapCenter();return {center:validPlace({name:'',point:center})?center.slice(0,2):null,radius_m:Number(radius.value),sort:sort.value,label:origin.value==='device'&&device?'내 위치':'지도 중심'};}
 function locationLabel(){const c=context();locationNote.textContent=origin.value==='map'?'지도 중심 기준 · 직선거리':device?`내 위치 기준 · 직선거리${device.accuracy>100?' · 위치 오차 약 '+Math.round(device.accuracy)+'m':''}`:(locationFailure||'현재 위치 확인 중…')+(c.center?' · 지도 중심 사용':'');}
 function locate(force=false){
  if(origin.value==='map')return null;
  if(locationPromise)return locationPromise;
  if(!force&&(device&&Date.now()-locationAt<120000||locationFailure&&Date.now()-locationAt<30000))return null;
  if(!win.navigator?.geolocation){locationFailure='기기 위치를 사용할 수 없습니다';locationAt=Date.now();locationLabel();return null;}
  const stamp=++locationVersion;locationFailure='';locationNote.textContent='현재 위치 확인 중…';locateButton.setAttribute('aria-busy','true');
  let resolve;const promise=new Promise(done=>resolve=done);locationPromise=promise;
  let finished=false;const finish=(position,error)=>{if(finished)return;finished=true;win.clearTimeout(timer);
   if(stamp===locationVersion){locationAt=Date.now();if(position&&validPlace({name:'',point:[position.coords.longitude,position.coords.latitude]}))device={point:[position.coords.longitude,position.coords.latitude],accuracy:position.coords.accuracy||0};else{device=null;locationFailure=error?.code===1?'위치 권한이 꺼져 있습니다':'현재 위치를 확인하지 못했습니다';}locationLabel();locateButton.removeAttribute('aria-busy');locationPromise=null;locationCancel=null;}resolve();};
  const timer=win.setTimeout(()=>finish(null,{code:3}),6500);locationCancel=()=>finish(null);
  try{win.navigator.geolocation.getCurrentPosition(p=>finish(p),e=>finish(null,e),{enableHighAccuracy:false,maximumAge:60000,timeout:6000});}catch{finish(null);}
  return promise;
 }
 function resultLabel(items,data,searchContext){return data.partial?'일부 조회가 지연됐습니다. 확인된 결과를 표시합니다.':items.length?`${items.length}개 결과 · ${data.scope==='global-fallback'?'주변 결과 없음, 전국 결과':searchContext.sort==='distance'&&searchContext.center?'가까운 순':'관련도순'}${data.truncated?' · 반경을 좁혀 다시 검색하세요':''}`:'다른 검색어로 다시 찾아보세요.';}
 function show(items,{pending=false,searchContext=context()}={}){
  const nodes=items.map(item=>{
   const b=node('button','');b.type='button';b.className='place-item';const heading=node('span','');heading.className='place-item-heading';heading.append(node('strong',item.name));
   const distance=placeDistance(searchContext.center,item.point);if(distance!==null){const badge=node('span',distance<1000?Math.round(distance/10)*10+'m':(distance/1000).toFixed(distance<10000?1:0)+'km');badge.className='place-distance';badge.title=searchContext.label+' 기준 직선거리';heading.append(badge);}b.append(heading);
   const address=item.address||item.source||'좌표';if(matchKey(address)!==matchKey(item.name))b.append(node('small',address));
   if(item.parcel_address&&item.parcel_address!==address){const p=node('small','지번 '+item.parcel_address);p.className='place-secondary';b.append(p);}
   b.onclick=()=>{cancel();select(item);};return b;
  });
  if(!nodes.length&&!pending){const n=node('p','검색 결과가 없습니다. 지역명이나 번지를 함께 입력하세요.');n.className='search-empty';nodes.push(n);}
  results.replaceChildren(...nodes);results.hidden=!nodes.length;
 }
 function busy(value){form.setAttribute('aria-busy',String(value));}
 function cancel(){version++;if(active){active.abort.abort();status.textContent='';}active=null;busy(false);}
 const same=v=>v===version&&isReady();
 function delay(ms,signal){return new Promise((resolve,reject)=>{
  if(signal.aborted){reject(new DOMException('Cancelled','AbortError'));return;}
  const abort=()=>{win.clearTimeout(timer);reject(new DOMException('Cancelled','AbortError'));};
  const timer=win.setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},ms);
  signal.addEventListener('abort',abort,{once:true});
 });}
 async function execute(query,v,abort){
  busy(true);
  const waiting=locate();if(waiting)await waiting;if(!same(v))return;
  const searchContext=context(),key=[category.value,query.toLocaleLowerCase(),searchContext.center?.map(v=>v.toFixed(4)).join(',')||'',searchContext.radius_m,searchContext.sort].join('|');
  const cached=cache.get(key);
  if(cached&&cached.expires>win.performance.now()){
   const items=rankedPlaces([...placeMatches(localItems(),query,cached.scope==='global-fallback'?{}:searchContext),...cached.items],query,searchContext);show(items,{searchContext});status.textContent=resultLabel(items,cached,searchContext);return;
  }
  const local=placeMatches(localItems(),query,searchContext);show(local,{pending:true,searchContext});status.textContent=local.length?'지도 결과 · 장소·주소 확인 중…':'장소·주소 검색 중…';busy(true);
  try{
   let data=await request('local-search/places',{query,category:category.value,center:searchContext.center,radius_m:searchContext.radius_m,sort:searchContext.sort},{signal:abort.signal});
   if(!same(v))return;
   const deadline=win.performance.now()+24000;
   for(let poll=0;data?.state==='QUEUED'&&win.performance.now()<deadline;poll++){
    if(!data.request_id)throw new Error('검색 응답을 확인하지 못했습니다. 다시 검색하세요.');
    const rid=data.request_id;
    await delay(poll<3?250:600,abort.signal);if(!same(v))return;
    data={...await request('local-search/places/'+rid,undefined,{signal:abort.signal}),request_id:rid};if(!same(v))return;
   }
   if(!data||!Array.isArray(data.items)||data.state!=='DONE'){
    show(local,{pending:!local.length});status.textContent=data?.reason==='PROVIDER_NOT_CONFIGURED'?'검색 서비스 설정을 확인하세요. 지도 내 검색과 좌표 입력은 사용할 수 있습니다.':'검색 연결이 지연됐습니다. 다시 검색하세요.';return;
   }
   const items=rankedPlaces([...(data.scope==='global-fallback'?placeMatches(localItems(),query):local),...data.items],query,searchContext);show(items,{searchContext});
   status.textContent=resultLabel(items,data,searchContext);
   if(!data.partial){cache.delete(key);cache.set(key,{items:data.items,scope:data.scope,truncated:data.truncated,expires:win.performance.now()+(data.items.length?300000:30000)});while(cache.size>32)cache.delete(cache.keys().next().value);}
  }catch(error){
   if(!same(v)||abort.signal.aborted)return;
   show(local,{pending:!local.length});status.textContent=error.status===429?'검색 요청이 많습니다. 잠시 후 다시 검색하세요.':error.status===401?'로그인이 만료되었습니다. 다시 로그인하세요.':'검색에 연결하지 못했습니다. 다시 검색하세요.';
  }finally{if(same(v))busy(false);}
 }
 function search(){
  const query=normalizePlaceQuery(input.value),key=category.value+'|'+query.toLocaleLowerCase()+'|'+JSON.stringify([origin.value,radius.value,sort.value,context().center]);
  if(active?.key===key)return active.promise;
  cancel();const v=version;input.value=query;
  if(!isReady())return Promise.resolve();
  const point=parseCoordinates(query);
  if(point){show([{name:'입력 좌표',point,source:`위도 ${point[1]} · 경도 ${point[0]}`}]);status.textContent='좌표를 선택하면 지도로 이동합니다.';return Promise.resolve();}
  if(query.length<2){results.replaceChildren();results.hidden=true;status.textContent=query?'두 글자 이상 입력하세요.':'';return Promise.resolve();}
  const abort=new AbortController(),promise=execute(query,v,abort).finally(()=>{if(same(v)){active=null;busy(false);}});active={key,abort,promise};return promise;
 }
 form.onsubmit=e=>{e.preventDefault();void search();};
 input.addEventListener('input',()=>{
  cancel();const query=normalizePlaceQuery(input.value),items=placeMatches(localItems(),query,context());show(items,{pending:true});
  status.textContent=items.length?'지도 내 결과 · Enter로 장소·주소 검색':'';
 });
 category.addEventListener('change',()=>{cancel();results.replaceChildren();results.hidden=true;status.textContent='';if(input.value.trim().length>=2)void search();});
 const changed=()=>{cancel();locationLabel();if(input.value.trim().length>=2)void search();};
 origin.onchange=()=>{if(origin.value==='device')void locate(true);changed();};radius.onchange=changed;sort.onchange=changed;
 locateButton.onclick=()=>{cancel();origin.value='device';device=null;const pending=locate(true),stamp=locationVersion;if(pending)void pending.then(()=>{if(stamp===locationVersion)changed();});else changed();};
 input.addEventListener('keydown',e=>{if(e.key==='ArrowDown'&&results.querySelector('button')){e.preventDefault();results.querySelector('button').focus();}});
 results.addEventListener('keydown',e=>{
  if(!['ArrowDown','ArrowUp'].includes(e.key))return;const buttons=[...results.querySelectorAll('button')],i=buttons.indexOf(doc.activeElement);if(i<0)return;e.preventDefault();
  if(e.key==='ArrowUp'&&i===0)input.focus();else buttons[(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length].focus();
 });
 return {search,cancel,open(){void locate();locationLabel();},clear(){cancel();cache.clear();device=null;locationVersion++;locationCancel?.();locationCancel=null;locationPromise=null;locationFailure='';locationAt=0;locateButton.removeAttribute('aria-busy');locationNote.textContent='검색을 열면 현재 위치를 확인합니다.';results.replaceChildren();results.hidden=true;status.textContent='';}};
}
