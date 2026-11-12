import {demoVisits, programLink, routeLink, selectedVisits, upcomingOfficialEvents, visitItinerary} from './campus-days-model.js?v=20261112-polish';

const $ = id => document.getElementById(id);
const official = upcomingOfficialEvents();
const dateFormat = new Intl.DateTimeFormat('ru-RU', {timeZone:'Europe/Moscow', day:'numeric', month:'long', year:'numeric'});
const timeFormat = new Intl.DateTimeFormat('ru-RU', {timeZone:'Europe/Moscow', hour:'2-digit', minute:'2-digit', hourCycle:'h23'});
$('official-event-list').innerHTML = official.length ? official.map(event => `<article class="card"><div class="card-time">${timeFormat.format(new Date(event.startsAt))}<span>Москва</span></div><div class="card-body"><span class="pill">Официальное объявление</span><h3>${event.title}</h3><p>${dateFormat.format(new Date(event.startsAt))} · ${event.venue}<br>${event.note}</p><a class="text-link" href="${event.source}" target="_blank" rel="noopener noreferrer">Объявление и подробности ↗</a>${event.building?`<br><a class="text-link" href="./buildings.html?to=${event.building}">Маршрут до корпуса →</a>`:''} </div></article>`).join('') : '<div class="empty">В проверенных объявлениях ближайших встреч не осталось. <a href="https://prouniver.ru/news/" target="_blank" rel="noopener noreferrer">Новости приёмной комиссии ↗</a></div>';
const params = new URLSearchParams(location.search);
if (params.has('program') && params.get('program') !== 'demo-open-day') {
  $('visit-list').textContent = 'Программа по этой ссылке не найдена. Откройте пример программы заново.';
  document.querySelector('.share-box').hidden = true;
} else {
  const chosen = new Set(selectedVisits(location.search));
  $('visit-list').innerHTML = demoVisits.map(visit => `<article class="card visit" data-visit="${visit.id}"><div class="card-time">${visit.time}<span>пример</span></div><div class="card-body"><div class="card-top"><span class="pill" data-visit-position></span><label class="visit-select"><input type="checkbox" value="${visit.id}" ${chosen.has(visit.id) ? 'checked' : ''}> В программе</label></div><h3>${visit.title}</h3><p>${visit.description}<br>Аудитория ${visit.room} · 4-й этаж</p><div data-visit-route></div></div></article>`).join('');
  const cards = [...$('visit-list').querySelectorAll('[data-visit]')];
  const update = event => {
    const ids = [...$('visit-list').querySelectorAll('input:checked')].map(input => input.value);
    const stops = new Map(visitItinerary(ids).map((stop, index) => [stop.visit.id, {...stop, number:index+1}]));
    for (const card of cards) {
      const stop = stops.get(card.dataset.visit);
      card.querySelector('[data-visit-position]').textContent = stop ? `${stop.number}-я остановка` : 'Вне программы';
      const leg = card.querySelector('[data-visit-route]');
      leg.replaceChildren();
      if (!stop) continue;
      if (!stop.route) {
        leg.textContent = 'Для этого участка нет подтверждённой точки на плане.';
        continue;
      }
      const link = document.createElement('a');
      link.className = 'text-link';
      link.href = routeLink(location.href, stop.route.destination, stop.route.origin);
      link.textContent = stop.previous ? `От аудитории ${stop.previous.room} →` : 'От главного входа →';
      leg.append(link);
    }
    const url = programLink(location.href, ids);
    $('share-link').value = url.href;
    if (event?.type === 'change') history.replaceState(null, '', url);
    $('copy-status').textContent = ids.length ? `Остановок в программе: ${ids.length}` : 'Остановки не выбраны.';
  };
  $('visit-list').addEventListener('change', update);
  $('copy-link').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('share-link').value);
      $('copy-status').textContent = 'Ссылка скопирована.';
    } catch {
      $('share-link').focus();
      $('share-link').select();
      $('copy-status').textContent = 'Выделите и скопируйте ссылку вручную.';
    }
  });
  update();
}
