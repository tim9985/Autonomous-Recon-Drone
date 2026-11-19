'use strict';
// Display projection only. Flight positions are the server's unmodified NED phases.
globalThis.RegionalMapModel = (() => {
  const a=6378137,e2=.0066943799901413165,k=.9996,ep=e2/(1-e2),rad=Math.PI/180;
  function project([lon,lat]) {
    const p=lat*rad,L=(lon-129)*rad,s=Math.sin(p),c=Math.cos(p),t=Math.tan(p)**2,C=ep*c*c,A=c*L,N=a/Math.sqrt(1-e2*s*s);
    const M=a*((1-e2/4-3*e2**2/64-5*e2**3/256)*p-(3*e2/8+3*e2**2/32+45*e2**3/1024)*Math.sin(2*p)+(15*e2**2/256+45*e2**3/1024)*Math.sin(4*p)-35*e2**3/3072*Math.sin(6*p));
    return [500000+k*N*(A+(1-t+C)*A**3/6+(5-18*t+t*t+72*C-58*ep)*A**5/120),k*(M+N*Math.tan(p)*(A*A/2+(5-t+9*C+4*C*C)*A**4/24+(61-58*t+t*t+600*C-330*ep)*A**6/720))];
  }
  function geographic([x,y]) {
    const mu=y/k/(a*(1-e2/4-3*e2**2/64-5*e2**3/256)),q=(1-Math.sqrt(1-e2))/(1+Math.sqrt(1-e2));
    const p=mu+(3*q/2-27*q**3/32)*Math.sin(2*mu)+(21*q*q/16-55*q**4/32)*Math.sin(4*mu)+151*q**3/96*Math.sin(6*mu)+1097*q**4/512*Math.sin(8*mu);
    const s=Math.sin(p),c=Math.cos(p),T=Math.tan(p)**2,C=ep*c*c,N=a/Math.sqrt(1-e2*s*s),R=a*(1-e2)/(1-e2*s*s)**1.5,D=(x-500000)/(N*k);
    return [129+(D-(1+2*T+C)*D**3/6+(5-2*C+28*T-3*C*C+8*ep+24*T*T)*D**5/120)/c/rad,
      (p-N*Math.tan(p)/R*(D*D/2-(5+3*T+10*C-4*C*C-9*ep)*D**4/24+(61+90*T+298*C+45*T*T-252*ep-3*C*C)*D**6/720))/rad];
  }
  const convert = origin => {const o=project(origin);return p=>geographic([o[0]+p[0],o[1]+p[1]]);};
  function geometry(g,convert) {
    if(!g)return null;
    if(g.type==='GeometryCollection')return {...g,geometries:g.geometries.map(x=>geometry(x,convert))};
    const walk=ps=>typeof ps[0]==='number'?convert(ps):ps.map(walk);
    return {...g,coordinates:walk(g.coordinates)};
  }
  function at(execution,stamp) {
    let elapsed=0,pos=execution.entryNed,yaw=execution.entryYaw||0;const passed=[pos];
    for(const leg of execution.legs){for(const p of leg.phases){
      const f=Math.max(0,Math.min(1,(stamp-elapsed)/p.seconds));
      pos=p.start.map((v,i)=>v+(p.end[i]-v)*f);yaw=p.yaw+p.delta*f;passed.push(pos);elapsed+=p.seconds;
      if(stamp<=elapsed)return {pos,yaw,passed};
    }elapsed+=leg.otherSeconds||0;if(stamp<=elapsed)return {pos,yaw,passed};}
    return {pos,yaw,passed};
  }
  return {project,geographic,convert,geometry,at};
})();
