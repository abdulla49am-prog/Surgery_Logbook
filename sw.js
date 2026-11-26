/* Surgical Logbook — service worker.
 * Caches the app shell so the app opens fully offline after the first visit.
 * Bump APP_VERSION (here AND in index.html) on every deployment: the cache
 * name changes, the new shell is downloaded, and old caches are deleted.
 */
'use strict';

const APP_VERSION = '1.1.0';
const CACHE_PREFIX = 'surgical-logbook-';
const CACHE_NAME = CACHE_PREFIX + 'v' + APP_VERSION;

// Relative paths: they resolve against this file's location, so the app works
// from any subdirectory (e.g. https://user.github.io/surgical-logbook/).
const SHELL = [
  './',
  'index.html',
  'manifest.json',
  'storage-worker.js',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'apple-touch-icon.png',
  'og-image.png',
  'about-abdullah.jpg',
  'about-mohammedanis.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    // Always answer navigations with the cached shell, so the app opens offline.
    event.respondWith(
      caches.match(new URL('index.html', self.registration.scope).href)
        .then((cached) => cached || fetch(request))
        .catch(() => caches.match('./'))
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true })
      .then((cached) => cached || fetch(request))
  );
});
