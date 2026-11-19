// The PC transport is distinct from drone telemetry; opening this help never flies.
const button=document.createElement('button');
button.className='school-pc-button';button.type='button';button.textContent='PC 연결';
button.setAttribute('aria-haspopup','dialog');
const dialog=document.createElement('dialog');dialog.className='school-pc-dialog';
dialog.innerHTML=`<form method="dialog"><button class="school-pc-close" aria-label="닫기">×</button></form>
<h2>내 PC 시뮬레이터</h2><p class="school-pc-state" role="status">연결 확인 중</p>
<ol><li>새 PC는 기본 설치 파일과 SIM 자료를 받아 <code>Install-SchoolPC.ps1</code> 실행</li><li>연결기를 종료한 상태에서 개인 계정용 PC 업데이트 적용</li><li><code>Start-SchoolPC.ps1</code> 실행 후 웹과 같은 개인 계정으로 로그인</li></ol>
<p>이후 이 화면에서 구역 선택 → 예상 경로 확인 → 드론 연결 → 출발 순서로 진행합니다.</p>
<p><a href="https://drive.google.com/drive/folders/<TEAM_DRIVE_FOLDER_ID>" target="_blank" rel="noopener noreferrer">새 PC 기본 설치</a> · <a href="https://drive.google.com/drive/folders/<TEAM_DRIVE_FOLDER_ID>" target="_blank" rel="noopener noreferrer">개인 계정용 PC 업데이트</a></p>`;
document.body.append(dialog);
const appbar=document.querySelector('.appbar');
const desktopHost=appbar?.querySelector('.environment')||appbar;
const mobileViewport=matchMedia('(max-width:1023px)');
function placeConnectionButton(){
  const mobileHost=appbar?.querySelector('.mobile-environment .environment-switch');
  const host=mobileViewport.matches&&mobileHost?mobileHost:desktopHost;
  if(host&&button.parentElement!==host)host.append(button);
  if(document.body.dataset.workspace!=='real-map'){
    const label=appbar?.querySelector('.mobile-environment > summary');
    if(label&&label.textContent!=='학교 SIM')label.textContent='학교 SIM';
  }
}
if(document.body.dataset.workspace!=='real-map')document.title='학교 정찰 관제';
placeConnectionButton();
mobileViewport.addEventListener('change',placeConnectionButton);
// Mobile navigation mounts asynchronously. Move the same button, without
// remounting the map or creating duplicate controls as the viewport changes.
if(appbar)new MutationObserver(placeConnectionButton).observe(appbar,{childList:true,subtree:true});
button.onclick=()=>{appbar?.querySelector('.mobile-environment')?.removeAttribute('open');dialog.showModal();};
async function refresh(){
  try{const r=await fetch('/api/v1/pc-sync/status',{credentials:'same-origin',cache:'no-store'});
    if(r.status===401){button.hidden=true;return;}if(!r.ok)throw new Error();
    const p=await r.json();button.hidden=false;button.textContent=p.online?'PC 연결됨':'PC 연결';button.dataset.connected=p.online?'true':'false';
    dialog.querySelector('.school-pc-state').textContent=p.online?`${p.label} · 연결됨`:'PC 연결기를 실행하세요.';
  }catch{button.textContent='PC 연결 확인';button.dataset.connected='false';}
}
refresh();setInterval(refresh,10000);
const loginForm=document.querySelector('#login-form');
if(loginForm){
  const hint=document.querySelector('#login-panel > p:not(.eyebrow)');
  if(hint)hint.textContent='개인 관제 계정으로 로그인하세요. SIM을 사용할 때는 PC 연결기에도 같은 계정을 입력하세요.';
}
