// Presentation decisions shared by map clicks, the accessible list, and toolbar guards.
export function scenePreparationNeeded(regional,plan){
 return !!(plan?.state==='READY'&&['REGIONAL','GLOBAL'].includes(plan.kind)&&regional?.package_id===plan.package_id&&!regional?.ready&&(regional?.reasons||[]).some(reason=>['REGIONAL_SCENE_PREPARATION_REQUIRED','REGIONAL_SCENE_RECEIPT_CHANGED','REGIONAL_PREPARATION_REQUIRED'].includes(reason)));
}
export function toggleZone(ids,id){return ids.includes(id)?ids.filter(value=>value!==id):[...ids,id];}
export function selectionLocked({flightActive=false,busy=false,pending=false,planState}={}){
 return flightActive||busy||pending||['QUEUED','RUNNING'].includes(planState);
}
export function selectionAfterChange(ids,initial){
 const selected=[...new Set(ids)];return {selected,initial:selected.includes(initial)?initial:selected[0]||''};
}
export function regionCoverage(job,coverage,id){
 if(!job?.job_id)return null;
 const sources=[job.observation_progress,coverage].filter(v=>v?.job_id===job.job_id&&v.run_id===job.run_id);
 const rows=sources.flatMap(v=>v.regions||[]).filter(r=>r.region_id===id&&Number.isFinite(r.actual_percent));
 const evidence=job.global_status?.region_evidence?.find(r=>r.region_id===id);
 if(evidence)rows.push({...evidence,sequence:evidence.last_sequence});
 const row=rows.sort((a,b)=>(b.sequence??0)-(a.sequence??0)||(b.updated_at??0)-(a.updated_at??0))[0];
 return Number.isFinite(row?.actual_percent)?row.actual_percent:null;
}
export function mergeObservationProgress(previous,next){
 if(!next)return previous;
 if(previous?.job_id!==next.job_id||previous?.run_id!==next.run_id)return next;
 const rows=new Map((previous.regions||[]).map(v=>[v.region_id,v]));
 for(const row of next.regions||[])if(!rows.has(row.region_id)||(row.sequence??0)>=(rows.get(row.region_id).sequence??0))rows.set(row.region_id,row);
 return {...next,regions:[...rows.values()]};
}
export function missionSummary(job,capture,coverage){
 const status=job?.global_status,evidence=status?.region_evidence||[];
 let actual=regionCoverage(job,coverage,status?.current_region||job?.region_id)??evidence.at(-1)?.actual_percent;
 let coverageLabel='현재 구역 관측률';
 const ended=['COMPLETED','PARTIAL','FAILED','CANCELLED','INTERRUPTED'].includes(job?.state)||job?.landed_disarmed;
 if(ended){
  const bound=!!coverage&&!!job?.job_id&&coverage.job_id===job.job_id&&coverage.run_id===job.run_id;
  const rows=bound?(coverage.regions||[]).filter(r=>Number.isFinite(r.actual_percent)&&Number.isFinite(r.target_area_m2)&&r.target_area_m2>0):[];
  if(rows.length){
   const total=rows.reduce((n,r)=>n+r.target_area_m2,0);
   actual=rows.reduce((n,r)=>n+r.actual_percent*r.target_area_m2,0)/total;
   coverageLabel=rows.length===(status?.total||1)?'임무 관측률':`관측 기록 ${rows.length}/${status?.total||1}구역`;
  }else coverageLabel='마지막 구역 관측률';
 }
  return {coverage:Number.isFinite(actual)?actual:null,frames:job?.recorded_frames??capture?.capture?.frames_stored??job?.capture_frames??0,
 completed:status?`${status.completed||0}/${status.total||0}`:'—',landed:!!job?.landed_disarmed,coverageLabel};
}

// A delayed measured-sample buffer absorbs poll jitter. Never extrapolates.
export class VehicleMotion {
 constructor({delayMs=1000}={}){this.delayMs=delayMs;this.samples=[];}
 push(fix,now,duration=500){
  const last=this.samples.at(-1);
  if(!fix||last&&fix.timestamp<=last.timestamp)return false;
  if(!last||fix.timestamp-last.timestamp>8){this.samples=[];this.offset=fix.timestamp-now/1000;}
  this.instant=duration===0;this.received=now;this.samples.push(fix);
  this.samples=this.samples.slice(-40);
  return true;
 }
 at(now){
  const last=this.samples.at(-1);if(!last)return null;
  if(this.instant)return {...last,moving:false};
  const time=now/1000+this.offset-this.delayMs/1000;
  let a=this.samples[0],b=a;
  for(const sample of this.samples){b=sample;if(sample.timestamp>=time)break;a=sample;}
  const span=b.timestamp-a.timestamp,f=span>0?Math.min(1,Math.max(0,(time-a.timestamp)/span)):1;
  const turn=((b.yaw-a.yaw+540)%360)-180;
  let camera=b.camera;
  if(a.camera?.quaternion?.length===4&&b.camera?.quaternion?.length===4){
   const aq=a.camera.quaternion,bq=b.camera.quaternion,sign=aq.reduce((s,v,i)=>s+v*bq[i],0)<0?-1:1;
   const q=aq.map((v,i)=>v+(sign*bq[i]-v)*f),norm=Math.hypot(...q);
   camera={...b.camera,quaternion:q.map(v=>v/norm)};
  }
  const altitude=Number.isFinite(a.altitude)&&Number.isFinite(b.altitude)?a.altitude+(b.altitude-a.altitude)*f:b.altitude;
  return {...b,camera,altitude,point:b.point.map((n,i)=>a.point[i]+(n-a.point[i])*f),yaw:a.yaw+turn*f,
   moving:now-this.received<8000&&time<last.timestamp,timestamp:a.timestamp+span*f};
 }
}

export function vehiclePosition(telemetry,now=Date.now()/1000,connected=true){
 const p=telemetry?.position,t=telemetry?.timestamp??telemetry?.time;
 const stamp=typeof t==='number'?t:Date.parse(t)/1000;
 if(!Array.isArray(p)||p.length<2||!p.slice(0,2).every(Number.isFinite)||Math.abs(p[0])>180||Math.abs(p[1])>90||!Number.isFinite(stamp)||telemetry.valid===false)return null;
 const age=now-stamp;
 return {point:p.slice(0,2),altitude:Number.isFinite(p[2])?p[2]:null,timestamp:stamp,yaw:Number.isFinite(telemetry.yaw)?telemetry.yaw:0,
  camera:telemetry.camera,ned:telemetry.ned,live:connected&&age>=0&&age<=8};
}

export function formatDuration(seconds){
 if(!Number.isFinite(seconds)||seconds<0)return '—';
 const n=Math.floor(seconds),h=Math.floor(n/3600),m=Math.floor(n%3600/60),s=n%60;
 return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
export function missionElapsed(job,now=Date.now()/1000){
 if(!Number.isFinite(job?.created_at))return null;
 const end=job.flight_timing?.ended_at??(job.landed_disarmed?job.telemetry?.timestamp:null)??job.finished_at;
 return Math.max(0,(Number.isFinite(end)?end:now)-job.created_at);
}
export function regionTiming(plan,job,id,now=Date.now()/1000){
 const task=plan?.kind==='GLOBAL'?plan.tasks?.find(t=>t.region_id===id):plan;
 const bound=!!job&&!!plan&&job.plan_id===plan.plan_id;
 const timing=bound?job.region_timing?.find(t=>t.region_id===id):null;
 const evidence=bound?job.global_status?.region_evidence?.find(t=>t.region_id===id):null;
 const live=bound?job.observation_progress?.regions?.find(t=>t.region_id===id):null;
 const row=timing||evidence||live,ended=!!row?.ended_at||live?.state==='FINISHED'||!!evidence;
 const elapsed=ended?row?.elapsed_seconds:Number.isFinite(row?.started_at)?Math.max(0,now-row.started_at):null;
 return {expected:Number.isFinite(task?.predicted_seconds)?task.predicted_seconds:null,elapsed:Number.isFinite(elapsed)?elapsed:null,ended};
}

export function flightPhase(job,now=Date.now()/1000){
 const t=job?.telemetry,c=job?.operator_control;
 const updated=c?.updated_at,stamp=t?.timestamp??t?.time??0;
 return c?.phase&&Number.isFinite(updated)&&now-updated<4&&updated>=stamp?c.phase:t?.phase||job?.global_status?.phase||c?.phase||job?.phase;
}
export function routeActivity(job,now=Date.now()/1000){
 const t=job?.telemetry,age=now-(t?.timestamp??t?.time??0),phase=flightPhase(job,now);
 const ended=['COMPLETED','PARTIAL','FAILED','CANCELLED','INTERRUPTED','EXPIRED'].includes(job?.state)||job?.landed_disarmed||job?.phase==='SAVING_FRAMES';
 const fresh=t?.valid&&age>=0&&age<5;
 const stopped=fresh&&(t.armed===false||phase==='PAUSED'||(['HANDOFF','WAITING_NEXT','DRAINING_OBSERVATIONS','OBSERVATION_WAIT'].includes(phase)&&Array.isArray(t.velocity)&&Math.hypot(...t.velocity)<.4));
 const visible=job?.state==='RUNNING'&&!ended&&!(fresh&&t.armed===false)&&['SEARCH','PAUSING','PAUSED','OBSERVATION_WAIT','DRAINING_OBSERVATIONS','WAITING_NEXT','HANDOFF'].includes(phase);
 return {visible,animated:visible&&!stopped,stale:!fresh};
}

// Display-only pinhole footprint on the launch-height plane. It is not observed
// coverage and does not model occlusion. Inputs are paired image camera poses.
export function cameraFootprint(fix,now=Date.now()/1000){
 const c=fix?.camera,q=c?.quaternion,p=c?.positionNed;
 if(!fix||c?.source!=='AIRSIM_RGB_PAIRED_CAMERA_POSE'||!c.valid||!Array.isArray(q)||q.length!==4||!q.every(Number.isFinite)
  ||!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite)||now-c.capturedAt>3||now-c.capturedAt<0||p[2]>=-.5)return null;
 const [x,y,z,w]=q;if(Math.abs(x*x+y*y+z*z+w*w-1)>.02)return null;
 const hfov=c.horizontalFovDeg,aspect=c.width/c.height;if(!(hfov>0&&hfov<140&&aspect>0))return null;
 const horizontal=Math.tan(hfov*Math.PI/360),vertical=horizontal/aspect;
 const rotate=([a,b,d])=>[(1-2*(y*y+z*z))*a+2*(x*y-z*w)*b+2*(x*z+y*w)*d,
  2*(x*y+z*w)*a+(1-2*(x*x+z*z))*b+2*(y*z-x*w)*d,
  2*(x*z-y*w)*a+2*(y*z+x*w)*b+(1-2*(x*x+y*y))*d];
 const points=[];
 for(const [side,up] of [[-1,-1],[1,-1],[1,1],[-1,1]]){
  const ray=rotate([1,side*horizontal,up*vertical]);if(ray[2]<=.02)return null;
  const length=-p[2]/ray[2];if(length>450)return null;
  const north=ray[0]*length+(p[0]-(fix.ned?.[0]??p[0])),east=ray[1]*length+(p[1]-(fix.ned?.[1]??p[1]));
  points.push([fix.point[0]+east/(111320*Math.cos(fix.point[1]*Math.PI/180)),fix.point[1]+north/111320]);
 }
 points.push(points[0]);return {type:'Polygon',coordinates:[points]};
}

export function mapLayerVisibility(mode,{planned=true,actual=true,previousRoute=false}={}){
 const coverage=mode==='coverage';
 return {'regions-fill':!coverage,'coverage-base':coverage,'coverage-observed':coverage,'coverage-edge':coverage,
 'initial-boundary':true,'regions-casing':true,'regions-line':true,'selection-fill':!coverage,'selection-line':true,
 'planned-line':planned,'preview-point':planned,'actual-line':actual,'previous-route-line':previousRoute,
 'previous-points':true,'previous-halo':true};
}

export const panelLayout=()=> 'sidebar';

export function casePlanIssue(plan,context={}){
 if(!plan)return '';
 const binding=plan.selection||{};
 if((binding.case_id||null)!==(context.case_id||null))return 'SEARCH_PLAN_CASE_MISMATCH';
 if(context.case_id&&binding.case_revision!==context.case_revision)return 'SEARCH_PLAN_CASE_REVISION';
 return '';
}

export function routeTiming(plan){
 const first=plan?.kind==='GLOBAL'?plan.tasks?.[0]:plan;
 const seconds=first?.predicted_seconds;
 return {seconds:Number.isFinite(seconds)&&seconds>=0?seconds:null,partial:plan?.kind==='GLOBAL'&&(plan.selection?.region_ids.length||0)>1};
}

// Child plans describe calculation; visit evidence describes the actual search.
// A prepared child still needs entry/return validation at the region boundary.
export function routePlanningRows(plan,job,visits,{stage='review',connected=true}={}){
 const bound=!!plan?.plan_id&&job?.plan_id===plan.plan_id,st=bound?job.global_status:null;
 const currentIndex=visits.findIndex(v=>v.id===st?.current_region),phase=bound?(job.operator_control?.phase||st?.phase||job.phase):'';
 const running=bound&&!['COMPLETED','PARTIAL','FAILED','CANCELLED','INTERRUPTED','EXPIRED'].includes(job.state);
 const returning=['RETURN','RETURN_VALIDATING','OPERATOR_RETURN','LAND','LANDING','LANDED'].includes(phase);
 const nextIndex=running&&currentIndex>=0?currentIndex+1:-1;
 const aliases={'CPU 계산 중':'RUNNING','계산 준비':'WAITING','메모리 여유 대기':'RESOURCE_WAIT','마지막 구역':'LAST'};
 const reported=aliases[st?.next_state]||st?.next_state;
 return visits.map(v=>{
  const i=v.number-1,t=plan?.tasks?.find(t=>t.region_id===v.id);
  let calculation=t?.state||(i===0?plan?.state||'QUEUED':'WAITING');
  if(i===nextIndex&&['WAITING','QUEUED'].includes(calculation)&&['RUNNING','RESOURCE_WAIT','FAILED','INCOMPLETE'].includes(reported))calculation=reported;
  let state='waiting',detail='계산 대기',icon='Clock',working=false;
  if(['STALE','FAILED','INCOMPLETE'].includes(plan?.state)||stage==='failed'){
   if(plan?.state==='STALE'||i===0){state='failed';detail=plan?.state==='INCOMPLETE'?'관측 목표 미달':'재계획 필요';icon='AlertTriangle';}
  }else if(calculation==='READY'){state='ready';detail='경로 준비';icon='Check';}
  else if(calculation==='RUNNING'){state='computing';detail='계산 중';icon='Loader';working=true;}
  else if(calculation==='QUEUED'){detail='계산 대기';}
  else if(calculation==='RESOURCE_WAIT'){state='resource';detail='메모리 여유 대기';}
  else if(['FAILED','INCOMPLETE'].includes(calculation)){state='failed';detail=calculation==='INCOMPLETE'?'관측 목표 미달':'계산 실패';icon='AlertTriangle';}
  else if(calculation==='STALE'){state='failed';detail='재계획 필요';icon='AlertTriangle';}
  else if(i>0&&!running&&stage!=='complete'){detail=i===1?'출발 후 계산':'순차 계산 대기';}
  if(i===nextIndex&&phase==='HANDOFF'&&calculation==='READY'){
   state='validating';detail='진입 경로 검증';icon='Loader';working=true;
  }
  // Actual observation evidence wins over path calculation or plan completion.
  if(v.state!=='pending'){
   state=v.state;detail=v.label;icon=state==='complete'?'Check':state==='incomplete'?'AlertTriangle':state==='active'||state==='incoming'?'Drone':state==='paused'?'PlayerPause':'Clock';working=false;
  }else if(stage==='complete'){
   state=state==='failed'?'failed':'waiting';detail=state==='failed'?detail:'미실행';working=false;if(state!=='failed')icon='Clock';
  }
  if(returning&&working){state='waiting';detail='계산 중단 확인';icon='Clock';working=false;}
  if(!connected&&stage!=='complete'&&!['complete','incomplete'].includes(v.state)){
   state='stale';detail='상태 확인 필요';icon='Clock';working=false;
  }
  const routeReady=calculation==='READY'&&!['STALE','FAILED','INCOMPLETE'].includes(plan?.state)&&stage!=='failed';
  return {...v,planState:state,calculation,detail,icon,working,routeReady,error:t?.error||''};
 });
}

export function nextRouteStatus(job){
 if(!job||['COMPLETED','PARTIAL','FAILED','CANCELLED','INTERRUPTED','EXPIRED'].includes(job.state))return '비행 종료';
 const code=job.global_status?.next_state;
 return ({READY:'다음 경로 준비됨',RUNNING:'다음 경로 계산 중','CPU 계산 중':'다음 경로 계산 중',QUEUED:'다음 경로 계산 대기',WAITING:'다음 구역 대기','계산 준비':'다음 계산 준비','메모리 여유 대기':'다음 계산 · 메모리 대기','마지막 구역':'마지막 구역 정찰',FAILED:'다음 경로 계산 실패',INCOMPLETE:'다음 경로 관측 목표 미달'})[code]||'다음 상태 확인 중';
}

export function simulatorStandby(control,fresh){
 return !!(fresh&&control?.launch_mode==='ON_DEPARTURE'&&control.runner?.ready&&(!control.job||['COMPLETED','PARTIAL','FAILED','CANCELLED','INTERRUPTED','EXPIRED'].includes(control.job.state)));
}

// Vehicle facts belong to the actual run, independent of selected plans/results.
export function droneStatus(job,{connected=false,now=Date.now()/1000}={}){
 const t=job?.telemetry,raw=t?.timestamp??t?.time,stamp=typeof raw==='number'?raw:Date.parse(raw)/1000;
 const hasData=t?.valid===true&&Number.isFinite(stamp)&&stamp>0&&stamp<=now+1;
 if(!hasData)return {link:'waiting',timestamp:null,phase:'—',altitude:null,speed:null,battery:null};
 const live=connected&&job.state==='RUNNING'&&now-stamp>=0&&now-stamp<=8;
 const operator=job.operator_control,operatorFresh=operator&&now-operator.updated_at>=0&&now-operator.updated_at<=4;
 const phase=live&&operatorFresh?operator.phase:t.phase;
 const phases={PREPARING:'준비 중',ARMING:'무장 준비',TAKEOFF:'이륙 중',INGRESS:'구역 이동',SEARCH:'정찰 중',
  PAUSING:'대기 전환',PAUSED:'일시중지',OBSERVATION_WAIT:'관측 수신 대기',HANDOFF:'경로 검증',WAITING_NEXT:'경로 대기',
  DRAINING_OBSERVATIONS:'관측 확인',RETURN_VALIDATING:'복귀 검증',RETURN:'복귀 중',LAND:'착륙 중',LANDING:'착륙 중',LANDED:'착륙 확인'};
 const altitude=Number.isFinite(t.relativeAltitudeM)?t.relativeAltitudeM:Array.isArray(t.ned)&&Number.isFinite(t.ned[2])?-t.ned[2]:null;
 const speed=Array.isArray(t.velocity)&&t.velocity.length>=2&&t.velocity.slice(0,2).every(Number.isFinite)?Math.hypot(t.velocity[0],t.velocity[1]):null;
 const battery=t.battery_percent??t.battery?.remaining_percent;
 return {link:live?'live':connected?'stale':'offline',timestamp:stamp,
  phase:t.armed===false?'무장 해제':phases[phase]||(t.armed===true?'무장 상태':'확인 필요'),
  altitude,speed,battery:Number.isFinite(battery)&&battery>=0&&battery<=100?battery:null};
}

export function flightActions(job,connected,now=Date.now()/1000){
 const control=job?.operator_control,terminal=['COMPLETED','PARTIAL','FAILED','CANCELLED','INTERRUPTED','EXPIRED'].includes(job?.state);
 const pending=!terminal&&(job?.operator_command?.state==='ACCEPTED'||job?.operator_command?.state==='PENDING'&&now-(job.operator_command.requested_at||0)<10);
 const fresh=connected&&job?.state==='RUNNING'&&!terminal&&!job.landed_disarmed&&control?.version===1&&now-control.updated_at>=0&&now-control.updated_at<4;
 return {paused:control?.phase==='PAUSED',pending,actions:fresh&&!pending?(control.actions||[]):[]};
}

// Clip every segment at all ring crossings, including holes and multipolygons.
// Keeping the source geometry separate avoids animating ingress outside a zone.
export function routeInsideRegion(route,geometry){
 const polygons=geometry?.type==='Polygon'?[geometry.coordinates]:geometry?.type==='MultiPolygon'?geometry.coordinates:[];
 if(!polygons.length||!Array.isArray(route))return [];
 const cross=(a,b)=>a[0]*b[1]-a[1]*b[0],sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
 const inRing=(p,ring)=>{let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[j],b=ring[i],v=sub(b,a),w=sub(p,a);
  if(Math.abs(cross(v,w))<1e-14&&p[0]>=Math.min(a[0],b[0])-1e-12&&p[0]<=Math.max(a[0],b[0])+1e-12&&p[1]>=Math.min(a[1],b[1])-1e-12&&p[1]<=Math.max(a[1],b[1])+1e-12)return true;
  if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }return inside;};
 const inside=p=>polygons.some(poly=>inRing(p,poly[0])&&!poly.slice(1).some(r=>inRing(p,r)));
 const output=[];
 for(let i=1;i<route.length;i++){
  const a=route[i-1],b=route[i];if(!a||!b||![...a.slice(0,2),...b.slice(0,2)].every(Number.isFinite))continue;
  const vector=sub(b,a),cuts=[0,1];
  for(const poly of polygons)for(const ring of poly)for(let k=1;k<ring.length;k++){
   const edge=sub(ring[k],ring[k-1]),delta=sub(ring[k-1],a),den=cross(vector,edge);if(Math.abs(den)<1e-18)continue;
   const t=cross(delta,edge)/den,u=cross(delta,vector)/den;if(t>0&&t<1&&u>=0&&u<=1)cuts.push(t);
  }
  cuts.sort((x,y)=>x-y);const point=t=>[a[0]+vector[0]*t,a[1]+vector[1]*t,...(Number.isFinite(a[2])&&Number.isFinite(b[2])?[a[2]+(b[2]-a[2])*t]:[])];
  for(let k=1;k<cuts.length;k++)if(cuts[k]-cuts[k-1]>1e-9&&inside(point((cuts[k]+cuts[k-1])/2))){
   const first=point(cuts[k-1]),last=point(cuts[k]),previous=output.at(-1);
   if(previous&&Math.hypot(...sub(previous.at(-1),first))<1e-12)previous.push(last);else output.push([first,last]);
  }
 }
 return output;
}

export function activeRegionRoute(plan,job,zones,{connected=true,now=Date.now()/1000}={}){
 if(job?.plan_id!==plan?.plan_id||!routeActivity(job,now).visible)return [];
 const id=plan.kind==='GLOBAL'?job.global_status?.current_region:plan.region_id;
 const route=plan.kind==='GLOBAL'?plan.tasks?.find(t=>t.region_id===id)?.route:plan.route;
 const geometry=zones.find(z=>z.properties?.zoneId===id)?.geometry;
 return routeInsideRegion(route,geometry);
}

export function routeDashFrame(milliseconds){
 const offset=(Math.floor(milliseconds/60)%24)/4;
 return offset<=4?[0,offset,2,4-offset]:[offset-4,4,6-offset,0];
}

// These links describe visit order; they are never executable flight paths.
export function regionVisitSequence(order,zones,plan,job,{connected=true,editing=false,now=Date.now()/1000}={}){
 const ids=[...new Set(order.filter(id=>typeof id==='string'&&id))],byId=new Map(zones.map(z=>[z.properties?.zoneId,z]));
 const bound=!editing&&!!plan?.plan_id&&job?.plan_id===plan.plan_id;
 const evidence=new Map((bound?job.global_status?.region_evidence||[]:[]).map(row=>[row.region_id,row]));
 const current=bound?job.global_status?.current_region:null,t=job?.telemetry;
 const stamp=t?.timestamp??t?.time,age=now-stamp;
 const live=connected&&job?.state==='RUNNING'&&!job.landed_disarmed&&t?.valid&&t?.armed&&age>=0&&age<5;
 const phase=job?.operator_control?.phase||t?.phase;
 const names={active:'정찰 중',incoming:'진입 중',paused:'일시중지',waiting:'대기',stale:'수신 확인',complete:'완료',incomplete:'미완료'};
 const regions=ids.map((id,index)=>{
  const zone=byId.get(id),raw=zone?.properties.representativePoint;
  const point=Array.isArray(raw)&&raw.length>=2&&raw.slice(0,2).every(Number.isFinite)&&Math.abs(raw[0])<=180&&Math.abs(raw[1])<=90?raw.slice(0,2):null;
  const ev=evidence.get(id);let state=ev?.completed===true?'complete':ev?.completed===false?'incomplete':'pending';
  if(id===current&&job.state==='RUNNING'&&state!=='complete'){
   if(!live)state='stale';
   else if(phase==='SEARCH')state='active';
   else if(phase==='INGRESS')state='incoming';
   else if(['PAUSED','PAUSING'].includes(phase))state='paused';
   else if(['WAITING_NEXT','HANDOFF','DRAINING_OBSERVATIONS'].includes(phase))state='waiting';
  }
  return {id,number:index+1,name:zone?.properties.name||id,point,state,label:names[state]||(index===0&&!bound?'시작':'')};
 });
 const links=[];
 for(let i=1;i<regions.length;i++){
  const from=regions[i-1],to=regions[i];if(!from.point||!to.point)continue;
  const state=['active','incoming','paused','stale','waiting'].includes(to.state)?to.state:from.state==='complete'&&to.state==='complete'?'complete':'pending';
  links.push({from:from.id,to:to.id,state,coordinates:[from.point,to.point]});
 }
 return {regions,links};
}
