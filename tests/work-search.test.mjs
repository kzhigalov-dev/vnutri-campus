import test from 'node:test';
import assert from 'node:assert/strict';
import {parseWorkSearch,nextWorkHour} from '../public/js/work-search.js';
import {filterPilotRooms,pilotStatus} from '../public/js/pilot-spaces.js';

test('a conversational place query keeps all equipment and group constraints',()=>{
 const request=parseWorkSearch('Найти место на троих с компьютером и проектором на ближайший час');
 assert.deepEqual(request,{minSeats:3,equipment:['Компьютеры','Проектор'],nearestHour:true});
 const slot={date:'2026-11-12',start:14,hours:1};
 const result=filterPilotRooms({...request,freeOnly:true},[],slot);
 assert.ok(result.length>0);
 assert.ok(result.every(room=>request.equipment.every(item=>room.equipment.includes(item))&&pilotStatus(room,[],slot).free>=3));
 const sockets=parseWorkSearch('место для 3 человек с розетками');
 assert.deepEqual(sockets.equipment,['Розетки']);
 assert.deepEqual(filterPilotRooms(sockets,[],slot),[]);
 assert.equal(parseWorkSearch('ауд. № 462'),null);
});

test('the closest hourly slot uses Moscow time and closes at 21:00',()=>{
 assert.deepEqual(nextWorkHour(new Date('2026-11-12T11:32:00Z')),{date:'2026-11-12',start:15,hours:1});
 assert.deepEqual(nextWorkHour(new Date('2026-11-12T17:00:00Z')),{date:'2026-11-12',start:20,hours:1});
 assert.equal(nextWorkHour(new Date('2026-11-12T17:00:01Z')),null);
});
