import test from 'node:test';
import assert from 'node:assert/strict';
import {parseWorkSearch} from '../public/js/work-search.js';
import {filterPilotRooms} from '../public/js/pilot-spaces.js';

test('a conversational place query keeps all equipment and group constraints',()=>{
 const request=parseWorkSearch('Найти место на троих с компьютером и проектором на ближайший час');
 assert.deepEqual(request,{minSeats:3,equipment:['Компьютеры','Проектор']});
 const result=filterPilotRooms(request);
 assert.ok(result.length>0);
 assert.ok(result.every(room=>request.equipment.every(item=>room.equipment.includes(item))&&room.seatCount>=3));
 const sockets=parseWorkSearch('место для 3 человек с розетками');
 assert.deepEqual(sockets.equipment,['Розетки']);
 assert.deepEqual(filterPilotRooms(sockets),[]);
 assert.equal(parseWorkSearch('ауд. № 462'),null);
});
