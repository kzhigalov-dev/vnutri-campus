import {placementForSpace} from './room-placements.js';
import {rooms} from './data.js';
import {searchRoom} from './room-search.js';
// Concept workspaces mapped to rooms on the 2026 wayfinding panels.
const bindings=['f4-s4','f4-s8','f4-s13','f4-s20','f4-s27','f4-s31','f4-s36','f4-s39'];
const numbers=['459','462','466','484','452','425','448','435'];
const names=['Цифровая лаборатория','Графическая мастерская','Код-студия','Веб и дизайн','Командная аудитория','Тихая комната','Проектная гостиная','Читальная зона'];
export const pilotRooms=rooms.map((r,i)=>({...r,number:numbers[i],name:names[i],spaceId:bindings[i],floor:4,proposed:true,source:null,documentedPlaces:null,evidence:'Учебная пилотная зона',description:'Предлагаемая рабочая зона в кабинете '+numbers[i]+' по навигационной панели 2026 года. Вместимость и оснащение заданы для учебной модели.',mapBinding:{kind:'pilot',spaceId:bindings[i],floor:4}}));
export const pilotEquipment=[...new Set(pilotRooms.flatMap(room=>room.equipment))].sort((a,b)=>a.localeCompare(b,'ru'));
export const pilotRoomById=id=>pilotRooms.find(r=>r.id===id);
export const pilotRoomBySpace=id=>pilotRooms.find(r=>r.spaceId===id);
export function filterPilotRooms({query='',category='all',minSeats=1,equipment=''}={}){
 if(!Number.isInteger(minSeats)||minSeats<1)return [];
 const requiredEquipment=Array.isArray(equipment)?equipment:equipment?[equipment]:[];
 return pilotRooms
  .map(room=>({room,score:searchRoom(query,{numbers:[room.number,placementForSpace(room.spaceId)?.number],text:[room.name,...room.equipment]})}))
  .filter(({room,score})=>Number.isFinite(score)
   &&(category==='all'||room.category===category)
   &&room.seatCount>=minSeats
   &&requiredEquipment.every(item=>room.equipment.includes(item)))
  .sort((a,b)=>a.score-b.score)
  .map(({room})=>room);
}

export function pilotDisplayNumber(room){const p=placementForSpace(room.spaceId);return p&&p.number!==room.number?`${p.number} / ${room.number}`:room.number;}
