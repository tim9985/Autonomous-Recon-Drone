'use strict';
const el=id=>document.getElementById(id);
let csrf='',request=null,stopId=null,cursor='0',rows=[],busy=false,lastLink=null,lastCandidates=null,pollFailed=false;
async function api(path,method='GET',body){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);
  try{
    const response=await fetch('/api/v1/'+path,{method,credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json',...(method==='GET'?{}:{'X-CSRF-Token':csrf})},...(body?{body:JSON.stringify(body)}:{})});
    const value=await response.json();
    if(!response.ok)throw new Error(`${response.status}: ${value.error?.code||value.detail||'요청 실패'}`);
    return value;
  }finally{clearTimeout(timer);}
}
function resetObservation(){cursor='0';rows=[];lastLink=null;lastCandidates=null;pollFailed=false;renderFreshness();}
function renderFreshness(){
  const sample=lastLink?.sample;
  const wallElapsed=lastLink?(Date.now()-lastLink.wallAtReceipt)/1000:NaN;
  const monoElapsed=lastLink?(performance.now()-lastLink.monoAtReceipt)/1000:NaN;
  // Either clock moving backwards makes the age unverifiable. Taking the larger
  // elapsed time also prevents a suspended monotonic clock from extending freshness.
  const elapsed=Number.isFinite(wallElapsed)&&Number.isFinite(monoElapsed)&&wallElapsed>=0&&monoElapsed>=0?Math.max(wallElapsed,monoElapsed):NaN;
  const age=lastLink&&Number.isFinite(elapsed)&&Number.isFinite(lastLink.ageAtReceipt)?lastLink.ageAtReceipt+elapsed:NaN;
  const ageValid=Number.isFinite(age)&&age>=0;
  const recentEstimate=ageValid&&age<3&&!pollFailed;
  const readiness=sample?.data?.vision_readiness;
  const frameAge=typeof readiness?.inferred_frame_age_s==='number'&&Number.isFinite(readiness.inferred_frame_age_s)&&readiness.inferred_frame_age_s>=0&&ageValid?readiness.inferred_frame_age_s+age:NaN;
  // The worker and browser clocks have no measured synchronization bound in the
  // current SIM contract. A wall-clock estimate cannot establish current authority.
  const clockStatus='UNVERIFIED';
  const authority=pollFailed?'UNKNOWN_REQUEST_FAILED':!recentEstimate?'UNKNOWN_STALE_OR_MISSING':'UNKNOWN_CLOCK_UNVERIFIED';
  el('link-state').textContent=JSON.stringify({observation_fresh:false,observation_recent_estimate:recentEstimate,
    current_authority:authority,clock_status:clockStatus,
    estimated_observation_age_s:ageValid?Math.round(age*10)/10:null,
    last_record:sample?{captured_at:sample.captured_at,...sample.data}:null},null,2);
  if(request?.pipeline_config?.mission_id){
    const inferredStatus=Number.isFinite(frameAge)&&frameAge>=2?'STALE':'UNVERIFIED';
    el('vision-state').textContent=JSON.stringify({mission_id:request.pipeline_config.mission_id,
      stored_candidates:lastCandidates?.length??null,movement_authorized:false,inference_status:inferredStatus,
      estimated_inferred_frame_age_s:Number.isFinite(frameAge)?Math.round(frameAge*10)/10:null,
      clock_status:clockStatus,coordinate_status:'UNVERIFIED',posture_status:'UNVERIFIED',
      latest:(lastCandidates||[]).slice().sort((a,b)=>String(b.last_seen).localeCompare(String(a.last_seen))).slice(0,1).map(c=>({geo_status:c.geo_status,position:c.latest_position,state_validation:c.tracking?.physical_validation||'NOT_VERIFIED',reported_state_unverified:c.tracking?.reported_state?.posture?.label,candidate_id:c.candidate_id,last_seen:c.last_seen,evidence_count:c.evidence_count,appearance:c.appearance}))},null,2);
  }
}
async function submit(){
  await api('simulations/runs','POST',request);
  el('message').textContent='실행 요청 저장 완료: '+request.run_id;
  await refresh();
}
async function refresh(){
  if(!request||busy){renderFreshness();return;}busy=true;
  const runId=request.run_id;
  try{
    const state=await api('simulations/runs/'+runId);
    if(request?.run_id!==runId)return;
    el('run-summary').textContent='실행 상태: '+state.state+' · '+state.run_id;
    const page=await api('simulations/runs/'+runId+'/samples?after='+cursor+'&limit=100');
    if(request?.run_id!==runId)return;
    cursor=page.next_cursor;rows.push(...page.samples);rows=rows.slice(-30);
    const link=[...page.samples].reverse().find(r=>r.kind==='PIPELINE_EVENT'&&r.data?.stage==='LINK_STATE');
    if(link){const wall=Date.now();lastLink={sample:link,wallAtReceipt:wall,monoAtReceipt:performance.now(),ageAtReceipt:(wall-Date.parse(link.captured_at))/1000};}
    el('state').textContent=JSON.stringify({state:state.state,...state},null,2);el('samples').textContent=JSON.stringify(rows,null,2);
    if(request.pipeline_config?.mission_id){
      const candidates=await api('missions/'+request.pipeline_config.mission_id+'/candidates');
      if(request?.run_id!==runId)return;
      lastCandidates=candidates;
    }
    pollFailed=false;renderFreshness();
  }catch(error){if(request?.run_id===runId){pollFailed=true;el('message').textContent=error.message;renderFreshness();}}finally{busy=false;}
}
el('form').addEventListener('submit',async event=>{
  event.preventDefault();
  try{
    const me=await api('auth/me');csrf=me.csrf_token;
    if(!el('worker').value)throw new Error('대상 PC를 선택하세요.');
    request={run_id:crypto.randomUUID(),worker_id:el('worker').value,scenario:el('scenario').value,world:el('world').value,simulator_version:'NET_SITL/UE5.5.4/Cosys5.5-v3.3',coordinate_frame:'NED_M',seed:'0',waypoints:el('scenario').value==='ROUTE'?JSON.parse(el('route').value):[]};
    request.duration_s=Number(el('duration').value);
    const mission=el('vision-mission').value.trim();
    if(mission)request.pipeline_config={mission_id:mission,model_config_id:el('vision-model').value.trim(),camera_name:el('vision-camera').value.trim(),interval_s:Number(el('vision-interval').value),image_format:'JPEG'};
    stopId=null;resetObservation();await submit();
  }catch(error){el('message').textContent=error.message;}
});
el('retry').addEventListener('click',async()=>{try{if(!request)throw new Error('먼저 실행을 요청하세요.');await submit();}catch(error){el('message').textContent=error.message;}});
el('lookup').addEventListener('click',async()=>{
  try{
    const id=el('lookup-run').value.trim();
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))throw new Error('유효한 실행 UUID를 입력하세요.');
    const state=await api('simulations/runs/'+id);request=state.request;
    stopId=null;resetObservation();el('link-state').textContent='기록을 조회합니다.';
    el('message').textContent='저장 실행 조회: '+id;await refresh();
  }catch(error){el('message').textContent=error.message;}
});
el('stop').addEventListener('click',async()=>{
  try{if(!request)throw new Error('먼저 실행을 요청하세요.');stopId??=crypto.randomUUID();await api('simulations/runs/'+request.run_id+'/stop','POST',{command_id:stopId});el('message').textContent='중지 요청이 저장됐습니다. 전달·정지·착륙은 별도 확인이 필요합니다.';await refresh();}catch(error){el('message').textContent=error.message;}
});
api('auth/me').then(async me=>{csrf=me.csrf_token;const workers=await api('simulations/workers');el('worker').replaceChildren(...workers.map(w=>{const option=document.createElement('option');option.value=w.worker_id;option.textContent=w.label+' ('+w.worker_id+')'+(w.capabilities?.execution_profile?' · FC 보호 SIM':'');return option;}));el('message').textContent='대상 PC의 연결기가 준비되면 실행을 요청하세요. 목록은 등록 정보이며 온라인 상태는 아닙니다.';}).catch(()=>{el('message').textContent='관제 화면에서 먼저 로그인하세요.';});
setInterval(refresh,2000);
setInterval(renderFreshness,250);
document.addEventListener('visibilitychange',renderFreshness);
