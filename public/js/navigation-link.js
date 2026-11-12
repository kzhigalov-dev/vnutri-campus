export function readNavigationLink(url, defaultOrigin) {
  const {searchParams, hash} = url;
  const origin = searchParams.get('from') ?? searchParams.get('start') ?? defaultOrigin;
  const roomId = searchParams.get('room');
  const target = searchParams.get('to');
  const spaceHash = hash.match(/^#space=(.+)$/)?.[1];
  let spaceId = null;
  if (spaceHash) {
    try {
      spaceId = decodeURIComponent(spaceHash);
    } catch {
      // A malformed bookmark should still leave the campus map usable.
    }
  }
  return {origin, target, roomId, spaceId};
}

export function writeRoutePreferences(url, {stepFree = false, mapPreview = false} = {}) {
  if (stepFree) url.searchParams.set('access', 'step-free');
  else url.searchParams.delete('access');
  if (mapPreview) url.searchParams.set('map', 'preview');
  else url.searchParams.delete('map');
  return url;
}

export function createRouteLink(base, from, to, preferences) {
  const url = new URL('./index.html', base);
  url.searchParams.set('from', from);
  url.searchParams.set('to', to);
  return writeRoutePreferences(url, preferences);
}

export function createServiceLink(base, serviceId) {
  const url = new URL('./index.html', base);
  url.searchParams.set('service', serviceId);
  return url;
}

export function createSpaceLink(base, spaceId) {
  const url = new URL('./index.html', base);
  url.hash = 'space=' + encodeURIComponent(spaceId);
  return url;
}

export function createStartLink(base, start) {
  const url = new URL('./index.html', base);
  url.searchParams.set('start', start);
  return url;
}
