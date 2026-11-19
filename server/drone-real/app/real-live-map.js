'use strict';

(() => {
  const panel = document.querySelector('#live-map-panel');
  const canvas = panel.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const field = name => panel.querySelector(`[data-live-field="${name}"]`);
  const selector = document.querySelector('#bench [name="drone"]');
  const consolePanel = document.querySelector('#console');
  let outline, marker, busy = false;

  function draw() {
    if (!outline || consolePanel.hidden) return;
    const dpr = devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = w*dpr;
    canvas.height = h*dpr;
    ctx.scale(dpr,dpr);
    ctx.fillStyle = '#14252c';
    ctx.fillRect(0,0,w,h);
    const [left,bottom,right,top] = outline.bounds;
    const aspect = Math.cos((top+bottom)*Math.PI/360);
    const scale = Math.min((w-28)/((right-left)*aspect),(h-28)/(top-bottom));
    const x = lon => w/2 + (lon-(right+left)/2)*scale*aspect;
    const y = lat => h/2 - (lat-(top+bottom)/2)*scale;
    ctx.fillStyle = '#476972';
    ctx.strokeStyle = '#6d8990';
    ctx.lineWidth = 0.5;
    for (const ring of outline.outlines) {
      ctx.beginPath();
      ring.forEach(([lon,lat],i) => i === 0 ? ctx.moveTo(x(lon),y(lat)) : ctx.lineTo(x(lon),y(lat)));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    if (marker) {
      ctx.beginPath();
      ctx.arc(x(marker.lon),y(marker.lat),6,0,Math.PI*2);
      ctx.fillStyle = '#9cf6cd';
      ctx.fill();
    }
    ctx.fillStyle = '#d4e4e7';
    ctx.font = '13px system-ui';
    ctx.fillText('↑ 북',13,22);
  }

  function render(result) {
    const sample = result?.sample;
    const live = result?.state === 'LIVE';
    panel.dataset.status = result?.state || 'WAITING';
    field('link').textContent = live ? '실시간 수신' : result?.state === 'STALE' ? '갱신 중단 · 마지막 값' :
      result?.state === 'UNAVAILABLE' ? '서버 응답 없음' : '상태 수신 대기';
    field('armed').textContent = typeof sample?.armed === 'boolean' ? (sample.armed ? '무장' : '비무장') : '—';
    field('battery').textContent = Number.isFinite(sample?.battery_voltage_v) ?
      `${sample.battery_voltage_v.toFixed(2)} V · ${sample.battery_remaining_percent ?? '—'}%` : '—';
    field('gps').textContent = sample ? `Fix ${sample.gps_fix_type ?? '—'} · 위성 ${sample.satellites_visible ?? '—'}개` : '—';
    field('time').textContent = sample?.received_at ? new Date(sample.received_at).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul'}) : '—';
    const p = live && sample?.position;
    const bounds = outline?.bounds;
    marker = p && bounds && p.lon >= bounds[0] && p.lon <= bounds[2] && p.lat >= bounds[1] && p.lat <= bounds[3] ? p : null;
    field('position').textContent = marker ? '캠퍼스 내 기체 위치' : p ? '현재 기체 위치가 지도 범위 밖입니다.' :
      live ? 'GPS 위치 미확정' : '유효한 실시간 위치 대기 중';
    draw();
  }

  async function refresh() {
    if (busy || consolePanel.hidden || !selector.value) return;
    const drone = selector.value;
    busy = true;
    try {
      const response = await fetch(`/api/v1/drones/${encodeURIComponent(drone)}`, {cache:'no-store',signal:AbortSignal.timeout(4000)});
      if (consolePanel.hidden || selector.value !== drone) return;
      if (!response.ok) { render({state:'UNAVAILABLE'}); return; }
      const data = await response.json();
      if (!consolePanel.hidden && selector.value === drone) render(data.live_telemetry);
    } catch {
      if (!consolePanel.hidden && selector.value === drone) render({state:'UNAVAILABLE'});
    } finally {
      busy = false;
    }
  }

  fetch('/real-live-campus.json',{cache:'no-store'}).then(r => {
    if (!r.ok) throw new Error('Map unavailable');
    return r.json();
  }).then(value => { outline=value; draw(); }).catch(() => { field('map').textContent='지도 자료를 불러오지 못했습니다.'; });
  selector.addEventListener('change',() => { render(null); void refresh(); });
  window.addEventListener('resize',draw);
  setInterval(refresh,2000);
  void refresh();
})();
