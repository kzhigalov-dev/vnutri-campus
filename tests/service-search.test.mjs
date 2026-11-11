import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { searchServices } from '../public/js/service-search.js';
import { roomPlacements } from '../public/js/room-placements.js';

const services = [
  { id: 'study', title: 'Справка об обучении', aliases: ['справку об обучении', 'подтверждение учёбы'] },
  { id: 'scholarship', title: 'Справка о стипендии', aliases: ['справку о стипендии'] },
  { id: 'ticket', title: 'Студенческий билет', aliases: ['студенческий', 'студбилет'], description: 'Можно получить справку.' },
  { id: 'library', title: 'Библиотека', aliases: ['читальный зал'] },
];
const ids = query => searchServices(query, services).map(service => service.id);

test('normalizes Russian case, ё, punctuation and word prefixes', () => {
  assert.deepEqual(ids(' ПОДТВЕРЖДЕНИЕ   УЧЕБЫ '), ['study']);
  assert.deepEqual(ids('СПРАВКА ОБ ОБУЧ'), ['study']);
  assert.deepEqual(ids('читальный-зал'), ['library']);
  assert.deepEqual(ids('студен'), ['ticket']);
  assert.deepEqual(ids('уден'), []);
});

test('recognizes explicit multiword phrases in conversational queries', () => {
  assert.deepEqual(ids('Где мне получить справку об обучении?'), ['study']);
  assert.deepEqual(ids('Подскажите, где читальный зал находится'), ['library']);
  assert.deepEqual(ids('где найти зал ожидания'), []);
});

test('keeps ambiguous choices and ranks the exact service first', () => {
  assert.deepEqual(ids('справка'), ['study', 'scholarship']);
  assert.deepEqual(ids('справка о стипендии'), ['scholarship']);
  assert.deepEqual(searchServices('студенческий', services), [services[2]]);
  assert.equal(searchServices('студенческий', services)[0], services[2]);
});

test('does not turn room numbers, empty input or unrelated text into services', () => {
  for (const query of ['', ' ', '№ 462', '462', 'несуществующая услуга', 'а']) {
    assert.deepEqual(ids(query), []);
  }
  assert.deepEqual(searchServices('справка', null), []);
  assert.deepEqual(searchServices('справка', [{ title: 'Иная услуга', description: 'справка' }]), []);
});

test('a service appears once even if several of its names match', () => {
  assert.deepEqual(searchServices('справ', [{ id: 1, title: 'Справка', aliases: ['справки', 'справка'] }]).map(x => x.id), [1]);
});

test('published service catalog answers the pilot queries without inferring rooms', () => {
  const catalog = JSON.parse(readFileSync(new URL('../public/data/services.json', import.meta.url), 'utf8'));
  const cases = [
    ['где получить справку об обучении', 'student-certificate', undefined],
    ['где библиотека', 'library', undefined],
    ['где находится РИНПО', 'rinpo', '415'],
  ];
  for (const [query, id, roomNumber] of cases) {
    const [match] = searchServices(query, catalog);
    assert.equal(match?.id, id);
    assert.equal(match.roomNumber, roomNumber);
    assert.equal(new URL(match.sourceUrl).hostname, 'sutd.ru');
  }
  assert.deepEqual(searchServices('ауд. № 462', catalog), []);
  for (const service of catalog.filter(item => item.roomNumber)) {
    assert.ok(roomPlacements.some(room => room.number === service.roomNumber && room.confidence === 'exact'));
  }
});
