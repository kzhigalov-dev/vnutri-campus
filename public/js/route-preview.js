// Presentation only. Retains every route waypoint, including stair transitions.
export function createRoutePreview(route,world){
 if(!route)return {legs:[],length:0,start:null};
 const legs=[];let total=0,last=null,start=null;
 function point(floor,p){return {position:world(floor,p,.27),floor};}
 function append(next,connection=false){
  start??=next;
  if(last){const distance=Math.hypot(...next.position.map((v,i)=>v-last.position[i]));if(distance>1e-7){legs.push({from:last,to:next,start:total,end:total+distance,connection});total+=distance;}}
  last=next;
 }
 // Segments and connections are ordered independently by the routing engine.
 // Match each segment's floor to the next connection; never interpolate over rooms.
 let index=0;
 for(const segment of route.segments){
  while(index<route.connections.length&&last&&last.floor!==segment.floor){const c=route.connections[index++];append(point(c.fromFloor,c.from));append(point(c.toFloor,c.to),true);}
  for(const p of segment.points)append(point(segment.floor,p));
 }
 while(index<route.connections.length){const c=route.connections[index++];append(point(c.fromFloor,c.from));append(point(c.toFloor,c.to),true);}
 return {legs,length:total,start};
}
export function sampleRoutePreview(path,progress){
 if(!path?.start)return null;
 const t=Number.isFinite(progress)?Math.max(0,Math.min(1,progress)):0,distance=t*path.length;
 const leg=path.legs.find(l=>l.end>=distance)||path.legs.at(-1);
 if(!leg)return {...path.start,connection:false,progress:t};
 const local=(distance-leg.start)/(leg.end-leg.start);
 return {position:leg.from.position.map((v,i)=>v+(leg.to.position[i]-v)*local),floor:local>=1?leg.to.floor:leg.from.floor,toFloor:leg.to.floor,connection:leg.connection,progress:t};
}
