import {prepareGalleryLayout} from './gallery-layout.js';
import {createWalkMap,pointInPolygon} from './walk-navigation.js';
import {toWorld} from './geometry.js';
const length=points=>points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-points[i][0],p[1]-points[i][1]),0);
export function schematicFloor(source,spaces){const walls=[...source.footprint.map((p,i)=>[...p,...source.footprint[(i+1)%source.footprint.length],5]),...spaces.flatMap(r=>r.polygon.map((p,i)=>[...p,...r.polygon[(i+1)%r.polygon.length],5]))];return prepareGalleryLayout({...source,walls},spaces);}
export function createCampusNavigator(geometry,spaceData,{stepFreeGraph=null}={}){
 const floors=new Map(),entries=new Map(),nodes=new Map(),vertical=new Map(),paths=new Map();
 const ref=geometry.floors.find(f=>f.floor===4)||geometry.floors[0],refMin=toWorld(ref,Math.min(...ref.footprint.map(p=>p[0])),0)[0],refBottom=toWorld(ref,0,Math.max(...ref.footprint.map(p=>p[1])))[1];
 for(const source of geometry.floors){const spaces=spaceData.floors.find(row=>row.floor===source.floor)?.spaces||[],layout=schematicFloor(source,spaces),map=createWalkMap(layout.floor,{step:.2,radius:.1}),offset=[refMin-toWorld(source,Math.min(...source.footprint.map(p=>p[0])),0)[0],refBottom-toWorld(source,0,Math.max(...source.footprint.map(p=>p[1])))[1]];const f={source,floor:layout.floor,layout,map,offset,spaces:[],landings:[]};floors.set(source.floor,f);
  const start={id:`start-${source.floor}`,label:`Точка старта · ${source.floor}-й этаж`,floor:source.floor,point:map.spawn(),kind:'start'};if(start.point)entries.set(start.id,start);
  for(const s of spaces){const polygon=s.polygon.map(p=>toWorld(source,...p)),point=map.nearest(toWorld(source,...s.center),{polygon,maxDistance:1.5});const entry={...s,floor:source.floor,polygon,point,center:toWorld(source,...s.center),kind:'space'};f.spaces.push(entry);entries.set(s.id,entry);}
  // A signed detached wing needs its own landing, not a snap to the main corridor.
  // Archive sheets keep their original largest-component registration.
  source.stairs.forEach(([x,y,w,h],i)=>{const center=toWorld(source,x+w/2,y+h/2),point=map.nearest(center,{maxDistance:2.2,...(source.navigationComponents==='local'?{}:{component:map.largestComponent})});if(!point)return;const node={id:`stairs-${source.floor}-${i}`,label:source.stairNumbers?.[i]?`Лестница №${source.stairNumbers[i]}`:`Лестничное ядро`,floor:source.floor,point,center,index:i,number:source.stairNumbers?.[i]??null};f.landings.push(node);nodes.set(node.id,node);vertical.set(node.id,[]);});
 }
 const entrance=geometry.mainEntrance,mainStair=entrance&&floors.get(entrance.floor)?.landings.find(l=>l.index===entrance.stairIndex);
 if(mainStair){mainStair.isMain=true;mainStair.label=entrance.label;const start=entries.get(`start-${entrance.floor}`);if(start){start.point=[...mainStair.point];start.label=entrance.label+' · '+entrance.floor+'-й этаж';start.departureStairId=mainStair.id;}}
 for(let floor=1;floor<5;floor++){
  const a=floors.get(floor),b=floors.get(floor+1);if(!a||!b)continue;
  const panelA=a.source.sourceKind==='wayfinding-panel',panelB=b.source.sourceKind==='wayfinding-panel';
  const registration=(geometry.stairRegistrations||[]).find(r=>r.fromFloor===floor&&r.toFloor===floor+1&&r.illustrative===true);
  const mixed=panelA!==panelB,candidates=[];
  for(const x of a.landings)for(const y of b.landings){
   const d=Math.hypot(x.center[0]+a.offset[0]-y.center[0]-b.offset[0],x.center[1]+a.offset[1]-y.center[1]-b.offset[1]);
   if(panelA&&panelB){if(!x.number||x.number!==y.number)continue;candidates.push({x,y,d,registration:'panel-number',illustrative:d>2.5});}
   else if(mixed){const panel=panelA?x:y;if(!registration||!registration.allowedPanelNumbers?.includes(panel.number))continue;const pairs=registration.pairs||[],pinned=pairs.some(p=>p.fromIndex===x.index&&p.toNumber===y.number);if(!pinned&&pairs.some(p=>p.fromIndex===x.index||p.toNumber===y.number))continue;candidates.push({x,y,d,pinned,registration:'archive-panel',illustrative:true});}
   else if(d<=2.5)candidates.push({x,y,d,registration:'aligned-archive',illustrative:false});
  }
  candidates.sort((a,b)=>Number(b.pinned||false)-Number(a.pinned||false)||a.d-b.d);const usedA=new Set(),usedB=new Set();
  for(const {x,y,d,registration,illustrative} of candidates){if(usedA.has(x.id)||usedB.has(y.id))continue;usedA.add(x.id);usedB.add(y.id);
   const id=[x.id,y.id].sort().join('|');
   vertical.get(x.id).push({id,to:y.id,cost:7+d,registration,illustrative});vertical.get(y.id).push({id,to:x.id,cost:7+d,registration,illustrative});
  }
 }

 function local(a,b){if(a.floor!==b.floor||!a.point||!b.point)return null;const key=`${a.floor}:${a.id}>${b.id}`;if(paths.has(key))return paths.get(key);const map=floors.get(a.floor).map,path=map.segmentClear(a.point,b.point)?[[...a.point],[...b.point]]:map.route(a.point,b.point);const good=path&&path.every((p,i)=>i===0||map.segmentClear(path[i-1],p))?path:null;paths.set(key,good);paths.set(`${a.floor}:${b.id}>${a.id}`,good?[...good].reverse():null);return good;}
 const linkIds=new Set([...vertical.values()].flatMap(edges=>edges.map(edge=>edge.id)));
 for(const edge of Array.isArray(stepFreeGraph?.edges)?stepFreeGraph.edges:[])if(typeof edge?.id==='string'&&edge.id)linkIds.add(edge.id);
 // Closed intervals use an inclusive start and an exclusive end. Invalid dates
 // are rejected instead of silently treating a planned closure as open.
 function closedLinks(closures,at){
  if(!Array.isArray(closures))throw new TypeError('closures must be an array');
  const instant=new Date(at).getTime();if(!Number.isFinite(instant))throw new TypeError('invalid route time');
  const result=new Set();
  for(const closure of closures){
   if(!closure||typeof closure.linkId!=='string'||!closure.linkId)throw new TypeError('closure requires linkId');
   if(!linkIds.has(closure.linkId))throw new TypeError('unknown closure linkId');
   const start=closure.startsAt==null?-Infinity:new Date(closure.startsAt).getTime(),end=closure.endsAt==null?Infinity:new Date(closure.endsAt).getTime();
   if(Number.isNaN(start)||Number.isNaN(end)||start>=end)throw new TypeError('invalid closure interval');
   if(start<=instant&&instant<end)result.add(closure.linkId);
  }
  return result;
 }
 function route(fromId,toId,{closures=[],at=Date.now()}={}){const closed=closedLinks(closures,at),from=entries.get(fromId),to=entries.get(toId);if(!from?.point||!to?.point)return null;if(from.id===to.id)return {from,to,segments:[{floor:from.floor,visit:0,points:[[...from.point]]}],connections:[],floors:[from.floor]};const direct=local(from,to);if(direct)return {from,to,segments:[{floor:from.floor,visit:0,points:direct}],connections:[],floors:[from.floor]};
  const graph=new Map(nodes);graph.set('__from',from);graph.set('__to',to);const dist=new Map([['__from',0]]),prev=new Map(),visited=new Set();
  while(true){let current=null,best=Infinity;for(const [id,d] of dist)if(!visited.has(id)&&d<best){best=d;current=id;}if(!current)break;if(current==='__to')break;visited.add(current);const a=graph.get(current),edges=[];
   for(const [id,b] of graph){if(id===current||id==='__from'||a.floor!==b.floor)continue;const path=local(a,b);if(path)edges.push({to:id,cost:length(path),path,floor:a.floor});}
   for(const edge of vertical.get(current)||[]){if(closed.has(edge.id))continue;if(from.departureStairId&&a.floor===from.floor&&current!==from.departureStairId)continue;edges.push({...edge,connection:{id:edge.id,fromFloor:a.floor,toFloor:graph.get(edge.to).floor,from:a.point,to:graph.get(edge.to).point,stair:a.index,stairNumber:a.number??graph.get(edge.to).number,registration:edge.registration,illustrative:edge.illustrative}});}
   for(const edge of edges){const next=best+edge.cost;if(next<(dist.get(edge.to)??Infinity)){dist.set(edge.to,next);prev.set(edge.to,{id:current,edge});}}
  }
  if(!prev.has('__to'))return null;const edges=[];for(let id='__to';id!=='__from';){const previous=prev.get(id);if(!previous)return null;edges.push(previous.edge);id=previous.id;}edges.reverse();
  const segments=[],connections=[],order=[from.floor];
  for(const edge of edges){
   if(edge.path)segments.push({floor:edge.floor,visit:connections.length,points:edge.path});
   else if(edge.connection){connections.push(edge.connection);order.push(edge.connection.toFloor);}
  }
  return {from,to,segments,connections,floors:order};
 }
 // Step-free data is a separate, explicitly surveyed graph; geometric proximity
 // and ordinary walk-map routes are never evidence of an accessible passage.
 // Nodes: {id, floor, point, verification}; endpoint IDs equal entry IDs.
 // Edges: {id, from, to, kind: 'passage'|'lift', points?, bidirectional?,
 //         verification, operation?}; passages list surveyed floor coordinates,
 // lifts additionally require operation {status:'operational',source,checkedAt}.
 // verification and graph.complete require {source,checkedAt}, and complete
 // also requires value:true. A source is a provenance reference, not a claim
 // that this module can independently authenticate the referenced survey.
 function routeStepFree(fromId,toId,{closures=[],at=Date.now()}={}){
  const closed=closedLinks(closures,at),from=entries.get(fromId),to=entries.get(toId);
  if(!from||!to)return {route:null,reason:'missing-entry',unverified:[]};
  const unverified=[],issue=(kind,id)=>unverified.push({kind,id});
  const verified=v=>v&&typeof v.source==='string'&&v.source.trim().length>0&&typeof v.checkedAt==='string'&&Number.isFinite(Date.parse(v.checkedAt));
  const point=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
  const same=(a,b)=>point(a)&&point(b)&&a[0]===b[0]&&a[1]===b[1];
  if(!stepFreeGraph||!Array.isArray(stepFreeGraph.nodes)||!Array.isArray(stepFreeGraph.edges))return {route:null,reason:'unverified',unverified:[...new Set([from.id,to.id])].map(id=>({kind:'entry',id})).concat({kind:'graph',id:null})};
  const surveyed=new Map(),duplicates=new Set(),nodeIds=new Set();
  for(const n of stepFreeGraph.nodes){
   if(!n||typeof n.id!=='string'||!n.id){issue('node',null);continue;}
   if(nodeIds.has(n.id)){surveyed.delete(n.id);duplicates.add(n.id);issue('node',n.id);continue;}
   nodeIds.add(n.id);
   if(!verified(n.verification)||!Number.isInteger(n.floor)||!floors.has(n.floor)||!point(n.point)){issue('node',n.id);continue;}
   surveyed.set(n.id,n);
  }
  // A verified endpoint must refer to the actual directory floor.
  for(const entry of [from,to]){const n=surveyed.get(entry.id);if(!n||n.floor!==entry.floor){surveyed.delete(entry.id);issue('entry',entry.id);}}
  const graph=new Map([...surveyed.keys()].map(id=>[id,[]])),edgeIds=new Set(),invalidIds=new Set();
  for(const e of stepFreeGraph.edges){if(e&&typeof e.id==='string'&&e.id){if(edgeIds.has(e.id))invalidIds.add(e.id);edgeIds.add(e.id);}}
  for(const e of stepFreeGraph.edges){
   const id=e?.id,a=surveyed.get(e?.from),b=surveyed.get(e?.to);
   if(typeof id!=='string'||!id||invalidIds.has(id)||!a||!b||!verified(e.verification)){issue('edge',id??null);continue;}
   if(e.kind==='passage'){
    if(a.floor!==b.floor||!Array.isArray(e.points)||e.points.length<2||!e.points.every(point)||!same(e.points[0],a.point)||!same(e.points.at(-1),b.point)){issue('edge',id);continue;}
   }else if(e.kind==='lift'){
    if(a.floor===b.floor||!verified(e.operation)||!['operational','unavailable'].includes(e.operation.status)){issue('lift',id);continue;}
    if(e.operation.status==='unavailable')continue;
   }else{issue('edge',id);continue;}
   if(closed.has(id))continue;
   const cost=e.kind==='passage'?length(e.points):7;
   graph.get(a.id).push({edge:e,to:b.id,cost,reverse:false});
   if(e.bidirectional===true)graph.get(b.id).push({edge:e,to:a.id,cost,reverse:true});
  }
  if(surveyed.has(fromId)&&surveyed.has(toId)){
   const dist=new Map([[fromId,0]]),prev=new Map(),visited=new Set();
   while(true){let current=null,best=Infinity;for(const [id,d] of dist)if(!visited.has(id)&&d<best){current=id;best=d;}if(current===null||current===toId)break;visited.add(current);
    for(const item of graph.get(current)){const next=best+item.cost;if(next<(dist.get(item.to)??Infinity)){dist.set(item.to,next);prev.set(item.to,{id:current,...item});}}
   }
   if(dist.has(toId)){
    const steps=[];for(let id=toId;id!==fromId;){const item=prev.get(id);steps.push(item);id=item.id;}steps.reverse();
    const segments=[],connections=[],order=[from.floor];
    for(const item of steps){const e=item.edge,a=surveyed.get(item.id),b=surveyed.get(item.to);
     if(e.kind==='passage')segments.push({floor:a.floor,visit:connections.length,points:(item.reverse?[...e.points].reverse():e.points).map(p=>[...p])});
     else{connections.push({id:e.id,kind:'lift',fromFloor:a.floor,toFloor:b.floor,from:[...a.point],to:[...b.point]});if(order.at(-1)!==b.floor)order.push(b.floor);}
    }
    if(!segments.length&&fromId===toId)segments.push({floor:from.floor,visit:0,points:[[...surveyed.get(fromId).point]]});
    return {route:{from,to,segments,connections,floors:order},reason:null,unverified:[]};
   }
  }
  if(stepFreeGraph.complete?.value!==true||!verified(stepFreeGraph.complete))issue('graph-completeness',null);
  return {route:null,reason:unverified.length?'unverified':'disconnected',unverified};
 }
 function world(floor,p,y=.12){const f=floors.get(floor);return [p[0]+f.offset[0],(floor-1)*10+y,p[1]+f.offset[1]];}
 return {floors,entries,route,routeStepFree,world,links:[...vertical].flatMap(([from,edges])=>edges.map(e=>({id:e.id,from,to:e.to,registration:e.registration,illustrative:e.illustrative}))),isInside(point,floor){return floors.get(floor).map.polygons.some(poly=>pointInPolygon(point,poly));}};
}
