import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoutePreview,sampleRoutePreview} from '../public/js/route-preview.js';
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
