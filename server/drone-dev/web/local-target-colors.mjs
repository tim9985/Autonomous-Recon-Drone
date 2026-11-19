export const targetPalette=[
 ['red','빨강','#c94b49'],['orange','주황','#e48835'],['yellow','노랑','#edc94b'],['green','초록','#438c64'],
 ['blue','파랑','#4289be'],['navy','남색','#283e69'],['purple','보라','#865aab'],['pink','분홍','#df92af'],
 ['white','흰색','#ffffff'],['gray','회색','#959da5'],['black','검정','#303940'],['brown','갈색','#8b624b']
].map(([id,label,hex])=>({id,label,hex}));
const normal=c=>c==='grey'?'gray':c;
export function colorMatch(row,colors){
 const upper=row?.appearance?.upper;if(upper?.status!=='OK')return null;
 const wanted=new Set(colors);
 return (upper.top||[]).slice(0,2).map((v,rank)=>({...v,color:normal(v.color),rank:rank+1}))
  .find(v=>wanted.has(v.color)&&Number.isFinite(v.p)&&v.p>=0&&v.p<=1&&(v.rank===1||v.p>=.3))||null;
}
export function matchedCandidates(data,colors){
 if(!colors.length)return [];
 return (data?.groups||[]).flatMap(g=>{
  const seen=new Set(),matches=g.observations.flatMap(row=>{
   if(seen.has(row.observation_id)||data.reviews?.[row.observation_id]?.status==='DISMISSED')return [];
   seen.add(row.observation_id);const match=colorMatch(row,colors);return match?[{row,match}]:[];
  });
  matches.sort((a,b)=>b.match.p-a.match.p||String(a.row.observation_id).localeCompare(String(b.row.observation_id)));
  return matches.length?[{...g,matches,row:matches[0].row,match:matches[0].match}]:[];
 }).sort((a,b)=>String(b.last_at||'').localeCompare(String(a.last_at||''))||a.id.localeCompare(b.id));
}
