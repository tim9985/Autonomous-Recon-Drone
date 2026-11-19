'use strict';
const el=id=>document.getElementById(id);
let csrf='',request=null,stopId=null,cursor='0',rows=[],busy=false;
async function api(path,method='GET',body){
  const response=await fetch('/api/v1/'+path,{method,credentials:'same-origin',headers:{'Content-Type':'application/json',...(method==='GET'?{}:{'X-CSRF-Token':csrf})},...(body?{body:JSON.stringify(body)}:{})});
  const value=await response.json();
  if(!response.ok)throw new Error(`${response.status}: ${value.error?.code||value.detail||'요청 실패'}`);
  return value;
}
async function submit(){
  await api('simulations/runs','POST',request);
  el('message').textContent='실행 요청 저장 완료: '+request.run_id;
  await refresh();
}
async function refresh(){
  if(!request||busy)return;busy=true;
  try{
    const state=await api('simulations/runs/'+request.run_id);
    const page=await api('simulations/runs/'+request.run_id+'/samples?after='+cursor+'&limit=100');
    cursor=page.next_cursor;rows.push(...page.samples);rows=rows.slice(-30);
    el('state').textContent=JSON.stringify(state,null,2);el('samples').textContent=JSON.stringify(rows,null,2);
  }catch(error){el('message').textContent=error.message;}finally{busy=false;}
}
el('form').addEventListener('submit',async event=>{
  event.preventDefault();
  try{
    const me=await api('auth/me');csrf=me.csrf_token;
    if(!el('worker').value)throw new Error('대상 PC를 선택하세요.');
    request={run_id:crypto.randomUUID(),worker_id:el('worker').value,scenario:el('scenario').value,world:el('world').value,simulator_version:'NET_SITL/UE5.5.4/Cosys5.5-v3.3',coordinate_frame:'NED_M',seed:'0',waypoints:el('scenario').value==='ROUTE'?JSON.parse(el('route').value):[]};
    stopId=null;cursor='0';rows=[];await submit();
  }catch(error){el('message').textContent=error.message;}
});
el('retry').addEventListener('click',async()=>{try{if(!request)throw new Error('먼저 실행을 요청하세요.');await submit();}catch(error){el('message').textContent=error.message;}});
el('stop').addEventListener('click',async()=>{
  try{if(!request)throw new Error('먼저 실행을 요청하세요.');stopId??=crypto.randomUUID();await api('simulations/runs/'+request.run_id+'/stop','POST',{command_id:stopId});el('message').textContent='중지 요청을 저장했습니다. 연결기가 착륙을 확인하면 종료됩니다.';await refresh();}catch(error){el('message').textContent=error.message;}
});
api('auth/me').then(async me=>{csrf=me.csrf_token;const workers=await api('simulations/workers');el('worker').replaceChildren(...workers.map(w=>{const option=document.createElement('option');option.value=w.worker_id;option.textContent=w.label+' ('+w.worker_id+')';return option;}));el('message').textContent='대상 PC의 연결기가 준비되면 실행을 요청하세요. 목록은 등록 정보이며 온라인 상태는 아닙니다.';}).catch(()=>{el('message').textContent='관제 화면에서 먼저 로그인하세요.';});
setInterval(refresh,2000);
