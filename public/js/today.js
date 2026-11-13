import {demoClasses, nextClass, routeLink} from './campus-days-model.js?v=20261112-polish';
import {buildingDirectionsLink} from './campus-buildings.js?v=20261112-polish';
import {todayMoscow} from './moscow-date.js';
import {readSchedule,readScheduleFile,scheduleDays,SCHEDULE_STORAGE_KEY} from './local-schedule.js?v=20261112-schedule';
import {escapeHTML as e} from './escape-html.js';

const $ = id => document.getElementById(id);
const dateLabel=new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',weekday:'long',day:'numeric',month:'long',year:'numeric'});
const formatDay=date=>dateLabel.format(new Date(date+'T12:00:00Z'));
let localSchedule=null,fileRevision=0,selectedDay=null;
const status=$('schedule-status'),reset=$('schedule-reset'),daySelect=$('schedule-day');
function renderSchedule(){
  const now=new Date(),today=todayMoscow(now),imported=localSchedule!==null;
  const days=scheduleDays(localSchedule??[],today);
  const day=imported&&days.dates.includes(selectedDay)?selectedDay:days.initial;
  const classes=imported?localSchedule.filter(item=>item.date===day).sort((a,b)=>a.start.localeCompare(b.start)):demoClasses;
  const next=day===today?nextClass(classes,now):null;
  $('today-date').textContent=formatDay(day).toLocaleUpperCase('ru-RU');
  $('schedule-title').textContent=imported?'Моё расписание':'Пример дня';
  $('schedule-demo').hidden=imported;
  reset.hidden=!imported;
  $('schedule-day-control').hidden=!imported;
  if(imported){
    daySelect.replaceChildren(...days.dates.map(date=>new Option(date===today?`Сегодня · ${formatDay(date)}`:formatDay(date),date)));
    daySelect.value=day;
  }
  $('next-status').textContent=next?'Ближайшее занятие выделено ниже.'
    :!classes.length?(localSchedule?.length?'На выбранную дату занятий в файле нет.':'В файле нет занятий.')
    :day===today?'На сегодня больше нет неотменённых занятий.':day===days.initial&&!selectedDay?`На сегодня занятий в файле нет. Показано расписание на ${formatDay(day)}.`:'Занятия на выбранную дату.';
  $('class-list').innerHTML=classes.map(item=>{
    const place=item.status==='moved'?`Вместо аудитории ${item.previousRoom} → аудитория ${item.room}`:item.room?`Аудитория ${item.room}`:'';
    const address=item.address||(localSchedule===null?'Вознесенский пр., 44–46':'');
    const label={moved:'Перенос',cancelled:'Отменено',scheduled:'По расписанию'}[item.status];
    const city=item.building&&item.status!=='cancelled'
      ?buildingDirectionsLink(location.href,item.building,item.destination?item.room:undefined)
      :null;
    return `<article class="card ${next?.id===item.id?'card-next':''}">
      <div class="card-time">${item.start}<span>до ${item.end}</span></div>
      <div class="card-body"><div class="card-top"><span class="pill ${item.status}">${label}</span>${next?.id===item.id?'<span class="next-label">Ближайшее</span>':''}</div>
      <h3>${e(item.title)}</h3>${place||address?`<p>${[place,address].filter(Boolean).map(e).join('<br>')}</p>`:''}
      ${item.destination?`<a class="text-link" href="${e(routeLink(location.href,item.destination))}">От входа до аудитории →</a>`:''}
      ${city?`<a class="text-link" href="${e(city.href)}">${item.destination?'До корпуса и дальше до аудитории':'Маршрут до корпуса'} →</a>`:''}
      ${city&&item.room&&!item.destination?'<p>Положение аудитории на карте пока не подтверждено.</p>':''}
      </div></article>`;
  }).join('')||'<p class="empty">Выберите другую дату или загрузите файл с занятиями.</p>';
}
try{
  const saved=localStorage.getItem(SCHEDULE_STORAGE_KEY);
  if(saved)localSchedule=readSchedule(saved);
}catch{
  status.textContent='Не удалось прочитать сохранённое расписание. Загрузите файл повторно.';
}
renderSchedule();
daySelect.addEventListener('change',()=>{
  selectedDay=daySelect.value;
  renderSchedule();
});
$('schedule-file').addEventListener('change',async event=>{
  const input=event.currentTarget,file=input.files[0];
  if(!file)return;
  const revision=++fileRevision;
  status.textContent='Читаем файл…';
  try{
    const rows=await readScheduleFile(file);
    if(revision!==fileRevision)return;
    localSchedule=rows;
    selectedDay=null;
    try{
      localStorage.setItem(SCHEDULE_STORAGE_KEY,JSON.stringify(rows));
      status.textContent=`Загружено занятий: ${rows.length}. Расписание сохранено в этом браузере.`;
    }catch{
      status.textContent=`Загружено занятий: ${rows.length}. Хранилище недоступно, поэтому расписание открыто до перезагрузки страницы.`;
    }
    renderSchedule();
  }catch(error){
    if(revision===fileRevision)status.textContent=error.message;
  }finally{
    if(revision===fileRevision)input.value='';
  }
});
reset.addEventListener('click',()=>{
  fileRevision++;
  localSchedule=null;
  selectedDay=null;
  $('schedule-file').value='';
  try{
    localStorage.removeItem(SCHEDULE_STORAGE_KEY);
    status.textContent='Загруженное расписание удалено.';
  }catch{
    status.textContent='Расписание закрыто. Браузер не разрешил удалить сохранённую копию.';
  }
  renderSchedule();
});
