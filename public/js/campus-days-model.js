import {createRouteLink} from './navigation-link.js?v=20261112-polish';
import {mappedBuildingRoom} from './campus-buildings.js?v=20261112-polish';

// Verified against the admissions office announcements, 12 November 2026.
// Times carry an explicit Moscow offset; these records are not automatically synced.
export const officialEvents = [
  {id:'ktmu-november-2026', title:'День открытых дверей КТМУ', startsAt:'2026-11-25T17:00:00+03:00', venue:'Адрес уточните в объявлении организатора', note:'Регистрация по ссылке в объявлении.', source:'https://prouniver.ru/news/1282-dod-spo-11-26/'},
  {id:'university-november-2026', title:'День открытых дверей СПбГУПТД', startsAt:'2026-11-27T17:00:00+03:00', building:'morskaya', venue:'Санкт-Петербург, Большая Морская ул., 18', note:'Вход свободный.', source:'https://prouniver.ru/news/1239-dod/'},
  {id:'isho-november-2026', title:'День открытых дверей ИШО', startsAt:'2026-11-28T16:00:00+03:00', venue:'Адрес уточните в объявлении организатора', note:'Регистрация по ссылке в объявлении.', source:'https://prouniver.ru/news/1282-dod-spo-11-26/'},
];
export const upcomingOfficialEvents = (now = new Date()) => officialEvents.filter(event => new Date(event.startsAt) >= now);

// These are illustrations, not a feed from the university.
export const demoClasses = [
  {id:'class-1', title:'Проектная практика', start:'10:00', end:'11:30', status:'moved', building:'voznesensky', room:'462', previousRoom:'459', destination:'f4-s8'},
  {id:'class-2', title:'История дизайна', start:'12:00', end:'13:30', status:'cancelled', building:'voznesensky', room:'452'},
  {id:'class-3', title:'Работа в мастерской', start:'14:00', end:'15:30', status:'scheduled', building:'voznesensky', room:'484', destination:'f4-s20'},
];

export const demoVisits = [
  {id:'meeting', time:'10:00', title:'Встреча участников', description:'Знакомство с программой и началом прогулки.', room:'459', destination:'f4-s4'},
  {id:'workshop', time:'11:00', title:'Знакомство с мастерской', description:'Пример остановки на маршруте по корпусу.', room:'462', destination:'f4-s8'},
  {id:'exhibition', time:'12:00', title:'Студенческие работы', description:'Пример выставочной остановки.', room:'484', destination:'f4-s20'},
];

export function moscowMinutes(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/Moscow', hour:'2-digit', minute:'2-digit', hourCycle:'h23'}).formatToParts(now);
  return Number(parts.find(part => part.type === 'hour').value) * 60 + Number(parts.find(part => part.type === 'minute').value);
}
const minutes = value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
export function nextClass(classes, now = new Date()) {
  const current = moscowMinutes(now);
  return classes.filter(item => item.status !== 'cancelled' && minutes(item.end) > current).sort((a, b) => minutes(a.start) - minutes(b.start))[0] || null;
}
export function selectedVisits(search) {
  const params = new URLSearchParams(search);
  if (!params.has('visits')) return demoVisits.map(visit => visit.id);
  const selected = new Set((params.get('visits') || '').split(','));
  return demoVisits.filter(visit => selected.has(visit.id)).map(visit => visit.id);
}
export function programLink(base, ids) {
  const url = new URL('./events.html', base);
  url.searchParams.set('program', 'demo-open-day');
  const selected = new Set(ids);
  url.searchParams.set('visits', demoVisits.filter(visit => selected.has(visit.id)).map(visit => visit.id).join(','));
  return url;
}
export function visitItinerary(ids, visits = demoVisits) {
  const selected = new Set(ids);
  const stops = visits.filter(visit => selected.has(visit.id));
  return stops.map((visit, index) => {
    const previous = stops[index - 1] ?? null;
    const origin = previous ? visitDestination(previous) : 'start-1';
    const destination = visitDestination(visit);
    return {visit, previous, route:origin && destination ? {origin, destination} : null};
  });
}
function visitDestination(visit) {
  const room = mappedBuildingRoom('voznesensky', visit.room);
  return room && room.spaceId === visit.destination ? room.spaceId : null;
}
export const routeLink = (base, destination, origin = 'start-1') => createRouteLink(base, origin, destination).href;
