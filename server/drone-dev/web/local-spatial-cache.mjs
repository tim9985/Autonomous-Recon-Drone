// Display caches never contain live telemetry, coverage, plans, or mission decisions.
export function containsBounds(outer,inner){return outer[0]<=inner[0]&&outer[1]<=inner[1]&&outer[2]>=inner[2]&&outer[3]>=inner[3];}
export function paddedBounds(bounds,limit,padding=.2){
 const dx=(bounds[2]-bounds[0])*padding,dy=(bounds[3]-bounds[1])*padding;
 return [Math.max(limit[0],bounds[0]-dx),Math.max(limit[1],bounds[1]-dy),Math.min(limit[2],bounds[2]+dx),Math.min(limit[3],bounds[3]+dy)];
}
export class SpatialViewportCache{
 constructor(capacity=6){this.capacity=capacity;this.entries=[];}
 find(release,bounds){
  const i=this.entries.findIndex(e=>e.release===release&&containsBounds(e.bounds,bounds));
  if(i<0)return null;const [entry]=this.entries.splice(i,1);this.entries.unshift(entry);return entry;
 }
 put(release,bounds,page){
  if(page.more)return;
  this.entries.unshift({release,bounds:[...bounds],features:page.features});this.entries.length=Math.min(this.entries.length,this.capacity);
 }
 clear(){this.entries=[];}
}
export const mapViewUrl=path=>path+(path.includes('?')?'&':'?')+'view=map';
export async function loadCampusDisplay(manifest,fetchJson,callbacks){
 const paths={buildings:manifest.web.buildingsUrl,facilities:manifest.web.facilitiesUrl,
  regions:`/api/environments/${manifest.environmentId}/${manifest.worldVersion}/school-tools/search-zones`};
 // Each layer appears as soon as it arrives. A slow or failed decoration cannot hold the others.
 return Promise.allSettled(Object.entries(paths).map(async([kind,path])=>{
  const data=path?await fetchJson(mapViewUrl(path)):null;
  await callbacks[kind](data);return kind;
 }));
}
