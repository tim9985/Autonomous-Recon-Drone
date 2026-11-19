'use strict';
(() => {
  const $=id=>document.getElementById(id),M=RegionalMapModel;
  const empty={type:'FeatureCollection',features:[]},activeStates=['QUEUED','RUNNING','STOP_REQUESTED','UNCONFIRMED'];
  const reasons={SIM_EXECUTOR_NOT_FRESH:'지역수색 PC 실행기 연결 없음',SIM_EXECUTOR_NOT_READY:'PC의 시뮬·입력 버전 준비 확인 필요',REGIONAL_PLAN_NOT_READY:'경로 준비 미완료',REGIONAL_SEARCH_INPUT_CHANGED:'지도·실행 코드 변경: 경로 재계산 필요',EXECUTOR_BUSY:'다른 실행 또는 착륙 확인 대기',OTHER_SIM_RUN_ACTIVE:'기존 SIM 시험 종료 대기',MANUAL_CONTROL_OWNED:'수동 제어권 해제 필요',SIM_SCENE_BINDING_UNAVAILABLE:'Unreal 장면과 현재 건물 입력 불일치',SITL_UNAVAILABLE:'SITL 꺼짐',AIRSIM_UNAVAILABLE:'Unreal 꺼짐',LEGACY_GATEWAY_ACTIVE:'기존 수동 연결기와 제어 충돌',REVISION_CONFLICT:'임무 개정 변경: 경로 재계산 필요'};
  let csrf='',userId='',regions=[],selected=null,binding=null,job=null,run=null,preview=null,coverage=empty,readiness=null;
  let map,marker,mapReady=false,busy=false,polling=false,generation=0,timer,playing=false,tracking=true,previewRequested=false;
  let pending=null,startId=null,sourceKey='',previewCells=[],actualTrack=[];
  let workerId='sim-pi-01',workerPinned=false;
  const note=text=>{$('message').textContent=text;};
  const active=()=>!!run&&activeStates.includes(run.state);
  const calculating=()=>job&&['QUEUED','RUNNING'].includes(job.state);
  const sec=v=>Number.isFinite(v)?v.toFixed(1)+'초':'—';
  const key=()=>`test-regional:${userId}`;
  function remember(){try{sessionStorage.setItem(key(),JSON.stringify({source:selected?.id,pending,startId,binding}));}catch{/* Server state remains authoritative. */}}
  async function api(path,body){
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
    try{const r=await fetch('/api/v1/'+path,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',signal:controller.signal,
      headers:{'Content-Type':'application/json',...(body===undefined?{}:{'X-CSRF-Token':csrf})},...(body===undefined?{}:{body:JSON.stringify(body)})});
      let value;try{value=await r.json();}catch{throw new Error(`서버 응답 오류 (HTTP ${r.status})`);}
      if(!r.ok)throw new Error(reasons[value.error?.code]||value.error?.code||`HTTP ${r.status}`);return value;
    }finally{clearTimeout(timeout);}
  }
  function controls(){
    $('region').disabled=busy||active();$('worker').disabled=busy||active();$('prepare').disabled=busy||active()||calculating()||!selected;
    $('prepare').textContent=calculating()?'경로 계산 중…':job?'선택 구역 경로 다시 생성':'선택 구역 경로 생성';
    $('start').disabled=busy||active()||!readiness?.executable||job?.state!=='READY';
    $('stop').disabled=busy||!run||!['QUEUED','RUNNING'].includes(run.state);
    $('play').disabled=!Number($('time').max);$('latest').disabled=!job?.result?.execution;
  }
  async function action(fn){if(busy)return;busy=true;controls();try{await fn();}catch(e){readiness=null;note(e.name==='AbortError'?'서버 응답 지연 · 같은 요청으로 재시도할 수 있습니다.':e.message);}finally{busy=false;controls();}}
  const planPath=()=>`missions/${binding.mission_id}/regional-search/${binding.job_id}`;
  const readyPath=path=>path+'/execution-readiness?worker_id='+encodeURIComponent(workerId);
  const runPath=()=>`missions/${binding.mission_id}/regional-executions/${run.execution_id}`;
  const feature=(geometry,properties={})=>geometry?{type:'Feature',geometry,properties}:empty;
  const line=points=>points.length>1?feature({type:'LineString',coordinates:points}):empty;
  function source(id,data){if(mapReady)map.getSource(id)?.setData(data);}
  function reset(){generation++;binding=job=run=preview=readiness=null;coverage=empty;previewCells=[];actualTrack=[];sourceKey='';previewRequested=false;startId=null;playing=false;tracking=true;
    for(const id of ['compute','forecast-time','forecast'])$(id).textContent='—';$('actual').textContent='0.00%';$('frames').textContent='0 / 0';$('state').textContent='실행 전';$('vehicle').textContent='수신 대기';$('run-id').textContent='없음';$('ending').textContent='';$('diagnostics').textContent='';$('readiness').textContent='경로와 PC 실행기를 확인합니다.';
    $('time').value='0';$('time').max='0';for(const id of ['area','route','transit','done','passed','exclusions'])source(id,empty);marker?.remove();
  }
  async function select(id,autoPrepare=false,restore=null){
    reset();selected=regions.find(r=>r.id===id)||null;$('region').value=selected?.id||'';
    $('area').textContent=selected?`${selected.name} · 의미구역 ${(selected.areaM2/10000).toFixed(2)} ha`:'구역을 선택해 주세요.';
    if(!selected){controls();return;}
    binding=restore?.source===id?restore.binding:null;pending=restore?.source===id?restore.pending:null;startId=restore?.source===id?restore.startId:null;
    binding=binding||selected.latest;remember();
    if(binding){await poll(true);note('선택 구역의 저장된 계획과 실행 상태를 불러왔습니다.');}
    else if(autoPrepare)await prepare();else note('선택 구역 경로 생성 버튼을 눌러 주세요.');
    controls();
  }
  async function prepare(){
    if(!selected||active()||calculating())return;
    const chosen=selected;pending=pending?.source===chosen.id?pending:{source:chosen.id,mid:crypto.randomUUID(),draftId:crypto.randomUUID()};remember();
    const p=pending;readiness=null;note('선택 구역 경로를 계산합니다. 계산 완료 후 정찰 시작을 누를 수 있습니다.');
    await api('missions',{mission_id:p.mid,drone_id:'sim-pi-01',environment:'SIM'});
    await api(`missions/${p.mid}/map-drafts`,{request_id:p.draftId,expected_draft_revision:0,release_id:chosen.releaseId,selected_zone_ids:[chosen.id],name:`지역수색 ${chosen.name}`,mission_type:'AREA_RECON',conditions:{altitude_m:30,speed_mps:3,observation_seconds:3,return_reserve_percent:20,priority_mode:'UNIFORM',appearance:null}});
    const [w,rs]=await Promise.all([api(`missions/${p.mid}/workspace`),api(`missions/${p.mid}/regions`)]),rev=w.mission.draft_revision;
    const region=rs.find(r=>r.mission_revision===rev&&r.source_features.source_id===chosen.id);
    if(!region||rev!==1)throw new Error('생성된 구역·임무 개정 불일치');
    const result=await api(`missions/${p.mid}/regional-search`,{job_id:p.draftId,mission_revision:rev,region_id:region.region_id,policy_profile:'RESEARCH_FUSED_CANDIDATE_95_V1'});
    reset();selected=chosen;binding={mission_id:p.mid,job_id:result.job_id,mission_revision:rev,region_id:region.region_id};job=result;pending=null;remember();await poll(true);
  }
  async function poll(force=false){
    if(polling||!binding||busy&&!force)return;polling=true;const gen=generation,b={...binding};
    const path=`missions/${b.mission_id}/regional-search/${b.job_id}`;
    try{
      const workers=await api('simulations/regional-executors');if(gen!==generation)return;
      const fresh=w=>w.ready&&Date.now()-Date.parse(w.seen_at)<4000&&w.package_id===selected?.packageId;
      if(!active()&&!workerPinned)workerId=workers.find(fresh)?.worker_id||workerId;
      const choices=workers.some(w=>w.worker_id===workerId)?workers:[...workers,{worker_id:workerId}];
      $('worker').replaceChildren(...choices.map(w=>{const o=document.createElement('option');o.value=w.worker_id;
        const executing=active()&&w.worker_id===run.worker_id&&Date.now()/1000-(run.status?.telemetry?.time||0)<4;
        o.textContent=w.worker_id+(executing?' · 정찰 연결됨':fresh(w)?' · 연결됨':' · 준비 확인');return o;}));$('worker').value=workerId;
      const [j,rd,runs]=await Promise.all([api(path),api(readyPath(path)),api(`missions/${b.mission_id}/regional-executions`)]);
      if(gen!==generation)return;job=j;readiness=rd;
      const nextRun=runs.find(r=>activeStates.includes(r.state))||runs.find(r=>r.job_id===job.job_id)||null;
      if(nextRun?.execution_id!==run?.execution_id)actualTrack=[];
      run=nextRun;
      // An uncertain start is resolved by its original ID, never by issuing a new ID.
      if(run&&run.execution_id===startId){startId=null;remember();}
      if(run){
        const [current,cells]=await Promise.all([api(`missions/${b.mission_id}/regional-executions/${run.execution_id}`),api(`missions/${b.mission_id}/regional-executions/${run.execution_id}/coverage`)]);
        if(gen!==generation)return;run=current;coverage=cells;
        const t=run.status?.telemetry;
        if(t?.ned&&(!actualTrack.length||actualTrack.at(-1).time!==t.time))actualTrack.push({time:t.time,ned:t.ned,yaw:t.yaw});
        if(actualTrack.length>7200)actualTrack.shift();
      }
      if(job.state==='READY'&&(!preview||!['READY','FAILED'].includes(preview.state))){
        const p=await api(path+'/preview');if(gen!==generation)return;
        if(p.resultHash!==job.result_hash)throw new Error('경로·관측 지도 결과 버전 불일치');
        preview=p;
        if(p.state==='NOT_REQUESTED'&&!previewRequested){await api(path+'/preview',{});if(gen!==generation)return;previewRequested=true;}
        if(p.state==='READY'){
          const cv=M.convert(job.result.execution.originGeographic);previewCells=p.cells.map(c=>({...c,geo:M.geometry(c.geometry,cv)}));
        }
      }
      if($('message').textContent.startsWith('상태 조회: '))note('연결이 복구됐습니다. 최신 상태를 표시합니다.');
      render();controls();
    }catch(e){if(gen===generation){readiness=null;controls();note('상태 조회: '+e.message);}}
    finally{polling=false;}
  }
  function render(){
    $('compute').textContent=sec(job?.result?.preparationSeconds);$('forecast-time').textContent=sec(preview?.first95Seconds??job?.result?.plan?.predictedFirstTargetSeconds);
    $('forecast').textContent=Number.isFinite(job?.result?.plan?.predictedPercent)?(preview?.percent??job.result.plan.predictedPercent).toFixed(2)+'%':'—';
    $('actual').textContent=(run?.actual?.percent??0).toFixed(2)+'%';$('frames').textContent=`${run?.applied_sequence??0} / ${run?.last_sequence??0}`;
    $('readiness').textContent=active()?'정찰 실행 상태를 확인 중입니다.':readiness?.executable?'경로·실행기 준비 완료 · 정찰 시작 가능':(readiness?.reasons||[]).map(x=>reasons[x]||x).join(' · ');
    $('diagnostics').textContent=(readiness?.worker?.diagnostics?.reasons||[]).map(x=>reasons[x]||x).join(' · ');
    $('state').textContent=run?`${run.state} · ${run.status?.phase||''}`:`계획 ${job?.state||'대기'}`;
    $('ending').textContent=run?JSON.stringify(run.status,null,2):job?.result?.reason||'';
    $('run-id').textContent=binding?`계획 ${binding.job_id}\n실행 ${run?.execution_id||'전'}`:'없음';
    const t=run?.status?.telemetry??run?.status?.lastState;
    $('vehicle').textContent=run?.status?.landedAndDisarmed?'착륙·무장 해제 확인':t?`${t.armed?'무장':'무장 해제'} · N ${t.ned?.[0]?.toFixed(1)} / E ${t.ned?.[1]?.toFixed(1)}m`:'지역수색 실행 대기';
    if(run?.status?.landedAndDisarmed)note(run.state==='COMPLETED'?'정찰 비행 종료 · 착륙·무장 해제를 확인했습니다.':`시험 종료 · 착륙·무장 해제 확인. ${run.status.error||''}`);
    if(job?.state==='INCOMPLETE')note('목표 관측률 또는 계산 한도 미달입니다. 이 계획으로는 시작할 수 없습니다.');
    draw();
  }
  function draw(){
    const e=job?.result?.execution;if(!e)return;
    const cv=M.convert(e.originGeographic),ned=p=>cv([p[1],p[0]]),actual=$('view').value==='actual';
    const start=run?.actual?.searchStartedAt??run?.status?.searchStartedAt??0;
    const duration=actual?(run?.actual?.elapsedSeconds??(start?Math.max(0,(run.status?.searchEndedAt??run.status?.telemetry?.time??start)-start):0)):(preview?.seconds??job.result.plan.predictedSearchSeconds??0);
    $('time').max=String(duration);$('time').disabled=duration<=0;if(tracking&&actual)$('time').value=String(duration);
    const stamp=Math.min(Number($('time').value),duration);$('time-label').firstChild.textContent=`${actual?'실제':'예상'} · 구역 진입 후 ${sec(stamp)}`;
    if(sourceKey!==job.result_hash&&mapReady){
      source('area',feature(e.targetGeometry));const points=[e.entryNed,...e.legs.flatMap(l=>l.phases.map(p=>p.end))];source('route',line(points.map(ned)));
      source('transit',{type:'FeatureCollection',features:[e.ingressPath,e.returnPath].filter(p=>p.length>1).map(p=>line(p.map(ned)))});
      const flat=e.targetGeometry.type==='Polygon'?e.targetGeometry.coordinates.flat():e.targetGeometry.coordinates.flat(2);
      if(flat.length)map.fitBounds(flat.reduce((b,p)=>b.extend(p),new maplibregl.LngLatBounds()),{padding:{top:60,bottom:60,left:50,right:innerWidth>700?440:50},maxZoom:18});sourceKey=job.result_hash;
    }
    let cells,position;
    if(actual){
      cells=(coverage.features||[]).filter(f=>start&&f.properties.completedAt-start<=stamp+.001);
      const track=actualTrack.filter(t=>start&&t.time>=start&&t.time-start<=stamp+.001);
      position=tracking?(actualTrack.at(-1)??run?.status?.lastState):track.at(-1);source('passed',line(track.map(t=>ned(t.ned))));
      const area=cells.reduce((n,f)=>n+f.properties.areaM2,0),total=run?.actual?.targetAreaM2||job.result.targetAreaM2;
      $('coverage-note').textContent=`실제 완료 ${total?(area/total*100).toFixed(2):'0.00'}% · 원본 프레임 판정 기준${actualTrack.length?'':' · 재접속 이전 기체 궤적은 미표시'}`;
    }else{
      cells=previewCells.filter(c=>c.completedAt!==null&&c.completedAt<=stamp+.001).map(c=>feature(c.geo,{areaM2:c.areaM2}));
      const p=M.at(e,stamp);position={ned:p.pos,yaw:p.yaw};source('passed',line(p.passed.map(ned)));
      const area=cells.reduce((n,f)=>n+f.properties.areaM2,0);$('coverage-note').textContent=preview?.state==='READY'?`예상 완료 ${(100*area/preview.targetAreaM2).toFixed(2)}% · 실제 기록과 별도`:`시간별 예상 관측 지도 ${preview?.state||'준비 중'}`;
    }
    source('done',{type:'FeatureCollection',features:cells});
    if(preview?.state==='READY')source('exclusions',{type:'FeatureCollection',features:[preview.forest,preview.canopy].filter(Boolean).map(g=>feature(M.geometry(g,cv)))});
    if(position&&mapReady)marker.setLngLat(ned(position.ned)).setRotation(position.yaw||0).addTo(map);else marker?.remove();
    controls();
  }
  $('region').onchange=()=>void action(()=>select($('region').value,true));$('prepare').onclick=()=>void action(prepare);
  $('start').onclick=()=>void action(async()=>{
    if(!binding||job?.state!=='READY'||active())return;
    readiness=await api(readyPath(planPath()));if(!readiness.executable)throw new Error(readiness.reasons.map(x=>reasons[x]||x).join(' · '));
    startId=startId||crypto.randomUUID();remember();
    run=await api(planPath()+'/start',{execution_id:startId,worker_id:workerId,result_hash:job.result_hash});
    actualTrack=[];coverage=empty;
    readiness=null;startId=null;remember();$('view').value='actual';tracking=true;note('정찰 요청을 등록했습니다. PC 실행기의 수락과 실제 촬영 관측을 기다립니다.');await poll(true);
  });
  $('stop').onclick=()=>void action(async()=>{if(!run)return;run=await api(runPath()+'/stop',{});note('정지·착륙 요청을 보냈습니다. 실제 무장 해제 확인을 기다립니다.');await poll(true);});
  $('worker').onchange=()=>{workerId=$('worker').value;workerPinned=true;readiness=null;controls();void poll();};
  $('logout').onclick=()=>void action(async()=>{if(active())throw new Error('정찰 종료·착륙 확인 후 로그아웃해 주세요.');await api('auth/logout',{});location.assign('/');});
  $('view').onchange=()=>{playing=false;tracking=true;$('time').value='0';draw();};$('time').oninput=()=>{playing=false;tracking=false;draw();};
  $('play').onclick=()=>{playing=!playing;tracking=false;$('play').textContent=playing?'일시 정지':'시간순 재생';};$('latest').onclick=()=>{playing=false;tracking=true;$('time').value=$('time').max;draw();};
  async function initialize(){
    const me=await api('auth/me');csrf=me.csrf_token;userId=me.user_id;
    const catalog=await api('simulations/regional-search/regions');regions=catalog.regions;
    $('region').replaceChildren(...[{id:'',name:'수색할 의미구역 선택'},...regions].map(r=>{const o=document.createElement('option');o.value=r.id;o.textContent=r.name;return o;}));
    const response=await fetch('/api/environments/kumoh-campus-sim/manifest',{credentials:'same-origin',cache:'no-store'});if(!response.ok)throw new Error('캠퍼스 지도 요청 실패');const world=await response.json();
    map=new maplibregl.Map({container:'map',center:[128.3916,36.1458],zoom:16,pitch:0,style:{version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#203b3b'}}]}});
    map.addControl(new maplibregl.NavigationControl(),'top-left');map.on('error',e=>note('지도 자료: '+e.error.message));
    map.on('load',()=>{
      if(world.web.facilitiesUrl){map.addSource('facilities',{type:'geojson',data:world.web.facilitiesUrl});map.addLayer({id:'facilities',type:'fill',source:'facilities',paint:{'fill-color':'#68856c','fill-opacity':.5}});}
      for(const id of ['area','route','transit','done','passed','exclusions'])map.addSource(id,{type:'geojson',data:empty});
      map.addLayer({id:'area',type:'fill',source:'area',paint:{'fill-color':'#b45e3b','fill-opacity':.7}});
      map.addLayer({id:'exclusions',type:'fill',source:'exclusions',paint:{'fill-color':'#526e55','fill-opacity':.8}});
      map.addSource('buildings',{type:'geojson',data:world.web.buildingsUrl});map.addLayer({id:'buildings',type:'fill',source:'buildings',paint:{'fill-color':'#b2b8bc','fill-opacity':.8}});
      map.addLayer({id:'done',type:'fill',source:'done',paint:{'fill-color':'#42bc8d','fill-opacity':.8}});
      for(const [id,color,width] of [['transit','#ba9ad4',1],['route','#77aff8',1.5],['passed','#74eee3',3]])map.addLayer({id,type:'line',source:id,paint:{'line-color':color,'line-width':width,...(id==='transit'?{'line-dasharray':[3,3]}:{})}});
      const el=document.createElement('div');el.className='vehicle-marker';marker=new maplibregl.Marker({element:el,rotationAlignment:'map'});mapReady=true;draw();
    });
    let restored;try{restored=JSON.parse(sessionStorage.getItem(key())||'null');}catch{/* No saved selection. */}
    if(restored?.source&&regions.some(r=>r.id===restored.source))await select(restored.source,false,restored);else note('의미구역을 선택하면 경로를 준비합니다.');controls();
    async function tick(){await poll();timer=setTimeout(tick,document.hidden?5000:2000);}timer=setTimeout(tick,1000);
    setInterval(()=>{if(playing){$('time').value=String(Math.min(Number($('time').max),Number($('time').value)+1));if(Number($('time').value)>=Number($('time').max)){playing=false;$('play').textContent='시간순 재생';}draw();}},100);
  }
  window.addEventListener('pagehide',()=>clearTimeout(timer));
  void initialize().catch(e=>note(e.message+' · 첫 화면에서 test 계정으로 로그인해 주세요.'));
})();
