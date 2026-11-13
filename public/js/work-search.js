import {normalizeRoomSearch} from './room-search.js';

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
 return {minSeats,equipment};
}
