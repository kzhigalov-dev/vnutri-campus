import {createCampusNavigator} from './campus-navigation.js';
import {mapLinks,readMapState,saveMapSnapshot,restoreMapSnapshot,validateClosures} from './map-preview.js';

const $=id=>document.getElementById(id);
const status=message=>{$('status').textContent=message;};
const node=(tag,text,className)=>{const el=document.createElement(tag);if(text!=null)el.textContent=text;if(className)el.className=className;return el;};
const moscowDate=new Intl.DateTimeFormat('ru-RU',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Moscow'});
const formatDate=value=>value?moscowDate.format(new Date(value)):null;
const period=closure=>`${formatDate(closure.startsAt)||'без начала'} — ${formatDate(closure.endsAt)||'без окончания'}`;
async function init(){
 const responses=await Promise.all(['floor-geometry','floor-spaces'].map(name=>fetch(`./data/${name}.json`)));
 if(responses.some(response=>!response.ok))throw new Error('Не удалось загрузить данные этажей.');
 const [geometry,spaces]=await Promise.all(responses.map(response=>response.json()));
 const navigator=createCampusNavigator(geometry,spaces),links=mapLinks(navigator),byId=new Map(links.map(link=>[link.id,link]));
 if(!links.length)throw new Error('В графе нет доступных переходов.');
 for(const link of links){const option=node('option',link.label);option.value=link.id;$('link').append(option);}
 let state,draft=[];
 try{state=readMapState(localStorage,navigator);draft=structuredClone(state.snapshots.find(item=>item.id===state.currentId)?.closures||[]);}
 catch(error){status(`История недоступна: ${error.message}. Сохранение невозможно до устранения ошибки.`);state={version:1,currentId:null,snapshots:[]};}
 function render(){
  $('count').textContent=`Закрытий: ${draft.length}`;
  const list=$('closures');list.replaceChildren();
  if(!draft.length)list.append(node('p','В черновике пока нет закрытий.','empty'));
  draft.forEach((closure,index)=>{
   const row=node('div',null,'row'),info=node('div');
   info.append(node('strong',byId.get(closure.linkId)?.label||closure.linkId),node('p',period(closure)));
   if(closure.reason)info.append(node('p',closure.reason));
   info.append(node('p',closure.linkId,'link-id'));
   const remove=node('button','Удалить');remove.type='button';remove.setAttribute('aria-label',`Удалить закрытие: ${byId.get(closure.linkId)?.label||closure.linkId}`);remove.addEventListener('click',()=>{draft.splice(index,1);render();status('Черновик изменён. Сохраните новую локальную версию.');});
   row.append(info,remove);list.append(row);
  });
  const versions=$('versions');versions.replaceChildren();
  if(!state.snapshots.length)versions.append(node('p','Локальных версий пока нет.','empty'));
  for(const snapshot of state.snapshots){
   const row=node('div',null,'row'),info=node('div'),current=snapshot.id===state.currentId;
   info.append(node('strong',`${formatDate(snapshot.createdAt)}${current?' · текущая':''}`),node('p',`Закрытий: ${snapshot.closures.length}`));
   const restore=node('button','Восстановить');restore.type='button';restore.disabled=current;restore.addEventListener('click',()=>{
    try{state=restoreMapSnapshot(localStorage,navigator,snapshot.id);draft=structuredClone(state.snapshots[0].closures);render();status('Версия восстановлена локально. Откройте демо-маршрут для проверки.');}
    catch(error){status(`Не удалось восстановить версию: ${error.message}`);}
   });row.append(info,restore);versions.append(row);
  }
  $('export').disabled=!state.snapshots.length;
 }
 $('closure-form').addEventListener('submit',event=>{
  event.preventDefault();
  try{
   const starts=$('starts').value,ends=$('ends').value;
   const [closure]=validateClosures([{
    linkId:$('link').value,startsAt:starts?starts+'+03:00':null,endsAt:ends?ends+'+03:00':null,reason:$('reason').value,
   }],navigator);
   draft.push(closure);
   $('closure-form').reset();render();status('Добавлено в черновик. Сохраните новую локальную версию.');
  }catch(error){status(error.message);}
 });
 $('save').addEventListener('click',()=>{
  try{state=saveMapSnapshot(localStorage,navigator,draft);draft=structuredClone(state.snapshots[0].closures);render();status('Локальная версия сохранена. Публичная карта не изменена.');}
  catch(error){status(`Не удалось сохранить версию: ${error.message}`);}
 });
 $('export').addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='vnutri-map-local-versions.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 $('editor').hidden=false;render();
 if(!$('status').textContent.startsWith('История недоступна'))status('');
}
init().catch(error=>status(`Редактор недоступен: ${error.message}`));
