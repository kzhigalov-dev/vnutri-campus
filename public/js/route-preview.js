// Presentation only. Retains every route waypoint, including stair transitions.
export function createRoutePreview(route,world,stairPath=()=>null){
 if(!route)return {legs:[],length:0,start:null};
 const legs=[];let total=0,last=null,start=null,step=0;
 function point(floor,p){return {position:world(floor,p,.27),floor};}
 function append(next,transition=null){
  start??=next;
  if(last){const distance=Math.hypot(...next.position.map((v,i)=>v-last.position[i]));if(distance>1e-7){
   legs.push({from:last,to:next,start:total,end:total+distance,connection:Boolean(transition),toFloor:transition?.toFloor??next.floor,step,arrives:transition?.arrives??false});
   total+=distance;
  }}
  if(transition?.arrives)step++;
  last=next;
 }
 function appendConnection(connection){
  const {fromFloor,toFloor,from,to}=connection;
  const approach=point(fromFloor,from),arrival=point(toFloor,to);
  const positions=stairPath(connection)??[approach.position,arrival.position];
  append({floor:fromFloor,position:positions[0]});
  positions.slice(1).forEach((position,i)=>{
   const arrives=i===positions.length-2;
   append({floor:arrives?toFloor:fromFloor,position},{toFloor,arrives});
  });
 }
 // A visit counts the transitions preceding a segment. Two visits to the same
 // floor can have no corridor segment on the floor between them.
 let index=0;
 for(const segment of route.segments){
  while(index<route.connections.length
   &&(segment.visit===undefined?(last?.floor??route.connections[index].fromFloor)!==segment.floor:index<segment.visit)){
   appendConnection(route.connections[index++]);
  }
  for(const p of segment.points)append(point(segment.floor,p));
 }
 while(index<route.connections.length)appendConnection(route.connections[index++]);
 return {legs,length:total,start};
}
export function sampleRoutePreview(path,progress){
 if(!path?.start)return null;
 const t=Number.isFinite(progress)?Math.max(0,Math.min(1,progress)):0,distance=t*path.length;
 const leg=path.legs.find(l=>l.end>=distance)||path.legs.at(-1);
 if(!leg)return {...path.start,connection:false,progress:t,step:0};
 const local=(distance-leg.start)/(leg.end-leg.start);
 return {position:leg.from.position.map((v,i)=>v+(leg.to.position[i]-v)*local),floor:local>=1?leg.to.floor:leg.from.floor,toFloor:leg.toFloor,connection:leg.connection,progress:t,step:leg.step+(local>=1&&leg.arrives?1:0)};
}

// A direction is described only for a substantial bend in the computed path.
// Coordinates have the same orientation as the floor plan (x right, y down).
export function routeFloorInstruction(route,index){
 const floor=route?.floors?.[index],connection=route?.connections?.[index];
 if(floor===undefined)return '';
 if(connection?.kind==='lift')return `К лифту · перейти на ${connection.toFloor}-й этаж`;
 const uniqueFloor=route.floors.indexOf(floor)===route.floors.lastIndexOf(floor);
 const turns=[];let ambiguous=false;
 const segments=route.segments.filter(segment=>segment.floor===floor&&(segment.visit===undefined?uniqueFloor:segment.visit===index));
 for(const segment of segments){
  const points=segment.points.filter((p,i,a)=>i===0||Math.hypot(p[0]-a[i-1][0],p[1]-a[i-1][1])>1e-7);
  for(let i=1;i<points.length-1;i++){
   const a=[points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]],b=[points[i+1][0]-points[i][0],points[i+1][1]-points[i][1]];
   const la=Math.hypot(...a),lb=Math.hypot(...b),cross=a[0]*b[1]-a[1]*b[0],dot=a[0]*b[0]+a[1]*b[1];
   // Short grid corrections and near reversals do not make reliable directions.
   const angle=Math.abs(Math.atan2(cross,dot))*180/Math.PI;
   if(angle>=45){if(la<1||lb<1||angle>135)ambiguous=true;else turns.push(cross>0?'направо':'налево');}
  }
 }
 const direction=!ambiguous&&turns.length?`По линии маршрута: ${turns.map((turn,i)=>`${i?'затем поверните':'поверните'} ${turn}`).join(', ')}. `:'';
 const end=connection?(index===0&&route.from?.departureStairId?`По главной лестнице на ${connection.toFloor}-й этаж`:`К лестнице${connection.stairNumber?' №'+connection.stairNumber:''} · перейти на ${connection.toFloor}-й этаж`):'По проходам к выбранному помещению';
 return direction+end;
}
