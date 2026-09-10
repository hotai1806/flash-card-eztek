/* eslint-disable no-restricted-globals */
/**
 * Service worker for the web (PWA) build.
 *
 *  - App shell (HTML, JS, CSS, fonts): cached on first use, served from cache
 *    when offline, refreshed in the background ("stale-while-revalidate").
 *  - Navigations: network first, falling back to the cached start page so the
 *    app opens offline.
 *  - Card pictures from the image providers: cached on first load so studying
 *    works offline once a picture has been seen.
 */

const VERSION = 'v1';
const SHELL_CACHE = `shell-${VERSION}`;
const IMAGE_CACHE = `images-${VERSION}`;
const IMAGE_HOSTS = ['image.pollinations.ai', 'loremflickr.com'];
const MAX_IMAGES = 400;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(['/', '/manifest.json']).catch(() => undefined))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== IMAGE_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function trimCache(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= max) return;
  await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone());
      return res;
    })
    .catch(() => undefined);
  return cached || (await network) || Response.error();
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put('/', res.clone());
    return res;
  } catch {
    return (await cache.match(request)) || (await cache.match('/')) || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (IMAGE_HOSTS.includes(url.hostname)) {
    event.respondWith(
      staleWhileRevalidate(request, IMAGE_CACHE).then((res) => {
        trimCache(IMAGE_CACHE, MAX_IMAGES);
        return res;
      })
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
  }
});
