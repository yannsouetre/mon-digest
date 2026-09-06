// Mon Digest — service worker v10
// Coquille en cache (hors ligne), digest.json réseau d'abord avec repli cache.
// v3 : notifications locales retirées (Periodic Background Sync décommissionné).
// v4 : bascule du cache de coquille.
// v5 : bascule du cache (réparation des adresses réécrites par Gmail dans index.html).
// v6 : bascule du cache (réparation des textes et des libellés de rubrique).
// v7 : bascule du cache (aucun lien affiché dans les textes, plus de débordement).
// v8 : bascule du cache (bouton « Hier » : digest de la veille, cache séparé).
// v9 : bascule du cache (entête allégée : raccourcis sans numéro, heure d'exécution
//      renvoyée au journal de bas de page ; alerte « breaking news » en tête de titre).
// v10 : bascule du cache (réparation des redirections Gmail réécrite avec l'API URL, pour
//       ne plus laisser de motif de redirection en clair — faux positif Windows Defender).
//
// RÈGLE À NE JAMAIS OUBLIER : la coquille (index.html compris) est servie CACHE D'ABORD.
// Tant que ce fichier-ci n'est pas modifié, le navigateur ne réinstalle pas le service
// worker et continue de servir l'ANCIEN index.html, même s'il a été mis à jour sur GitHub.
// => Toute modification d'index.html impose d'incrémenter le numéro de SHELL ci-dessous.
const SHELL = 'mon-digest-shell-v10';
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
  if (url.pathname.endsWith('digest.json') || url.pathname.endsWith('digest-veille.json')) {
    // Chaque fichier a sa propre entrée de cache : hors ligne, « Hier » ne doit
    // jamais servir le digest du jour à la place de celui de la veille.
    const cle = url.pathname.endsWith('digest-veille.json') ? 'digest-veille.json' : 'digest.json';
    e.respondWith(
      fetch(e.request).then(r => {
        const copy = r.clone();
        caches.open(DATA).then(c => c.put(cle, copy));
        return r;
      }).catch(() => caches.match(cle))
    );
  } else {
    e.respondWith(caches.match(e.request, {ignoreSearch: true}).then(hit => hit || fetch(e.request)));
  }
});
