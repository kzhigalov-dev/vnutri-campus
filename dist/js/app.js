import {rooms,roomById,categories,money,slotLabel} from './data.js';
import {todayMoscow,addDays,filterRooms,occupiedSeats,createBooking,cancelBooking,loadBookings,saveBookings,validateRequest,STORAGE_KEY} from './model.js';
const $=id=>document.getElementById(id);
const icon=name=>`<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const typeIcon=r=>r.category==='computer'?'screen':r.category==='quiet'?'quiet':'people';
const typeName=r=>categories.find(c=>c.id===r.category).name;
const storage={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)};
let restored=loadBookings(storage);
const state={bookings:restored.bookings,storageError:restored.error,roomId:'r462',seatIds:[],date:addDays(todayMoscow(),1),start:13,hours:2,filters:{category:'all',maxPrice:60,query:'',freeOnly:false},success:null};
let scene,toastTimer,confirmAction,directoryData,submitting=false,overview=false,flatMode=false,sceneFailed=false,archiveZoom=1;
function notify(text,error=false){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').dataset.error=String(error);$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,error?9000:5000);}
function warn(){const el=$('storage-warning');el.hidden=!state.storageError;el.textContent=state.storageError||'';}
const currentRequest=()=>({roomId:state.roomId,seatIds:state.seatIds,date:state.date,start:state.start,hours:state.hours});
function invalidSlot(){const e=validateRequest({...currentRequest(),roomId:'r459',seatIds:[1]},[],todayMoscow());return Boolean(e.date||e.start||e.hours);}
const visibleRooms=()=>filterRooms(state.filters,state.bookings,state);
const freeCount=r=>r.seatCount-occupiedSeats(r.id,state.date,state.start,state.hours,state.bookings).size;
function syncMap(){scene?.update({visibleIds:visibleRooms().map(r=>r.id),selectedId:state.roomId,freeCounts:Object.fromEntries(rooms.map(r=>[r.id,freeCount(r)])),selectedSeats:state.seatIds});renderFallback();}
function renderRoomList(){
 const focused=document.activeElement?.dataset?.room, list=visibleRooms();
 $('room-list').innerHTML=list.map(r=>`<button class="room-card" data-room="${r.id}" aria-pressed="${r.id===state.roomId}" ${!invalidSlot()&&freeCount(r)===0?'disabled':''}><span class="room-card-top"><span class="room-card-number">${r.proposed?'ЗОНА ':''}${r.number}</span><span class="room-card-type">${icon(typeIcon(r))}${typeName(r)}</span></span><span class="room-card-title">${r.name}</span><span class="room-card-meta">${r.proposed?'Предложение для пилота':'Назначение подтверждено источником'}</span><span class="room-card-bottom"><span class="availability ${freeCount(r)===0?'busy':''}">${invalidSlot()?'Уточни время':freeCount(r)?`${freeCount(r)} из 8 мест`:'Мест нет'}</span><span class="room-card-price">${r.price?money(r.price)+'/ч':'Бесплатно'} · демо</span></span></button>`).join('');
 $('result-count').textContent=`${list.length} из ${rooms.length} пространств`;
 $('empty-results').hidden=list.length>0;
 if(focused)$('room-list').querySelector(`[data-room="${focused}"]`)?.focus({preventScroll:true});
}
function renderDetail(){
 const r=roomById(state.roomId),panel=$('detail-panel');
 if(!r){panel.innerHTML=`<div class="empty-detail"><span aria-hidden="true">↗</span><h3>Твоё место<br>уже где-то рядом.</h3><p>Выбери пространство на карте или в списке. Здесь появятся описание и свободные учебные места.</p><button class="button-outline" data-action="all">Показать все пространства</button></div>`;return;}
 panel.innerHTML=`<div class="detail-top"><span class="room-category">${icon(typeIcon(r))}${typeName(r)}</span><span class="room-number">${r.proposed?'ЗОНА ':''}${r.number}</span></div><h3 class="detail-title" id="detail-title">${r.name}</h3><p class="detail-description">${r.description}</p><div class="equipment">${r.equipment.map(e=>`<span>${e}</span>`).join('')}</div>${r.source?`<a class="evidence-line" href="${r.source}" target="_blank" rel="noopener">↗ ${r.evidence}${r.documentedPlaces?' · '+r.documentedPlaces+' ПК в документе':''}</a>`:`<span class="evidence-line">◇ ${r.evidence} · без номера кабинета</span>`}<div id="booking-area"></div>`;
 if(state.success&&state.success.roomId===r.id){renderSuccess();return;}
 $('booking-area').innerHTML=`<form class="booking-form" id="booking-form" novalidate><div class="slot-fields"><label class="form-field date-field"><span>Дата</span><input id="booking-date" name="date" type="date" required min="${todayMoscow()}" max="${addDays(todayMoscow(),14)}" value="${state.date}" aria-describedby="error-date"><small class="field-error" id="error-date"></small></label><label class="form-field"><span>Начало</span><select id="booking-start" name="start" aria-describedby="error-start">${Array.from({length:12},(_,i)=>i+9).map(h=>`<option value="${h}" ${Number(state.start)===h?'selected':''}>${slotLabel(h)}</option>`).join('')}</select><small class="field-error" id="error-start"></small></label><label class="form-field"><span>Часов</span><input id="booking-hours" name="hours" type="number" min="1" max="4" step="1" required inputmode="numeric" value="${state.hours}" aria-describedby="error-hours"><small class="field-error" id="error-hours"></small></label></div><div class="seats-heading"><strong>Выбери места</strong><span id="seat-count"></span></div><div class="seat-plan"><div class="seat-wall">ОКНО</div><div id="seat-grid" class="seat-grid" role="group" aria-label="Восемь учебных мест"></div><div class="seat-exit">ВХОД ↗ · УСЛОВНЫЙ ПЛАН</div></div><small id="error-seats" class="field-error" role="alert"></small><div class="seat-legend"><span><i></i>Свободно</span><span><i></i>Выбрано</span><span><i></i>Занято</span></div><div class="price-summary"><div><p>Учебный расчёт</p><small id="price-formula"></small></div><strong id="booking-total" role="status" aria-live="polite">0 ₽</strong></div><small class="field-error" id="error-room" role="alert"></small><button type="submit" class="button-dark book-submit" id="book-submit"><span>Забронировать места</span>${icon('arrow')}</button><p class="form-disclosure">Демо-тарифы придуманы для задания.<br>Реальная бронь и оплата не производятся.</p></form>`;
 updateSeats();updatePrice();
}
function renderSuccess(){
 const b=state.success;
 $('booking-area').innerHTML=`<div class="booking-success"><span class="success-icon">${icon('check')}</span><h3>Время для идеи нашлось.</h3><p>Учебная бронь № ${b.id.slice(0,6).toUpperCase()} сохранена.</p><p>${dateLabel(b.date)} · ${slotLabel(b.start)}–${slotLabel(b.start+b.hours)}<br>Места: ${b.seatIds.join(', ')} · ${money(b.total)}</p><button class="button-dark" data-action="bookings">Посмотреть мои брони ${icon('arrow')}</button><button class="text-button" data-action="another">Выбрать другие места</button></div>`;
}
function updateSeats(){
 const grid=$('seat-grid'),r=roomById(state.roomId);if(!grid||!r)return;
 const occupied=occupiedSeats(r.id,state.date,state.start,state.hours,state.bookings),invalid=invalidSlot(),focused=document.activeElement?.dataset?.seat;
 grid.innerHTML=Array.from({length:r.seatCount},(_,i)=>i+1).map(n=>{const busy=occupied.has(n),selected=state.seatIds.includes(n);return `<button class="seat-button" type="button" data-seat="${n}" aria-label="Место ${n}: ${invalid?'уточни время':busy?'занято':selected?'выбрано':'свободно'}" aria-pressed="${selected}" ${busy||invalid?'disabled':''}>${String(n).padStart(2,'0')}</button>`}).join('');
 $('seat-count').textContent=invalid?'Уточни время':`${r.seatCount-occupied.size} свободно`;
 if(focused)grid.querySelector(`[data-seat="${focused}"]`)?.focus({preventScroll:true});
}
function updatePrice(){const r=roomById(state.roomId);if(!$('booking-total')||!r)return;const valid=!invalidSlot();$('booking-total').textContent=valid?money(state.seatIds.length*Number(state.hours)*r.price):'—';$('price-formula').textContent=valid?`Мест: ${state.seatIds.length} × ${state.hours} ч × ${money(r.price)}`:'Заполни дату и время';$('book-submit').disabled=submitting;}
function showErrors(errors){for(const key of ['date','start','hours','seats','room']){const e=$('error-'+key);if(e)e.textContent=errors[key]||'';const input=$('booking-'+key);if(input)input.setAttribute('aria-invalid',String(Boolean(errors[key])));}}
function selectRoom(id,origin='map'){
 const r=roomById(id);if(!r||!visibleRooms().some(x=>x.id===id))return;
 if(!invalidSlot()&&freeCount(r)===0){notify('В это время все учебные места заняты. Попробуй другой интервал.');return;}
 if(state.roomId!==id){state.roomId=id;state.seatIds=[];state.success=null;renderDetail();}
 renderRoomList();syncMap();scene?.focusRoom(id);
 if(origin==='list'&&matchMedia('(max-width:700px)').matches)$('detail-panel').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});
}
function toggleSeat(n){if(invalidSlot()||occupiedSeats(state.roomId,state.date,state.start,state.hours,state.bookings).has(n))return;state.success=null;state.seatIds=state.seatIds.includes(n)?state.seatIds.filter(s=>s!==n):[...state.seatIds,n];if(!$('seat-grid'))renderDetail();updateSeats();updatePrice();showErrors({});syncMap();}
function reconcileSelection(){
 if(state.roomId&&!visibleRooms().some(r=>r.id===state.roomId)){state.roomId=null;state.seatIds=[];state.success=null;return true;}
 return false;
}
function filterChanged(){
 state.filters={category:$('category').value,maxPrice:Number($('max-price').value),query:$('room-search').value,freeOnly:$('free-only').checked};
 $('budget-value').textContent=`до ${money(state.filters.maxPrice)}/ч`;
 if(reconcileSelection()){renderDetail();notify('Выбор сброшен: пространство не подходит под фильтры.');}
 renderRoomList();syncMap();
}
function resetFilters(){ $('room-search').value='';$('category').value='all';$('max-price').value='60';$('free-only').checked=false;filterChanged(); }
function slotChanged(){
 state.date=$('booking-date').value;state.start=$('booking-start').value;state.hours=$('booking-hours').value;state.success=null;
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
 if(submitting)return;
 const errors=validateRequest(currentRequest(),state.bookings,todayMoscow());showErrors(errors);
 if(Object.keys(errors).length){const first=Object.keys(errors)[0];($(first==='seats'?'seat-grid':'booking-'+first)||$('detail-title'))?.focus();return;}
 if(state.storageError){notify(state.storageError,true);return;}
 submitting=true;updatePrice();const snapshot={...currentRequest(),seatIds:[...state.seatIds]};
 const result=await persistChange(latest=>createBooking(latest,snapshot));submitting=false;
 if(result.error){if(typeof result.error==='object'){showErrors(result.error);notify(Object.values(result.error)[0],true);const fresh=loadBookings(storage);if(!fresh.error)state.bookings=fresh.bookings;state.seatIds=state.seatIds.filter(n=>!occupiedSeats(state.roomId,state.date,state.start,state.hours,state.bookings).has(n));if(reconcileSelection())renderDetail();else updateSeats();syncMap();renderRoomList();}else notify(result.error,true);updatePrice();return;}
 state.success=result.booking;state.seatIds=[];reconcileSelection();renderDetail();renderRoomList();syncMap();updateCounter();notify('Учебная бронь сохранена. Найти её можно в «Моих бронях».');
 $('detail-panel').querySelector('[data-action="bookings"]')?.focus({preventScroll:true});
}
function dateLabel(date){return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long'}).format(new Date(date+'T12:00:00Z'));}
function updateCounter(){$('booking-count').textContent=state.bookings.length;}
function renderBookings(){
 $('bookings-list').innerHTML=state.bookings.length?state.bookings.slice().sort((a,b)=>a.date.localeCompare(b.date)||a.start-b.start).map(b=>{const r=roomById(b.roomId);return `<article class="booking-record"><div class="booking-record-top"><h3>${r.proposed?'Зона '+r.number:'Ауд. '+r.number} · ${r.name}</h3><span>№ ${b.id.slice(0,6).toUpperCase()}</span></div><p class="record-details">${dateLabel(b.date)} · ${slotLabel(b.start)}–${slotLabel(b.start+b.hours)}<br>Места: ${b.seatIds.join(', ')}</p><p class="record-note">Мест: ${b.seatIds.length} × ${b.hours} ч × ${money(r.price)} · учебный тариф</p><div class="record-bottom"><button data-cancel="${b.id}" aria-label="Отменить бронь ${b.id.slice(0,6).toUpperCase()}">Отменить бронь</button><strong>${money(b.total)}</strong></div></article>`}).join(''):`<div class="bookings-empty">${icon('book')}<h3>Здесь будут твои планы</h3><p>Выбери пространство и места на карте.<br>Сохранённые учебные брони появятся здесь.</p><button class="button-dark" data-action="close-bookings">Найти своё место ${icon('arrow')}</button></div>`;
}
function openBookings(){renderBookings();$('bookings-dialog').showModal();}
function askConfirmation(title,message,label,action){confirmAction=action;$('confirm-title').textContent=title;$('confirm-message').textContent=message;$('confirm-yes').textContent=label;$('confirm-no').textContent='Оставить';$('confirm-dialog').showModal();$('confirm-no').focus();}
async function cancel(id){const result=await persistChange(latest=>({bookings:cancelBooking(latest,id),error:null}));if(result.error){notify(result.error,true);return;}if(state.success?.id===id)state.success=null;renderBookings();renderDetail();renderRoomList();syncMap();updateCounter();notify('Учебная бронь отменена. Места снова доступны.');}
async function resetDemo(){const result=saveBookings(storage,[]);if(result.error){state.storageError=result.error;warn();notify(result.error,true);return;}state.bookings=[];state.storageError=null;state.seatIds=[];state.success=null;warn();renderBookings();renderDetail();renderRoomList();syncMap();updateCounter();notify('Учебные брони сброшены. Примерная занятость сохранена.');}
function renderFallback(){const container=$('map-fallback');if(container.hidden)return;container.innerHTML=visibleRooms().map(r=>`<button data-map-room="${r.id}" aria-pressed="${r.id===state.roomId}" ${freeCount(r)===0?'disabled':''}><b>${r.number}</b>${r.name}<span>${freeCount(r)?freeCount(r)+' мест':'Мест нет'}</span></button>`).join('');}
function activateFallback(failed=false){ sceneFailed=Boolean(failed)||sceneFailed;flatMode=true;$('scene-loading').hidden=true;$('map-labels').hidden=true;$('map-fallback').hidden=false;$('map-help').textContent='Плоская схема · Выбери пространство кнопкой';document.querySelector('.camera-controls').hidden=true;$('view-toggle').hidden=true;$('map-mode').textContent='3D';$('map-mode').setAttribute('aria-label','Вернуться к объёмной схеме');$('map-mode').disabled=!scene||sceneFailed;renderFallback(); }
const escapeText=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function renderDirectory(){
 if(!directoryData)return;const q=$('directory-search').value.trim().toLocaleLowerCase('ru');const list=directoryData.rooms.filter(r=>(r.number+' '+r.label).toLocaleLowerCase('ru').includes(q));
 const statuses={floor_explicit:'4-й этаж указан в документе',address_documented:'Адрес кабинета найден; положение уточняется',conflicting:'Источники расходятся',historical:'Историческое упоминание 2021 года',needs_verification:'Требуется уточнение',overlapping_assignments:'Несколько назначений в источниках'};
 $('directory-list').innerHTML=list.length?list.map(r=>`<article class="directory-entry"><strong>${escapeText(r.number)}</strong><div><h3>${escapeText(r.label)}</h3><p class="${['conflicting','needs_verification','overlapping_assignments','historical'].includes(r.evidence_status)?'evidence-caution':''}">${statuses[r.evidence_status]}</p>${r.verification_note?`<p>${escapeText(r.verification_note)}</p>`:''}<a href="${directoryData.sources[r.source_ids[0]].url}" target="_blank" rel="noopener">Посмотреть источник ↗</a></div></article>`).join(''):'<p class="directory-intro">По этому запросу кабинетов не найдено.</p>';
}
async function openDirectory(){
 $('directory-dialog').showModal();if(!directoryData){$('directory-list').textContent='Загружаем проверенные сведения…';try{const r=await fetch('./data/directory.json');if(!r.ok)throw Error();directoryData=await r.json();}catch{$('directory-list').textContent='Не удалось загрузить справочник. Проверь соединение и открой его снова.';return;}}renderDirectory();
}
$('filters').addEventListener('submit',e=>e.preventDefault());$('filters').addEventListener('input',filterChanged);$('filters').addEventListener('change',filterChanged);$('filters').addEventListener('reset',e=>{e.preventDefault();resetFilters();});$('empty-reset').addEventListener('click',resetFilters);
$('room-list').addEventListener('click',e=>{const el=e.target.closest('[data-room]');if(el)selectRoom(el.dataset.room,'list');});
$('map-fallback').addEventListener('click',e=>{const el=e.target.closest('[data-map-room]');if(el)selectRoom(el.dataset.mapRoom);});
$('detail-panel').addEventListener('click',e=>{const seat=e.target.closest('[data-seat]');if(seat){toggleSeat(Number(seat.dataset.seat));return;}const a=e.target.closest('[data-action]')?.dataset.action;if(a==='bookings')openBookings();if(a==='another'){state.success=null;renderDetail();}if(a==='all')resetFilters();});
$('detail-panel').addEventListener('submit',e=>{e.preventDefault();submitBooking();});$('detail-panel').addEventListener('input',e=>{if(e.target.closest('.slot-fields'))slotChanged();});$('detail-panel').addEventListener('change',e=>{if(e.target.closest('.slot-fields'))slotChanged();});
$('bookings-open').addEventListener('click',openBookings);$('bookings-close').addEventListener('click',()=>$('bookings-dialog').close());
$('bookings-list').addEventListener('click',e=>{if(e.target.closest('[data-action="close-bookings"]'))$('bookings-dialog').close();const id=e.target.closest('[data-cancel]')?.dataset.cancel;if(id)askConfirmation('Отменить учебную бронь?','Выбранные места освободятся в указанное время. Другие брони сохранятся.','Да, отменить',()=>cancel(id));});
$('reset-demo').addEventListener('click',()=>askConfirmation('Сбросить учебные брони?','Все твои записи в этом браузере будут удалены. Сброс не затрагивает данные других сайтов.','Да, сбросить',resetDemo));
$('confirm-no').addEventListener('click',()=>$('confirm-dialog').close());$('confirm-yes').addEventListener('click',async()=>{$('confirm-dialog').close();const action=confirmAction;confirmAction=null;await action?.();});
$('directory-open').addEventListener('click',openDirectory);$('about-directory').addEventListener('click',openDirectory);$('directory-close').addEventListener('click',()=>$('directory-dialog').close());$('directory-search').addEventListener('input',renderDirectory);
function openArchive(){archiveZoom=1;$('archive-image').style.width='100%';$('archive-zoom-label').textContent='100%';$('archive-dialog').showModal();}
$('archive-open').addEventListener('click',openArchive);$('archive-preview').addEventListener('click',openArchive);$('archive-close').addEventListener('click',()=>$('archive-dialog').close());
function zoomArchive(delta){archiveZoom=Math.max(1,Math.min(4,archiveZoom+delta));$('archive-image').style.width=`${archiveZoom*100}%`;$('archive-zoom-label').textContent=`${archiveZoom*100}%`;}
$('archive-zoom-in').addEventListener('click',()=>zoomArchive(.5));$('archive-zoom-out').addEventListener('click',()=>zoomArchive(-.5));
$('map-mode').addEventListener('click',()=>{if(!scene)return;if(!flatMode){activateFallback();return;}flatMode=false;$('map-fallback').hidden=true;$('map-labels').hidden=false;document.querySelector('.camera-controls').hidden=false;$('view-toggle').hidden=false;$('map-mode').textContent='2D';$('map-mode').setAttribute('aria-label','Показать плоскую схему');$('map-help').textContent='Потяни, чтобы повернуть · Нажми на номер пространства';syncMap();});
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
for(const button of document.querySelectorAll('[data-floor]'))button.addEventListener('click',()=>{if(button.dataset.floor!=='4')notify(`Для ${button.dataset.floor}-го этажа ещё нужны проверенные планы. Сейчас открыт четвёртый.`);else{scene?.setOverview(false);overview=false;$('view-toggle').querySelector('span').textContent='Общий вид';}});
$('zoom-in').addEventListener('click',()=>scene?.zoom(1.2));$('zoom-out').addEventListener('click',()=>scene?.zoom(1/1.2));$('rotate-view').addEventListener('click',()=>scene?.rotate());$('reset-view').addEventListener('click',()=>scene?.reset());$('view-toggle').addEventListener('click',()=>{overview=!overview;scene?.setOverview(overview);$('view-toggle').querySelector('span').textContent=overview?'Четвёртый этаж':'Общий вид';});
window.addEventListener('storage',e=>{if(e.key!==STORAGE_KEY&&e.key!==null)return;restored=loadBookings(storage);state.bookings=restored.bookings;state.storageError=restored.error;state.success=null;state.seatIds=state.seatIds.filter(n=>!occupiedSeats(state.roomId,state.date,state.start,state.hours,state.bookings).has(n));reconcileSelection();warn();renderDetail();renderBookings();renderRoomList();syncMap();updateCounter();notify(restored.error||'Брони обновлены из другой вкладки.',Boolean(restored.error));});
window.addEventListener('focus',()=>{const d=$('booking-date');if(d){d.min=todayMoscow();d.max=addDays(todayMoscow(),14);}const fresh=loadBookings(storage);if(!fresh.error&&JSON.stringify(fresh.bookings)!==JSON.stringify(state.bookings)){state.bookings=fresh.bookings;state.success=null;state.seatIds=[];reconcileSelection();renderDetail();renderRoomList();syncMap();updateCounter();}});
warn();renderDetail();renderRoomList();updateCounter();
try{const {createCampusScene}=await import('./scene.js');scene=createCampusScene({container:$('scene'),labels:$('map-labels'),onSelect:id=>selectRoom(id),onSeat:(id,n)=>{selectRoom(id);toggleSeat(n);},onFailure:()=>activateFallback(true)});syncMap();$('scene-loading').hidden=true;}catch(error){console.warn('3D unavailable; accessible 2D view enabled.',error);activateFallback(true);}
