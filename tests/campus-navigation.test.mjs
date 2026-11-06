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
