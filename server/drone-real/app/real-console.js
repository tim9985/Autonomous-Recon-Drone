'use strict';

const loginForm = document.querySelector('#login');
const bench = document.querySelector('#bench');
const consolePanel = document.querySelector('#console');
const submit = document.querySelector('#submit');
const message = document.querySelector('#message');
const result = document.querySelector('#result');
const gateway = document.querySelector('#gateway');
let csrf = '';
let connected = false;
let pending = null;
let retry = null;
let busy = false;
let epoch = 0;
const errors = {
  SESSION_EXPIRED: '로그인 세션이 끝났습니다. 다시 로그인하세요.',
  INVALID_CREDENTIALS: '아이디 또는 비밀번호를 확인하세요.',
  BENCH_GATEWAY_OFFLINE: '시험용 게이트웨이 연결을 확인하세요.',
  BENCH_JOB_PENDING: '이 기체에 결과를 기다리는 시험이 있습니다.',
};

async function api(path, method = 'GET', body) {
  const res = await fetch('/api/v1' + path, {
    method, headers: {'Content-Type': 'application/json', 'X-CSRF-Token': csrf},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = data.error?.code || (typeof data.detail === 'string' ? data.detail : `HTTP ${res.status}`);
    throw new Error(errors[code] || code);
  }
  return data;
}

function reset() {
  epoch++;
  csrf = '';
  connected = false;
  pending = retry = null;
  loginForm.hidden = false;
  consolePanel.hidden = true;
  submit.disabled = true;
  result.textContent = '';
}

async function enter() {
  const me = await api('/auth/me');
  const readiness = await api('/readiness');
  if (readiness.environment !== 'REAL') throw new Error('REAL 환경을 확인하세요.');
  csrf = me.csrf_token;
  const drones = await api('/drones');
  const allowed = new Set(me.permissions.filter(p => p.scopes.includes('control')).map(p => p.drone_id));
  bench.elements.drone.replaceChildren(...drones.filter(d => allowed.has(d.drone_id)).map(d => new Option(d.name || d.drone_id, d.drone_id)));
  document.querySelector('#readiness').textContent = '환경 REAL · 비행제어기 송신 차단 · 지상 전달 시험만 제공';
  loginForm.hidden = true;
  consolePanel.hidden = false;
  await refresh();
}

async function refresh() {
  if (consolePanel.hidden) return;
  const generation = epoch;
  const did = bench.elements.drone.value;
  try {
    const status = did ? await api(`/drones/${encodeURIComponent(did)}/bench`) : {connected: false};
    if (generation !== epoch || did !== bench.elements.drone.value) return;
    connected = status.connected;
    gateway.textContent = connected ? `시험용 게이트웨이 연결 · ${status.mode === 'MOCK' ? '모의 수신' : '실물 FC 읽기'}` : did ? '시험용 게이트웨이 연결 대기' : '제어 권한이 있는 REAL 기체가 없습니다.';
    if (pending) {
      const current = pending;
      const job = await api(`/missions/${current.mission}/bench/${current.job}`);
      if (generation !== epoch || pending !== current) return;
      if (job.state === 'REPORTED') {
        const labels = {MOCK_RECEIVED: '모의 게이트웨이 수신 확인', FC_HEARTBEAT_OBSERVED: '실물 FC heartbeat 관측', FC_HEARTBEAT_MISSING: '실물 FC heartbeat 미확인'};
        result.textContent = `${labels[job.result.code]}\n시험 ID ${job.job_id}\n비행 명령 송신 없음`;
        pending = retry = null;
      } else if (job.state === 'EXPIRED') {
        result.textContent = `응답 대기 시간 초과\n시험 ID ${job.job_id}`;
        pending = retry = null;
      }
    }
  } catch (err) {
    if (generation !== epoch) return;
    connected = false;
    gateway.textContent = err.message;
  }
  submit.disabled = busy || Boolean(pending) || !connected;
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.textContent = '';
  const values = Object.fromEntries(new FormData(loginForm));
  try {
    await api('/auth/login', 'POST', values);
    await enter();
  } catch (err) { message.textContent = err.message; }
  finally { loginForm.elements.password.value = ''; }
});

document.querySelector('#logout').addEventListener('click', async () => {
  try { await api('/auth/logout', 'POST', {}); reset(); }
  catch (err) { message.textContent = err.message; }
});

bench.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!connected || busy || pending) return;
  busy = true;
  submit.disabled = true;
  message.textContent = '';
  const values = new FormData(bench);
  const drone = values.get('drone');
  const waypoint = {latitude: Number(values.get('latitude')), longitude: Number(values.get('longitude')), relative_altitude_m: Number(values.get('altitude'))};
  const key = JSON.stringify({drone, waypoint});
  if (retry?.key !== key) retry = {key, mission: crypto.randomUUID(), job: crypto.randomUUID()};
  const current = retry;
  const generation = epoch;
  try {
    await api('/missions', 'POST', {mission_id: current.mission, drone_id: drone, environment: 'REAL'});
    if (generation !== epoch) return;
    const job = await api(`/missions/${current.mission}/bench`, 'POST', {job_id: current.job, waypoint});
    if (generation !== epoch) return;
    pending = current;
    result.textContent = `서버 접수 · 게이트웨이 회신 대기\n시험 ID ${job.job_id}`;
  } catch (err) { message.textContent = err.message; }
  finally { busy = false; await refresh(); }
});

bench.elements.drone.addEventListener('change', () => { connected = false; submit.disabled = true; void refresh(); });
enter().catch(() => reset());
setInterval(refresh, 2000);
