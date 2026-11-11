import {normalizeRoomSearch} from './room-search.js';
import {todayMoscow} from './model.js';

const people={двоих:2,троих:3,четверых:4,пятерых:5,шестерых:6,семерых:7,восьмерых:8};
const equipmentTerms=[
 ['Компьютеры',/(?:^| )(?:компьютер|компьютером|компьютерами)(?: |$)/u],
 ['Проектор',/(?:^| )(?:проектор|проектором)(?: |$)/u],
 ['Экран',/(?:^| )(?:экран|экраном)(?: |$)/u],
 ['Розетки',/(?:^| )(?:розетка|розетки|розетками|розеткой)(?: |$)/u],
];

export function parseWorkSearch(query){
 const text=normalizeRoomSearch(query);
 if(!/(?:^| )(?:место|места|поработать)(?: |$)/u.test(text))return null;
 const number=text.match(/(?:^| )(?:на|для) ([1-9]\d?) (?:человек|человека|людей)(?: |$)/u)?.[1];
 const word=text.match(/(?:^| )(?:на|для) (двоих|троих|четверых|пятерых|шестерых|семерых|восьмерых)(?: |$)/u)?.[1];
 const minSeats=number?Number(number):people[word]??1;
 const equipment=equipmentTerms.filter(([,term])=>term.test(text)).map(([name])=>name);
 const nearestHour=/(?:^| )на ближайший час(?: |$)/u.test(text);
 return minSeats>1||equipment.length||nearestHour?{minSeats,equipment,nearestHour}:null;
}

const moscowClock=new Intl.DateTimeFormat('en-GB',{
 timeZone:'Europe/Moscow',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23',
});

export function nextWorkHour(now=new Date()){
 const clock=Object.fromEntries(moscowClock.formatToParts(now).map(part=>[part.type,part.value]));
 const start=Number(clock.hour)+Number(Number(clock.minute)>0||Number(clock.second)>0);
 if(start<9||start>20)return null;
 return {date:todayMoscow(now),start,hours:1};
}
