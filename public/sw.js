const CACHE = 'central-comercial-v14';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
    )).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // QR, account status, inbox and AI results must never survive in the offline cache.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (!APP_SHELL.includes(url.pathname) && !url.pathname.startsWith('/assets/')) return;
  event.respondWith(
    fetch(event.request).then((response) => {
      const copy = response.clone();
      if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(event.request)),
  );
});
