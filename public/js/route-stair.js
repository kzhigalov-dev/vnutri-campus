// The route graph contains floor endpoints, not measured stair geometry. This
// switchback is an illustration; it must not be used for navigation distances.
export function buildRouteStair(connection, world, layout) {
 const from=world(connection.fromFloor,connection.from,.18);
 const to=world(connection.toFloor,connection.to,.18);
 const ascending=from[1]<=to[1], low=ascending?from:to, high=ascending?to:from;
 const height=high[1]-low[1];
 if(height<1e-7)return {treads:[],landings:[],path:[from,to],connector:Math.hypot(...from.map((v,i)=>v-to[i]))>1e-7?[from,to]:null};
 if(layout)return buildPlannedStair(low,high,ascending,layout);

 // Keep the stairs a reasonable size even if the floor registrations differ
 // greatly. Any remaining horizontal displacement is a level approach.
 const dx=high[0]-low[0], dz=high[2]-low[2], distance=Math.hypot(dx,dz);
 const axis=distance>1e-7?[dx/distance,dz/distance]:[1,0];
 const side=[-axis[1],axis[0]], width=1, separation=1.2, going=.3;
 const count=Math.max(2,Math.ceil(height/.33)), first=Math.ceil(count/2), second=count-first;
 const rise=height/count, run=first*going, thickness=.1, landingDepth=1;
 const rotationY=Math.atan2(axis[0],axis[1]);
 const at=(along,across,y)=>[low[0]+axis[0]*along+side[0]*across,y,low[2]+axis[1]*along+side[1]*across];
 const treads=[], path=[low];
 const addTread=(along,across,y)=>{
  const point=at(along,across,y);
  treads.push({position:[point[0],point[1]-thickness/2,point[2]],size:[width,thickness,going],rotationY});
  path.push(point);
 };
 for(let i=0;i<first;i++)addTread((i+.5)*going,0,low[1]+(i+1)*rise);
 const landingY=low[1]+first*rise, landingAlong=run+landingDepth/2;
 const landingCenter=at(landingAlong,separation/2,landingY);
 const lowerCenter=at(-landingDepth/2,0,low[1]);
 const upperCenter=at(run-second*going-landingDepth/2,separation,high[1]);
 const slab=(center,size)=>({position:[center[0],center[1]-thickness/2,center[2]],size,rotationY});
 const landings=[slab(lowerCenter,[width,thickness,landingDepth]),slab(landingCenter,[width+separation,thickness,landingDepth]),slab(upperCenter,[width,thickness,landingDepth])];
 path.push(at(landingAlong,0,landingY),at(landingAlong,separation,landingY));
 // If the flights have different step counts, align their far ends at the landing.
 for(let i=0;i<second;i++)addTread(run-(i+.5)*going,separation,low[1]+(first+i+1)*rise);
 path.push(upperCenter,high);
 const connector=Math.hypot(high[0]-upperCenter[0],high[2]-upperCenter[2])>1e-7?[upperCenter,high]:null;
 return {treads,landings,path:ascending?path:path.reverse(),connector:ascending||!connector?connector:connector.reverse()};
}

export function buildPlannedStair(low,high,ascending,{center,axis,length,width}){
 const side=[axis[1],-axis[0]],thickness=.08;
 const flightWidth=width*.46, separation=width*.54;
 const landingDepth=length*.2, count=8, run=length-2*landingDepth, going=run/count;
 const rotationY=Math.atan2(axis[0],axis[1]);
 const rise=(high[1]-low[1])/(count*2);
 const at=(along,across,y)=>[
  center[0]+axis[0]*along+side[0]*across,y,center[2]+axis[1]*along+side[1]*across,
 ];
 const part=(point,w,d)=>({position:[point[0],point[1]-thickness/2,point[2]],size:[w,thickness,d],rotationY});
 const start=-length/2+landingDepth, end=length/2-landingDepth;
 const lower=at(start-landingDepth/2,-separation/2,low[1]);
 const upper=at(start-landingDepth/2,separation/2,high[1]);
 const midY=low[1]+count*rise;
 const landing=at(end+landingDepth/2,0,midY);
 const treads=[],path=[low,lower];
 for(let i=0;i<count;i++){
  const step=at(start+(i+.5)*going,-separation/2,low[1]+(i+1)*rise);
  treads.push(part(step,flightWidth,going));
  path.push(step);
 }
 path.push(at(end+landingDepth/2,-separation/2,midY),at(end+landingDepth/2,separation/2,midY));
 for(let i=0;i<count;i++){
  const step=at(end-(i+.5)*going,separation/2,midY+(i+1)*rise);
  treads.push(part(step,flightWidth,going));
  path.push(step);
 }
 path.push(upper,high);
 const landings=[part(lower,flightWidth,landingDepth),part(landing,width,landingDepth),part(upper,flightWidth,landingDepth)];
 const connectors=[[low,lower],[upper,high]].filter(([a,b])=>Math.hypot(a[0]-b[0],a[2]-b[2])>1e-7);
 return {treads,landings,path:ascending?path:path.reverse(),connectors:ascending?connectors:connectors.reverse().map(pair=>pair.reverse())};
}
