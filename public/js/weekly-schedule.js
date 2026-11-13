import {campusBuildings} from './campus-buildings.js?v=20261112-polish';
import {normalizeScheduleRows} from './local-schedule.js?v=20261113-xlsx';

export const WEEKDAYS=['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];
export const WEEK_TYPES={numerator:'Числитель',denominator:'Знаменатель'};
const text=value=>String(value??'').trim();
const weekdayIndex=new Map(WEEKDAYS.map((day,index)=>[day.toLowerCase(),index]));
const campusCodes=new Map(campusBuildings.map(building=>[building.code,building.id]));
const latinCodes={B:'В',C:'С',M:'М',P:'Р'};
const timeRange=/^(\d{1,2}:\d{2})\s*[-–—−]\s*(\d{1,2}:\d{2})$/u;
const courseType=/^(?:Лек(?:ция)?|Пр(?:актика)?|Лаб(?:ораторная)?|Сем(?:инар)?|Экз?(?:амен)?|Зач(?:ёт|ет)?|Конс(?:ультация)?|КР|КП|ДЗ)$/iu;

function lessonLocation(value){
 const location=text(value).replace(/\s+/gu,' ');
 if(!location)return {};
 if(/^(?:ДО|ДОТ|дистанционное обучение)(?=$|\s|[.(])/iu.test(location)){
  return {address:'Дистанционное обучение'};
 }
 const match=location.match(/^(?:([ВСМДЦРBCMP])\s*[-.]?\s*)?(\d{1,4}[\p{L}]?(?:[/-]\d{1,4}[\p{L}]?)?)$/iu);
 if(!match)return {room:location};
 const prefix=match[1]?.toUpperCase();
 return {building:prefix?campusCodes.get(latinCodes[prefix]??prefix):'morskaya',room:match[2]};
}

function cellLessons(value){
 const lessons=[];
 for(const line of String(value??'').split(/\r?\n/u).map(text).filter(Boolean)){
  const [first,...parts]=line.split(/\s+·\s+/u);
  const previous=lessons.at(-1);
  if(previous&&!previous.teacher&&!previous.lessonType&&(courseType.test(first)||parts.length&&!/ауд\./iu.test(line))){
   previous.lessonType=courseType.test(first)?first:'';
   previous.teacher=previous.lessonType?parts.join(' · '):line;
   continue;
  }
  const match=line.match(/^(.*?),\s*ауд\.?\s+(.+)$/iu);
  lessons.push({title:match?.[1]??line,...lessonLocation(match?.[2])});
 }
 return lessons;
}

export function parseWeeklyGrid(rows,merges,sheetName=''){
 const header=rows.findIndex(row=>row?.slice(0,3).map(value=>text(value).toLowerCase()).join('|')==='день|время|занятие');
 if(header<0)return null;
 const heading=text(rows.slice(0,header).find(row=>/^Расписание группы\s/iu.test(text(row?.[0])))?.[0]);
 const group=(heading.replace(/^Расписание группы\s+/iu,'')||text(sheetName)).slice(0,100);
 const week=readWeeklyRows(rows,merges,header);
 return {format:'weekly',group,week:'numerator',rows:week};
}

function readWeeklyRows(rows,merges,header){
 // The official export uses one lesson cell for both weeks, or two lesson
 // cells in numerator/denominator order. A blank variant is significant.
 const coveredLessons=new Set(),slotEnds=new Map();
 for(const {first,last,column} of merges){
  if(column===1)slotEnds.set(first,last);
  if(column===2)for(let row=first+1;row<=last;row++)coveredLessons.add(row);
 }
 const slots=[];
 let slot=null,weekday=null,slotEnd=-1;
 const rowCount=Math.max(rows.length,...[...slotEnds.values()].map(end=>end+1));
 for(let index=header+1;index<rowCount;index++){
  const [day,range,lesson]=rows[index]??[];
  if(text(day)){
   weekday=weekdayIndex.get(text(day).toLowerCase())??null;
   slot=null;
  }
  if(text(range)){
   slotEnd=slotEnds.get(index)??index;
   const match=text(range).match(timeRange);
   slot=match&&weekday!==null?{weekday,start:match[1].padStart(5,'0'),end:match[2].padStart(5,'0'),variants:[]}:null;
   if(slot)slots.push(slot);
  }
  if(coveredLessons.has(index))continue;
  if(slot&&index<=slotEnd)slot.variants.push(text(lesson));
  else if(text(lesson))throw new Error('В строке '+(index+1)+' не удалось определить день или время занятия.');
 }
 const entries=[];
 for(const {variants,...slot} of slots){
  if(variants.length>2&&variants.some(Boolean))throw new Error('Не удалось различить числитель и знаменатель в одной из пар.');
  const types=variants.length===1?['both']:Object.keys(WEEK_TYPES);
  variants.forEach((value,index)=>{
   for(const lesson of cellLessons(value))entries.push({...slot,...lesson,weekType:types[index]});
  });
 }
 if(!entries.length)throw new Error('В таблице нет занятий.');
 return normalizeScheduleRows(entries,{weekly:true});
}

export function readWeeklySchedule(data){
 if(!data||data.format!=='weekly'||typeof data.group!=='string'||!Object.hasOwn(WEEK_TYPES,data.week)){
  throw new Error('Не удалось восстановить расписание Excel.');
 }
 return {format:'weekly',group:data.group.slice(0,100),week:data.week,rows:normalizeScheduleRows(data.rows,{weekly:true})};
}

export function lessonsForWeek(rows,week){
 return rows.filter(lesson=>lesson.weekType==='both'||lesson.weekType===week)
  .sort((a,b)=>a.weekday-b.weekday||a.start.localeCompare(b.start));
}
