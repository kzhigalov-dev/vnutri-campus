import { rooms, roomById } from './data.js';
export const MAX_BOOKINGS=250;
const capacityError='Сохранено 250 учебных броней. Отмени ненужную запись перед созданием новой.';
export const STORAGE_KEY='vnutri.campus.bookings.v1';
export function todayMoscow(now=new Date()) {
  const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const v=k=>p.find(x=>x.type===k).value;
  return `${v('year')}-${v('month')}-${v('day')}`;
}
export function addDays(date,days){const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
const integer=v=>(typeof v==='number'||typeof v==='string'&&/^\d+$/.test(v.trim()))&&Number.isInteger(Number(v));
export const overlaps=(aStart,aHours,bStart,bHours)=>aStart<bStart+bHours&&bStart<aStart+aHours;
export function occupiedSeats(roomId,date,start,hours,bookings=[],seeded=true){
  const occupied=new Set();
  if(!roomById(roomId)||!validDate(date)||!integer(start)||!integer(hours))return occupied;
  // Fixed example reservations are simulated every day, never real timetable data.
  if(seeded&&overlaps(Number(start),Number(hours),12,3)){
    for(const seat of roomId==='reading'?[1,2,3,4,5,6,7,8]:[2,6])occupied.add(seat);
  }
  for(const b of bookings)if(b.roomId===roomId&&b.date===date&&overlaps(Number(start),Number(hours),b.start,b.hours))for(const seat of b.seatIds)occupied.add(seat);
  return occupied;
}
export function validateRequest(request,bookings=[],today=todayMoscow(),checkWindow=true,seeded=true){
  const {roomId,seatIds,date,start,hours}=request,room=roomById(roomId),error={};
  if(!room)error.room='Выбери пространство на карте или в списке.';
  if(!validDate(date)||(checkWindow&&(date<today||date>addDays(today,14))))error.date='Выбери дату от сегодня до двух недель вперёд.';
  if(!integer(start)||Number(start)<9||Number(start)>20)error.start='Начало — в целый час с 09:00 до 20:00.';
  if(!integer(hours)||Number(hours)<1||Number(hours)>4)error.hours='Длительность — целое число от 1 до 4 часов.';
  else if(!error.start&&Number(start)+Number(hours)>21)error.hours='Запись должна закончиться не позднее 21:00.';
  if(!Array.isArray(seatIds)||seatIds.length<1||seatIds.length>8||new Set(seatIds).size!==seatIds.length||seatIds.some(s=>!Number.isInteger(s)||s<1||s>(room?.seatCount??8)))error.seats='Выбери хотя бы одно свободное место.';
  else if(room&&!error.date&&!error.start&&!error.hours){
    const occupied=occupiedSeats(roomId,date,start,hours,bookings,seeded);
    if(seatIds.some(s=>occupied.has(s)))error.seats='Одно из выбранных мест занято в это время. Выбери другое место или время.';
  }
  return error;
}
export function createBooking(bookings,request,today=todayMoscow()){
  const error=validateRequest(request,bookings,today);
  if(bookings.length>=MAX_BOOKINGS)error.room=capacityError;
  if(Object.keys(error).length)return {error,bookings};
  const {roomId,seatIds,date}=request,start=Number(request.start),hours=Number(request.hours);
  const booking={id:crypto.randomUUID(),roomId,seatIds:[...seatIds].sort((a,b)=>a-b),date,start,hours,total:roomById(roomId).price*hours*seatIds.length,createdAt:new Date().toISOString()};
  return {error:null,booking,bookings:[...bookings,booking]};
}
export const cancelBooking=(bookings,id)=>bookings.filter(b=>b.id!==id);
export function filterRooms({category='all',maxPrice=Infinity,query='',freeOnly=false}={},bookings=[],slot={},seeded=true){
  const q=String(query).trim().toLocaleLowerCase('ru');
  return rooms.filter(r=>(category==='all'||r.category===category)&&r.price<=Number(maxPrice)&&(!q||`${r.number} ${r.name} ${r.equipment.join(' ')}`.toLocaleLowerCase('ru').includes(q))&&(!freeOnly||occupiedSeats(r.id,slot.date,slot.start,slot.hours,bookings,seeded).size<r.seatCount));
}
export function saveBookings(storage,bookings){
  if(bookings.length>MAX_BOOKINGS)return {error:capacityError};
  try{storage.setItem(STORAGE_KEY,JSON.stringify({version:2,bookings}));return {error:null};}
  catch{return {error:'Браузер не разрешил сохранить изменения. Бронь не изменена. Разреши хранение данных сайта и попробуй снова.'};}
}
export function loadBookings(storage,today=todayMoscow()){
  try{
    const raw=storage.getItem(STORAGE_KEY);
    if(raw===null)return {bookings:[],error:null};
    const data=JSON.parse(raw);
    if(!data||![1,2].includes(data.version)||!Array.isArray(data.bookings)||data.bookings.length>MAX_BOOKINGS)throw Error('schema');
    const clean=[],ids=new Set();
    for(const b of data.bookings){
      if(!b||typeof b.id!=='string'||!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(b.id)||ids.has(b.id)||typeof b.start!=='number'||typeof b.hours!=='number'||typeof b.createdAt!=='string'||!Number.isFinite(Date.parse(b.createdAt))||Object.keys(validateRequest(b,clean,today,false)).length||!(b.total===0||(data.version===1&&b.total===({r459:40,r462:60,r466:40,r484:60,r452:20,quiet:0,team:30,reading:0}[b.roomId])*b.hours*b.seatIds.length)))throw Error('record');
      ids.add(b.id);
      clean.push({id:b.id,roomId:b.roomId,seatIds:[...b.seatIds],date:b.date,start:b.start,hours:b.hours,total:0,createdAt:b.createdAt});
    }
    return {bookings:clean.filter(b=>b.date>=today),error:null};
  }catch{return {bookings:[],error:'Не удалось прочитать брони: данные повреждены или хранение недоступно. Сбрось учебные брони, чтобы начать заново.'};}
}
