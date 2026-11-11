import {demoClasses, nextClass, routeLink} from './campus-days-model.js';
import {loadBookings, todayMoscow} from './model.js';
import {pilotRoomById, pilotDisplayNumber} from './pilot-spaces.js';
import {readSchedule,SCHEDULE_STORAGE_KEY} from './local-schedule.js';
import {escapeHTML as e} from './email-template.js';

const $ = id => document.getElementById(id);
const now = new Date();
const today = todayMoscow(now);
$('today-date').textContent = new Intl.DateTimeFormat('ru-RU', {timeZone:'Europe/Moscow', weekday:'long', day:'numeric', month:'long'}).format(now).toLocaleUpperCase('ru-RU');
let localSchedule=null,fileRevision=0;
const status=$('schedule-status'),reset=$('schedule-reset');
function renderSchedule(){
  const classes=localSchedule===null?demoClasses:localSchedule.filter(item=>item.date===today).sort((a,b)=>a.start.localeCompare(b.start));
  const next=nextClass(classes,now);
  $('schedule-title').textContent=localSchedule===null?'Пример дня':'Моё расписание';
  reset.hidden=localSchedule===null;
  $('next-status').textContent=next?'Ближайшее неотменённое занятие выделено ниже.':classes.length?'На сегодня занятий больше нет.':'На сегодня занятий в файле нет.';
  $('class-list').innerHTML=classes.map(item=>{
    const place=item.status==='moved'?`Вместо аудитории ${item.previousRoom} → аудитория ${item.room}`:item.room?`Аудитория ${item.room}`:'';
    const address=item.address||(localSchedule===null?'Вознесенский пр., 44–46':'');
    const label={moved:'Перенос',cancelled:'Отменено',scheduled:'По расписанию'}[item.status];
    return `<article class="card ${next?.id===item.id?'card-next':''}">
      <div class="card-time">${item.start}<span>до ${item.end}</span></div>
      <div class="card-body"><div class="card-top"><span class="pill ${item.status}">${label}</span>${next?.id===item.id?'<span class="next-label">Ближайшее</span>':''}</div>
      <h3>${e(item.title)}</h3>${place||address?`<p>${[place,address].filter(Boolean).map(e).join('<br>')}</p>`:''}
      ${item.destination?`<a class="text-link" href="${e(routeLink(location.href,item.destination))}">Маршрут от входа →</a>`:''}
      ${item.building&&item.status!=='cancelled'?`<a class="text-link" href="./buildings.html?to=${e(item.building)}">Маршрут до корпуса →</a>`:''}
      </div></article>`;
  }).join('');
}
try{
  const saved=localStorage.getItem(SCHEDULE_STORAGE_KEY);
  if(saved)localSchedule=readSchedule(saved);
}catch{
  status.textContent='Не удалось прочитать сохранённое расписание. Загрузите файл повторно.';
}
renderSchedule();
$('schedule-file').addEventListener('change',async event=>{
  const revision=++fileRevision,input=event.currentTarget,file=input.files[0];
  if(!file)return;
  try{
    if(file.size>256000)throw new Error('Файл слишком большой. Максимум 256 КБ.');
    const rows=readSchedule(await file.text());
    if(revision!==fileRevision)return;
    localStorage.setItem(SCHEDULE_STORAGE_KEY,JSON.stringify(rows));
    localSchedule=rows;
    status.textContent='Расписание сохранено в этом браузере.';
    renderSchedule();
  }catch(error){
    if(revision===fileRevision)status.textContent=error instanceof SyntaxError?'Не удалось прочитать JSON. Сверьте формат с примером.':error.message;
  }finally{
    if(revision===fileRevision)input.value='';
  }
});
reset.addEventListener('click',()=>{
  fileRevision++;
  try{
    localStorage.removeItem(SCHEDULE_STORAGE_KEY);
    localSchedule=null;
    $('schedule-file').value='';
    status.textContent='Загруженное расписание удалено.';
    renderSchedule();
  }catch{
    status.textContent='Не удалось удалить расписание из хранилища браузера.';
  }
});

const result = loadBookings({getItem: key => localStorage.getItem(key)}, today);
const bookings = result.bookings.filter(item => item.date === today).sort((a, b) => a.start - b.start);
if (result.error) $('booking-list').textContent = result.error;
else if (!bookings.length) $('booking-list').innerHTML = '<div class="empty">На сегодня учебных броней нет. <a href="./index.html">Выбрать место на карте →</a></div>';
else $('booking-list').innerHTML = bookings.map(item => {
  const room = pilotRoomById(item.roomId);
  const time = hour => `${String(hour).padStart(2, '0')}:00`;
  return `<article class="booking-row"><div><strong>${time(item.start)}–${time(item.start + item.hours)} · ${room.name}</strong><p>Аудитория ${pilotDisplayNumber(room)} · места ${item.seatIds.join(', ')}</p></div><a href="${routeLink(location.href, room.spaceId)}">Маршрут →</a></article>`;
}).join('');
