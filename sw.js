const CACHE_NAME = 'psycho-power-cache-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/icon.png'
];

// --- Install new version ---
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// --- Activate and clean old cache ---
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  return self.clients.claim();
});

// --- Fetch requests ---
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // ❌ Don’t cache external or large (video) files
  if (url.origin !== location.origin || url.pathname.endsWith('.webm')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(fetched => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, fetched.clone());
          return fetched;
        });
      }).catch(() => caches.match('/index.html'));
    })
  );
});

// --- Update trigger ---
self.addEventListener('message', event => {
  if (event.data === 'checkForUpdate') {
    self.skipWaiting();
  }
});
