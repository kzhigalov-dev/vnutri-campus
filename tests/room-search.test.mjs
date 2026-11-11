import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {searchRoom} from '../public/js/room-search.js';
import {filterPilotRooms} from '../public/js/pilot-spaces.js';

const {rooms}=JSON.parse(readFileSync(new URL('../public/data/directory.json',import.meta.url)));
const find=query=>rooms.map(room=>({room,score:searchRoom(query,{numbers:[room.number],text:[room.label]})}))
  .filter(({score})=>Number.isFinite(score)).sort((a,b)=>a.score-b.score).map(({room})=>room.number);

test('room numbers accept common prefixes, case and spacing without adding records',()=>{
  for(const query of ['462','  462  ','ауд. № 462','АУДИТОРИЯ 462','каб. #462','помещение 462'])
    assert.deepEqual(find(query),['462']);
  assert.deepEqual(find('ауд. № 999'),[]);
  assert.equal(filterPilotRooms({query:'кабинет №462'})[0].number,'462');
});

test('exact numbers outrank partial identifiers and names',()=>{
  assert.ok(searchRoom('462',{numbers:['462']})<searchRoom('462',{numbers:['462а']}));
  assert.ok(searchRoom('462',{numbers:['462а']})<searchRoom('462',{numbers:['1462']}));
  assert.ok(searchRoom('462',{numbers:['1462']})<searchRoom('462',{text:['комната 462']}));
  assert.equal(searchRoom('несуществующая',{numbers:['462'],text:['Лаборатория']}),Infinity);
});

test('search finds the actual panel group for a number inside a range',()=>{
  const groups={numbers:['265-269']};
  assert.ok(Number.isFinite(searchRoom('ауд. 267',groups)));
  assert.ok(searchRoom('267',{numbers:['267']})<searchRoom('267',groups));
  assert.equal(searchRoom('270',groups),Infinity);
  assert.equal(searchRoom('350',{numbers:['265-469']}),Infinity);
});

test('text search normalizes punctuation and ё while preserving empty and partial searches',()=>{
  assert.deepEqual(find('  ЛАБОРАТОРИЯ   КОМПЬЮТЕРНОЙ '),['462']);
  assert.deepEqual(find('веб дизайн'),['484']);
  assert.deepEqual(find('462 лаборатория компьютерной'),['462']);
  assert.deepEqual(find('аудитория'),['411','452']);
  assert.equal(searchRoom('учебная',{text:['Учёбная зона']}),3);
  assert.deepEqual(find(''),rooms.map(room=>room.number));
  assert.ok(find('46').includes('462'));
});
