import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {createCampusNavigator} from '../public/js/campus-navigation.js';
const read=n=>JSON.parse(readFileSync(new URL(`../public/data/${n}.json`,import.meta.url))),geometry=read('floor-geometry'),spaces=read('floor-spaces');
let campus;
test('source plans remain immutable; five aligned navigation floors and room identifiers are retained',()=>{const original=JSON.stringify(geometry);campus=createCampusNavigator(geometry,spaces);assert.equal(JSON.stringify(geometry),original);assert.equal(campus.floors.size,5);assert.equal([...campus.entries.values()].filter(x=>x.kind==='space').length,220);for(const f of campus.floors.values()){assert.ok(f.landings.length);assert.ok(f.offset.every(Number.isFinite));}});
test('routes from floor1 can reach a room on every other floor using adjacent stair transitions and clear segments',()=>{for(let floor=2;floor<=5;floor++){let result;for(const room of campus.floors.get(floor).spaces){result=campus.route('start-1',room.id);if(result)break;}assert.ok(result,`no reachable room on floor${floor}`);assert.equal(result.from.floor,1);assert.equal(result.to.floor,floor);assert.deepEqual(result.floors,Array.from({length:floor},(_,i)=>i+1));assert.ok(result.connections.length>=floor-1);for(const c of result.connections)assert.equal(Math.abs(c.fromFloor-c.toFloor),1);for(const s of result.segments){const map=campus.floors.get(s.floor).map;for(let i=1;i<s.points.length;i++)assert.ok(map.segmentClear(s.points[i-1],s.points[i]));}}});
test('unknown destinations never produce a made-up route',()=>{assert.equal(campus.route('start-1','missing'),null);assert.equal(campus.route('missing','f4-s1'),null)});

test('second-floor signed remote wing routes through floor3 instead of inventing a corridor',()=>{
 const c=createCampusNavigator(geometry,spaces),rows=c.floors.get(2).spaces;
 const from=rows.find(s=>s.label==='201'),to=rows.find(s=>s.label==='265-269');
 assert.ok(from&&to);const f=c.floors.get(2);assert.equal(f.map.route(from.point,to.point),null);
 const route=c.route(from.id,to.id);assert.ok(route);assert.deepEqual(route.floors,[2,3,2]);
 assert.ok(route.connections.every(s=>s.stairNumber));
 for(const label of ['277','278','258-264']){const target=rows.find(s=>s.label===label);assert.ok(target);const signedRoute=c.route(from.id,target.id);assert.deepEqual(signedRoute.floors,[2,3,2]);assert.equal(signedRoute.connections.at(-1).stairNumber,label==='258-264'?2:1);}
 assert.deepEqual(route.connections.map(s=>[s.fromFloor,s.toFloor]),[[2,3],[3,2]]);
 assert.ok(route.segments.every(segment=>route.floors[segment.visit]===segment.floor));
 assert.deepEqual([...new Set(route.segments.map(segment=>segment.visit))],[0,1,2]);
});

test('panel stair numbers stay consistent between adjacent floors',()=>{
 const c=createCampusNavigator(geometry,spaces);
 for(const link of c.links){const a=[...c.floors.values()].flatMap(f=>f.landings).find(s=>s.id===link.from),b=[...c.floors.values()].flatMap(f=>f.landings).find(s=>s.id===link.to);
 if(a.number&&b.number)assert.equal(a.number,b.number);}
 const f3=c.floors.get(3).spaces;assert.ok(f3.some(s=>s.label==='382-385'));assert.ok(f3.some(s=>s.label==='340-345'));
});

test('every panel zone reaches a stair landing without exterior shortcuts',()=>{
 const c=createCampusNavigator(geometry,spaces);
 for(const number of [2,3,4]){const f=c.floors.get(number);
  for(const room of f.spaces){assert.ok(f.landings.some(stair=>f.map.route(room.point,stair.point)),`${room.id} (${room.label}) must reach a stair`);}
 }
 const group2=c.floors.get(2).spaces.find(s=>s.label==='244-253'),group3=c.floors.get(3).spaces.find(s=>s.label==='340-345');
 assert.ok(c.route('start-1',group2.id));assert.ok(c.route('start-1',group3.id));
});

test('panel silhouettes contain no synthetic western towers or unnumbered stair cores',()=>{
 for(const f of geometry.floors.filter(f=>[2,3,4].includes(f.floor))){
  assert.deepEqual([...f.stairNumbers].sort(),[1,2,3,4,5]);assert.equal(f.stairs.length,5);
  for(const p of f.footprint)if(p[0]<700)assert.ok(p[1]<=228,`floor${f.floor}: unrecorded western extension`);
 }
});
test('archive to panel registration is explicit and never requires invented floor area',()=>{
 const c=createCampusNavigator(geometry,spaces),mixed=c.links.filter(l=>l.registration==='archive-panel');assert.ok(mixed.length);
 for(const link of mixed){assert.equal(link.illustrative,true);const pair=[Number(link.from.split('-')[1]),Number(link.to.split('-')[1])].sort();assert.ok([[1,2],[4,5]].some(allowed=>String(allowed)===String(pair)));}
 const without=structuredClone(geometry);delete without.stairRegistrations;
 const disconnected=createCampusNavigator(without,spaces);assert.equal(disconnected.route('start-1','f4-s4'),null);
});

test('default first-floor routes depart from the confirmed entrance stair and its explicit panel registration',()=>{
 const c=createCampusNavigator(geometry,spaces),start=c.entries.get('start-1'),main=c.floors.get(1).landings.find(l=>l.isMain);
 assert.equal(main.index,1);assert.deepEqual(start.point,main.point);assert.match(start.label,/Главная лестница/);
 for(const n of [2,3,4,5]){let checked=0;for(const room of c.floors.get(n).spaces){const route=c.route(start.id,room.id);if(!route)continue;checked++;const exit=route.connections[0];assert.equal(exit.fromFloor,1);assert.equal(exit.toFloor,2);assert.equal(exit.stairNumber,3);assert.deepEqual(exit.from,main.point);}assert.ok(checked>0);}
 const custom=c.floors.get(1).spaces.find(s=>s.point);assert.ok(c.route(custom.id,'f4-s8'));
});

test('published closure reroutes both directions and does not mutate the graph',()=>{
 const c=createCampusNavigator(geometry,spaces),from=c.floors.get(2).spaces.find(s=>s.label==='201'),to=c.floors.get(3).spaces.find(s=>s.label==='340-345');
 const initial=c.route(from.id,to.id),id=initial.connections[0].id,closures=[{linkId:id}];
 assert.ok(id);assert.equal(c.links.filter(link=>link.id===id).length,2);
 const forward=c.route(from.id,to.id,{closures}),backward=c.route(to.id,from.id,{closures});
 assert.ok(forward);assert.ok(backward);
 for(const route of [forward,backward])assert.ok(route.connections.every(link=>link.id!==id));
 assert.equal(c.route(from.id,to.id).connections[0].id,id);
});

test('closure periods include the start and exclude the end',()=>{
 const c=createCampusNavigator(geometry,spaces),from=c.floors.get(2).spaces.find(s=>s.label==='201'),to=c.floors.get(3).spaces.find(s=>s.label==='340-345');
 const initial=c.route(from.id,to.id),id=initial.connections[0].id;
 const closures=[{linkId:id,startsAt:'2026-01-01T10:00:00Z',endsAt:'2026-01-01T11:00:00Z'}];
 for(const [at,closed] of [['2026-01-01T09:59:59Z',false],['2026-01-01T10:00:00Z',true],['2026-01-01T10:59:59Z',true],['2026-01-01T11:00:00Z',false]]){
  const route=c.route(from.id,to.id,{closures,at});assert.ok(route);assert.equal(route.connections.some(link=>link.id===id),!closed,at);
 }
});

test('closing every transition between floors produces no route and invalid intervals fail visibly',()=>{
 const c=createCampusNavigator(geometry,spaces),from=c.floors.get(2).spaces.find(s=>s.label==='201'),to=c.floors.get(3).spaces.find(s=>s.label==='340-345');
 const closures=c.links.filter(link=>link.from.startsWith('stairs-2-')&&link.to.startsWith('stairs-3-')).map(link=>({linkId:link.id}));
 assert.ok(closures.length);assert.equal(c.route(from.id,to.id,{closures}),null);
 assert.throws(()=>c.route(from.id,to.id,{closures:[{linkId:closures[0].linkId,startsAt:'invalid'}]}),/invalid closure interval/);
 assert.throws(()=>c.route(from.id,to.id,{closures:[{linkId:closures[0].linkId,startsAt:'2026-01-02T00:00:00Z',endsAt:'2026-01-01T00:00:00Z'}]}),/invalid closure interval/);
 assert.throws(()=>c.route(from.id,to.id,{closures,at:'invalid'}),/invalid route time/);
 assert.throws(()=>c.route(from.id,to.id,{closures:[{linkId:'missing'}]}),/unknown closure linkId/);
});

const survey={source:'survey:accessibility-2026',checkedAt:'2026-01-01T10:00:00Z'};
function verifiedFixture(){
 const base=createCampusNavigator(geometry,spaces),a=base.floors.get(1).spaces.find(s=>s.point),b=base.floors.get(1).spaces.find(s=>s.point&&s.id!==a.id),c=base.floors.get(2).spaces.find(s=>s.point);
 const nodes=[a,b,c].map(s=>({id:s.id,floor:s.floor,point:[...s.point],verification:{...survey}}));
 const edges=[{id:'surveyed-hall',from:a.id,to:b.id,kind:'passage',points:[[...a.point],[...b.point]],bidirectional:true,verification:{...survey}},
  {id:'surveyed-lift',from:b.id,to:c.id,kind:'lift',bidirectional:true,verification:{...survey},operation:{...survey,status:'operational'}}];
 return {a,b,c,graph:{nodes,edges,complete:{...survey,value:true}}};
}
test('step-free mode fails closed on the actual campus and distinguishes missing entries',()=>{
 const c=createCampusNavigator(geometry,spaces),a=c.floors.get(1).spaces.find(s=>s.point),b=c.floors.get(2).spaces.find(s=>s.point);
 assert.ok(c.route(a.id,b.id));
 for(const target of [a.id,b.id]){const result=c.routeStepFree(a.id,target);assert.equal(result.route,null);assert.equal(result.reason,'unverified');assert.ok(result.unverified.some(x=>x.kind==='entry'&&x.id===a.id));assert.ok(result.unverified.some(x=>x.kind==='entry'&&x.id===target));assert.ok(result.unverified.some(x=>x.kind==='graph')); }
 assert.equal(c.routeStepFree(a.id,'missing').reason,'missing-entry');
});
test('only independently recorded edges with verified endpoints and working lift form a step-free path',()=>{
 const {a,c,graph}=verifiedFixture(),nav=createCampusNavigator(geometry,spaces,{stepFreeGraph:graph});
 const result=nav.routeStepFree(a.id,c.id);assert.equal(result.reason,null);assert.deepEqual(result.route.floors,[1,2]);assert.equal(result.route.connections[0].kind,'lift');assert.deepEqual(result.route.segments[0].points,graph.edges[0].points);
 const reversed=nav.routeStepFree(c.id,a.id);assert.equal(reversed.reason,null);assert.deepEqual(reversed.route.segments[0].points,[...graph.edges[0].points].reverse());
 const closed=nav.routeStepFree(a.id,c.id,{closures:[{linkId:'surveyed-lift'}]});assert.equal(closed.reason,'disconnected');
 assert.equal(nav.routeStepFree(a.id,c.id).reason,null);
 const original=structuredClone(graph);delete graph.edges[0].verification;
 assert.equal(nav.routeStepFree(a.id,c.id).reason,'unverified');
 Object.assign(graph,structuredClone(original));delete graph.edges[1].operation;
 assert.ok(nav.routeStepFree(a.id,c.id).unverified.some(x=>x.kind==='lift'));
 Object.assign(graph,structuredClone(original));graph.edges[1].operation.status='unavailable';
 assert.equal(nav.routeStepFree(a.id,c.id).reason,'disconnected');
});
test('incomplete, malformed, and staircase data never become step-free routes',()=>{
 const {a,b,c,graph}=verifiedFixture(),original=structuredClone(graph),nav=createCampusNavigator(geometry,spaces,{stepFreeGraph:graph});
 for(const alter of [g=>delete g.nodes[0].verification,g=>g.edges[0].points.pop(),g=>g.edges[1].kind='stairs',g=>g.nodes.push({...g.nodes[0]}),g=>delete g.complete]){
  Object.assign(graph,structuredClone(original));alter(graph);
  if(!graph.complete)graph.edges=[];
  const result=nav.routeStepFree(a.id,c.id);
  assert.equal(result.route,null);assert.equal(result.reason,'unverified');assert.ok(result.unverified.length);
 }
 Object.assign(graph,structuredClone(original));graph.edges=[];
 assert.equal(nav.routeStepFree(a.id,b.id).reason,'disconnected');
 Object.assign(graph,structuredClone(original));graph.edges[0].bidirectional=false;
 assert.equal(nav.routeStepFree(b.id,a.id).reason,'disconnected');
});
