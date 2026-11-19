// Session-scoped byte cache. Never stores telemetry, plans, credentials or user records.
const cancelled=()=>new DOMException('Tile no longer needed','AbortError');
function delay(ms,signal){return new Promise((resolve,reject)=>{
 if(signal.aborted){reject(cancelled());return;}
 const abort=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);reject(cancelled());};
 const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},ms);signal.addEventListener('abort',abort,{once:true});
});}
export class TileResourceCache{
 constructor({fetcher=fetch,maxBytes=64*1024*1024,onUpdate=()=>{},onUnauthorized=()=>{},pause=delay}={}){
  Object.assign(this,{fetcher,maxBytes,onUpdate,onUnauthorized,pause});this.cache=new Map();this.pending=new Map();this.bytes=0;this.closed=false;
  this.stats={requests:0,baseRequests:0,regionRequests:0,hits:0,retries:0,failures:0};
 }
 report(){this.onUpdate({...this.stats,bytes:this.bytes,pending:this.pending.size});}
 remember(url,data){
  if(this.closed||data.byteLength>this.maxBytes)return;
  if(this.cache.has(url)){this.bytes-=this.cache.get(url).byteLength;this.cache.delete(url);}
  this.cache.set(url,data);this.bytes+=data.byteLength;
  while(this.bytes>this.maxBytes){const key=this.cache.keys().next().value;this.bytes-=this.cache.get(key).byteLength;this.cache.delete(key);}
 }
 async load(url,signal){
  let last;
  for(let attempt=0;attempt<3;attempt++){
   if(signal.aborted)throw cancelled();
   if(attempt){this.stats.retries++;this.report();await this.pause([0,400,1600][attempt],signal);}
   const abort=new AbortController(),cancel=()=>abort.abort();signal.addEventListener('abort',cancel,{once:true});
   const timeout=setTimeout(()=>abort.abort(),21000);
   try{
    this.stats.requests++;this.stats[url.includes('/display/')?'regionRequests':'baseRequests']++;this.report();
    const response=await this.fetcher(url,{credentials:'same-origin',cache:'no-cache',signal:abort.signal});
    if(response.status===401){this.onUnauthorized();throw Object.assign(Error('로그인이 만료되었습니다.'),{status:401});}
    if(!response.ok)throw Object.assign(Error('지도 타일 연결 지연'),{status:response.status});
    const data=await response.arrayBuffer();
    if(data.byteLength>8*1024*1024)throw Object.assign(Error('Invalid tile size'),{status:422});
    if(url.endsWith('.png')&&new Uint8Array(data).slice(0,8).join(',')!=='137,80,78,71,13,10,26,10')throw Object.assign(Error('Invalid map tile'),{status:502});
    if(signal.aborted)throw cancelled();this.remember(url,data);return data;
   }catch(e){last=e;if(signal.aborted)throw cancelled();if(e.status&&e.status!==429&&e.status<500)throw e;}
   finally{clearTimeout(timeout);signal.removeEventListener('abort',cancel);}
  }
  this.stats.failures++;this.report();throw last;
 }
 get(url,signal){
  if(this.closed||signal.aborted)return Promise.reject(cancelled());
  if(!url.startsWith('/api/v1/')||url.includes('..'))return Promise.reject(Error('Only local map APIs are allowed'));
  const cached=this.cache.get(url);
  if(cached){this.cache.delete(url);this.cache.set(url,cached);this.stats.hits++;this.report();return Promise.resolve(cached.slice(0));}
  let task=this.pending.get(url);
  if(task?.controller.signal.aborted){this.pending.delete(url);task=null;}
  if(!task){
   task={controller:new AbortController(),users:0,done:false,abandon:null};this.pending.set(url,task);
   task.promise=this.load(url,task.controller.signal);
   const end=()=>{task.done=true;clearTimeout(task.abandon);if(this.pending.get(url)===task)this.pending.delete(url);this.report();};task.promise.then(end,end);
  }
  clearTimeout(task.abandon);
  task.users++;
  return new Promise((resolve,reject)=>{
   let settled=false;
   const finish=(error,data)=>{if(settled)return;settled=true;signal.removeEventListener('abort',abort);task.users--;
    // Let an almost-finished parent tile enter the cache during a zoom animation.
    // A quick zoom back reuses this request; truly obsolete work is still cancelled.
    if(!task.users&&!task.done)task.abandon=setTimeout(()=>{if(!task.users&&!task.done)task.controller.abort();},750);
    error?reject(error):resolve(data.slice(0));};
   const abort=()=>finish(cancelled());signal.addEventListener('abort',abort,{once:true});
   task.promise.then(data=>finish(null,data),e=>finish(e));
  });
 }
 close(){this.closed=true;for(const task of this.pending.values()){clearTimeout(task.abandon);task.controller.abort();}this.pending.clear();this.cache.clear();this.bytes=0;this.report();}
}

export function tilePath(url,release,display){
 if(!/^[a-zA-Z0-9_-]{1,128}$/.test(release)||!(/^[a-f0-9]{16}$/).test(display.build_id))throw Error('Invalid display release');
 const parsed=/^recon-map:\/\/(base|regions)\/(\d+)\/(\d+)\/(\d+)\.(png|pbf)$/.exec(url);
 if(!parsed)throw Error('Invalid local tile URL');
 const [,kind,zs,xs,ys,ext]=parsed,z=Number(zs),x=Number(xs),y=Number(ys);
 if(z<0||z>(kind==='base'?19:display.maxzoom)||x>=2**z||y>=2**z||ext!==(kind==='base'?'png':'pbf'))throw Error('Invalid local tile coordinates');
 return kind==='base'?`/api/v1/local-search/real-map/tiles/${z}/${x}/${y}.png`:`/api/v1/spatial-releases/${release}/display/${display.build_id}/${z}/${x}/${y}.pbf`;
}
