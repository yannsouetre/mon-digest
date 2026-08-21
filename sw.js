// Mon Digest — service worker v3
// Coquille en cache (hors ligne), digest.json réseau d'abord avec repli cache.
// v3 : notifications locales retirées (Periodic Background Sync décommissionné).
const SHELL = 'mon-digest-shell-v3';
const DATA = 'mon-digest-data-v1';
const SHELL_FILES = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== SHELL && k !== DATA).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // images distantes : laisser le navigateur gérer
  if (url.pathname.endsWith('digest.json')) {
    e.respondWith(
      fetch(e.request).then(r => {
        const copy = r.clone();
        caches.open(DATA).then(c => c.put('digest.json', copy));
        return r;
      }).catch(() => caches.match('digest.json'))
    );
  } else {
    e.respondWith(caches.match(e.request, {ignoreSearch: true}).then(hit => hit || fetch(e.request)));
  }
});
