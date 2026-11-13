import test from 'node:test';
import assert from 'node:assert/strict';
import {lessonsForWeek,parseWeeklyGrid,readWeeklySchedule} from '../public/js/weekly-schedule.js';

test('weekly Excel grid preserves both variants, blank lessons and merged links',()=>{
 const rows=[
  ['Расписание группы 4-ТЕСТ-1'],
  ['День','Время','Занятие'],
  ['Среда','10:05 – 11:30','Информатика, ауд. ДО\nЛек · Преподаватель А.'],
  [null,null,'Информатика, ауд. В 462\nЛаб · Преподаватель Б.'],
  [null,'11:40 – 13:05',''],
  [null,null,'Дизайн, ауд. С 407'],
  [null,'13:45 – 15:10','Моделирование, ауд. В 466'],
  [],
  [null,'15:20 – 16:45','История, ауд. 525'],
  [],
 ];
 const merges=[
  {column:0,first:2,last:9},
  {column:1,first:2,last:3},
  {column:1,first:4,last:5},
  {column:1,first:6,last:7},
  {column:2,first:6,last:7},
  {column:1,first:8,last:9},
 ];
 const schedule=parseWeeklyGrid(rows,merges);
 assert.equal(schedule.group,'4-ТЕСТ-1');
 const numerator=lessonsForWeek(schedule.rows,'numerator');
 const denominator=lessonsForWeek(schedule.rows,'denominator');
 assert.deepEqual(numerator.map(item=>item.title),['Информатика','Моделирование','История']);
 assert.deepEqual(denominator.map(item=>item.title),['Информатика','Дизайн','Моделирование']);
 assert.equal(numerator[0].address,'Дистанционное обучение');
 assert.equal(numerator[2].building,'morskaya');
 assert.equal(denominator[0].teacher,'Преподаватель Б.');
 assert.equal(denominator[0].lessonType,'Лаб');
 assert.equal(denominator[0].destination,'f4-s8');
 assert.equal(denominator[1].building,'sadovaya');
 assert.equal(denominator[1].destination,undefined);
 assert.deepEqual(readWeeklySchedule(JSON.parse(JSON.stringify(schedule))),schedule);
});

test('Excel importer distinguishes another workbook from an empty timetable',()=>{
 assert.equal(parseWeeklyGrid([['Бюджет','Сумма']],[]),null);
 assert.throws(()=>parseWeeklyGrid([['День','Время','Занятие']],[]),/нет занятий/);
});
