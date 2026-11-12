import {seatLayout} from './maquette-layout.js?v=20261030-11';
import {applyRoomPlacements,roomEvidence,roomPlacements} from './room-placements.js';
import {createCampusNavigator} from './campus-navigation.js?v=20261112-pilot';
import {loadMapClosures} from './map-preview.js';
import {searchRoom} from './room-search.js';
import {searchServices} from './service-search.js';
import {parseWorkSearch,nextWorkHour} from './work-search.js';
import {createNavigatorPlan} from './navigator-plan.js';
import {accessSources,floorSource,secondFloorDetour,fourthFloorSign} from './campus-evidence.js';
import {createRouteLink,createServiceLink,createStartLink,readNavigationLink,writeRoutePreferences} from './navigation-link.js';
import {routeFloorInstruction} from './route-preview.js?v=20261111-route1';
import {pilotRooms,pilotEquipment,pilotRoomById,pilotRoomBySpace,pilotStatus,filterPilotRooms,pilotDisplayNumber} from './pilot-spaces.js';
import {todayMoscow,addDays,loadBookings,saveBookings,createBooking,cancelBooking,validateRequest,STORAGE_KEY} from './model.js';
import {slotLabel} from './data.js';
import {escapeHTML as e} from './email-template.js';
import {initContactForm,sendBookingNotification} from './contact-form.js?v=20261106-ui2';
const $=id=>document.getElementById(id),app=$('nav-app');
const icon=name=>`<svg class="nav-icon" aria-hidden="true"><use href="#nav-i-${name}"/></svg>`;
const defaultOrigin='start-1';
const routeParams=new URLSearchParams(location.search),previewRequested=routeParams.get('map')==='preview';
$('nav-route-mode').value=routeParams.get('access')==='step-free'?'step-free':'standard';
let mapRouting,routeFeedback='';
function routePreferences(){return {stepFree:$('nav-route-mode').value==='step-free',mapPreview:previewRequested};}
let graphicsAvailable=false,routeStairFocus=null;
let services=null,servicesFailed=false;
let campus,scene,directory,selected=null,directoryEntry=null,origin=defaultOrigin,mode='all',route=null,routeRevision=0,routeStep=-1,chosen=new Set(),busy=false,bookingError='',success=null,toastTimer,bookingOpen=false,returnFocus=null,viewLevel=0;
const storage={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)};
let restored=loadBookings(storage),bookings=restored.bookings,storageError=restored.error,visible=new Set(),pendingConfirm;
const today=todayMoscow();$('nav-date').value=today;$('nav-date').min=today;$('nav-date').max=addDays(today,14);$('nav-start-time').innerHTML=Array.from({length:12},(_,i)=>`<option value="${i+9}"${i+9===13?' selected':''}>${slotLabel(i+9)}</option>`).join('');
$('nav-team-size').append(...Array.from({length:Math.max(...pilotRooms.map(room=>room.seatCount))},(_,i)=>new Option(String(i+1),String(i+1))));
$('nav-equipment').append(new Option('Любое',''),...pilotEquipment.map(item=>new Option(item,item)));
function toast(message){clearTimeout(toastTimer);$('nav-toast').textContent=message;$('nav-toast').hidden=false;toastTimer=setTimeout(()=>$('nav-toast').hidden=true,5000);return toastTimer; }
function slot(){return {date:$('nav-date').value,start:$('nav-start-time').value,hours:$('nav-hours').value}}
function slotErrors(){const errors=validateRequest({roomId:pilotRooms[0].id,seatIds:[8],...slot()},bookings,today);return Object.entries(errors).filter(([key])=>key!=='seats'&&key!=='room').map(([,message])=>message)}
function categoryName(category){return {computer:'С компьютером',quiet:'Тихая работа',team:'Для команды'}[category]||'Помещение модели'}
function filter(){
 const query=$('nav-query').value;
 const request=mode==='all'||mode==='work'?parseWorkSearch(query):null;
 const work=mode==='work'||Boolean(request);
 const equipment=[...(request?.equipment??[])];
 if(work&&$('nav-equipment').value)equipment.push($('nav-equipment').value);
 return {query,request,work,category:$('nav-category').value,freeOnly:$('nav-free').checked||Boolean(request?.nearestHour),
  minSeats:Math.max(request?.minSeats??1,work?Number($('nav-team-size').value):1),equipment};
}
function current(){return campus?.entries.get(selected)||null}
function pilot(){return pilotRoomBySpace(selected)}
const mobile=matchMedia('(max-width:700px)');
function syncSidebar(){const open=app.classList.contains('is-list-open');$('nav-sidebar').inert=!open;$('nav-list-toggle').setAttribute('aria-expanded',String(open));}
function openList(){if(!app.classList.contains('is-list-open'))returnFocus=document.activeElement;app.classList.add('is-list-open');syncSidebar()}
function closeList(){app.classList.remove('is-list-open');syncSidebar()}
let restoringSearchFocus=false;
function closeSearch(){
 closeList();
 restoringSearchFocus=true;
 (returnFocus?.isConnected?returnFocus:$('nav-query')).focus();
 restoringSearchFocus=false;
}
mobile.addEventListener('change',syncSidebar);syncSidebar();
function setLevel(number,animate=true,stairIndex=null){
 number=Number(number)||0;
 viewLevel=number;
 routeStairFocus=stairIndex;
 scene?.setOverviewMode?.(route?'spread':'building');
 app.classList.toggle('is-open-model',number>0);
 $('nav-stage-title').innerHTML=number?`${number} этаж`:'Вознесенский,<br>44–46';
 $('nav-stage-subtitle').textContent=number?'Учебная схема этажа':'Аудитории, маршруты и места для работы.';
 $('nav-open-model').innerHTML=number?'Собрать здание':`Смотреть этажи ${icon('chevron')}`;
 if(!number){$('nav-projection').setAttribute('aria-pressed','false');$('nav-projection').querySelector('span').textContent='2D';$('nav-rotate').disabled=false;}
 scene?.setView(number,{animate,stairIndex});
 const source=$('nav-floor-source');
 source.hidden=stairIndex!==null;
 const shownFloor=number||(!graphicsAvailable&&scene?(route?.from.floor??1):0);
 if(shownFloor){
  const evidence=floorSource(shownFloor);
  source.querySelector('span').textContent=`${shownFloor}-й этаж · ${shownFloor>=2&&shownFloor<=4?'панель 2026':'план 2012'}`;
  source.title=evidence.label;
  source.href=evidence.href;
  source.target='_blank';
  source.rel='noopener';
 }else{
  source.querySelector('span').textContent='Планы и ориентиры';
  source.removeAttribute('title');
  source.href='./orientation.html';
  source.removeAttribute('target');
 }
 const overviewButton=document.querySelector('[data-level="0"]');
 const overviewLabel=route?'Весь маршрут':'Показать здание целиком';
 overviewButton.setAttribute('aria-label',overviewLabel);
 overviewButton.title=overviewLabel;
 overviewButton.querySelector('use').setAttribute('href',route?'#nav-i-route':'#nav-i-building');
 overviewButton.querySelector('span').textContent=route?'Маршрут':'Здание';
 document.querySelectorAll('[data-level]').forEach(button=>button.setAttribute('aria-pressed',String(stairIndex===null&&Number(button.dataset.level)===number)));
 if(route){
  setRouteStep(stairIndex??route.floors.indexOf(number));
  updateStairPanel();
 }
}
function switchToPlan(){
 graphicsAvailable=false;
 routeStairFocus=null;
 scene?.dispose();
 scene=null;
 const loading=$('nav-loading');
 try{
  scene=createNavigatorPlan({container:$('campus-map'),campus,onSelect:select});
  app.classList.add('has-plan-fallback');
  $('campus-map').setAttribute('aria-label','Плоский план корпуса. Кабинеты также доступны в списке.');
  const overview=document.querySelector('[data-level="0"]');
  overview.setAttribute('aria-label','Показать план стартового этажа');
  overview.title='План стартового этажа';
  overview.querySelector('span').textContent='Старт';
  scene.setVisible(visible);
  scene.select(selected);
  scene.setRoute(route);
  setLevel(viewLevel,false);
  loading.hidden=true;
 }catch{
  loading.hidden=false;
  loading.classList.add('is-error');
  loading.textContent='Карта недоступна. Поиск и текстовые шаги работают.';
  openList();
 }
 renderRoute();
}
function setRouteStep(index){
 routeStep=index;
 $('nav-route').querySelectorAll('[data-route-step]').forEach(button=>button.setAttribute('aria-current',Number(button.dataset.routeStep)===index?'step':'false'));
}
function showMapFloor(number){
 if(!route){clearSelection();resetFilters();closeList();}
 setLevel(number);
}
function clearRoute(){
 routeRevision++;
 route=null;
 routeFeedback='';
 routeStairFocus=null;
 scene?.setRoute(null);
 $('nav-route').hidden=true;
 delete $('nav-route').dataset.focusedStair;
 routeStep=-1;
}
function clearSelection(message){if($('nav-detail').contains($('nav-time')))$('nav-slot-home').append($('nav-time'));bookingOpen=false;scene?.setSeatSelection?.(selected,[]);selected=null;directoryEntry=null;chosen.clear();success=null;bookingError='';clearRoute();scene?.select(null,{focus:false});$('nav-detail').hidden=true;app.classList.remove('has-context');document.querySelectorAll('[data-select][aria-pressed=true]').forEach(b=>b.setAttribute('aria-pressed','false'));if(message)toast(message)}
function closePassport(){clearSelection();setLevel(viewLevel);document.querySelector('.nav-levels [aria-pressed=true]')?.focus();}
function returnToRoom(){
 clearRoute();
 const entry=current();
 if(entry){
  const url=new URL(location.href);
  url.searchParams.delete('to');
  url.hash=`space=${encodeURIComponent(entry.id)}`;
  history.replaceState(null,'',url);
  setLevel(entry.floor);
  scene?.focusRoom(selected);
 }
 renderDetail();
}

function renderServices(query,filters){
 const section=$('nav-service-results'),catalogMode=mode==='services';
 const shouldSearch=catalogMode||(mode==='all'&&Boolean(query)&&filters.category==='all'&&!filters.freeOnly);
 const matches=shouldSearch&&services?(query?searchServices(query,services):services):[];
 section.hidden=!catalogMode&&!matches.length;
 if(section.hidden){section.replaceChildren();return 0;}
 if(!services){
  section.innerHTML=`<p class="nav-empty">${servicesFailed?'Не удалось загрузить услуги. Обновите страницу.':'Загружаем услуги…'}</p>`;
  return 0;
 }
 section.innerHTML=matches.length?matches.map(service=>{
  const placement=roomPlacements.find(room=>room.number===service.roomNumber&&room.confidence==='exact');
  const space=campus?.entries.get(placement?.spaceId);
  const destination=space?.point&&space.directoryRoom?.number===service.roomNumber?space:null;
  const sourceLink=`<a href="${e(service.sourceUrl)}" target="_blank" rel="noopener">Источник СПбГУПТД ↗</a>`;
  const actionLink=service.actionUrl&&service.actionLabel?`<a class="nav-btn" href="${e(service.actionUrl)}" target="_blank" rel="noopener">${e(service.actionLabel)} ↗</a>`:'';
  const routeButton=destination?`<button type="button" class="nav-btn nav-btn-primary" data-service-destination="${e(destination.id)}">Учебный маршрут</button>`:'';
  return `<article class="nav-service" data-service-id="${e(service.id)}">
   <h3>${e(service.title)}</h3>
   <p>${e(service.description)}</p>
   ${service.address?`<p>${e(service.address)}${service.roomNumber?' · каб. '+e(service.roomNumber):''}</p>`:''}
   ${service.hours?`<p>${e(service.hours)}</p>`:''}
   ${service.note?`<p>${e(service.note)}</p>`:''}
   ${service.accessNote?`<p>${e(service.accessNote)} <a href="${accessSources.university}" target="_blank" rel="noopener">Доступная среда СПбГУПТД ↗</a></p>`:''}
   <div class="nav-service-actions">
    ${routeButton}${actionLink}${sourceLink}
    <button type="button" class="nav-text-btn" data-service-share aria-label="Скопировать ссылку на услугу: ${e(service.title)}">Скопировать ссылку</button>
   </div>
  </article>`;
 }).join(''):'<p class="nav-empty">По этому запросу услуг не найдено.</p>';
 return matches.length;
}

function renderResults(){
 const filters=filter(),query=filters.query.trim(),invalid=slotErrors().length>0;
 const requiresFree=filters.freeOnly||filters.minSeats>1;
 const missingEquipment=filters.equipment.find(item=>!pilotEquipment.includes(item));
 const noUpcomingSlot=Boolean(filters.request?.nearestHour&&!nextWorkHour());
 const workNotice=missingEquipment?'В каталоге нет сведений о розетках.':noUpcomingSlot?'В ближайший час учебных слотов по Москве нет.':'';
 const pilots=filterPilotRooms({...filters,query:''},bookings,slot()),pilotSet=new Set(pilots.map(r=>r.spaceId));
 const entries=campus?[...campus.entries.values()].filter(s=>s.kind==='space'):pilotRooms.map(r=>({id:r.spaceId,label:r.number,floor:4,kind:'space'}));
 const result=(mode==='services'?[]:entries).flatMap(space=>{
  const room=pilotRoomBySpace(space.id);
  if(room ? !pilotSet.has(space.id)||(invalid&&requiresFree)||noUpcomingSlot : mode!=='all'||filters.work||filters.category!=='all'||filters.freeOnly)return [];
  const rank=searchRoom(filters.request?'':query,{
   numbers:[space.label,space.modelIndex],
   text:[space.displayName,room?.name,...(room?.equipment??[]),room?null:`помещение ${space.floor} этаж`],
  });
  return Number.isFinite(rank)?[{space,rank}]:[];
 }).sort((a,b)=>a.rank-b.rank
  ||Number(Boolean(pilotRoomBySpace(b.space.id)))-Number(Boolean(pilotRoomBySpace(a.space.id)))
  ||Number(Boolean(b.space.directoryRoom))-Number(Boolean(a.space.directoryRoom))
  ||a.space.floor-b.space.floor||a.space.label.localeCompare(b.space.label,'ru',{numeric:true})).map(({space})=>space);
 visible=new Set(result.map(s=>s.id));if(selected&&!visible.has(selected))clearSelection('Выбор снят: помещение скрыто фильтром.');
 const availability=new Map(pilotRooms.map(r=>[r.spaceId,invalid?{free:null,text:'Уточни время'}:pilotStatus(r,bookings,slot())]));scene?.setAvailability?.(availability);scene?.setVisible(visible);
 const timeErrors=slotErrors();if(timeErrors.length)$('nav-time').open=true;const time=slot();$('nav-slot-summary').textContent=timeErrors.length?'Уточните дату и время':`${time.date===today?'Сегодня':new Intl.DateTimeFormat('ru',{day:'numeric',month:'short'}).format(new Date(time.date+'T12:00:00Z'))}, ${slotLabel(Number(time.start))}–${slotLabel(Number(time.start)+Number(time.hours))}`;
 const serviceCount=renderServices(query,filters);
 $('nav-results').innerHTML=result.length?result.map(s=>{const r=pilotRoomBySpace(s.id),status=availability.get(s.id);return `<button type="button" class="nav-result ${status?.free===0?'is-busy':''}" data-select="${e(s.id)}" aria-pressed="${s.id===selected}"><span class="nav-result-code">${e(s.label)}</span><span class="nav-result-main"><strong>${e(s.displayName||r?.name||'Помещение модели')}</strong><small>${s.floor}-й этаж${s.directoryRoom&&!s.directoryRoom.documented_floor?' макета':''}${r?' · '+categoryName(r.category):''}</small>${r?`<small class="nav-status">${status.free===0?'×':'○'} ${e(status.text)} · Бесплатно</small>`:''}</span></button>`}).join(''):serviceCount?'':`<p class="nav-empty">${invalid&&requiresFree?'Уточните дату и время для проверки свободных мест.':mode==='work'?'Нет учебных мест, подходящих по этим условиям. Измените требования или время.':'Ничего не найдено. Измени запрос или сбрось фильтры.'}</p>`;
 const placedIds=new Set(campus?[...campus.entries.values()].map(space=>space.directoryRoom?.id):[]);
 const real=directory&&mode==='all'&&!filters.work&&!filters.freeOnly&&filters.category==='all'&&query.length>1
  ?directory.rooms.flatMap(room=>{
   if(placedIds.has(room.id))return [];
   const rank=searchRoom(query,{numbers:[room.number],text:[room.label]});
   return Number.isFinite(rank)?[{room,rank}]:[];
  }).sort((a,b)=>a.rank-b.rank).map(({room})=>room)
  :[];
 if(directoryEntry&&!real.some(r=>r.number===directoryEntry.number))clearSelection();
 $('nav-directory-results').innerHTML=real.length?`<p class="nav-directory-heading">Справочник · без привязки к схеме</p>`+real.map(r=>`<button type="button" class="nav-result" data-directory="${e(r.number)}"><span class="nav-result-code">${e(r.number)}</span><span class="nav-result-main"><strong>${e(r.label)}</strong><small>Положение не подтверждено</small></span></button>`).join(''):'';
 const isContact=mode==='contact',serviceMode=mode==='services';
 const serviceOnly=serviceMode||(serviceCount>0&&!result.length&&!real.length);
 const hasServiceRoute=Boolean(query&&$('nav-service-results').querySelector('[data-service-destination]'));
 $('nav-result-count').textContent=serviceOnly
  ?`Услуг: ${serviceCount}`
  :`На схеме: ${result.length}${mode==='work'?' из 8':''}${serviceCount?` · Услуг: ${serviceCount}`:''}`;
 $('nav-search-title').textContent={contact:'Обратная связь',work:'Место для работы',services:'Услуги'}[mode]||'Поиск по кампусу';
 for(const key of ['all','work','services','contact'])$('nav-mode-'+key).setAttribute('aria-pressed',String(mode===key));
 $('nav-sidebar-contact').hidden=!isContact;
 for(const id of ['nav-filter-row','nav-time','nav-results','nav-directory-results'])$(id).hidden=isContact||serviceOnly;
 $('nav-origin-tools').hidden=isContact||(serviceOnly&&!hasServiceRoute);
 $('nav-work-filters').hidden=!filters.work;
 $('nav-work-notice').textContent=workNotice|| (filters.request
  ? [filters.minSeats>1?`Мест: от ${filters.minSeats}`:'',...new Set(filters.equipment),filters.request.nearestHour?$('nav-slot-summary').textContent:''].filter(Boolean).join(' · ')
  : '');
 $('nav-start-share').disabled=!campus?.entries.get(origin)?.point;
 $('nav-results-head').hidden=isContact;
 const errors=slotErrors();$('nav-slot-error').textContent=errors.join(' ');$('nav-slot-error').hidden=!errors.length;$('nav-storage-error').textContent=storageError||'';$('nav-storage-error').hidden=!storageError;
}
function renderDetail(){
 const panel=$('nav-detail'),time=$('nav-time');if(panel.contains(time))$('nav-slot-home').append(time);
 if(route){panel.hidden=true;app.classList.add('has-context');return}
 const entry=current(),r=pilot();panel.classList.toggle('is-booking',bookingOpen&&!success);panel.classList.toggle('is-success',Boolean(success&&r?.id===success.roomId));app.classList.toggle('has-context',Boolean(entry||r||directoryEntry));
 if(directoryEntry){const source=directory.sources[directoryEntry.source_ids[0]];panel.hidden=false;panel.innerHTML=`<button class="nav-close" data-close aria-label="Закрыть помещение">${icon('close')}</button><h2>${e(directoryEntry.number)}</h2><p class="nav-room-title">${e(directoryEntry.label)}</p><p>Номер из справочника. Современное положение на плане не подтверждено; маршрут и бронь этому номеру не назначены.</p><a class="nav-btn" href="${e(source.url)}" target="_blank" rel="noopener">Открыть источник</a><a class="nav-btn nav-btn-wide" href="./about.html">О точности макета</a>`;return;}
 if(!entry&&!r){panel.hidden=true;return}panel.hidden=false;
 const status=r?pilotStatus(r,bookings,slot()):null,invalid=slotErrors().length>0;
 if(r)chosen=new Set([...chosen].filter(seat=>!status.occupied.has(seat)));scene?.setSeatSelection?.(selected,[...chosen]);
 const evidenceOpen=panel.dataset.space===selected&&panel.querySelector('.nav-evidence')?.open;panel.dataset.space=selected||'';
 const title=entry?.displayName||r?.name||'Помещение модели',number=entry?.label||r?.number;
 const panelGroup=entry&&campus.floors.get(entry.floor)?.source.sourceKind==='wayfinding-panel'&&/^\d{3}\s*[-–—]\s*\d{3}$/u.test(number);
 panel.innerHTML=`<button class="nav-close" data-close aria-label="Закрыть помещение">${icon('close')}</button><h2>${e(number)}</h2><p class="nav-room-title">${e(title)}</p>${panelGroup?'<p class="nav-note">Панель показывает эту группу целиком. Отдельные двери на схеме не различимы.</p>':''}<p class="nav-kind"><span class="nav-space-meta">${r?'Пилотное пространство':entry?.directoryRoom?'Кабинет в макете':'Помещение модели'} · ${r?.floor||entry.floor}-й этаж</span>${r?'<span class="nav-concept-note">Оборудование и размещение — концепция</span>':''}</p>${r?`<div class="nav-equipment">${r.equipment.map(x=>`<span>${e(x)}</span>`).join('')}</div>`:''}<div class="nav-actions">${r&&!success&&!bookingOpen?`<button class="nav-btn nav-btn-primary" data-show-seats>${icon('seat')}Выбрать места</button>`:''}<button class="nav-btn ${r?'':'nav-btn-primary'}" data-route${entry?.point?'':' disabled'}>${icon('route')}${routePreferences().stepFree?'Маршрут без лестниц':'Как добраться'}</button>${entry?.point&&!routePreferences().stepFree?'<button type="button" class="nav-text-btn" data-step-free-route>Без лестниц</button>':''}${!bookingOpen?`<button class="nav-text-btn" data-start${entry?.point?'':' disabled'}>Начать отсюда</button>`:''}<button class="nav-btn" data-contact-room="${e(number)}" aria-label="Связаться">${icon('mail')}Связаться</button></div>${routeFeedback?`<p id="nav-route-feedback" class="nav-field-error" role="status" tabindex="-1">${e(routeFeedback)}</p>${routePreferences().stepFree&&!mapRouting?.error?'<a class="nav-text-btn" href="./orientation.html#access">Доступность и контакты университета →</a>':''}`:''}${r?success?.roomId===r.id?`<div class="nav-success"><strong>Бронь сохранена.</strong><p class="nav-ticket-room">${e(title)}</p><p>№${e(success.id.slice(0,6).toUpperCase())} · ${e(number)}<br>${e(success.date)} · ${slotLabel(success.start)}–${slotLabel(success.start+success.hours)}<br>Места ${success.seatIds.join(', ')} · Бесплатно</p><p>Сохранено в этом браузере. Это не пропуск в университет.</p><button class="nav-btn nav-btn-primary nav-btn-wide" data-route>Показать путь</button><button class="nav-btn nav-btn-wide" data-history>Мои брони</button><div class="nav-email-send-box"><label for="nav-booking-email-input">Отправить подтверждение на почту</label><div class="nav-email-send-row"><input type="email" id="nav-booking-email-input" placeholder="student@sutd.ru" autocomplete="email"><button type="button" class="nav-btn nav-btn-primary" id="nav-booking-send-btn">Отправить</button></div><p id="nav-booking-send-status" class="nav-note" style="margin:5px 0 0;" hidden></p></div><a class="nav-text-btn" href="./email.html#${e(success.id)}">Образец письма · без отправки</a></div>`:bookingOpen?`<form id="nav-reservation-form" novalidate><div id="nav-booking-time"></div><h3>Выбери свободные места</h3><div class="nav-seat-grid" data-seat-layout="${e(r.spaceId)}" data-room-style="${e(r.style)}" role="group" aria-label="Восемь учебных мест">${seatLayout(r.style,r.spaceId).map(position=>{const seat=position.seatId,occupied=status.occupied.has(seat);return `<button type="button" class="nav-seat" style="--seat-x:${50+position.x*110}%;--seat-z:${50+position.z*118}%;--seat-angle:${position.angle}rad" data-seat="${seat}" aria-pressed="${chosen.has(seat)}" aria-label="Место ${seat}: ${occupied?'занято':chosen.has(seat)?'выбрано':'свободно'}"${occupied||invalid?' disabled':''}><span class="nav-seat-number">${seat}${occupied?' ×':''}</span><small>${occupied?'Занято':chosen.has(seat)?'Выбрано':'Свободно'}</small></button>`}).join('')}</div><div class="nav-seat-legend">○ Свободно · выделение — выбрано · × Занято</div><p class="nav-field-error" role="alert">${e(bookingError||storageError||slotErrors().join(' '))}</p><div class="nav-book-total"><span>Мест: ${chosen.size} · ${e(slot().hours||'—')} ч</span><strong>Бесплатно</strong></div><button class="nav-btn nav-btn-primary nav-btn-wide" type="submit"${busy||invalid||storageError||!status.free?' disabled':''}>${busy?'Сохраняем…':status.free?'Сохранить учебную бронь':'Все места заняты'}</button><p class="nav-disclosure">Учебная бронь в браузере. Это не пропуск.</p></form>`:`<p>Восемь учебных мест · <strong>Бесплатно</strong><br>${e(status.text)} на выбранное время.</p>`:'<p class="nav-note">Бесплатная учебная бронь доступна в восьми пилотных пространствах. Открой «Найти место».</p>'}${entry?.directoryRoom?`<div class="nav-placement-note"><strong>Номер по навигационной панели</strong><details class="nav-evidence"${evidenceOpen?' open':''}><summary>${entry.directoryRoom.evidence_status==='conflicting'?'Источники расходятся':entry.directoryRoom.evidence_status==='historical'?'По архиву · сведения и источник':'Сведения и источник'}</summary><p>${e(roomEvidence(entry.directoryRoom))}</p><small>Индекс модели: ${e(entry.modelIndex)}</small><a href="${e(directory.sources[entry.directoryRoom.source_ids[0]].url)}" target="_blank" rel="noopener">Источник о кабинете</a></details></div>`:''}<p class="nav-disclosure">${r?'Размещение и оборудование условные. Пилотное пространство — авторская концепция; реальный доступ не предоставляется.':entry?.placement?'Номер и расположение — по панели; назначение — по справочнику.':'Схема по источнику этажа. Современное назначение не установлено.'}</p>`;
 if(bookingOpen&&!success&&r){$('nav-booking-time').append(time);time.open=true;}if(success&&r?.id===success.roomId)panel.scrollTop=0;
}

function updateAll(){renderResults();renderDetail();$('nav-booking-count').textContent=bookings.length;if($('nav-history').open)renderHistory();}
function select(id,{keepUrl=false}={}){if(!visible.has(id)){toast('Помещение скрыто фильтром. Сначала сбрось фильтры.');return}clearRoute();selected=id;directoryEntry=null;bookingOpen=false;chosen.clear();success=null;bookingError='';const entry=campus?.entries.get(id);if(entry)setLevel(entry.floor);scene?.select(id,{focus:true});closeList();renderResults();renderDetail();if(!keepUrl){const url=new URL(location.href);url.search='';writeRoutePreferences(url,routePreferences());if(origin!==defaultOrigin)url.searchParams.set('from',origin);url.hash=`space=${encodeURIComponent(id)}`;history.replaceState(null,'',url);}$('nav-detail').querySelector('h2')?.setAttribute('tabindex','-1');$('nav-detail').querySelector('h2')?.focus({preventScroll:true});}
function selectDirectory(number){clearSelection();directoryEntry=directory?.rooms.find(r=>r.number===number);closeList();renderDetail();}
async function displayRoute(){
 const target=current();
 if(!campus||!target?.point)return;
 const request=++routeRevision,from=origin,to=target.id;
 const preferences=routePreferences();
 history.replaceState(null,'',createRouteLink(location.href,from,to,preferences));
 if(mapRouting.error){showRouteFeedback(mapRouting.error);return;}
 const pendingToast=toast('Проверяем проходы в схеме…');
 await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
 if(request!==routeRevision)return;
 if(toastTimer===pendingToast){
  clearTimeout(toastTimer);
  $('nav-toast').hidden=true;
 }
 let computed;
 try{
  const options={closures:mapRouting.closures};
  if(preferences.stepFree){
   const result=campus.routeStepFree(from,to,options);
   computed=result.route;
   if(!computed){
    const messages={
     'missing-entry':'Одна из точек маршрута недоступна на схеме.',
     unverified:'Путь без лестниц пока не подтверждён. Для этой пары точек не хватает проверенных данных о доступности входа и переходов.',
     disconnected:'Проверенные переходы не образуют открытого пути без лестниц.',
    };
    showRouteFeedback(messages[result.reason]);
    return;
   }
  }else computed=campus.route(from,to,options);
 }catch(error){
  console.error(error);
  showRouteFeedback('Не удалось проверить ограничения на проход. Маршрут недоступен.');
  return;
 }
 if(!computed){
  showRouteFeedback('В схеме не найден непрерывный проход. Выберите другую точку старта.');
  return;
 }
 route=computed;
 routeFeedback='';
 scene?.setRoute(route);
 setLevel(0);
 renderDetail();
 renderRoute();
 $('nav-route-title').focus({preventScroll:true});
}
function showRouteFeedback(message){
 clearRoute();
 routeFeedback=previewRequested?`Предпросмотр локальной версии карты. ${message}`:message;
 renderDetail();
 $('nav-route-feedback')?.focus();
}
function updateStairPanel(){
 const panel=$('nav-route'),detail=panel.querySelector('#nav-stair-view'),overview=panel.querySelector('#nav-route-overview');
 if(!detail||!overview)return;
 const connection=route?.connections[routeStairFocus];
 const focused=Boolean(connection&&graphicsAvailable);
 panel.toggleAttribute('data-focused-stair',focused);
 detail.hidden=!focused;
 overview.hidden=focused;
 if(focused){
  $('nav-stair-title').textContent=connection.stairNumber?`Лестница №${connection.stairNumber}`:'Лестница';
  $('nav-stair-direction').textContent=`${connection.fromFloor}-й этаж → ${connection.toFloor}-й этаж`;
  $('nav-stair-evidence').textContent=connection.registration==='archive-panel'
   ?'Площадки сопоставлены между архивным планом и современной панелью.'
   :connection.registration==='panel-number'
    ?'Площадки связаны по совпадающему номеру на панелях.'
    :'Положение площадок взято из схемы этажа.';
 }
}
function renderRoute(){
 const panel=$('nav-route');
 if(!route){panel.hidden=true;return;}
 const detour=secondFloorDetour(route);
 const destinationSign=fourthFloorSign(route.to);
 const steps=route.floors.map((floor,index)=>{
  const connection=route.connections[index];
  const instruction=`<span class="nav-step-number" aria-hidden="true">${index+1}</span><span class="nav-step-copy"><strong>${floor}-й этаж</strong><small>${e(routeFloorInstruction(route,index))}</small></span>`;
  const floorStep=scene
   ?`<button type="button" data-route-floor="${floor}" data-route-step="${index}">${instruction}</button>`
   :`<div class="nav-route-step">${instruction}</div>`;
  const stairButton=graphicsAvailable&&connection&&connection.kind!=='lift'
   ?`<button type="button" class="nav-text-btn nav-stair-button" data-route-stair="${index}" aria-label="Показать лестницу целиком, с ${floor}-го на ${connection.toFloor}-й этаж">Показать лестницу целиком</button>`
   :'';
  return `<li>${floorStep}${stairButton}</li>`;
 }).join('');
 const journey=graphicsAvailable?`<div class="nav-journey">
  <button type="button" class="nav-btn nav-btn-wide" data-route-play aria-pressed="false">${icon('play')}Показать движение</button>
  <label for="nav-route-progress">Просмотр маршрута <output id="nav-route-position">Начало · ${route.from.floor}-й этаж</output></label>
  <input id="nav-route-progress" type="range" min="0" max="1000" step="1" value="0" aria-label="Положение на учебном маршруте">
  <p>Демонстрация движения по схеме</p>
 </div>`:'';
 panel.innerHTML=`<div id="nav-route-overview">
  <button type="button" class="nav-close" data-route-close aria-label="Закрыть маршрут">${icon('close')}</button>
  <h2 id="nav-route-title" tabindex="-1">Как добраться</h2>
  <p class="nav-kind">${previewRequested?'Локальный предпросмотр карты':routePreferences().stepFree?'Маршрут без лестниц':'Учебный маршрут по модели'}</p>
  <p class="nav-route-endpoints">${e(route.from.label)} → ${e(route.to.label)}</p>
  ${detour?`<p class="nav-route-evidence">На панели 2-го этажа указан обход через 3-й. Спуск к этой секции — по лестнице №${detour.stairNumber}. <a href="./orientation.html#panel-2">Фото указателя →</a></p>`:''}
  ${destinationSign?`<p class="nav-route-evidence">На указателе 4-го этажа ищите диапазон ${destinationSign}. <a href="./orientation.html#panel-4">Фото указателя →</a></p>`:''}
  ${graphicsAvailable?'':scene?'<p>Выберите этаж, чтобы увидеть его участок пути. А — начало, Б — цель, цифры — номера лестниц.</p>':'<p>Карта недоступна. Следуйте текстовым шагам маршрута.</p>'}
  <button type="button" class="nav-text-btn" data-route-origin>Изменить начало маршрута</button>
  <ol>${steps}</ol>
  ${journey}
  <div class="nav-actions">
   ${scene?`<button type="button" class="nav-btn" data-route-all>${graphicsAvailable?'Весь маршрут':'Этаж отправления'}</button><button type="button" class="nav-btn" data-route-next>Следующий шаг</button>`:''}
   <button type="button" class="nav-btn" data-route-share>Ссылка на маршрут</button>
  </div>
  ${pilot()?'<button type="button" class="nav-btn nav-btn-primary nav-btn-wide" data-route-book>Выбрать места</button>':'<button type="button" class="nav-btn nav-btn-wide" data-route-close>К помещению</button>'}
  <details class="nav-route-sources">
   <summary>Источники этого маршрута</summary>
   <p>Площадки и обозначения взяты из планов. Точные двери, проходы и форма лестничных маршей требуют проверки в здании.</p>
   <ul>${[...new Set(route.floors)].map(floor=>{
    const source=floorSource(floor);
    return `<li><a href="${source.href}" target="_blank" rel="noopener">${floor}-й этаж · ${source.label} ↗</a></li>`;
   }).join('')}</ul>
  </details>
 </div>
 <div id="nav-stair-view" hidden>
  <h2 id="nav-stair-title" tabindex="-1"></h2>
  <p id="nav-stair-direction" class="nav-route-endpoints"></p>
  <p>Схема лестничных маршей и площадок</p>
  <p id="nav-stair-evidence"></p>
  <button type="button" class="nav-btn nav-btn-wide" data-stair-back>К маршруту</button>
 </div>`;
 panel.hidden=false;
 setRouteStep(routeStep);
 updateStairPanel();
}
function setOrigin(id){
 const entry=campus?.entries.get(id);
 if(!entry?.point){toast('Эта точка пока недоступна для маршрута.');return false;}
 origin=id;
 const select=$('nav-origin');
 select.querySelector('[data-custom]')?.remove();
 if(![...select.options].some(option=>option.value===id)){
  const option=new Option(entry.label,id);
  option.dataset.custom='true';
  select.append(option);
 }
 select.value=id;
 clearRoute();
 renderDetail();
 return true;
}
async function copyLink(url,container,label){
 try{
  await navigator.clipboard.writeText(url.href);
  toast(`${label} скопирована.`);
 }catch{
  if(!container.isConnected)return;
  const input=container.querySelector('.nav-share-input')||document.createElement('input');
  input.className='nav-share-input';
  input.setAttribute('aria-label',label);
  input.readOnly=true;
  input.value=url.href;
  container.append(input);
  input.focus();
  input.select();
  toast('Скопируйте ссылку из поля.');
 }
}
function copyRoute(){
 if(route)copyLink(createRouteLink(location.href,route.from.id,route.to.id,routePreferences()),$('nav-route-overview'),'Ссылка на маршрут');
}
function renderHistory(){const list=$('nav-history-list');list.innerHTML=bookings.length?[...bookings].sort((a,b)=>a.date.localeCompare(b.date)||a.start-b.start).map(b=>{const r=pilotRoomById(b.roomId);return `<article class="nav-record"><h3>${e(pilotDisplayNumber(r))} · ${e(r.name)}</h3><p>№${e(b.id.slice(0,6).toUpperCase())} · ${e(b.date)}<br>${slotLabel(b.start)}–${slotLabel(b.start+b.hours)} · места ${b.seatIds.join(', ')} · Бесплатно</p><div><button class="nav-btn" data-history-route="${e(r.spaceId)}">Как добраться</button><a class="nav-btn" href="./email.html#${e(b.id)}">Образец письма</a><button class="nav-btn" data-cancel="${e(b.id)}">Отменить</button></div></article>`}).join(''):'<p class="nav-note">Здесь появятся сохранённые учебные записи. Выбери пилотную зону на карте или в списке.</p>';$('nav-reset-demo').disabled=busy;$('nav-reset-demo').hidden=!bookings.length&&!storageError;}
function openHistory(){renderHistory();if(!$('nav-history').open)$('nav-history').showModal();}
async function writeChange(operation){if(busy)return;busy=true;try{const run=()=>{const fresh=loadBookings(storage);if(fresh.error)throw Error(fresh.error);const result=operation(fresh.bookings);if(result.error)throw Error(Object.values(result.error).join(' '));const saved=saveBookings(storage,result.bookings);if(saved.error)throw Error(saved.error);bookings=result.bookings;storageError=null;return result;};return navigator.locks?await navigator.locks.request(STORAGE_KEY,run):run();}finally{busy=false;}}
async function submit(){if(busy)return;bookingError='';const r=pilot();if(!r)return;const request={roomId:r.id,seatIds:[...chosen],...slot()};try{const result=await writeChange(rows=>createBooking(rows,request,today));if(result?.booking){if(pilot()?.id===request.roomId){success=result.booking;chosen.clear();}toast('Учебная бронь сохранена в этом браузере.');}}catch(error){bookingError=error.message;toast(error.message);}updateAll();}
function confirmAction(title,text,yes,action){$('nav-confirm-title').textContent=title;$('nav-confirm-text').textContent=text;$('nav-confirm-yes').textContent=yes;pendingConfirm=action;$('nav-confirm').showModal();}
$('nav-confirm-no').addEventListener('click',()=>{$('nav-confirm').close();pendingConfirm=null});$('nav-confirm-yes').addEventListener('click',async()=>{if(busy)return;const action=pendingConfirm;pendingConfirm=null;$('nav-confirm').close();try{await action?.();}catch(error){toast(error.message)}updateAll()});
$('nav-results').addEventListener('click',event=>{const id=event.target.closest('[data-select]')?.dataset.select;if(id)select(id)});$('nav-directory-results').addEventListener('click',event=>{const n=event.target.closest('[data-directory]')?.dataset.directory;if(n)selectDirectory(n)});
$('nav-detail').addEventListener('click',event=>{const b=event.target.closest('button');if(!b)return;if(b.hasAttribute('data-close'))closePassport();if(b.hasAttribute('data-route'))displayRoute();if(b.hasAttribute('data-step-free-route')){$('nav-route-mode').value='step-free';displayRoute();}if(b.hasAttribute('data-start')&&selected){setOrigin(selected);toast('Точка старта изменена. Теперь выбери куда идти.');}if(b.hasAttribute('data-history'))openHistory();if(b.hasAttribute('data-change-time')){openList();$('nav-time').open=true;$('nav-date').focus();}if(b.hasAttribute('data-show-seats')){bookingOpen=true;renderDetail();$('nav-detail').querySelector('[data-seat]:not(:disabled)')?.focus();}if(b.dataset.contactRoom)window.openContactModal?.({room:b.dataset.contactRoom,subject:'Вопрос по аудитории '+b.dataset.contactRoom});const sendBtn=event.target.closest('#nav-booking-send-btn');if(sendBtn&&success){const input=$('nav-booking-email-input'),status=$('nav-booking-send-status');const email=input?.value?.trim();if(!email){if(status){status.hidden=false;status.textContent='Укажите email для отправки.';}return;}if(status){status.hidden=false;status.textContent='Отправляем…';}sendBtn.disabled=true;(async()=>{try{const res=await sendBookingNotification(success,email);if(res.success){if(status){status.hidden=false;status.innerHTML='<strong>Отправлено!</strong> Подтверждение ушло на почту.';}toast('Бронь отправлена на '+email);}else{if(status){status.hidden=false;status.textContent=res.message;}toast(res.message);}}finally{sendBtn.disabled=false;}})();}if(b.dataset.seat){const seat=Number(b.dataset.seat);chosen.has(seat)?chosen.delete(seat):chosen.add(seat);bookingError='';renderDetail();$('nav-detail').querySelector(`[data-seat="${seat}"]`)?.focus();}});$('nav-detail').addEventListener('submit',event=>{event.preventDefault();submit()});
function leaveRouteStair(){
 const index=routeStairFocus;
 setLevel(0);
 $('nav-route').querySelector(`[data-route-stair="${index}"]`)?.focus();
}
$('nav-route').addEventListener('click',event=>{
 const button=event.target.closest('button');
 if(!button)return;
 if(button.hasAttribute('data-route-close')||button.hasAttribute('data-route-book')){
  if(button.hasAttribute('data-route-book'))bookingOpen=true;
  returnToRoom();
  $('nav-detail').querySelector(bookingOpen?'[data-seat]:not(:disabled)':'[data-route]')?.focus();
 }
 if(button.hasAttribute('data-route-origin')){openList();$('nav-origin').focus();}
 if(button.hasAttribute('data-route-play')){
  if(button.getAttribute('aria-pressed')==='true')scene?.pausePreview();
  else{setLevel(0);scene?.playPreview();}
 }
 if(button.dataset.routeStair!==undefined){
  setLevel(0,true,Number(button.dataset.routeStair));
  $('nav-stair-title').focus({preventScroll:true});
 }
 if(button.hasAttribute('data-stair-back'))leaveRouteStair();
 if(button.hasAttribute('data-route-all'))setLevel(0);
 if(button.hasAttribute('data-route-next')&&route){
  const next=(routeStep+1)%route.floors.length;
  setLevel(route.floors[next]);
  setRouteStep(next);
 }
 if(button.dataset.routeFloor){
  setLevel(button.dataset.routeFloor);
  setRouteStep(Number(button.dataset.routeStep));
 }
 if(button.hasAttribute('data-route-share'))copyRoute();
});
$('nav-route').addEventListener('input',event=>{if(event.target.id==='nav-route-progress')scene?.seekPreview(Number(event.target.value)/1000)});
function openSearch(){if(restoringSearchFocus)return;if(mode==='contact'){mode='all';updateAll()}openList()}
document.querySelector('.nav-search').addEventListener('click',openSearch);$('nav-query').addEventListener('focus',openSearch);$('nav-query').addEventListener('input',()=>{
 const request=filter().request;
 const upcoming=request?.nearestHour?nextWorkHour():null;
 if(upcoming){
  $('nav-date').value=upcoming.date;
  $('nav-start-time').value=String(upcoming.start);
  $('nav-hours').value=String(upcoming.hours);
 }
 success=null;
 openList();
 updateAll();
});
for(const id of ['nav-category','nav-free'])$(id).addEventListener('change',()=>{if($('nav-category').value!=='all'||$('nav-free').checked)mode='work';updateAll()});
for(const id of ['nav-team-size','nav-equipment'])$(id).addEventListener('change',()=>updateAll());
for(const id of ['nav-date','nav-start-time','nav-hours'])$(id).addEventListener(id==='nav-hours'?'input':'change',()=>{success=null;bookingError='';if(slotErrors().length)chosen.clear();updateAll()});
$('nav-mode-all').addEventListener('click',()=>{mode='all';resetWorkFilters();updateAll()});$('nav-mode-work').addEventListener('click',()=>{mode='work';updateAll()});$('nav-mode-contact')?.addEventListener('click',()=>{mode='contact';updateAll();openList();});
$('nav-mode-services').addEventListener('click',()=>{mode='services';openList();updateAll()});
$('nav-service-results').addEventListener('click',event=>{
 const share=event.target.closest('[data-service-share]');
 if(share){
  const card=share.closest('[data-service-id]');
  copyLink(createServiceLink(location.href,card.dataset.serviceId),card,'Ссылка на услугу');
  return;
 }
 const id=event.target.closest('[data-service-destination]')?.dataset.serviceDestination;
 if(!id)return;
 resetFilters();
 select(id);
 displayRoute();
});
function resetWorkFilters(){
 $('nav-category').value='all';
 $('nav-free').checked=false;
 $('nav-team-size').value='1';
 $('nav-equipment').value='';
}
function resetFilters(){mode='all';$('nav-query').value='';resetWorkFilters();updateAll();}
$('nav-filter-reset').addEventListener('click',()=>{
 if(mode!=='services'){resetFilters();return;}
 $('nav-query').value='';
 updateAll();
});
$('nav-origin').addEventListener('change',()=>{
 const url=new URL(location.href);
 const rebuild=url.searchParams.has('to')&&Boolean(current()?.point);
 if(!setOrigin($('nav-origin').value))return;
 if(rebuild){
  closeList();
  displayRoute();
  return;
 }
 url.searchParams.delete('start');
 url.searchParams.set('from',origin);
 history.replaceState(null,'',url);
});
$('nav-start-share').addEventListener('click',()=>{
 if(campus?.entries.get(origin)?.point)copyLink(createStartLink(location.href,origin),$('nav-origin-tools'),'Ссылка на точку старта');
});
$('nav-route-mode').addEventListener('change',()=>{
 const url=writeRoutePreferences(new URL(location.href),routePreferences());
 history.replaceState(null,'',url);
 if(url.searchParams.has('to')&&current()?.point){closeList();displayRoute();}
 else{routeFeedback='';renderDetail();}
});
document.querySelectorAll('[data-level]').forEach(button=>button.addEventListener('click',()=>showMapFloor(button.dataset.level)));
document.querySelectorAll('[data-level]').forEach(b=>{const peek=()=>scene?.previewFloor?.(Number(b.dataset.level));b.addEventListener('pointerenter',peek);b.addEventListener('focus',peek);b.addEventListener('pointerleave',()=>scene?.previewFloor?.(null));b.addEventListener('blur',()=>scene?.previewFloor?.(null));});
$('nav-projection').addEventListener('click',()=>{const plan=$('nav-projection').getAttribute('aria-pressed')!=='true';if(plan&&!scene?.view)setLevel(current()?.floor||4);scene?.setProjection?.(plan);$('nav-projection').setAttribute('aria-pressed',String(plan));$('nav-projection').querySelector('span').textContent=plan?'3D':'2D';$('nav-rotate').disabled=plan;});$('nav-rotate').addEventListener('click',()=>scene?.rotate?.());
$('nav-zoom-in').addEventListener('click',()=>scene?.zoom(1.2));$('nav-zoom-out').addEventListener('click',()=>scene?.zoom(1/1.2));$('nav-map-reset').addEventListener('click',()=>scene?.reset());$('nav-list-toggle').addEventListener('click',()=>{app.classList.toggle('is-list-open');syncSidebar()});
$('nav-list-close').addEventListener('click',closeSearch);
$('nav-history-open').addEventListener('click',openHistory);$('nav-history-close').addEventListener('click',()=>$('nav-history').close());
$('nav-history-list').addEventListener('click',event=>{const b=event.target.closest('button');if(!b)return;if(b.dataset.historyRoute){$('nav-history').close();resetFilters();select(b.dataset.historyRoute);displayRoute();}if(b.dataset.cancel)confirmAction('Отменить бронь?','Выбранные места снова станут доступны.','Да, отменить',async()=>{await writeChange(rows=>({bookings:cancelBooking(rows,b.dataset.cancel)}));if(success?.id===b.dataset.cancel)success=null;toast('Бронь отменена. Места освобождены.');});});
$('nav-reset-demo').addEventListener('click',()=>confirmAction('Сбросить учебные записи?','Будут удалены только записи этого приложения в этом браузере.','Сбросить',()=>{const saved=saveBookings(storage,[]);if(saved.error)throw Error(saved.error);bookings=[];storageError=null;success=null;chosen.clear();toast('Учебные записи сброшены.');}));
window.addEventListener('storage',event=>{if(event.key!==STORAGE_KEY&&event.key!==null)return;const fresh=loadBookings(storage);bookings=fresh.bookings;storageError=fresh.error;success=null;updateAll();toast('Брони обновлены из другой вкладки.');});
window.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'&&!document.querySelector('dialog[open]')){event.preventDefault();openList();$('nav-query').focus();return;}if(event.key==='Escape'&&!document.querySelector('dialog[open]')){if(app.classList.contains('is-list-open')){event.preventDefault();closeSearch();return}if(routeStairFocus!==null){leaveRouteStair();return;}if(route){returnToRoom();$('nav-detail').querySelector('[data-route]')?.focus()}else if(selected||directoryEntry){closePassport()}else setLevel(0);}});
$('campus-map').addEventListener('keydown',event=>{if(event.key==='+'||event.key==='='){event.preventDefault();scene?.zoom(1.2)}if(event.key==='-'){event.preventDefault();scene?.zoom(1/1.2)}});
function findWork(){resetFilters();mode='work';setLevel(4);openList();updateAll();$('nav-search-title').textContent='Место для работы';}
$('nav-open-model').addEventListener('click',()=>{clearSelection();resetFilters();setLevel(viewLevel?0:1)});
$('nav-find-work').addEventListener('click',findWork);
$('nav-sidebar').addEventListener('click',event=>{const action=event.target.closest('[data-quick]')?.dataset.quick;if(action==='work')findWork();if(action==='history'){closeList();openHistory()}if(action==='rooms'){resetFilters();$('nav-query').focus()}});
document.addEventListener('pointerdown',event=>{if(app.classList.contains('is-list-open')&&!event.target.closest('#nav-sidebar,.nav-search,#nav-list-toggle,#nav-find-work'))closeList()});
$('nav-search-shortcut').textContent=/Mac|iPhone|iPad/.test(navigator.platform)?'⌘ K':'Ctrl K';
initContactForm();window.activateContactMode=(options={})=>{mode='contact';updateAll();openList();if(options.room){const r=$('sidebar-contact-room');if(r)r.value=options.room;}if(options.subject){const s=$('sidebar-contact-subject');if(s)s.value=options.subject;}setTimeout(()=>$('sidebar-contact-name')?.focus(),50);};
updateAll();
async function loadServices(){
 const params=new URLSearchParams(location.search),id=params.has('to')?null:params.get('service');
 if(id){
  mode='services';
  openList();
  updateAll();
 }
 try{
  const response=await fetch('./data/services.json');
  if(!response.ok)throw new Error('Service catalog request failed');
  const catalog=await response.json();
  if(!Array.isArray(catalog))throw new Error('Invalid service catalog');
  services=catalog;
  if(id&&mode==='services'&&!$('nav-query').value.trim()){
   const linked=services.find(service=>service.id===id);
   if(linked)$('nav-query').value=linked.title;
   else toast('Услуга по ссылке не найдена. Можно выбрать другую из списка.');
  }
 }catch{
  servicesFailed=true;
 }
 updateAll();
}
void loadServices();
try{const load=async path=>{const r=await fetch(path);if(!r.ok)throw Error(path);return r.json()};const [geometry,spaces,real]=await Promise.all([load('./data/floor-geometry.json?v=20261106-hover1'),load('./data/floor-spaces.json'),load('./data/directory.json')]);directory=real;campus=applyRoomPlacements(createCampusNavigator(geometry,spaces),directory);
 mapRouting=loadMapClosures(campus,{storage});
 const versionNote=$('nav-map-version');
 versionNote.hidden=!previewRequested;
 versionNote.textContent=mapRouting.error||'Предпросмотр локальной версии карты. Закрытия действуют только здесь.';
 try{const {createNavigatorScene}=await import('./navigator-scene.js?v=20261112-centered-entry');scene=createNavigatorScene({container:$('campus-map'),campus,onSelect:select,onFloor:showMapFloor,onSeatSelect:(spaceId,seatId)=>{if(selected!==spaceId)select(spaceId);bookingOpen=true;const r=pilot();if(!r||slotErrors().length||pilotStatus(r,bookings,slot()).occupied.has(seatId))return;chosen.has(seatId)?chosen.delete(seatId):chosen.add(seatId);renderDetail();$('nav-detail').querySelector(`[data-seat="${seatId}"]`)?.focus({preventScroll:true});},onPreview:state=>{const button=$('nav-route').querySelector('[data-route-play]');if(!button)return;button.setAttribute('aria-pressed',String(state.playing));button.innerHTML=icon('play')+(state.playing?'Приостановить':state.done?'Показать ещё раз':'Показать движение');$('nav-route-progress').value=Math.round(state.progress*1000);$('nav-route-position').textContent=state.done?'Вы у цели':state.connection&&state.floor!==state.toFloor?`${routePreferences().stepFree?'Лифт':'Лестница'} · ${state.floor} → ${state.toFloor}`:`${state.floor||route?.from.floor||1}-й этаж · ${Math.round(state.progress*100)}%`;if(state.playing||state.done)setRouteStep(state.step);},onFailure:switchToPlan});graphicsAvailable=true;$('nav-loading').hidden=true;}catch{switchToPlan();}
 updateAll();
 const link=readNavigationLink(new URL(location.href),defaultOrigin);
 const target=link.target??pilotRoomById(link.roomId)?.spaceId??link.spaceId;
 if(target&&visible.has(target)){
  select(target,{keepUrl:true});
 }else{
  const level=location.hash.match(/^#floor-([1-5])$/);
  setLevel(Number(level?.[1]||0),false);
 }
 const hasOrigin=setOrigin(link.origin);
 if(link.target!==null){
  if(!current()?.point)toast('Помещение по ссылке недоступно для маршрута.');
  else if(hasOrigin)displayRoute();
 }
 if(location.hash==='#bookings')openHistory();
}catch(error){openList();$('nav-loading').textContent='Не удалось загрузить схему. Обнови страницу; учебные брони доступны в списке.';$('nav-loading').classList.add('is-error');toast('Не удалось загрузить планы. Проверь подключение.');updateAll();}
window.addEventListener('pagehide',event=>{if(!event.persisted)scene?.dispose()});
