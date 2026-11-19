import {routeInsideRegion,routeActivity} from './local-dashboard-ui.mjs';

export const valid3D=p=>Array.isArray(p)&&p.length>=3&&p.slice(0,3).every(Number.isFinite)&&Math.abs(p[0])<=180&&Math.abs(p[1])<85;
export function trackPaths(rows){
 const paths=[];let path=[];
 for(const row of rows||[]){const g=row?.data?.geographic,p=[g?.longitude,g?.latitude,g?.altitude_m];
  if(valid3D(p))path.push(p);else{if(path.length>1)paths.push(path);path=[];}
 }if(path.length>1)paths.push(path);return paths;
}
export function routeFeatures3D(plan,world){
 const launch=world?.launch?.geographic;
 return (plan?.route_3d?.features||[]).flatMap(f=>{
  if(f.geometry?.type!=='LineString'||f.geometry.coordinates?.length<2||!f.geometry.coordinates.every(valid3D))return [];
  if(f.properties?.altitude_datum==='SIM_SOURCE_DEM')return [f];
  const p=f.properties,origin=p?.origin_geographic;
  if(p?.altitude_datum!=='SIM_LAUNCH_RELATIVE'||p.world_version!==world?.worldVersion||!valid3D(launch)||!origin?.slice(0,2).every(Number.isFinite)||origin.length<2||Math.hypot(origin[0]-launch[0],origin[1]-launch[1])>1e-7)return [];
  return [{...f,geometry:{...f.geometry,coordinates:f.geometry.coordinates.map(c=>[c[0],c[1],c[2]+launch[2]])}}];
 });
}
export function primaryRoute3D(plan,world){
 const id=plan?.kind==='GLOBAL'?plan.tasks?.[0]?.region_id:plan?.region_id;
 return routeFeatures3D(plan,world).filter(f=>f.properties.region_id===id&&(plan.kind!=='GLOBAL'||f.properties.kind!=='return')).flatMap(f=>f.geometry.coordinates);
}
export function groundTrack(rows,onlyMissingHeight=false){
 const paths=[];let path=[];
 for(let i=1;i<(rows||[]).length;i++){
  const points=[rows[i-1],rows[i]].map(row=>{const g=row?.data?.geographic;return [g?.longitude,g?.latitude,g?.altitude_m];});
  if(points.every(p=>p.slice(0,2).every(Number.isFinite))&&(!onlyMissingHeight||!points.every(valid3D))){
   if(!path.length)path.push(points[0].slice(0,2));path.push(points[1].slice(0,2));
  }else if(path.length){paths.push(path);path=[];}
 }if(path.length)paths.push(path);return paths;
}
export function displayPaths({plan,job,world,zones=[],track=[],previousTrack=[],planned=true,actual=true,previous=false,editing=false,connected=true,now=Date.now()/1000}){
 const paths=[],features=routeFeatures3D(plan,world);
 if(planned&&!editing){
  for(const f of features){const kind=f.properties.kind;paths.push({coordinates:f.geometry.coordinates,color:kind==='return'?'#bf7b23':'#6153ba',width:kind==='search'?3.6:3,dash:kind!=='search'});}
  const activity=routeActivity(job,now),rid=plan?.kind==='GLOBAL'?job?.global_status?.current_region:plan?.region_id;
  if(connected&&job?.plan_id===plan?.plan_id&&activity.visible){
   const geometry=zones.find(z=>z.properties?.zoneId===rid)?.geometry;
   for(const f of features.filter(f=>f.properties.region_id===rid&&f.properties.kind==='search'))
    for(const coordinates of routeInsideRegion(f.geometry.coordinates,geometry))paths.push({coordinates,color:activity.stale?'#7d8792':'#087a88',width:4.5,dash:true,animated:activity.animated&&!activity.stale});
  }
 }
 if(previous)for(const coordinates of trackPaths(previousTrack))paths.push({coordinates,color:'#b67c45',width:2.5,dash:true});
 if(actual)for(const coordinates of trackPaths(track))paths.push({coordinates,color:'#138e7b',width:3,dash:false});
 return paths;
}

export function translatedMatrix(matrix,origin){
 const result=new Float32Array(matrix);
 for(let i=0;i<4;i++)result[12+i]=matrix[i]*origin[0]+matrix[4+i]*origin[1]+matrix[8+i]*origin[2]+matrix[12+i];
 return result;
}
export function screenPoint(matrix,point,width,height){
 const clip=[0,0,0,0];for(let i=0;i<4;i++)clip[i]=matrix[i]*point[0]+matrix[4+i]*point[1]+matrix[8+i]*point[2]+matrix[12+i];
 return clip[3]>0?[(clip[0]/clip[3]+1)*width/2,(1-clip[1]/clip[3])*height/2]:null;
}

const vertex=`#version 300 es
precision highp float;
in vec3 a_start; in vec3 a_end; in vec2 a_corner; in vec2 a_distance;
uniform mat4 u_matrix; uniform vec2 u_viewport; uniform float u_width;
out float v_distance; out float v_edge;
void main(){
 vec4 a=u_matrix*vec4(a_start,1.),b=u_matrix*vec4(a_end,1.);
 if(a.w<=0.||b.w<=0.){gl_Position=vec4(2.,2.,2.,1.);v_distance=0.;v_edge=0.;return;}
 vec2 delta=(b.xy/b.w-a.xy/a.w)*u_viewport;
 vec2 normal=vec2(-delta.y,delta.x)/max(length(delta),.001);
 vec4 p=mix(a,b,a_corner.x);p.xy+=normal*a_corner.y*u_width/u_viewport*p.w;
 gl_Position=p;v_distance=mix(a_distance.x,a_distance.y,a_corner.x);v_edge=a_corner.y;
}`;
const fragment=`#version 300 es
precision highp float;
in float v_distance; in float v_edge;
uniform vec4 u_color; uniform float u_dash; uniform float u_phase;
out vec4 color;
void main(){
 if(u_dash>0.&&mod(v_distance-u_phase,14.)>8.)discard;
 float alpha=u_color.a*(1.-smoothstep(.82,1.,abs(v_edge)));
 color=vec4(u_color.rgb*alpha,alpha);
}`;
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);

export function makeSimRouteLayer(lib,{onError=()=>{}}={}){
 const layer={id:'sim-flight-3d',type:'custom',renderingMode:'3d'};
 let map,gl,program,vao,uniforms,attributes,origin=null,matrix=null,paths=[],batches=[],key='',dirty=true,enabled=false,disposed=false,healthy=false;
 const markers=new Map(),corners=[[0,-1],[1,-1],[0,1],[0,1],[1,-1],[1,1]];
 const offsets=new WeakMap();
 function originAt(p){if(origin||!p)return;const v=lib.MercatorCoordinate.fromLngLat(p.slice(0,2),0);origin=[v.x,v.y,v.z];}
 function clean(){if(gl&&!gl.isContextLost()){for(const b of batches)gl.deleteBuffer(b.buffer);if(program)gl.deleteProgram(program);if(vao)gl.deleteVertexArray(vao);}batches=[];program=vao=null;}
 function compile(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const error=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error(error);}return s;}
 function initialize(){
  const a=compile(gl.VERTEX_SHADER,vertex),b=compile(gl.FRAGMENT_SHADER,fragment);program=gl.createProgram();gl.attachShader(program,a);gl.attachShader(program,b);gl.linkProgram(program);gl.deleteShader(a);gl.deleteShader(b);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  uniforms=Object.fromEntries(['matrix','viewport','width','color','dash','phase'].map(n=>[n,gl.getUniformLocation(program,'u_'+n)]));
  attributes=['start','end','corner','distance'].map(n=>gl.getAttribLocation(program,'a_'+n));vao=gl.createVertexArray();dirty=true;healthy=true;
 }
 function buffers(){
  for(const b of batches)gl.deleteBuffer(b.buffer);batches=[];
  originAt(paths[0]?.coordinates?.[0]);
  if(!origin)return;
  for(const path of paths){const data=[];let distance=0;
   for(let i=1;i<path.coordinates.length;i++){
    const a=lib.MercatorCoordinate.fromLngLat(path.coordinates[i-1].slice(0,2),path.coordinates[i-1][2]),b=lib.MercatorCoordinate.fromLngLat(path.coordinates[i].slice(0,2),path.coordinates[i][2]);
    const size=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)/a.meterInMercatorCoordinateUnits();if(size<.001)continue;
    for(const c of corners)data.push(a.x-origin[0],a.y-origin[1],a.z-origin[2],b.x-origin[0],b.y-origin[1],b.z-origin[2],...c,distance,distance+size);
    distance+=size;
   }
   if(!data.length)continue;const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
   batches.push({...path,buffer,count:data.length/10,tone:rgb(path.color)});
  }dirty=false;
 }
 function place(marker,p){
  if(!marker.setOffset)return;
  if(!enabled||!matrix||!valid3D(p)){offset(marker,[0,0]);return;}
  const v=lib.MercatorCoordinate.fromLngLat(p.slice(0,2),p[2]),canvas=map.getCanvas(),screen=screenPoint(matrix,[v.x-origin[0],v.y-origin[1],v.z-origin[2]],canvas.clientWidth,canvas.clientHeight),ground=map.project(p.slice(0,2));
  if(screen)offset(marker,[screen[0]-ground.x,screen[1]-ground.y]);
 }
 function offset(marker,value){const old=offsets.get(marker);if(!old||Math.hypot(old[0]-value[0],old[1]-value[1])>.05){marker.setOffset?.(value);offsets.set(marker,value);}}
 const lost=()=>{program=vao=null;batches=[];matrix=null;dirty=true;};
 const failed=e=>{healthy=false;enabled=false;clean();onError(e);};
 const restored=()=>{if(disposed)return;try{initialize();map.triggerRepaint();}catch(e){failed(e);}};
 layer.onAdd=(m,g)=>{map=m;gl=g;disposed=false;try{initialize();}catch(e){failed(e);}map.getCanvas().addEventListener('webglcontextlost',lost);map.getCanvas().addEventListener('webglcontextrestored',restored);};
 layer.onRemove=()=>{disposed=true;map.getCanvas().removeEventListener('webglcontextlost',lost);map.getCanvas().removeEventListener('webglcontextrestored',restored);for(const marker of markers.keys())marker.setOffset?.([0,0]);markers.clear();clean();};
 layer.setPaths=value=>{const signature=JSON.stringify(value);if(signature===key)return;key=signature;paths=value;dirty=true;map?.triggerRepaint();};
 layer.ready=()=>healthy;
 layer.setEnabled=value=>{value=!!value&&healthy;if(enabled===value)return;enabled=value;for(const [marker,p] of markers)place(marker,p);map?.triggerRepaint();};
 layer.positionMarker=(marker,p)=>{if(!marker)return;if(valid3D(p)){originAt(p);markers.set(marker,p);}else markers.delete(marker);place(marker,p);};
 layer.forgetMarker=marker=>{markers.delete(marker);if(marker)offset(marker,[0,0]);};
 layer.render=(context,args)=>{
  if(!enabled||!program||context.isContextLost())return;
  gl=context;const previousVao=gl.getParameter(gl.VERTEX_ARRAY_BINDING);gl.bindVertexArray(vao);
  try{
   if(dirty)buffers();if(!origin)return;
   matrix=translatedMatrix(args.defaultProjectionData.mainMatrix,origin);
   gl.useProgram(program);gl.uniformMatrix4fv(uniforms.matrix,false,matrix);gl.uniform2f(uniforms.viewport,gl.drawingBufferWidth,gl.drawingBufferHeight);
   gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.CULL_FACE);gl.depthMask(false);
   const moving=!document.hidden&&!matchMedia('(prefers-reduced-motion: reduce)').matches,now=performance.now()/1000,ratio=gl.drawingBufferWidth/map.getCanvas().clientWidth;
   for(const b of batches){
    gl.bindBuffer(gl.ARRAY_BUFFER,b.buffer);
    for(const [i,size,offset] of [[0,3,0],[1,3,3],[2,2,6],[3,2,8]]){const loc=attributes[i];gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,40,offset*4);}
    gl.uniform1f(uniforms.dash,b.dash?1:0);gl.uniform1f(uniforms.phase,b.animated&&moving?now*8:0);
    // Occluded route remains a faint cue; visible geometry shares map depth.
    gl.disable(gl.DEPTH_TEST);gl.uniform1f(uniforms.width,b.width*ratio);gl.uniform4f(uniforms.color,...b.tone,.18);gl.drawArrays(gl.TRIANGLES,0,b.count);
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.uniform1f(uniforms.width,(b.width+2.4)*ratio);gl.uniform4f(uniforms.color,1,1,1,.9);gl.drawArrays(gl.TRIANGLES,0,b.count);
    gl.uniform1f(uniforms.width,b.width*ratio);gl.uniform4f(uniforms.color,...b.tone,1);gl.drawArrays(gl.TRIANGLES,0,b.count);
   }
   for(const [marker,p] of markers)place(marker,p);
   if(moving&&batches.some(b=>b.animated))map.triggerRepaint();
  }finally{gl.bindVertexArray(previousVao);gl.bindBuffer(gl.ARRAY_BUFFER,null);}
 };
 return layer;
}
