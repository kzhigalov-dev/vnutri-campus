import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pointInPolygon,createWalkMap} from '../public/js/walk-navigation.js';
import {toWorld} from '../public/js/geometry.js';
const read=name=>JSON.parse(readFileSync(new URL(`../public/data/${name}.json`,import.meta.url)));
test('model indexes remain distinct from current room IDs and stay inside source footprints',()=>{
 const geometry=read('floor-geometry'),data=read('floor-spaces'),ids=new Set();let total=0;
 assert.equal(data.floors.length,5);
 for(const row of data.floors){const f=geometry.floors.find(f=>f.floor===row.floor);assert.ok(f);assert.ok(row.spaces.length>0);
  for(const space of row.spaces){assert.equal(space.modernNumber,null);assert.equal(space.kind,'model-space');assert.match(space.label,new RegExp(`^П${row.floor}\\.\\d{2}$`));assert.ok(!ids.has(space.id));ids.add(space.id);assert.ok(pointInPolygon(space.center,space.polygon));for(const p of space.polygon)assert.ok([f.footprint,...(f.insets||[])].some(poly=>pointInPolygon(p,poly)),space.id);total++;}
 }assert.equal(total,149);
});
test('every selectable space has a walkable entry within its own polygon',()=>{
 const geometry=read('floor-geometry');for(const row of read('floor-spaces').floors){const f=geometry.floors.find(f=>f.floor===row.floor),map=createWalkMap(f);for(const space of row.spaces){const polygon=space.polygon.map(p=>toWorld(f,...p)),point=map.nearest(toWorld(f,...space.center),{maxDistance:1.5,polygon});assert.ok(point,space.id);assert.ok(pointInPolygon(point,polygon));}}
});
