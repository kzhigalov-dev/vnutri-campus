import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRouteStair} from '../public/js/route-stair.js';

const world=(floor,point,y)=>[point[0],(floor-1)*10+y,point[1]];
const reverse=c=>({fromFloor:c.toFloor,toFloor:c.fromFloor,from:c.to,to:c.from});
const cases=[
 {fromFloor:1,toFloor:2,from:[9.48,-6.68],to:[2.72,-6.94]},
 {fromFloor:1,toFloor:2,from:[3,4],to:[3.001,4.001]},
 {fromFloor:1,toFloor:2,from:[3,4],to:[3,4]},
 {fromFloor:1,toFloor:2,from:[0,0],to:[1000,-2000]},
];
for(const c of cases)test(`schematic staircase connects and reverses ${c.from} to ${c.to}`,()=>{
 const a=buildRouteStair(c,world), b=buildRouteStair(reverse(c),world);
 assert.deepEqual(a.path[0],world(c.fromFloor,c.from,.18));
 assert.deepEqual(a.path.at(-1),world(c.toFloor,c.to,.18));
 assert.deepEqual(b.path,[...a.path].reverse());
 assert.deepEqual(b.treads,a.treads);assert.deepEqual(b.landings,a.landings);
 assert.ok(a.treads.length>=2);assert.equal(a.landings.length,3);
 assert.deepEqual(b.connector,[...a.connector].reverse());
 assert.deepEqual(a.connector,[a.path.at(-2),a.path.at(-1)]);
 assert.deepEqual(b.connector,[b.path[0],b.path[1]]);
 assert.ok(a.path.every(p=>p.every(Number.isFinite)));
 for(let i=1;i<a.path.length;i++)assert.ok(a.path[i][1]>=a.path[i-1][1]);
 for(const tread of a.treads){assert.deepEqual(tread.size,[1,.1,.3]);assert.ok(tread.position.every(Number.isFinite));}
 // Registration differences never stretch the actual stair treads or landing.
 assert.deepEqual(a.landings.map(l=>l.size),[[1,.1,1],[2.2,.1,1],[1,.1,1]]);
 assert.equal(a.landings[0].position[1]+.05,a.path[0][1]);
 assert.equal(a.landings[2].position[1]+.05,a.path.at(-2)[1]);
});

test('same-level endpoints produce a level connection without stairs',()=>{
 const c={fromFloor:1,toFloor:1,from:[0,0],to:[5,2]}, stair=buildRouteStair(c,world);
 const endpoints=[world(1,c.from,.18),world(1,c.to,.18)];
 assert.deepEqual(stair,{treads:[],landings:[],path:endpoints,connector:endpoints});
});

test('negligible level connector is omitted',()=>{
 const c={fromFloor:1,toFloor:1,from:[0,0],to:[0,0]};
 assert.equal(buildRouteStair(c,world).connector,null);
});

test('planned stair stays inside its actual rectangle and reverses without flipping the geometry',()=>{
 const c={fromFloor:1,toFloor:2,from:[-2,0],to:[3,1]};
 const layout={center:[0,0,0],axis:[0,1],length:2,width:1.2};
 const a=buildRouteStair(c,world,layout),b=buildRouteStair(reverse(c),world,layout);
 assert.deepEqual(b.treads,a.treads);
 assert.deepEqual(b.path,[...a.path].reverse());
 assert.equal(a.landings.length,3);
 assert.equal(a.connectors.length,2);
 for(const part of [...a.treads,...a.landings]){
  assert.equal(part.rotationY,0);
  assert.ok(Math.abs(part.position[0])+part.size[0]/2<=layout.width/2+1e-9);
  assert.ok(Math.abs(part.position[2])+part.size[2]/2<=layout.length/2+1e-9);
 }
});
