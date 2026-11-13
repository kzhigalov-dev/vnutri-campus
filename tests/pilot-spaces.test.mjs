import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {pilotRooms,pilotRoomById,filterPilotRooms} from '../public/js/pilot-spaces.js';
import {createCampusNavigator} from '../public/js/campus-navigation.js';
const read=n=>JSON.parse(readFileSync(new URL(`../public/data/${n}.json`,import.meta.url)));
test('eight pilot bindings keep unique IDs and land on real panel rooms that stay reachable',()=>{assert.equal(pilotRooms.length,8);assert.equal(new Set(pilotRooms.map(r=>r.spaceId)).size,8);const c=createCampusNavigator(read('floor-geometry'),read('floor-spaces'));for(const r of pilotRooms){assert.equal(r.floor,4);assert.equal(r.seatCount,8);assert.equal(r.proposed,true);assert.match(r.number,/^\d{3}$/);assert.equal(c.entries.get(r.spaceId).label,r.number);assert.ok(c.route('start-1',r.spaceId));assert.equal(pilotRoomById(r.id),r);}});
test('workspace filters match room number, category and capacity',()=>{
 assert.equal(filterPilotRooms().length,8);
 assert.equal(filterPilotRooms({category:'quiet',minSeats:8}).length,2);
 assert.equal(filterPilotRooms({minSeats:9}).length,0);
 assert.equal(filterPilotRooms({query:'448'})[0].id,'team');
 assert.equal(filterPilotRooms({query:'нет-такого'}).length,0);
});
test('directory number is a searchable display alias while stored pilot identity remains unchanged',async()=>{const {pilotDisplayNumber}=await import('../public/js/pilot-spaces.js');const r=pilotRoomById('r462');assert.equal(r.number,'462');assert.equal(r.spaceId,'f4-s8');assert.equal(pilotDisplayNumber(r),'462');assert.equal(filterPilotRooms({query:'462'})[0].id,'r462');});
