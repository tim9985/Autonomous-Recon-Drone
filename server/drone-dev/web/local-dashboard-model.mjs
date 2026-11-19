export const terminal = new Set(['COMPLETED','PARTIAL','FAILED','CANCELLED','INTERRUPTED','EXPIRED']);
export const validId = value => typeof value==='string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
export const actualPoint = row => {const p=row?.data?.geographic;return Number.isFinite(p?.longitude)&&Number.isFinite(p?.latitude)?[p.longitude,p.latitude]:null;};
export const estimatePoint = row => {const p=row?.sim_estimate;return p?.status==='ESTIMATED'&&p.validation==='SIM_GEOMETRY_ONLY'&&Number.isFinite(p.lon)&&Number.isFinite(p.lat)?[p.lon,p.lat]:null;};
export function distance(points){let m=0;for(let i=1;i<points.length;i++){const [a,b]=[points[i-1],points[i]],r=Math.PI/180;const x=(b[0]-a[0])*r*Math.cos((a[1]+b[1])*r/2),y=(b[1]-a[1])*r;m+=6371008.8*Math.hypot(x,y);}return m;}
export function along(points,fraction){if(!points?.length)return null;if(points.length===1)return points[0];let remaining=distance(points)*Math.max(0,Math.min(1,fraction));for(let i=1;i<points.length;i++){const d=distance([points[i-1],points[i]]);if(remaining<=d&&d>0){const f=remaining/d;return points[i].map((v,k)=>points[i-1][k]+f*(v-points[i-1][k]));}remaining-=d;}return points.at(-1);}
export function droneConnectionReady(connection,plan,now=Date.now()/1000){const t=connection?.telemetry;return !!(connection?.state==='READY'&&validId(connection.connection_id)&&connection.source==='LOCAL_SITL_PREFLIGHT'&&now-connection.updated_at>=0&&now-connection.updated_at<5&&t?.valid===true&&t.armed===false&&t.landed===true&&now-t.timestamp>=0&&now-t.timestamp<5&&(!plan||connection.plan_id===plan.plan_id&&connection.plan_hash===plan.plan_hash));}
// Freshness of a live, uncached check belongs to the receiving browser's clock.
// Start at request dispatch, so a slow response cannot renew an expired check.
export function receivedStorage(storage,requestedAt){
 if(!Number.isFinite(storage?.checked_at)||storage.checked_at<=0||typeof storage.ready!=='boolean'||!Number.isFinite(requestedAt))return {ready:false,reason:'RECORDING_STORAGE_UNAVAILABLE'};
 return {...storage,checked_monotonic_ms:requestedAt};
}
export function storageIssue(storage,now=Date.now()/1000,monotonicNow=performance.now()){
 if(!storage)return 'RECORDING_STORAGE_CHECKING';
 if(storage.ready!==true)return storage.reason||'RECORDING_STORAGE_UNAVAILABLE';
 const age=Object.hasOwn(storage,'checked_monotonic_ms')?(monotonicNow-storage.checked_monotonic_ms)/1000:now-storage.checked_at;
 return Number.isFinite(age)&&age>=0&&age<15?'':'RECORDING_STORAGE_STALE';
}
export function storageReady(storage,now=Date.now()/1000,monotonicNow=performance.now()){return storageIssue(storage,now,monotonicNow)==='';}
export function canStart({plan,region,runner,regional,job,confirmed,fresh,pending,connection,storage}){return !!(fresh&&!pending&&plan?.state==='READY'&&plan.region_id===region&&validId(plan.plan_id)&&plan.plan_hash&&runner?.ready&&storageReady(storage)&&droneConnectionReady(connection,plan)&&(!job||terminal.has(job.state))&&confirmed&&(plan.kind==='SHORT'||regional?.ready&&regional.package_id===plan.package_id));}
export function sourceMode(mode,capture,previous){return mode==='previous'?{snapshot:previous,previous:true}:{snapshot:capture,previous:false};}
