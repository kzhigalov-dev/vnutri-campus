import test from 'node:test';
import assert from 'node:assert/strict';
import {readSchedule} from '../public/js/local-schedule.js';

const moved={date:'2026-11-12',start:'14:00',end:'15:30',title:'Практика',status:'moved',building:'voznesensky',previousRoom:'459',room:'462'};

test('an imported move points to the current room only in the mapped campus',()=>{
 const rows=readSchedule(JSON.stringify([moved,{...moved,building:'other'},{...moved,status:'cancelled'}]));
 assert.deepEqual(rows.map(row=>row.destination),['f4-s8',undefined,undefined]);
 assert.deepEqual(readSchedule(JSON.stringify(rows)),rows);
});

test('invalid import rejects the whole schedule',()=>{
 for(const invalid of [{date:'2026-02-30'},{start:'15:30'},{previousRoom:'462'},{status:'updated'}]){
  assert.throws(()=>readSchedule(JSON.stringify([moved,{...moved,...invalid}])),/Занятие 2/);
 }
});
