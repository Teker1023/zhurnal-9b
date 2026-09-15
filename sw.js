// Кешує журнал на телефоні, щоб він відкривався без інтернету.
// Після зміни файлів журналу збільште номер версії.
const CACHE = 'zhurnal-fk-v9';
const FILES = ['./', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Сторінка журналу: спершу мережа (щоб оновлення з'являлись одразу),
// але не довше 3 секунд — далі береться збережена копія. Решта файлів — з кешу.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  if (e.request.mode === 'navigate') {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const net = fetch(e.request).then(r => {
        if (r.ok && !r.redirected) cache.put('./', r.clone());
        return r;
      });
      const timeout = new Promise(res => setTimeout(res, 3000));
      try {
        const r = await Promise.race([net, timeout]);
        if (r) return r;
      } catch (err) {}
      e.waitUntil(net.catch(() => {}));
      return (await cache.match('./')) || net;
    })());
    return;
  }

  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(r => {
      if (r.ok) caches.open(CACHE).then(c => c.put(e.request, r.clone()));
      return r;
    }))
  );
});
