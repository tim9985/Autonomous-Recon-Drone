'use strict';
(() => {
  const $=id=>document.getElementById(id);
  let csrf='',mid='',revision=0,job=null,run=null,ready=false,busy=false,regions=[],coverage=null,polling=false,generation=0;
  const reasons={SIM_EXECUTOR_NOT_FRESH:'학교 PC 실행기의 최신 연결이 없습니다.',SIM_EXECUTOR_NOT_READY:'학교 PC의 SIM·지도·카메라 준비 상태를 확인해 주세요.',REGIONAL_PLAN_NOT_READY:'경로 계산이 아직 완료되지 않았습니다.',REGIONAL_SEARCH_INPUT_CHANGED:'지도 또는 실행 코드가 변경됐습니다. 경로를 다시 준비해 주세요.',REGIONAL_SEARCH_CONDITIONS_MISMATCH:'현재 프로파일은 고도 30m·기본 3m/s·지점 대기 3초입니다. 임무 조건을 확인해 주세요.',EXECUTOR_BUSY:'이미 실행 중이거나 착륙 확인이 필요한 임무가 있습니다.',REVISION_CONFLICT:'임무 개정이 바뀌었습니다. 다시 준비해 주세요.',MANUAL_CONTROL_OWNED:'기존 수동 제어권을 먼저 해제해 주세요.',OTHER_SIM_RUN_ACTIVE:'다른 SIM 시험이 진행 중입니다.'};
  async function api(path,body){
    const r=await fetch('/api/v1/'+path,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:body===undefined?{}:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:body===undefined?undefined:JSON.stringify(body)});
    const v=await r.json();if(!r.ok)throw new Error(reasons[v.error?.code]||v.error?.code||`HTTP ${r.status}`);return v;
  }
  function controls(){ $('prepare').disabled=busy; $('start').disabled=busy||!ready||!$('confirm').checked||!!run&&['QUEUED','RUNNING','STOP_REQUESTED','UNCONFIRMED'].includes(run.state);$('stop').disabled=busy||!run||!['QUEUED','RUNNING'].includes(run.state); }
  async function action(fn){if(busy)return;busy=true;controls();try{await fn();}catch(e){$('message').textContent=e.message;}finally{busy=false;controls();}}
  function option(value,text){const o=document.createElement('option');o.value=value;o.textContent=text;return o;}
  async function refreshMissions(){const v=await api('mission-workspaces');$('mission').replaceChildren(option('','새 캠퍼스 임무'),...v.items.map(m=>option(m.mission_id,m.name||m.mission_id.slice(0,8))));$('mission').value=mid;}
  async function selectMission(){generation++;mid=$('mission').value;job=run=null;ready=false;coverage=null;revision=0;controls();draw();
    if(!mid){$('region').replaceChildren(option('zone-106c8e3a7e32','생활구역'),option('zone-0bb1b42ef9e7','강의·연구구역'),option('zone-633e575ab1ca-c-89106-799958','지원구역'));return;}
    const w=await api(`missions/${mid}/workspace`);revision=w.mission.draft_revision;
    regions=(await api(`missions/${mid}/regions`)).filter(r=>r.mission_revision===revision);
    $('region').replaceChildren(...regions.map(r=>option(r.region_id,r.source_features.name||r.source_features.source_id||r.region_id)));
    const jobs=await api(`missions/${mid}/regional-search`);const saved=jobs.find(j=>j.mission_revision===revision&&j.region_id===$('region').value);
    if(saved)job=await api(`missions/${mid}/regional-search/${saved.job_id}`);
    const runs=await api(`missions/${mid}/regional-executions`);run=runs.find(r=>r.job_id===job?.job_id)||null;
    await poll();
  }
  $('login-form').onsubmit=e=>{e.preventDefault();void action(async()=>{await api('auth/login',{login_id:$('username').value,password:$('password').value});$('password').value='';await initialize();});};
  $('mission').onchange=()=>void action(selectMission);
  $('region').onchange=()=>{generation++;job=run=null;ready=false;coverage=null;$('confirm').checked=false;controls();draw();};
  $('worker').onchange=()=>{ready=false;controls();void poll();};$('confirm').onchange=controls;
  $('prepare').onclick=()=>void action(async()=>{
    generation++;ready=false;run=null;coverage=null;$('confirm').checked=false;
    if(!mid){
      const source=$('region').value;mid=crypto.randomUUID();
      await api('missions',{mission_id:mid,drone_id:'sim-pi-01',environment:'SIM'});
      await api(`missions/${mid}/map-drafts`,{request_id:crypto.randomUUID(),expected_draft_revision:0,release_id:'campus-04e1b46514574d45',selected_zone_ids:[source],name:'지역수색 '+$('region').selectedOptions[0].textContent,mission_type:'AREA_RECON',conditions:{altitude_m:30,speed_mps:3,observation_seconds:3,return_reserve_percent:20,priority_mode:'UNIFORM'}});
      revision=1;regions=(await api(`missions/${mid}/regions`)).filter(r=>r.mission_revision===revision);await refreshMissions();
      $('region').replaceChildren(...regions.map(r=>option(r.region_id,r.source_features.source_id||'선택 구역')));
    }
    job=await api(`missions/${mid}/regional-search`,{job_id:crypto.randomUUID(),mission_revision:revision,region_id:$('region').value});
    $('message').textContent='경로를 준비하고 있습니다. 준비만으로 이륙하지 않습니다.';
  });
  $('start').onclick=()=>void action(async()=>{
    if(!job||!ready||!$('confirm').checked)return;
    const r=await api(`missions/${mid}/regional-search/${job.job_id}/execution-readiness?worker_id=${encodeURIComponent($('worker').value)}`);
    if(!r.executable)throw new Error(r.reasons.map(v=>reasons[v]||v).join(' '));
    run=await api(`missions/${mid}/regional-search/${job.job_id}/start`,{execution_id:crypto.randomUUID(),worker_id:$('worker').value,result_hash:job.result_hash});
    ready=false;$('confirm').checked=false;$('message').textContent='학교 PC에 실행 요청을 등록했습니다. 실제 관측은 촬영 프레임이 도착한 뒤 누적됩니다.';
  });
  $('stop').onclick=()=>void action(async()=>{run=await api(`missions/${mid}/regional-executions/${run.execution_id}/stop`,{});$('message').textContent='중지 요청을 보냈습니다. 착륙·무장 해제 확인을 기다립니다.';});
  async function poll(){if(polling||!job)return;polling=true;const gen=generation,jid=job.job_id,mission=mid;
    try{
      const updated=await api(`missions/${mission}/regional-search/${jid}`);if(gen!==generation)return;job=updated;
      const r=await api(`missions/${mission}/regional-search/${jid}/execution-readiness?worker_id=${encodeURIComponent($('worker').value)}`);if(gen!==generation)return;
      ready=r.executable;$('readiness').textContent=r.reasons.length?r.reasons.map(v=>reasons[v]||v).join(' '):'실행 준비 완료 · 시작 버튼을 누르면 이륙합니다.';
      $('compute').textContent=job.result?.preparationSeconds?.toFixed(1)+'초';$('forecast-time').textContent=job.result?.plan?.predictedFirstTargetSeconds?.toFixed(1)+'초';$('forecast').textContent=(job.result?.plan?.predictedPercent??0).toFixed(2)+'%';
      if(!run){const runs=await api(`missions/${mission}/regional-executions`);if(gen!==generation)return;run=runs.find(x=>x.job_id===jid)||null;}
      if(run){const current=await api(`missions/${mission}/regional-executions/${run.execution_id}`);if(gen!==generation)return;run=current;coverage=await api(`missions/${mission}/regional-executions/${run.execution_id}/coverage`);if(gen!==generation)return;}
      $('actual').textContent=(run?.actual?.percent??0).toFixed(2)+'%';$('run-state').textContent=run?`${run.state} · ${run.status?.phase??''} · 반영 프레임 ${run.applied_sequence}/${run.last_sequence}`:`계획 ${job.state}`;draw();controls();
    }catch(e){ready=false;controls();$('message').textContent=e.message;}finally{polling=false;}
  }
  function draw(){const canvas=$('map'),ctx=canvas.getContext('2d');if(!ctx)return;ctx.clearRect(0,0,canvas.width,canvas.height);const e=job?.result?.execution;if(!e)return;
    const origin=e.originGeographic;const points=e.legs.flatMap(l=>l.phases.map(p=>[p.end[1],p.end[0]]));
    const local=([lon,lat])=>[(lon-origin[0])*111320*Math.cos(origin[1]*Math.PI/180),(lat-origin[1])*111320];
    const polys=g=>g?.type==='Polygon'?[g.coordinates]:g?.coordinates||[];
    const all=[...points,...polys(e.targetGeometry).flat(2).map(local)],xs=all.map(p=>p[0]),ys=all.map(p=>p[1]);
    const minx=Math.min(...xs)-15,miny=Math.min(...ys)-15,scale=Math.min(950/(Math.max(...xs)-minx+15),800/(Math.max(...ys)-miny+15));
    const xy=p=>[25+(p[0]-minx)*scale,825-(p[1]-miny)*scale];
    function shape(g,color){ctx.fillStyle=color;ctx.beginPath();for(const rings of polys(g))for(const ring of rings){ring.forEach((p,i)=>{const [x,y]=xy(local(p));i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();}ctx.fill('evenodd');}
    shape(e.targetGeometry,'#3d4c5e');ctx.strokeStyle='#61b4ff';ctx.lineWidth=2;ctx.beginPath();points.forEach((p,i)=>{const [x,y]=xy(p);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();
    for(const f of coverage?.features||[])shape(f.geometry,'#4ec894');
    const pos=run?.status?.telemetry?.ned;if(pos){const [x,y]=xy([pos[1],pos[0]]);ctx.fillStyle='#ffbb64';ctx.beginPath();ctx.arc(x,y,7,0,2*Math.PI);ctx.fill();}
  }
  async function initialize(){try{const me=await api('auth/me');csrf=me.csrf_token;$('login').hidden=true;$('workspace').hidden=false;await refreshMissions();
      const workers=await api('simulations/regional-executors');if(workers.length)$('worker').replaceChildren(...workers.map(w=>option(w.worker_id,w.worker_id+(w.ready?' · 준비':' · 확인 필요'))));$('message').textContent='구역을 선택하고 경로를 준비해 주세요.';
    }catch(e){$('login').hidden=false;$('workspace').hidden=true;$('message').textContent='학교 계정 로그인이 필요합니다.';}}
  void initialize();setInterval(()=>void poll(),2000);
})();
