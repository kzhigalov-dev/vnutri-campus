import test from 'node:test';
import assert from 'node:assert/strict';
import {buildingDirectionsLink,cityDirections,indoorDirections} from '../public/js/campus-buildings.js';
import {readSchedule,readScheduleFile,scheduleDays} from '../public/js/local-schedule.js';
import {readNavigationLink} from '../public/js/navigation-link.js';

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

test('schedule opens today, the next dated entry, or the last archived day',()=>{
 const rows=readSchedule(JSON.stringify([{...moved,date:'2026-11-16'},moved,moved]));
 assert.deepEqual(scheduleDays(rows,'2026-11-13'),{dates:['2026-11-12','2026-11-13','2026-11-16'],initial:'2026-11-16'});
 assert.equal(scheduleDays(rows,'2026-11-12').initial,'2026-11-12');
 assert.equal(scheduleDays(rows,'2026-11-20').initial,'2026-11-16');
 assert.equal(scheduleDays([],'2026-11-20').initial,'2026-11-20');
});

test('JSON import accepts files with UTF-8 or UTF-16 byte-order marks',async()=>{
 const json=JSON.stringify([moved]),expected=readSchedule(json);
 assert.deepEqual(await readScheduleFile(new Blob(['\uFEFF',json])),expected);
 assert.deepEqual(await readScheduleFile(new Blob([Buffer.from('\uFEFF'+json,'utf16le')])),expected);
 await assert.rejects(readScheduleFile(new Blob(['<html>'])),/Не удалось прочитать JSON/);
});

test('a moved class keeps its current room across the city and indoor route links',()=>{
 const [item]=readSchedule(JSON.stringify([moved]));
 const page=buildingDirectionsLink('https://example.test/campus/today.html?private=1#schedule',item.building,item.room);
 assert.equal(page.pathname,'/campus/buildings.html');
 assert.deepEqual([...page.searchParams],[['to','voznesensky'],['room','462']]);
 assert.equal(page.hash,'');
 const walk=new URL(cityDirections('morskaya',page.searchParams.get('to')));
 assert.match(walk.searchParams.get('origin'),/Большая Морская/);
 assert.match(walk.searchParams.get('destination'),/Вознесенский проспект/);
 assert.equal(walk.searchParams.get('travelmode'),'walking');
 assert.equal(walk.searchParams.has('room'),false);
 assert.equal(new URL(cityDirections('',item.building)).searchParams.has('origin'),false);
 assert.equal(cityDirections(item.building,item.building),null);
 const {url,room}=indoorDirections(page.href,page.searchParams.get('to'),page.searchParams.get('room'));
 assert.equal(url.pathname,'/campus/index.html');
 assert.equal(room.number,item.room);
 assert.deepEqual(readNavigationLink(url,'start-1'),{origin:'start-1',target:item.destination,roomId:null,spaceId:null});
});

test('rooms from other or unconfirmed locations do not gain an indoor route',()=>{
 const base='https://example.test/campus/today.html';
 for(const [building,room] of [['morskaya','462'],['voznesensky','446'],['voznesensky','f4-s8']]){
  const page=buildingDirectionsLink(base,building,room);
  assert.equal(page.searchParams.has('room'),false);
  const indoor=indoorDirections(page.href,building,room);
  if(building==='morskaya')assert.equal(indoor,null);
  else{
   assert.equal(indoor.room,null);
   assert.equal(readNavigationLink(indoor.url,'start-1').target,null);
  }
 }
});
