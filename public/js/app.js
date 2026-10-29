import {api,createAvailabilityLoader} from './booking-client.js';
import {rooms,roomById,categories,money,slotLabel} from './data.js';
import {todayMoscow,addDays,filterRooms,occupiedSeats as occupiedModel,createBooking,cancelBooking,loadBookings,saveBookings,validateRequest as validateModel,STORAGE_KEY} from './model.js';
const $=id=>document.getElementById(id);
const icon=name=>`<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const typeIcon=r=>r.category==='computer'?'screen':r.category==='quiet'?'quiet':'people';
const typeName=r=>categories.find(c=>c.id===r.category).name;
const storage={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)};
let restored=loadBookings(storage);
const state={bookings:restored.bookings,storageError:restored.error,floor:4,roomId:null,seatIds:[],date:addDays(todayMoscow(),1),start:13,hours:2,filters:{category:'all',query:'',freeOnly:false},success:null};
let ready=false,live=false,accountEmail=null,remoteSlots=[],requestId=null;
const occupiedSeats=(room,date,start,hours,bookings)=>occupiedModel(room,date,start,hours,live?[...bookings,...remoteSlots]:bookings,!live);
const validateRequest=(request,bookings=[],today=todayMoscow())=>validateModel(request,live?[...bookings,...remoteSlots]:bookings,today,true,!live);
let toastTimer,confirmAction,directoryData,submitting=false,archiveZoom=1;
function notify(text,error=false){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').dataset.error=String(error);$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,error?9000:5000);}
function warn(){const el=$('storage-warning');el.hidden=!state.storageError;el.textContent=state.storageError||'';}
const currentRequest=()=>({roomId:state.roomId,seatIds:state.seatIds,date:state.date,start:state.start,hours:state.hours});
function invalidSlot(){const e=validateRequest({...currentRequest(),roomId:'r459',seatIds:[1]},[],todayMoscow());return Boolean(e.date||e.start||e.hours);}
const visibleRooms=()=>state.floor===4?filterRooms(state.filters,live?[...state.bookings,...remoteSlots]:state.bookings,state,!live):[];
const freeCount=r=>r.seatCount-occupiedSeats(r.id,state.date,state.start,state.hours,state.bookings).size;
function syncMap(){}
function renderRoomList(){
 const focused=document.activeElement?.dataset?.room, list=visibleRooms();
 $('room-list').innerHTML=list.map(r=>`<button class="room-card" data-room="${r.id}" aria-pressed="${r.id===state.roomId}" ${!invalidSlot()&&freeCount(r)===0?'disabled':''}><span class="room-card-top"><span class="room-card-number">${r.proposed?'ЗОНА ':''}${r.number}</span><span class="room-card-type">${icon(typeIcon(r))}${typeName(r)}</span></span><span class="room-card-title">${r.name}</span><span class="room-card-meta">${r.proposed?'Предложение для пилота':'Назначение подтверждено источником'}</span><span class="room-card-bottom"><span class="availability ${freeCount(r)===0?'busy':''}">${invalidSlot()?'Уточни время':freeCount(r)?`${freeCount(r)} из 8 мест`:'Мест нет'}</span><span class="room-card-price">Бесплатно</span></span></button>`).join('');
 $('result-count').textContent=`${list.length} из ${rooms.length} пространств`;
 $('empty-results').hidden=state.floor!==4||list.length>0;
 if(focused)$('room-list').querySelector(`[data-room="${focused}"]`)?.focus({preventScroll:true});
}
function renderDetail(){
 const r=roomById(state.roomId),panel=$('detail-panel');document.body.dataset.roomSelected=String(Boolean(r)&&state.floor===4);
 if(state.floor!==4){const f=null;panel.innerHTML=`<div class="floor-info"><span class="floor-info-number">0${f?.number||''}</span><p class="eyebrow">АРХИВНЫЙ ПЛАН · ${f?.year||2012}</p><h3>${f?.label||'Выбери этаж'}</h3><p>Рассмотри помещения, коридоры и лестницы на подлинном чертеже. Увеличивай план и перемещай его по экрану.</p><p>Современные назначения кабинетов этого этажа ещё не подтверждены. Учебная запись доступна в каталоге четвёртого этажа.</p><button class="button-dark" data-action="floor4">На 4-й этаж · выбрать место ↗</button></div>`;return;}
 if(!r){panel.innerHTML=`<div class="empty-detail"><span aria-hidden="true">↗</span><h3>4-й этаж.<br>Место для работы.</h3><p>Выбери кабинет или зону в каталоге. Здесь появятся описание и свободные учебные места. Привязка кабинетов к архивному чертежу пока не установлена.</p><button class="button-outline" data-action="all">К каталогу пространств ↓</button></div>`;return;}
 panel.innerHTML=`<div class="detail-top"><span class="room-category">${icon(typeIcon(r))}${typeName(r)}</span><span class="room-number">${r.proposed?'ЗОНА ':''}${r.number}</span></div><h3 class="detail-title" id="detail-title" tabindex="-1">${r.name}</h3><p class="detail-description">${r.description}</p><div class="equipment">${r.equipment.map(e=>`<span>${e}</span>`).join('')}</div>${r.source?`<a class="evidence-line" href="${r.source}" target="_blank" rel="noopener">↗ ${r.evidence}${r.documentedPlaces?' · '+r.documentedPlaces+' ПК в документе':''}</a>`:`<span class="evidence-line">◇ ${r.evidence} · без номера кабинета</span>`}<div id="booking-area"></div>`;
 if(state.success&&state.success.roomId===r.id){renderSuccess();return;}
 $('booking-area').innerHTML=`<form class="booking-form" id="booking-form" novalidate><div class="slot-fields"><label class="form-field date-field"><span>Дата</span><input id="booking-date" name="date" type="date" required min="${todayMoscow()}" max="${addDays(todayMoscow(),14)}" value="${state.date}" aria-describedby="error-date"><small class="field-error" id="error-date"></small></label><label class="form-field"><span>Начало</span><select id="booking-start" name="start" aria-describedby="error-start">${Array.from({length:12},(_,i)=>i+9).map(h=>`<option value="${h}" ${Number(state.start)===h?'selected':''}>${slotLabel(h)}</option>`).join('')}</select><small class="field-error" id="error-start"></small></label><label class="form-field"><span>Часов</span><input id="booking-hours" name="hours" type="number" min="1" max="4" step="1" required inputmode="numeric" value="${state.hours}" aria-describedby="error-hours"><small class="field-error" id="error-hours"></small></label></div><div class="seats-heading"><strong>Выбери места</strong><span id="seat-count"></span></div><div class="seat-plan"><div class="seat-wall">ОКНО</div><div id="seat-grid" class="seat-grid" role="group" aria-label="Восемь учебных мест"></div><div class="seat-exit">ВХОД ↗ · УСЛОВНЫЙ ПЛАН</div></div><small id="error-seats" class="field-error" role="alert"></small><div class="seat-legend"><span><i></i>Свободно</span><span><i></i>Выбрано</span><span><i></i>Занято</span></div><div class="price-summary"><div><p>Стоимость бронирования</p><small id="price-formula"></small></div><strong id="booking-total" role="status" aria-live="polite">Бесплатно</strong></div><small class="field-error" id="error-room" role="alert"></small><button type="submit" class="button-dark book-submit" id="book-submit"><span>Забронировать места</span>${icon('arrow')}</button><p class="form-disclosure">${live?'Подтверждение придёт на почту твоего аккаунта. Отмена — в письме или в «Моих бронях».':'Учебный режим: запись только в этом браузере. Письмо не отправляется, но можно посмотреть его образец.'}</p></form>`;
 updateSeats();updatePrice();
}
function renderSuccess(){
 const b=state.success;
 $('booking-area').innerHTML=`<div class="booking-success"><span class="success-icon">${icon('check')}</span><h3>${live?'Место сохранено.':'Время для идеи нашлось.'}</h3><p>${live?'Бронь':'Учебная запись'} № ${b.id.slice(0,6).toUpperCase()} сохранена.</p><p>${dateLabel(b.date)} · ${slotLabel(b.start)}–${slotLabel(b.start+b.hours)}<br>Места: ${b.seatIds.join(', ')} · Бесплатно</p><p class="mail-status">${live?(b.emailStatus==='accepted'?'Письмо передано почтовому сервису. Проверь входящие и спам.':'Запись сохранена, но отправка письма не подтверждена. Управляй ею в «Моих бронях».'):'Письмо не отправлено: почтовый сервис ещё не подключён.'}</p>${live?'':`<a class="button-outline email-preview-link" href="./email.html#${b.id}">Посмотреть образец письма ↗</a>`}<button class="button-dark" data-action="bookings">Мои брони ${icon('arrow')}</button><button class="text-button" data-action="another">Выбрать другие места</button></div>`;
}
function updateSeats(){
 const grid=$('seat-grid'),r=roomById(state.roomId);if(!grid||!r)return;
 const occupied=occupiedSeats(r.id,state.date,state.start,state.hours,state.bookings),invalid=invalidSlot(),focused=document.activeElement?.dataset?.seat;
 grid.innerHTML=Array.from({length:r.seatCount},(_,i)=>i+1).map(n=>{const busy=occupied.has(n),selected=state.seatIds.includes(n);return `<button class="seat-button" type="button" data-seat="${n}" aria-label="Место ${n}: ${invalid?'уточни время':busy?'занято':selected?'выбрано':'свободно'}" aria-pressed="${selected}" ${busy||invalid?'disabled':''}>${String(n).padStart(2,'0')}</button>`}).join('');
 $('seat-count').textContent=invalid?'Уточни время':`${r.seatCount-occupied.size} свободно`;
 if(focused)grid.querySelector(`[data-seat="${focused}"]`)?.focus({preventScroll:true});
}
function updatePrice(){const r=roomById(state.roomId);if(!$('booking-total')||!r)return;const valid=!invalidSlot();$('booking-total').textContent='Бесплатно';$('price-formula').textContent=valid?`Мест: ${state.seatIds.length} · ${state.hours} ч`:'Заполни дату и время';$('book-submit').disabled=submitting||!ready;}
function showErrors(errors){for(const key of ['date','start','hours','seats','room']){const e=$('error-'+key);if(e)e.textContent=errors[key]||'';const input=$('booking-'+key);if(input)input.setAttribute('aria-invalid',String(Boolean(errors[key])));}}
function selectRoom(id,origin='map'){
 const r=roomById(id);if(!r||!visibleRooms().some(x=>x.id===id))return;
 if(!invalidSlot()&&freeCount(r)===0){notify('В это время все учебные места заняты. Попробуй другой интервал.');return;}
 if(state.roomId!==id){requestId=null;state.roomId=id;state.seatIds=[];state.success=null;renderDetail();}
 renderRoomList();syncMap();
 if(origin==='list'){$('detail-panel').scrollIntoView({behavior:'instant',block:'start'});$('detail-title')?.focus({preventScroll:true});}
}
function toggleSeat(n){requestId=null;if(invalidSlot()||occupiedSeats(state.roomId,state.date,state.start,state.hours,state.bookings).has(n))return;state.success=null;state.seatIds=state.seatIds.includes(n)?state.seatIds.filter(s=>s!==n):[...state.seatIds,n];if(!$('seat-grid'))renderDetail();updateSeats();updatePrice();showErrors({});syncMap();}
function reconcileSelection(){
 if(state.roomId&&!visibleRooms().some(r=>r.id===state.roomId)){state.roomId=null;state.seatIds=[];state.success=null;return true;}
 return false;
}
function filterChanged(){
 state.filters={category:$('category').value,query:$('room-search').value,freeOnly:$('free-only').checked};
 if(reconcileSelection()){renderDetail();notify('Выбор сброшен: пространство не подходит под фильтры.');}
 renderRoomList();syncMap();
}
function resetFilters(){ $('room-search').value='';$('category').value='all';$('free-only').checked=false;filterChanged(); }
async function slotChanged(){
 requestId=null;state.date=$('booking-date').value;state.start=$('booking-start').value;state.hours=$('booking-hours').value;state.success=null;
 if(live)await refreshAvailability();
 const occupied=occupiedSeats(state.roomId,state.date,state.start,state.hours,state.bookings);const old=state.seatIds.length;state.seatIds=state.seatIds.filter(n=>!occupied.has(n));
 if(old!==state.seatIds.length)notify('Некоторые выбранные места заняты в новом интервале. Выбор обновлён.');
 const errors=validateRequest({...currentRequest(),seatIds:[1]},[],todayMoscow());delete errors.seats;showErrors(errors);
 updateSeats();updatePrice();renderRoomList();syncMap();
 // A slot change can make an availability filter hide the selected area.
 if(state.filters.freeOnly&&!visibleRooms().some(r=>r.id===state.roomId)){state.roomId=null;state.seatIds=[];renderDetail();notify('Пространство скрыто фильтром: в новом интервале мест нет.');syncMap();}
}
async function persistChange(transform){
 const execute=()=>{
  const latest=loadBookings(storage);if(latest.error){state.storageError=latest.error;warn();return {error:latest.error};}
  const result=transform(latest.bookings);if(result.error)return result;
  const saved=saveBookings(storage,result.bookings);if(saved.error){state.storageError=saved.error;warn();return {error:saved.error};}
  state.bookings=result.bookings;state.storageError=null;warn();return result;
 };
 try{return navigator.locks?await navigator.locks.request(STORAGE_KEY,execute):execute();}catch{return {error:'Не удалось сохранить запись. Попробуй ещё раз.'};}
}
async function submitBooking(){
 if(submitting||!ready)return;
 const errors=validateRequest(currentRequest(),state.bookings,todayMoscow());showErrors(errors);
 if(Object.keys(errors).length){const first=Object.keys(errors)[0];($(first==='seats'?'seat-grid':'booking-'+first)||$('detail-title'))?.focus();return;}
 if(!live&&state.storageError){notify(state.storageError,true);return;}
 submitting=true;updatePrice();const snapshot={...currentRequest(),seatIds:[...state.seatIds]};
 let result;
 if(live){try{requestId??=crypto.randomUUID();const response=await api('bookings',{...snapshot,id:requestId});result={booking:response.booking};state.bookings=[...state.bookings.filter(b=>b.id!==response.booking.id),response.booking];requestId=null;}catch(e){result={error:e.fields||e.message};await refreshAvailability();}}
 else result=await persistChange(latest=>createBooking(latest,snapshot));submitting=false;
 if(result.error){if(typeof result.error==='object'){showErrors(result.error);notify(Object.values(result.error)[0],true);if(!live){const fresh=loadBookings(storage);if(!fresh.error)state.bookings=fresh.bookings;}state.seatIds=state.seatIds.filter(n=>!occupiedSeats(state.roomId,state.date,state.start,state.hours,state.bookings).has(n));if(reconcileSelection())renderDetail();else updateSeats();syncMap();renderRoomList();}else notify(result.error,true);updatePrice();return;}
 state.success=result.booking;state.seatIds=[];reconcileSelection();renderDetail();renderRoomList();syncMap();updateCounter();notify(live?'Бронь сохранена.':'Учебная запись сохранена в этом браузере.');
 $('detail-panel').querySelector('[data-action="bookings"]')?.focus({preventScroll:true});
}
function dateLabel(date){return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long'}).format(new Date(date+'T12:00:00Z'));}
function updateCounter(){$('booking-count').textContent=state.bookings.length;}
function renderBookings(){
 $('bookings-list').innerHTML=state.bookings.length?state.bookings.slice().sort((a,b)=>a.date.localeCompare(b.date)||a.start-b.start).map(b=>{const r=roomById(b.roomId);return `<article class="booking-record"><div class="booking-record-top"><h3>${r.proposed?'Зона '+r.number:'Ауд. '+r.number} · ${r.name}</h3><span>№ ${b.id.slice(0,6).toUpperCase()}</span></div><p class="record-details">${dateLabel(b.date)} · ${slotLabel(b.start)}–${slotLabel(b.start+b.hours)}<br>Места: ${b.seatIds.join(', ')}</p><p class="record-note">${live?'Бронь':'Учебная запись'} · Бесплатно</p><div class="record-bottom"><button data-cancel="${b.id}" aria-label="Отменить бронь ${b.id.slice(0,6).toUpperCase()}">Отменить бронь</button>${live?'':`<a href="./email.html#${b.id}">Образец письма ↗</a>`}</div></article>`}).join(''):`<div class="bookings-empty">${icon('book')}<h3>Здесь будут твои планы</h3><p>Выбери пространство и свободные места.<br>Сохранённые учебные брони появятся здесь.</p><button class="button-dark" data-action="close-bookings">Найти своё место ${icon('arrow')}</button></div>`;
}
function openBookings(){renderBookings();$('bookings-dialog').showModal();}
function askConfirmation(title,message,label,action){confirmAction=action;$('confirm-title').textContent=title;$('confirm-message').textContent=message;$('confirm-yes').textContent=label;$('confirm-no').textContent='Оставить';$('confirm-dialog').showModal();$('confirm-no').focus();}
async function cancel(id){let result; if(live){try{await api('cancel',{id});state.bookings=cancelBooking(state.bookings,id);await refreshAvailability();result={error:null};}catch(e){result={error:e.message}}}else result=await persistChange(latest=>({bookings:cancelBooking(latest,id),error:null}));if(result.error){notify(result.error,true);return;}if(state.success?.id===id)state.success=null;renderBookings();renderDetail();renderRoomList();syncMap();updateCounter();notify('Учебная бронь отменена. Места снова доступны.');}
async function resetDemo(){if(live)return;const result=saveBookings(storage,[]);if(result.error){state.storageError=result.error;warn();notify(result.error,true);return;}state.bookings=[];state.storageError=null;state.seatIds=[];state.success=null;warn();renderBookings();renderDetail();renderRoomList();syncMap();updateCounter();notify('Учебные брони сброшены. Примерная занятость сохранена.');}
$('filters').addEventListener('submit',e=>e.preventDefault());$('filters').addEventListener('input',filterChanged);$('filters').addEventListener('change',filterChanged);$('filters').addEventListener('reset',e=>{e.preventDefault();resetFilters();});$('empty-reset').addEventListener('click',resetFilters);
$('room-list').addEventListener('click',e=>{const el=e.target.closest('[data-room]');if(el)selectRoom(el.dataset.room,'list');});
$('detail-panel').addEventListener('click',e=>{const seat=e.target.closest('[data-seat]');if(seat){toggleSeat(Number(seat.dataset.seat));return;}const a=e.target.closest('[data-action]')?.dataset.action;if(a==='bookings')openBookings();if(a==='another'){state.success=null;renderDetail();}if(a==='all')$('spaces').scrollIntoView({block:'start',behavior:'instant'});});
$('detail-panel').addEventListener('submit',e=>{e.preventDefault();submitBooking();});$('detail-panel').addEventListener('input',e=>{if(e.target.closest('.slot-fields'))slotChanged();});$('detail-panel').addEventListener('change',e=>{if(e.target.closest('.slot-fields'))slotChanged();});
$('bookings-open').addEventListener('click',async()=>{if(live){try{state.bookings=(await api('bookings')).bookings;updateCounter()}catch(e){notify(e.message,true)}}openBookings()});$('bookings-close').addEventListener('click',()=>$('bookings-dialog').close());
$('bookings-list').addEventListener('click',e=>{if(e.target.closest('[data-action="close-bookings"]'))$('bookings-dialog').close();const id=e.target.closest('[data-cancel]')?.dataset.cancel;if(id)askConfirmation('Отменить бронь?','Выбранные места освободятся в указанное время.','Да, отменить',()=>cancel(id));});
$('reset-demo').addEventListener('click',()=>askConfirmation('Сбросить учебные записи?','Все твои учебные записи в этом браузере будут удалены.','Да, сбросить',resetDemo));
$('confirm-no').addEventListener('click',()=>$('confirm-dialog').close());$('confirm-yes').addEventListener('click',async()=>{$('confirm-dialog').close();const action=confirmAction;confirmAction=null;await action?.();});
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
const loadAvailability=createAvailabilityLoader();
async function refreshAvailability(){if(!live)return;try{const date=state.date,data=await loadAvailability(date);if(!data||date!==state.date)return;remoteSlots=data.slots.map(s=>({roomId:s.room_id,date:data.date,start:s.hour,hours:1,seatIds:[s.seat]}));}catch{notify('Не удалось обновить свободные места. Доступность проверится при записи.',true)}}
window.addEventListener('storage',e=>{if(live||e.key!==STORAGE_KEY&&e.key!==null)return;restored=loadBookings(storage);state.bookings=restored.bookings;state.storageError=restored.error;state.success=null;state.seatIds=[];warn();renderDetail();renderBookings();renderRoomList();updateCounter();});
window.addEventListener('focus',async()=>{if(live){try{state.bookings=(await api('bookings')).bookings;await refreshAvailability()}catch{}}else{const fresh=loadBookings(storage);state.bookings=fresh.bookings;state.storageError=fresh.error;}state.success=null;state.seatIds=[];warn();renderDetail();renderRoomList();updateCounter();});
warn();renderDetail();renderRoomList();updateCounter();
try{const config=await api('config');live=config.enabled;accountEmail=config.email;if(live){if(!config.signedIn){$('service-status').innerHTML='Для бронирования нужен вход. <a href="/signin-with-chatgpt?return_to=/booking.html" target="_top">Войти через ChatGPT ↗</a>';throw Error('auth')}state.bookings=(await api('bookings')).bookings;await refreshAvailability();$('service-status').textContent='Бесплатное бронирование · подтверждение на '+accountEmail;$('reset-demo').hidden=true;}else $('service-status').textContent='Учебный режим · почта ещё не подключена. Записи хранятся в этом браузере; после брони можно посмотреть образец письма.';ready=true;}catch(e){if(e.message!=='auth'){live=false;ready=true;$('service-status').textContent='Учебный режим · сервер недоступен. Записи сохраняются только в этом браузере; письма не отправляются.';}}
renderDetail();renderRoomList();updateCounter();if(location.hash==='#bookings')openBookings();
