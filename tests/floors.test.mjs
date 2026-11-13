import test from 'node:test';
import assert from 'node:assert/strict';
import {floors,floorByNumber,changeFloor} from '../public/js/floors.js';
test('five real archived floor sheets have distinct page and asset mappings',()=>{assert.deepEqual(floors.map(f=>f.number),[1,2,3,4,5]);assert.deepEqual(floors.map(f=>f.page),[319,320,321,322,323]);assert.equal(new Set(floors.map(f=>f.plan)).size,5);assert.ok(floors.every(f=>[2012,2026].includes(f.year)));assert.deepEqual(floors.map(f=>f.year),[2012,2026,2026,2026,2012]);assert.equal(floorByNumber(5).attic,true)});
test('changing floors clears the selected room',()=>{const state={floor:4,roomId:'r459'};assert.deepEqual(changeFloor(state,2),{floor:2,roomId:null});assert.equal(state.roomId,'r459');});
test('invalid floors are ignored; repeated selection preserves state',()=>{const s={floor:4,roomId:'r459',seatIds:[1]};for(const f of [0,6,NaN,2.5,'x',null])assert.equal(changeFloor(s,f),s);assert.equal(changeFloor(s,4),s);assert.equal(changeFloor(s,'2').floor,2)});
