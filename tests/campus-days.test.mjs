import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {demoClasses, demoVisits, moscowMinutes, nextClass, officialEvents, programLink, routeLink, selectedVisits, upcomingOfficialEvents, visitItinerary} from '../public/js/campus-days-model.js';
import {createCampusNavigator} from '../public/js/campus-navigation.js';
import {readNavigationLink} from '../public/js/navigation-link.js';
import {pilotRooms} from '../public/js/pilot-spaces.js';

test('official announcements expire at their Moscow start time and have no demo destinations', () => {
  assert.equal(upcomingOfficialEvents(new Date('2026-11-27T13:59:59Z')).some(event => event.id === 'university-november-2026'), true);
  assert.equal(upcomingOfficialEvents(new Date('2026-11-27T14:00:01Z')).some(event => event.id === 'university-november-2026'), false);
  assert.equal(upcomingOfficialEvents(new Date('2026-11-29T00:00:00Z')).length, 0);
  assert.ok(officialEvents.every(event => !('destination' in event) && event.source.startsWith('https://prouniver.ru/news/')));
  assert.match(officialEvents.find(event => event.id === 'university-november-2026').venue, /Большая Морская/);
});

test('next class uses Moscow time, skips cancelled classes and points at the moved room', () => {
  assert.equal(moscowMinutes(new Date('2026-11-12T06:45:00Z')), 9 * 60 + 45);
  const moved = nextClass(demoClasses, new Date('2026-11-12T06:45:00Z'));
  assert.equal(moved.status, 'moved');
  assert.equal(moved.destination, 'f4-s8');
  assert.equal(nextClass(demoClasses, new Date('2026-11-12T09:15:00Z')).id, 'class-3');
  assert.equal(nextClass(demoClasses, new Date('2026-11-12T13:00:00Z')), null);
});

test('public program round-trips selected visits only and never copies private URL data', () => {
  const link = programLink('https://example.test/campus/today.html?private=secret#booking', ['exhibition', 'meeting', 'unknown']);
  assert.equal(link.pathname, '/campus/events.html');
  assert.equal(link.searchParams.get('program'), 'demo-open-day');
  assert.equal(link.searchParams.get('private'), null);
  assert.equal(link.hash, '');
  assert.deepEqual(selectedVisits(link.search), ['meeting', 'exhibition']);
  assert.deepEqual(selectedVisits('?visits='), []);
  assert.deepEqual(selectedVisits('?visits=bad,meeting,meeting'), ['meeting']);
  assert.deepEqual(selectedVisits(''), demoVisits.map(item => item.id));
});

test('each available example destination opens an existing pilot space from the entrance', () => {
  const destinations = new Set(pilotRooms.map(room => room.spaceId));
  for (const item of [...demoClasses, ...demoVisits]) {
    if (!item.destination) continue;
    assert.ok(destinations.has(item.destination), item.destination);
    const link = new URL(routeLink('https://example.test/campus/events.html', item.destination));
    assert.equal(link.pathname, '/campus/index.html');
    assert.deepEqual(readNavigationLink(link, 'start-1'), {origin:'start-1', target:item.destination, roomId:null, spaceId:null});
  }
  assert.equal(demoClasses.find(item => item.status === 'cancelled').destination, undefined);
});

test('selected visits link from the entrance and then from the previous selected stop', () => {
  const base = 'https://example.test/campus/events.html';
  const full = visitItinerary(demoVisits.map(visit => visit.id));
  assert.deepEqual(full.map(stop => stop.route), [
    {origin:'start-1',destination:'f4-s4'},
    {origin:'f4-s4',destination:'f4-s8'},
    {origin:'f4-s8',destination:'f4-s20'},
  ]);
  const partial = visitItinerary(selectedVisits(programLink(base, ['exhibition', 'meeting']).search));
  assert.deepEqual(partial.map(stop => stop.visit.id), ['meeting', 'exhibition']);
  assert.deepEqual(partial[1].route, {origin:'f4-s4',destination:'f4-s20'});
  assert.deepEqual(visitItinerary(['exhibition'])[0].route, {origin:'start-1',destination:'f4-s20'});
  assert.deepEqual(visitItinerary([]), []);

  const read = name => JSON.parse(readFileSync(new URL(`../public/data/${name}.json`, import.meta.url), 'utf8'));
  const campus = createCampusNavigator(read('floor-geometry'), read('floor-spaces'));
  for (const {route:{origin,destination}} of [...full, ...partial]) {
    const link = new URL(routeLink(base, destination, origin));
    const {origin:from,target:to} = readNavigationLink(link, 'start-1');
    assert.equal(from, origin);
    assert.equal(to, destination);
    assert.ok(campus.route(from, to), `${from} → ${to}`);
  }
});

test('itinerary links require matching map placements at both ends', () => {
  const unknown = {...demoVisits[1], room:'446'};
  const mismatched = {...demoVisits[1], destination:demoVisits[2].destination};
  for (const unavailable of [unknown, mismatched]) {
    const [first, middle, last] = visitItinerary(demoVisits.map(visit => visit.id), [demoVisits[0], unavailable, demoVisits[2]]);
    assert.ok(first.route);
    assert.equal(middle.route, null);
    assert.equal(last.route, null);
  }
});
