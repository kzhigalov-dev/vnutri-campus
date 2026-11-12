import assert from 'node:assert/strict';
import test from 'node:test';
import {createRouteLink, createServiceLink, createSpaceLink, createStartLink, readNavigationLink} from '../public/js/navigation-link.js';

const base = 'https://example.test/vnutri-campus/index.html?room=old#floor-2';

test('a service card link keeps the project base and drops the previous route state', () => {
  const route = createRouteLink(base, 'start-1', 'f4-s2');
  const service = createServiceLink(route, 'rinpo');
  assert.equal(service.href, 'https://example.test/vnutri-campus/index.html?service=rinpo');
});

test('a shared route keeps the GitHub Pages project path and round-trips both IDs', () => {
  const url = createRouteLink(base, 'start-2', 'floor/П4.08');
  assert.equal(url.pathname, '/vnutri-campus/index.html');
  assert.equal(url.hash, '');
  assert.deepEqual(readNavigationLink(url, 'start-1'), {
    origin: 'start-2', target: 'floor/П4.08', roomId: null, spaceId: null,
  });
});

test('start-only links and old room bookmarks still resolve', () => {
  const url = new URL('?start=start-3&room=pilot-1#space=%D0%9F4.08', base);
  assert.deepEqual(readNavigationLink(url, 'start-1'), {
    origin: 'start-3', target: null, roomId: 'pilot-1', spaceId: 'П4.08',
  });
});

test('a start link is reusable without sharing a destination', () => {
  const route = createRouteLink(base, 'start-1', 'f4-s2');
  const start = createStartLink(route, 'f2-s4');
  assert.equal(start.href, 'https://example.test/vnutri-campus/index.html?start=f2-s4');
  assert.equal(readNavigationLink(start, 'start-1').origin, 'f2-s4');
  assert.equal(readNavigationLink(start, 'start-1').target, null);
});

test('a room link retains the Pages path and shares only the selected room', () => {
  const url = createSpaceLink(createRouteLink(base, 'start-2', 'f4-s2', {stepFree:true,mapPreview:true}), 'П4.08');
  assert.equal(url.pathname, '/vnutri-campus/index.html');
  assert.equal(url.search, '');
  assert.deepEqual(readNavigationLink(url, 'start-1'), {
    origin: 'start-1', target: null, roomId: null, spaceId: 'П4.08',
  });
});

test('invalid explicit route parameters stay distinguishable from absent values', () => {
  const url = new URL('?from=&to=#space=%ZZ', base);
  assert.deepEqual(readNavigationLink(url, 'start-1'), {
    origin: '', target: '', roomId: null, spaceId: null,
  });
});
