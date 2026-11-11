import {campusClosures} from './campus-closures.js';

export const MAP_STORAGE_KEY='vnutri.map-preview.v1';
const zonedDate=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;

// The graph exposes each stair connection twice, once in each direction.
export function mapLinks(navigator){
 const landings=new Map([...navigator.floors.values()].flatMap(f=>f.landings.map(landing=>[landing.id,landing])));
 const unique=new Map();
 for(const link of navigator.links){
  if(unique.has(link.id))continue;
  const a=landings.get(link.from),b=landings.get(link.to);
  const label=landing=>landing?`${landing.label} · ${landing.floor}-й этаж`:link.id;
  unique.set(link.id,{...link,label:`${label(a)} ↔ ${label(b)}`});
 }
 return [...unique.values()].sort((a,b)=>a.label.localeCompare(b.label,'ru'));
}

export function validateClosures(closures,navigator){
 if(!Array.isArray(closures))throw new Error('Список закрытий повреждён.');
 const ids=new Set(navigator.links.map(link=>link.id));
 return closures.map(closure=>{
  if(!closure||typeof closure!=='object'||!ids.has(closure.linkId))throw new Error('Указан неизвестный переход.');
  const readDate=value=>{
   if(value==null||value==='')return null;
   if(typeof value!=='string'||!zonedDate.test(value)||!Number.isFinite(Date.parse(value)))throw new Error('Укажите корректную дату и время с часовым поясом.');
   // Reject normalised impossible calendar dates such as February 30.
   const parts=value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/),days=new Date(Date.UTC(Number(parts[1]),Number(parts[2]),0)).getUTCDate();
   if(Number(parts[2])<1||Number(parts[2])>12||Number(parts[3])<1||Number(parts[3])>days||Number(parts[4])>23||Number(parts[5])>59||Number(parts[6]||0)>59)throw new Error('Укажите корректную дату и время с часовым поясом.');
   return new Date(value).toISOString();
  };
  const startsAt=readDate(closure.startsAt),endsAt=readDate(closure.endsAt);
  if(startsAt&&endsAt&&Date.parse(startsAt)>=Date.parse(endsAt))throw new Error('Окончание должно быть позже начала.');
  if(closure.reason!=null&&typeof closure.reason!=='string')throw new Error('Причина должна быть текстом.');
  return {linkId:closure.linkId,...(startsAt?{startsAt}:{}),...(endsAt?{endsAt}:{}),...(closure.reason?.trim()?{reason:closure.reason.trim().slice(0,500)}:{})};
 });
}

export function readMapState(storage,navigator){
 const raw=storage.getItem(MAP_STORAGE_KEY);
 if(!raw)return {version:1,currentId:null,snapshots:[]};
 const state=JSON.parse(raw);
 if(!state||state.version!==1||!Array.isArray(state.snapshots)||typeof state.currentId!=='string')throw new Error('История версий повреждена.');
 const seen=new Set();
 const snapshots=state.snapshots.map(snapshot=>{
  if(!snapshot||typeof snapshot.id!=='string'||!snapshot.id||seen.has(snapshot.id)||typeof snapshot.createdAt!=='string'||!Number.isFinite(Date.parse(snapshot.createdAt)))throw new Error('История версий повреждена.');
  seen.add(snapshot.id);
  return {id:snapshot.id,createdAt:snapshot.createdAt,closures:validateClosures(snapshot.closures,navigator)};
 });
 if(!seen.has(state.currentId))throw new Error('Текущая версия не найдена.');
 return {version:1,currentId:state.currentId,snapshots};
}

export function saveMapSnapshot(storage,navigator,closures){
 const safe=validateClosures(closures,navigator),state=readMapState(storage,navigator);
 const createdAt=new Date().toISOString();
 const id=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
 const snapshot={id,createdAt,closures:safe};
 const next={version:1,currentId:id,snapshots:[snapshot,...state.snapshots]};
 storage.setItem(MAP_STORAGE_KEY,JSON.stringify(next));
 return next;
}

export function restoreMapSnapshot(storage,navigator,id){
 const state=readMapState(storage,navigator),snapshot=state.snapshots.find(item=>item.id===id);
 if(!snapshot)throw new Error('Версия не найдена.');
 // Rollback creates a new snapshot; the historical versions remain available.
 return saveMapSnapshot(storage,navigator,snapshot.closures);
}

export function loadMapClosures(navigator,{search=globalThis.location?.search||'',storage}={}){
 if(new URLSearchParams(search).get('map')!=='preview')return {closures:campusClosures,mode:'public',error:null};
 try{
  const state=readMapState(storage??globalThis.localStorage,navigator),snapshot=state.snapshots.find(item=>item.id===state.currentId);
  if(!snapshot)return {closures:campusClosures,mode:'public',error:'Локальная версия карты ещё не сохранена.'};
  return {closures:snapshot.closures,mode:'preview',error:null};
 }catch(error){return {closures:campusClosures,mode:'public',error:`Не удалось загрузить локальную версию карты: ${error.message}`};}
}
