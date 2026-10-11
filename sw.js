/* Fuse Run service worker.
   RELEASING AN UPDATE: bump VERSION here AND in game.js, then upload the files.
   Players keep playing the version they have; they get a dot on Settings and choose when to install the update. */
const VERSION = '1.2.3';
const CACHE = 'fuse-run-' + VERSION;
const SHELL = [
  '/Fuse-Run/',
  '/Fuse-Run/index.html',
  '/Fuse-Run/style.css',
  '/Fuse-Run/game.js',
  '/Fuse-Run/pwa.js',
  '/Fuse-Run/manifest.webmanifest',
  '/Fuse-Run/icons/icon-192.png',
  '/Fuse-Run/icons/icon-512.png',
  '/Fuse-Run/icons/icon-maskable-512.png',
  '/Fuse-Run/icons/apple-touch-icon.png'
];

// Install: download the whole game into a version-named cache (bypassing the browser's HTTP cache).
// No skipWaiting() here, so a new version never replaces the old one in the middle of a game.
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))));
});

// Activate: remove caches from older versions.
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('fuse-run-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// The page asks for the switch when the player taps "Update ready".
self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

// Fetch: cache first (instant start, works offline), falling back to the network.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    })).catch(() => (req.mode === 'navigate' ? caches.match('/Fuse-Run/index.html') : Response.error()))
  );
});
