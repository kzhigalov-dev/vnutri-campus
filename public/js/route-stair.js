// The route graph contains floor endpoints, not measured stair geometry. This
// switchback is an illustration; it must not be used for navigation distances.
export function buildRouteStair(connection, world) {
 const from=world(connection.fromFloor,connection.from,.18);
 const to=world(connection.toFloor,connection.to,.18);
 const ascending=from[1]<=to[1], low=ascending?from:to, high=ascending?to:from;
 const height=high[1]-low[1];
 if(height<1e-7)return {treads:[],landings:[],path:[from,to],connector:Math.hypot(...from.map((v,i)=>v-to[i]))>1e-7?[from,to]:null};

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
