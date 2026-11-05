import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {roomBounds,seatLayout,visualWorld} from '../public/js/maquette-layout.js';
import {pilotRooms} from '../public/js/pilot-spaces.js';
import {createCampusNavigator} from '../public/js/campus-navigation.js';
import {createRoutePreview,sampleRoutePreview} from '../public/js/route-preview.js';
import {pointInPolygon} from '../public/js/walk-navigation.js';
const geometry=JSON.parse(fs.readFileSync(new URL('../public/data/floor-geometry.json',import.meta.url)));
const spaces=JSON.parse(fs.readFileSync(new URL('../public/data/floor-spaces.json',import.meta.url)));
const campus=createCampusNavigator(geometry,spaces);
test('every pilot room has eight unique, finite seat positions inside its retained room',()=>{
 for(const room of pilotRooms){const space=campus.entries.get(room.spaceId),bounds=roomBounds(space.polygon),layout=seatLayout(room.style,room.spaceId);assert.equal(layout.length,room.seatCount);assert.deepEqual(layout.map(s=>s.seatId).sort((a,b)=>a-b),[1,2,3,4,5,6,7,8]);const positions=layout.map(s=>[bounds.x+s.x*bounds.w,bounds.z+s.z*bounds.d]);assert.equal(new Set(positions.map(p=>p.join(','))).size,8);for(const p of positions){assert.ok(p.every(Number.isFinite));assert.ok(pointInPolygon(p,space.polygon),`${room.spaceId}: seat ${p} escaped room`);}}
});
test('visual adapter preserves route endpoints and keeps preview on the transformed floor',()=>{
 const route=campus.route('start-1','f4-s4');assert.ok(route);const before=JSON.stringify(route);const world=(floor,p,y)=>visualWorld(campus.world(floor,p,y));const preview=createRoutePreview(route,world);assert.deepEqual(sampleRoutePreview(preview,0).position,world(route.from.floor,route.from.point,.27));const end=sampleRoutePreview(preview,1);const expected=world(route.to.floor,route.to.point,.27);for(let i=0;i<3;i++)assert.ok(Math.abs(end.position[i]-expected[i])<1e-7);assert.equal(end.floor,4);for(const leg of preview.legs){if(!leg.connection)assert.equal(leg.from.position[1],leg.to.position[1]);}assert.equal(JSON.stringify(route),before);
});
