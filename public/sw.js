const CACHE_NAME = 'sanjeevani-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
  // Add links to your CSS/JS files here if needed
];

// Install the service worker and cache files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Files cached for offline medical access');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch files from cache when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});