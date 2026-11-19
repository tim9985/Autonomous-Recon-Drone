export const count = value => Number.isInteger(value) && value >= 0 ? value : 0;
export function analysisPresentation(snapshot){
 if(!snapshot)return {label:'—',message:'기록을 선택하세요.',available:false};
 const a=snapshot.analysis||{},completed=count(a.completed),total=count(snapshot.capture?.frames_stored),running=count(a.running)+count(a.queued),failed=count(a.failed),n=count(snapshot.results_total);
 if(!completed)return {label:running?'분석 중':failed?'분석 실패':'미분석',message:running?'저장 자료의 분석이 진행 중입니다.':failed?'완료된 분석이 없습니다. 실패한 분석 기록을 확인하세요.':'새 분석을 실행하지 않았습니다. 탐지 여부는 아직 판단할 수 없습니다.',available:false};
 const partial=running>0||failed>0||completed<total;
 return {label:n.toLocaleString()+(partial?' · 일부 분석':''),message:partial?`${completed}프레임 분석 · 전체 촬영 중 일부 결과입니다.`:n?'분석된 관측 기록입니다.':'분석이 완료되었으며 탐지 관측은 없습니다.',available:true};
}
export function stage(snapshot) {
  if (!snapshot) return {capture:'waiting',analysis:'waiting',results:'waiting',label:'정찰 기록 대기'};
  const a=snapshot.analysis||{}, n=count(snapshot.capture?.frames_stored);
  if (['FAILED','CANCELLED','EXPIRED'].includes(snapshot.run_state)) return {capture:'error',analysis:'waiting',results:'waiting',label:'정찰 종료 상태 확인 필요'};
  if(snapshot.realtime_vision_enabled&&snapshot.run_state==='RUNNING')return {capture:'active',analysis:'active',results:count(a.completed)?'active':'waiting',label:n?'정찰 중 · 실시간 분석':'정찰 중 · 영상 대기'};
  if (snapshot.run_state!=='COMPLETED') return {capture:'active',analysis:'waiting',results:'waiting',label:n?'영상·자세 저장 중 · 실시간 비전 OFF':'정찰 연결 대기 · 실시간 비전 OFF'};
  if (count(a.running)+count(a.queued)>0) return {capture:'done',analysis:'active',results:'waiting',label:count(a.running)?'정찰 완료 · 저장 자료 GPU 분석 중':'정찰 완료 · 저장 자료 GPU 분석 대기'};
  if (count(a.completed)+count(a.failed)>0) return {capture:'done',analysis:count(a.failed)?'error':'done',results:'active',label:count(a.failed)?'분석 결과 도착 · 실패한 프레임 확인 필요':'분석 완료 · 결과 확인'};
  return {capture:'done',analysis:'waiting',results:'waiting',label:'정찰 완료 · 새 분석 미실행'};
}
export function estimatePosition(value) {
  if (!value || value.status!=='ESTIMATED' || value.validation!=='SIM_GEOMETRY_ONLY') return null;
  return Number.isFinite(value.lon)&&Number.isFinite(value.lat)&&Math.abs(value.lon)<=180&&Math.abs(value.lat)<=90?[value.lon,value.lat]:null;
}
export function validId(value) {return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);}
export function canAnalyze(snapshot,fresh=true) {return fresh&&snapshot?.analysis_policy==='POSTFLIGHT'&&snapshot?.run_state==='COMPLETED'&&count(snapshot.capture?.frames_stored)>count(snapshot.analysis?.completed)+count(snapshot.analysis?.failed)&&!count(snapshot.analysis?.running)&&!count(snapshot.analysis?.queued);}
export function nedPoint(sample) {
  const p=sample?.data?.position;
  return p && Number.isFinite(p.north_m)&&Number.isFinite(p.east_m) ? {north:p.north_m,east:p.east_m,down:Number.isFinite(p.down_m)?p.down_m:null,captured_at:sample.captured_at}:null;
}
