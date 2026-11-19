async function refresh(){for(const [id,path] of [['status','status'],['records','probes']]){const el=document.getElementById(id);try{const r=await fetch('/api/v1/'+path,{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);el.textContent=JSON.stringify(await r.json(),null,2)}catch(e){el.textContent='조회 실패: '+e.message}}}refresh();setInterval(refresh,30000);

