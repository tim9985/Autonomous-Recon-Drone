// Shared operator UI: execute its selected regional plan through the existing SIM API.
const ACTIVE = new Set(['QUEUED', 'RUNNING', 'STOP_REQUESTED', 'UNCONFIRMED']);
const LABELS = {QUEUED:'실행기 수락 대기',RUNNING:'Unreal 정찰 중',STOP_REQUESTED:'정지·착륙 확인 중',UNCONFIRMED:'실제 종료 확인 필요',COMPLETED:'정찰 완료',CANCELLED:'정찰 중지',FAILED:'실행 실패'};
const REASONS = {
  SIM_EXECUTOR_NOT_FRESH:'지역수색 PC 실행기의 최신 연결이 없습니다.',
  SIM_EXECUTOR_NOT_READY:'PC의 Unreal·SITL·입력 버전 준비 상태를 확인해 주세요.',
  REGIONAL_PLAN_NOT_READY:'선택 구역의 경로 계산이 완료되지 않았습니다.',
  REGIONAL_SEARCH_INPUT_CHANGED:'지도 또는 실행 코드가 변경되어 경로 재계산이 필요합니다.',
  REGIONAL_SEARCH_CONDITIONS_MISMATCH:'지역수색 실행 조건과 저장된 계획이 다릅니다.',
  SIM_SCENE_BINDING_UNAVAILABLE:'Unreal 장면과 현재 건물 입력이 일치하지 않습니다.',
  EXECUTOR_BUSY:'다른 실행 또는 착륙 확인이 진행 중입니다.',
  OTHER_SIM_RUN_ACTIVE:'기존 SIM 시험의 종료를 기다립니다.',
  MANUAL_CONTROL_OWNED:'수동 제어권을 먼저 해제해 주세요.',
  SITL_UNAVAILABLE:'SITL 연결이 없습니다.', AIRSIM_UNAVAILABLE:'Unreal 연결이 없습니다.',
  LEGACY_GATEWAY_ACTIVE:'기존 수동 연결기와 제어가 충돌합니다.',
  REVISION_CONFLICT:'임무 개정이 변경되어 경로 재계산이 필요합니다.',
  PLAN_HASH_CHANGED:'계획 결과가 변경되어 다시 조회해야 합니다.'
};
const explain = code => REASONS[code] || code;
const permitted = account => account?.permissions?.some(p => p.drone_id === 'sim-pi-01' && p.scopes.includes('sim_patrol') && p.scopes.includes('control'));

export function createRegionalExecutionControls(React) {
  const h = React.createElement;
  return function RegionalExecutionControls({account, selection, binding, job, onLockChange}) {
    const allowed = permitted(account);
    const [workers, setWorkers] = React.useState([]), [workerId, setWorkerId] = React.useState('sim-pi-01');
    const [run, setRun] = React.useState(null), [readiness, setReadiness] = React.useState(null);
    const [coverage, setCoverage] = React.useState(null), [loading, setLoading] = React.useState(true);
    const [busy, setBusy] = React.useState(false), [error, setError] = React.useState(''), [notice, setNotice] = React.useState('');
    const runtime = React.useRef(null), runRef = React.useRef(null), requestRef = React.useRef(false), pinned = React.useRef(false);
    const pending = React.useRef(null), context = React.useRef('');
    const scope = allowed && binding && job ? `${account.user_id}/${binding.mission_id}/${job.job_id}` : '';
    const active = !!run && ACTIVE.has(run.state);
    const locked = allowed && (busy || loading || active || !!pending.current || !!error);

    async function api(path, body, signal) {
      const controller = new AbortController(), abort = () => controller.abort();
      if (signal?.aborted) controller.abort(); else signal?.addEventListener('abort', abort, {once:true});
      const timeout = setTimeout(abort, 12000);
      try {
        const response = await fetch('/api/v1/' + path, {
          method:body === undefined ? 'GET':'POST', credentials:'same-origin', cache:'no-store', signal:controller.signal,
          headers:{'Content-Type':'application/json',...(body === undefined ? {} : {'X-CSRF-Token':account.csrf_token})},
          ...(body === undefined ? {} : {body:JSON.stringify(body)})
        });
        const value = await response.json();
        if (!response.ok) throw new Error(explain(value.error?.code || `HTTP ${response.status}`));
        return value;
      } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort); }
    }
    const planPath = () => `missions/${binding.mission_id}/regional-search/${job.job_id}`;
    const historyPath = () => `missions/${binding.mission_id}/regional-executions`;
    const pendingKey = () => `operator-regional-start:${scope}`;
    function remember(value) {
      pending.current = value;
      try { value ? sessionStorage.setItem(pendingKey(),JSON.stringify(value)) : sessionStorage.removeItem(pendingKey()); } catch { /* Same mounted request still retains its ID. */ }
    }
    async function poll(signal) {
      if (!scope || runtime.current?.polling || requestRef.current) return;
      const state = runtime.current;
      if (!state || state.scope !== scope) return;
      state.polling = true;
      const workerRevision = state.workerRevision;
      try {
        const [available, history] = await Promise.all([api('simulations/regional-executors',undefined,signal),api(historyPath(),undefined,signal)]);
        if (signal.aborted || runtime.current !== state || requestRef.current || state.workerRevision !== workerRevision) return;
        const current = history.find(r => ACTIVE.has(r.state)) || history.find(r => r.job_id === job.job_id) || null;
        const fresh = w => w.ready && Date.now()-Date.parse(w.seen_at) < 4000 && w.package_id === selection?.packageId;
        const chosen = current && ACTIVE.has(current.state) ? current.worker_id : pending.current?.workerId || (pinned.current ? state.workerId : available.find(fresh)?.worker_id || state.workerId);
        state.workerId = chosen;
        setWorkers(available); setWorkerId(chosen);
        const next = current ? await api(`${historyPath()}/${current.execution_id}`,undefined,signal) : null;
        const [ready, cells] = await Promise.all([
          api(planPath()+'/execution-readiness?worker_id='+encodeURIComponent(chosen),undefined,signal),
          next ? api(`${historyPath()}/${next.execution_id}/coverage`,undefined,signal) : Promise.resolve(null)
        ]);
        if (signal.aborted || runtime.current !== state || requestRef.current || state.workerRevision !== workerRevision) return;
        runRef.current = next; setRun(next); setCoverage(cells); setReadiness(ready);
        if (next?.execution_id === pending.current?.executionId) remember(null);
        setLoading(false); setError('');
      } catch (failure) {
        if (!signal.aborted && runtime.current === state) {
          setReadiness(null); setError(failure.name === 'AbortError' ? '실행 상태 조회가 지연되고 있습니다. 연결 후 다시 확인합니다.' : failure.message);
          setLoading(false);
        }
      } finally { state.polling = false; }
    }
    React.useEffect(() => {
      setRun(null); runRef.current = null; setCoverage(null); setReadiness(null); setError(''); setNotice(''); setLoading(!!scope);
      pinned.current = false; pending.current = null; context.current = scope;
      if (!scope) { runtime.current = null; return; }
      try { pending.current = JSON.parse(sessionStorage.getItem(pendingKey()) || 'null'); } catch { /* A corrupt draft never creates a new request. */ }
      const controller = new AbortController(), state = {scope,workerId:'sim-pi-01',workerRevision:0,polling:false};
      runtime.current = state;
      let timer;
      async function tick() {
        await poll(controller.signal);
        if (!controller.signal.aborted) timer = setTimeout(tick,document.hidden ? 5000 : 2000);
      }
      void tick();
      return () => { controller.abort(); clearTimeout(timer); if (runtime.current === state) runtime.current = null; };
    }, [scope]);
    React.useEffect(() => { onLockChange(locked); }, [locked,onLockChange]);
    React.useEffect(() => {
      if (!active && !busy && !pending.current) return;
      const guard = event => {
        const button = event.target?.closest?.('.school-app .sim-header button');
        if (button?.textContent.trim() === '로그아웃') {
          event.preventDefault(); event.stopImmediatePropagation();
          setNotice('정찰 종료·착륙 확인 후 로그아웃해 주세요. 지역수색 경로에서 진행 상태를 확인할 수 있습니다.');
        }
      };
      document.addEventListener('click',guard,true);
      return () => document.removeEventListener('click',guard,true);
    }, [active,busy,pending.current?.executionId]);

    async function command(kind) {
      const state = runtime.current;
      if (!state || requestRef.current) return;
      requestRef.current = true; setBusy(true); setError('');
      try {
        let result;
        if (kind === 'start') {
          if (job.state !== 'READY' || ACTIVE.has(runRef.current?.state)) return;
          const chosen = pending.current?.workerId || state.workerId;
          const ready = await api(planPath()+'/execution-readiness?worker_id='+encodeURIComponent(chosen));
          if (runtime.current !== state) return;
          if (!ready.executable) { setReadiness(ready); setNotice(ready.reasons.map(explain).join(' ')); return; }
          const operation = pending.current || {executionId:crypto.randomUUID(),workerId:chosen,resultHash:job.result_hash};
          if (operation.resultHash !== job.result_hash) throw new Error('저장된 시작 요청과 계획이 다릅니다. 상태 확인이 필요합니다.');
          remember(operation);
          result = await api(planPath()+'/start',{execution_id:operation.executionId,worker_id:operation.workerId,result_hash:operation.resultHash});
          if (runtime.current !== state) return;
          remember(null); setNotice('정찰 요청을 등록했습니다. Unreal 실행기의 수락과 실제 촬영 관측을 기다립니다.');
        } else {
          if (!['QUEUED','RUNNING'].includes(runRef.current?.state)) return;
          result = await api(`${historyPath()}/${runRef.current.execution_id}/stop`,{});
          if (runtime.current !== state) return;
          setNotice('정지·착륙을 요청했습니다. 실제 착륙·무장 해제 확인을 기다립니다.');
        }
        runRef.current = result; setRun(result); setReadiness(null);
      } catch (failure) {
        if (runtime.current === state) { setReadiness(null); setError(failure.name === 'AbortError' ? '서버 응답 지연 · 같은 요청 ID로 재시도합니다.' : failure.message); }
      } finally {
        requestRef.current = false;
        if (runtime.current === state) { setBusy(false); void poll(new AbortController().signal); }
      }
    }
    if (!allowed) return null;
    const executable = !loading && !busy && job?.state === 'READY' && readiness?.executable && !active;
    const status = active ? LABELS[run.state] : loading ? '실행 상태 확인 중' : readiness?.executable ? '경로·실행기 준비 완료' : (readiness?.reasons || []).map(explain).join(' ') || '지역수색 경로를 먼저 준비해 주세요.';
    const telemetry = run?.status?.telemetry || run?.status?.lastState;
    const options = workers.some(w => w.worker_id === workerId) ? workers : [...workers,{worker_id:workerId}];
    return h('section',{className:'operator-sim-execution','aria-label':'Unreal SIM 정찰 실행'},
      h('h3',null,'Unreal SIM 정찰'),
      h('p',{className:'sr-note'},'선택한 지역수색 경로로 이륙·수색·복귀·착륙을 요청합니다.'),
      h('label',null,'시뮬 실행 PC',h('select',{'aria-label':'시뮬 실행 PC',value:workerId,disabled:!scope||loading||busy||active||!!pending.current,onChange:event=>{
        pinned.current=true;runtime.current.workerId=event.target.value;runtime.current.workerRevision++;setWorkerId(event.target.value);setReadiness(null);
        void poll(new AbortController().signal);
      }},...options.map(w=>h('option',{key:w.worker_id,value:w.worker_id},w.worker_id+(w.ready&&Date.now()-Date.parse(w.seen_at)<4000?' · 연결됨':' · 준비 확인'))))),
      h('p',{className:'operator-sim-readiness',role:'status'},status),
      h('div',{className:'sr-actions'},
        h('button',{type:'button',className:'sr-primary',disabled:!executable,onClick:()=>void command('start')},pending.current?'같은 정찰 요청 재시도':'정찰 시작'),
        h('button',{type:'button',disabled:busy||!['QUEUED','RUNNING'].includes(run?.state),onClick:()=>void command('stop')},'정지·착륙')),
      notice&&h('p',{role:'status'},notice),error&&h('p',{role:'alert',className:'sr-warning'},error),
      run&&h('dl',{className:'operator-sim-metrics'},
        h('dt',null,'실행 상태'),h('dd',null,LABELS[run.state]||run.state),
        h('dt',null,'실제 관측률'),h('dd',null,(run.actual?.percent??0).toFixed(2)+'%'),
        h('dt',null,'실제 관측 프레임'),h('dd',null,`${run.applied_sequence??0} / ${run.last_sequence??0}`),
        h('dt',null,'가상 기체'),h('dd',null,run.status?.landedAndDisarmed?'착륙·무장 해제 확인':telemetry?`${telemetry.armed?'무장':'무장 해제'} · ${run.status?.phase||'측정 중'}`:'측정 대기')),
      run&&h('details',null,h('summary',null,'실행 기록'),h('p',null,`실행 ${run.execution_id}`),h('pre',null,JSON.stringify(run.status,null,2))),
      coverage&&h('p',{className:'sr-note'},`서버에 반영된 실제 관측 셀 ${(coverage.features||[]).length}개`));
  };
}
