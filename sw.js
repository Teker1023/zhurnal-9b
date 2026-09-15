// Кешує журнал на телефоні, щоб він відкривався без інтернету.
// Після зміни файлів журналу збільште номер версії.
const CACHE = 'zhurnal-fk-v2';
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

// Спочатку з кешу (працює офлайн), паралельно тихо оновлюємо з мережі.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const key = e.request.mode === 'navigate' ? './' : e.request;
  const update = caches.open(CACHE).then(c =>
    fetch(e.request).then(r => {
      if (r.ok && !r.redirected) c.put(key, r.clone());
      return r;
    })
  );
  e.respondWith(
    caches.match(key, { ignoreSearch: true }).then(hit => hit || update)
  );
  e.waitUntil(update.catch(() => {}));
});
