import {demoClasses, nextClass, routeLink} from './campus-days-model.js?v=20261112-polish';
import {buildingDirectionsLink} from './campus-buildings.js?v=20261112-polish';
import {todayMoscow} from './moscow-date.js';
import {readSchedule,readScheduleFile,scheduleDays,SCHEDULE_STORAGE_KEY} from './local-schedule.js?v=20261113-xlsx';
import {readWeeklySchedule,lessonsForWeek,WEEKDAYS,WEEK_TYPES} from './weekly-schedule.js?v=20261113-xlsx';
import {escapeHTML as e} from './escape-html.js';

const $ = id => document.getElementById(id);
const dateLabel=new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',weekday:'long',day:'numeric',month:'long',year:'numeric'});
const formatDay=date=>dateLabel.format(new Date(date+'T12:00:00Z'));
let localSchedule=null,fileRevision=0,selectedDay=null;
const status=$('schedule-status'),reset=$('schedule-reset'),daySelect=$('schedule-day');
const weekSelect=$('schedule-week'),weekdaySelect=$('schedule-weekday');
let selectedWeekday=null;
weekdaySelect.replaceChildren(...WEEKDAYS.map((day,index)=>new Option(day,String(index))));

function weeklyView(schedule,today){
 const weekdays=lessonsForWeek(schedule.rows,schedule.week);
 const todayIndex=(new Date(today+'T12:00:00Z').getUTCDay()+6)%7;
 const weekday=selectedWeekday??(weekdays.find(lesson=>lesson.weekday>=todayIndex)??weekdays[0])?.weekday??todayIndex;
 weekSelect.value=schedule.week;
 weekdaySelect.value=String(weekday);
 $('today-date').textContent=WEEKDAYS[weekday].toLocaleUpperCase('ru-RU');
 $('schedule-title').textContent=schedule.group?'Группа '+schedule.group:'Расписание группы';
 const classes=weekdays.filter(lesson=>lesson.weekday===weekday);
 $('next-status').textContent=classes.length
  ?WEEK_TYPES[schedule.week]+' · '+WEEKDAYS[weekday].toLowerCase()
  :'На этот день занятий в выбранной неделе нет.';
 return {classes,next:null};
}

function datedView(schedule,today,now){
 const days=scheduleDays(schedule??[],today);
 const day=schedule&&days.dates.includes(selectedDay)?selectedDay:days.initial;
 const classes=schedule?schedule.filter(item=>item.date===day).sort((a,b)=>a.start.localeCompare(b.start)):demoClasses;
 const next=day===today?nextClass(classes,now):null;
 $('today-date').textContent=formatDay(day).toLocaleUpperCase('ru-RU');
 $('schedule-title').textContent=schedule?'Моё расписание':'Пример дня';
 if(schedule){
  daySelect.replaceChildren(...days.dates.map(date=>new Option(date===today?'Сегодня · '+formatDay(date):formatDay(date),date)));
  daySelect.value=day;
 }
 $('next-status').textContent=next?'Ближайшее занятие выделено ниже.'
  :!classes.length?(schedule?.length?'На выбранную дату занятий в файле нет.':'В файле нет занятий.')
  :day===today?'На сегодня больше нет неотменённых занятий.'
  :day===days.initial&&!selectedDay?'На сегодня занятий в файле нет. Показано расписание на '+formatDay(day)+'.':'Занятия на выбранную дату.';
 return {classes,next};
}

function saveLocalSchedule(){
 try{
  localStorage.setItem(SCHEDULE_STORAGE_KEY,JSON.stringify(localSchedule));
  return true;
 }catch{
  return false;
 }
}
function renderSchedule(){
  const now=new Date(),today=todayMoscow(now),imported=localSchedule!==null;
  const weekly=localSchedule?.format==='weekly';
  $('schedule-demo').hidden=imported;
  reset.hidden=!imported;
  $('schedule-day-control').hidden=!imported||weekly;
  $('schedule-week-control').hidden=!weekly;
  $('schedule-weekday-control').hidden=!weekly;
  $('schedule-week-note').hidden=!weekly;
  const {classes,next}=weekly?weeklyView(localSchedule,today):datedView(localSchedule,today,now);
  $('class-list').innerHTML=classes.map(item=>{
    const place=item.status==='moved'?`Вместо аудитории ${item.previousRoom} → аудитория ${item.room}`:item.room?`Аудитория ${item.room}`:'';
    const address=item.address||(localSchedule===null?'Вознесенский пр., 44–46':'');
    const label=item.lessonType||{moved:'Перенос',cancelled:'Отменено',scheduled:'По расписанию'}[item.status];
    const city=item.building&&item.status!=='cancelled'
      ?buildingDirectionsLink(location.href,item.building,item.destination?item.room:undefined)
      :null;
    return `<article class="card ${next?.id===item.id?'card-next':''}">
      <div class="card-time">${item.start}<span>до ${item.end}</span></div>
      <div class="card-body"><div class="card-top"><span class="pill ${item.status}">${e(label)}</span>${next?.id===item.id?'<span class="next-label">Ближайшее</span>':''}</div>
      <h3>${e(item.title)}</h3>${item.teacher||place||address?`<p>${[item.teacher,place,address].filter(Boolean).map(e).join('<br>')}</p>`:''}
      ${item.destination?`<a class="text-link" href="${e(routeLink(location.href,item.destination))}">От входа до аудитории →</a>`:''}
      ${city?`<a class="text-link" href="${e(city.href)}">${item.destination?'До корпуса и дальше до аудитории':'Маршрут до корпуса'} →</a>`:''}
      ${city&&item.room&&!item.destination?'<p>Положение аудитории на карте пока не подтверждено.</p>':''}
      </div></article>`;
  }).join('')||(weekly?'<p class="empty">Выберите другой день или неделю.</p>':'<p class="empty">Выберите другую дату или загрузите файл с занятиями.</p>');
}
try{
  const saved=localStorage.getItem(SCHEDULE_STORAGE_KEY);
  if(saved){
    const data=JSON.parse(saved);
    localSchedule=Array.isArray(data)?readSchedule(saved):readWeeklySchedule(data);
  }
}catch{
  status.textContent='Не удалось прочитать сохранённое расписание. Загрузите файл повторно.';
}
renderSchedule();
daySelect.addEventListener('change',()=>{
  selectedDay=daySelect.value;
  renderSchedule();
});
weekSelect.addEventListener('change',()=>{
  if(localSchedule?.format!=='weekly'||!Object.hasOwn(WEEK_TYPES,weekSelect.value))return;
  selectedWeekday=Number(weekdaySelect.value);
  localSchedule.week=weekSelect.value;
  saveLocalSchedule();
  renderSchedule();
});
weekdaySelect.addEventListener('change',()=>{
  selectedWeekday=Number(weekdaySelect.value);
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
    selectedWeekday=null;
    const count=Array.isArray(rows)?rows.length:rows.rows.length;
    status.textContent='Загружено занятий: '+count+'. '+(saveLocalSchedule()
      ?'Расписание сохранено в этом браузере.'
      :'Хранилище недоступно, поэтому расписание открыто до перезагрузки страницы.');
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
  selectedWeekday=null;
  $('schedule-file').value='';
  try{
    localStorage.removeItem(SCHEDULE_STORAGE_KEY);
    status.textContent='Загруженное расписание удалено.';
  }catch{
    status.textContent='Расписание закрыто. Браузер не разрешил удалить сохранённую копию.';
  }
  renderSchedule();
});
