/* Offline cache. Bump CACHE whenever a file changes, or installed copies keep the old files. */
const CACHE = 'matrix-blackout-v16';
const FILES = ['/', '/app.css', '/app.js', '/config.js', '/themes.js', '/screen', '/screen.css', '/screen.js', '/manifest.json', '/matrix-icon.svg', '/apple-touch-icon.png', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png', '/favicon-32.png', '/favicon.ico', '/build', '/build.css', '/build.js'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== location.origin) return;
  if (e.request.mode === 'navigate') {
    // Pages come fresh when online; offline, the cached copy of that page (or the home screen).
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('/'))));
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  })));
});
