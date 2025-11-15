// Service Worker untuk PWA GeoCamera
const CACHE_NAME = 'geocamera-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/index.css',
  '/icon-192.png',
  '/icon-512.png',
];

// Install Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Ambil aset dari cache jika offline
self.addEventListener('fetch', (event) => {
  // Tangani permintaan gambar atau video secara terpisah
  if (event.request.destination === 'image' || event.request.destination === 'video') {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request);
      })
    );
    return;
  }

  // Tangani permintaan selain gambar/video
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return response || networkResponse;
          }

          // Clone response to put in cache
          const responseToCache = networkResponse.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return networkResponse;
        });
      })
      .catch(() => {
        // Jika semua gagal, kembalikan fallback untuk halaman utama
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      })
  );
});

// Update Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});