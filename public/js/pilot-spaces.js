import {rooms} from './data.js';
import {occupiedSeats} from './model.js';
// Model-only pilot placements, never asserted to be modern rooms459/462/etc.
const bindings=['f4-s4','f4-s8','f4-s13','f4-s20','f4-s27','f4-s31','f4-s36','f4-s39'];
const names=['Цифровая лаборатория','Графическая мастерская','Код-студия','Веб и дизайн','Командная аудитория','Тихая комната','Проектная гостиная','Читальная зона'];
export const pilotRooms=rooms.map((r,i)=>({...r,number:`П4.${String(Number(bindings[i].split('-s')[1])).padStart(2,'0')}`,name:names[i],spaceId:bindings[i],floor:4,proposed:true,source:null,documentedPlaces:null,evidence:'Учебная пилотная зона',description:'Пилотная зона на схеме 4-го этажа. Размещение, оборудование и восемь мест заданы для учебного бронирования; это не подтверждённый кабинет университета.',mapBinding:{kind:'pilot',spaceId:bindings[i],floor:4}}));
export const pilotRoomById=id=>pilotRooms.find(r=>r.id===id);
export const pilotRoomBySpace=id=>pilotRooms.find(r=>r.spaceId===id);
export function pilotStatus(room,bookings,slot){const occupied=occupiedSeats(room.id,slot.date,slot.start,slot.hours,bookings),free=room.seatCount-occupied.size;return {occupied,free,state:free?'available':'busy',text:free?`${free} из ${room.seatCount} мест`:'Все места заняты'};}
export function filterPilotRooms({query='',category='all',freeOnly=false}={},bookings=[],slot={}){const q=query.trim().toLocaleLowerCase('ru');return pilotRooms.filter(r=>(category==='all'||r.category===category)&&(!q||`${r.number} ${r.name} ${r.equipment.join(' ')}`.toLocaleLowerCase('ru').includes(q))&&(!freeOnly||pilotStatus(r,bookings,slot).free>0));}
