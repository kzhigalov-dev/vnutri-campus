import {buildingById,mappedBuildingRoom} from './campus-buildings.js?v=20261112-polish';

export const SCHEDULE_STORAGE_KEY='vnutri.schedule.v1';
const time=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
const statuses=new Set(['scheduled','moved','cancelled']);
const clean=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';

export function readSchedule(source){
 const rows=JSON.parse(source);
 if(!Array.isArray(rows)||rows.length>500)throw new Error('Нужен массив из максимум 500 занятий.');
 return rows.map((row,index)=>{
  const error=()=>new Error(`Занятие ${index+1}: проверьте дату, время, название и статус.`);
  if(!row||typeof row!=='object')throw error();
  const {date,start,end}=row,status=row.status??'scheduled';
  const title=clean(row.title,160),room=clean(row.room,40),previousRoom=clean(row.previousRoom,40);
  if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))throw error();
  const day=new Date(date+'T00:00:00Z');
  if(!Number.isFinite(+day)||day.toISOString().slice(0,10)!==date)throw error();
  if(!title||typeof start!=='string'||typeof end!=='string'||!time.test(start)||!time.test(end)||start>=end||!statuses.has(status))throw error();
  if(status==='moved'&&(!room||!previousRoom||room===previousRoom))throw error();
  const building=buildingById(row.building);
  const placement=mappedBuildingRoom(building?.id,room);
  return {
   id:`local-${index}`,date,start,end,status,title,room,previousRoom,building:building?.id??'',
   address:building?.address??clean(row.address,200),
   ...(status!=='cancelled'&&placement?{destination:placement.spaceId}:{}),
  };
 });
}
