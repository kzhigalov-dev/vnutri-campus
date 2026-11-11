import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoutePreview,sampleRoutePreview} from '../public/js/route-preview.js';
import {buildRouteStair} from '../public/js/route-stair.js';
const world=(floor,p,y)=>[p[0],(floor-1)*10+y,p[1]];
for(const [from,to] of [[1,4],[5,2]])test(`preview follows every waypoint and stair on ${from}→${to}`,()=>{
 const dir=Math.sign(to-from),floors=Array.from({length:Math.abs(to-from)+1},(_,i)=>from+i*dir);
 const route={segments:floors.map(floor=>({floor,points:[[0,0],[2,0],[2,2]]})),connections:floors.slice(0,-1).map((floor,i)=>({fromFloor:floor,toFloor:floors[i+1],from:[2,2],to:[0,0]}))};
 const path=createRoutePreview(route,world);assert.equal(path.legs.filter(l=>l.connection).length,floors.length-1);assert.deepEqual(sampleRoutePreview(path,0).position,world(from,[0,0],.27));assert.deepEqual(sampleRoutePreview(path,1).position,world(to,[2,2],.27));
 for(const leg of path.legs){if(!leg.connection)assert.equal(leg.from.floor,leg.to.floor);const p=sampleRoutePreview(path,(leg.start+leg.end)/2/path.length);p.position.forEach((v,i)=>assert.ok(Math.abs(v-(leg.from.position[i]+leg.to.position[i])/2)<1e-9));}
});
test('preview clamps progress, handles singleton, empty and non-finite inputs',()=>{const p=createRoutePreview({segments:[{floor:2,points:[[3,4]]}],connections:[]},world);assert.deepEqual(sampleRoutePreview(p,5).position,world(2,[3,4],.27));assert.equal(sampleRoutePreview(p,NaN).progress,0);assert.equal(sampleRoutePreview(createRoutePreview(null,world),.5),null);assert.equal(sampleRoutePreview(null,0),null);});
test('actual campus preview retains horizontal route legs and every vertical connection',async()=>{
 const {readFile}=await import('node:fs/promises');const {createCampusNavigator}=await import('../public/js/campus-navigation.js');
 const geometry=JSON.parse(await readFile(new URL('../public/data/floor-geometry.json',import.meta.url))),spaces=JSON.parse(await readFile(new URL('../public/data/floor-spaces.json',import.meta.url))),campus=createCampusNavigator(geometry,spaces);
 for(const from of ['start-1','start-5','start-4']){const route=campus.route(from,'f4-s8');assert.ok(route);const p=createRoutePreview(route,campus.world);assert.equal(p.legs.filter(l=>l.connection).length,route.connections.length);assert.deepEqual(sampleRoutePreview(p,1).position,campus.world(route.to.floor,route.to.point,.27));
  for(const leg of p.legs.filter(l=>!l.connection)){const f=campus.floors.get(leg.from.floor),local=q=>[q[0]-f.offset[0],q[2]-f.offset[1]];assert.ok(f.map.segmentClear(local(leg.from.position),local(leg.to.position)));}
 }
});

test('returning to the same floor retains the distinct journey step',()=>{
 const floors=[2,3,2],route={segments:floors.map(floor=>({floor,points:[[0,0],[2,0]]})),connections:[{fromFloor:2,toFloor:3,from:[2,0],to:[0,0]},{fromFloor:3,toFloor:2,from:[2,0],to:[0,0]}]};
 const path=createRoutePreview(route,world);assert.equal(sampleRoutePreview(path,0).step,0);assert.equal(sampleRoutePreview(path,1).step,2);assert.equal(sampleRoutePreview(path,1).floor,2);
 for(const leg of path.legs.filter(l=>!l.connection)){const sample=sampleRoutePreview(path,(leg.start+leg.end)/2/path.length);assert.equal(sample.step,leg.step);assert.equal(sample.floor,floors[sample.step]);}
});

for(const [fromFloor,toFloor] of [[1,2],[2,1]])test(`preview follows the full stair path on ${fromFloor}→${toFloor}`,()=>{
 const connection={fromFloor,toFloor,from:[0,0],to:[0,0]};
 const stair=buildRouteStair(connection,world);
 const points=stair.path.map(([x,y,z])=>[x,y+.09,z]);
 const route={segments:[{floor:toFloor,points:[[0,0],[2,0]]}],connections:[connection]};
 const path=createRoutePreview(route,world,()=>points);
 const flights=path.legs.filter(leg=>leg.connection);
 assert.deepEqual(flights.map(leg=>leg.to.position),points.slice(1));
 assert.deepEqual(path.start.position,points[0]);
 for(const leg of flights){
  const sample=sampleRoutePreview(path,(leg.start+leg.end)/2/path.length);
  assert.equal(sample.floor,fromFloor);
  assert.equal(sample.toFloor,toFloor);
  assert.equal(sample.step,0);
 }
 const arrival=sampleRoutePreview(path,1);
 assert.deepEqual(arrival.position,world(toFloor,[2,0],.27));
 assert.equal(arrival.step,1);
 assert.equal(arrival.floor,toFloor);
});

test('floor instructions follow substantial plan bends and the actual connection',async()=>{
 const {routeFloorInstruction}=await import('../public/js/route-preview.js');
 const route={from:{},floors:[2,3],segments:[{floor:2,points:[[0,0],[2,0],[2,2],[4,2]]},{floor:3,points:[[0,0],[3,0]]}],connections:[{fromFloor:2,toFloor:3,stairNumber:4}]};
 assert.equal(routeFloorInstruction(route,0),'По линии маршрута: поверните направо, затем поверните налево. К лестнице №4 · перейти на 3-й этаж');
 assert.equal(routeFloorInstruction(route,1),'По проходам к выбранному помещению');
});
test('instructions omit uncertain bends and do not attribute repeated floors to the wrong visit',async()=>{
 const {routeFloorInstruction}=await import('../public/js/route-preview.js');
 const route={from:{departureStairId:'stairs-2-1'},floors:[2,3,2],segments:[{floor:2,points:[[0,0],[2,0],[2,.2],[4,.2]]},{floor:3,points:[[0,0],[1,0]]},{floor:2,points:[[0,0],[2,0],[2,2]]}],connections:[{toFloor:3},{toFloor:2,stairNumber:5}]};
 assert.equal(routeFloorInstruction(route,0),'По главной лестнице на 3-й этаж');
 assert.equal(routeFloorInstruction(route,1),'К лестнице №5 · перейти на 2-й этаж');
 assert.equal(routeFloorInstruction(route,2),'По проходам к выбранному помещению');
 assert.equal(routeFloorInstruction(route,3),'');
 const noisy={from:{},floors:[1],segments:[{floor:1,points:[[0,0],[2,0],[2,.2],[4,.2]]}],connections:[]};
 assert.equal(routeFloorInstruction(noisy,0),'По проходам к выбранному помещению');
 const mixed={from:{},floors:[1],segments:[{floor:1,points:[[0,0],[2,0],[2,2],[4,2],[4,2.2],[6,2.2]]}],connections:[]};
 assert.equal(routeFloorInstruction(mixed,0),'По проходам к выбранному помещению');
});
