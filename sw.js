/* Fuse Run service worker.
   RELEASING AN UPDATE: bump the number in version.js, then upload the files. (The browser notices the
   change in version.js too, because it is loaded with importScripts.)
   Players keep playing the version they have; they get a dot on Settings and choose when to install the update.
   Paths are relative to this file, so the game works from any folder or domain. */
importScripts('version.js');
const VERSION = self.FUSE_VERSION;
const CACHE = 'fuse-run-' + VERSION;
const SHELL = [
  './',
  './index.html',
  './style.css',
  './version.js',
  './pwa.js',
  './js/main.js',
  './js/config.js',
  './js/state.js',
  './js/view.js',
  './js/audio.js',
  './js/art.js',
  './js/fx.js',
  './js/ui.js',
  './js/enemies.js',
  './js/level.js',
  './js/game.js',
  './js/render.js',
  './js/menu.js',
  './js/input.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
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
    caches.open(CACHE).then(cache => cache.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }))).catch(() => (req.mode === 'navigate' ? caches.match(new URL('./index.html', self.location).href) : Response.error()))
  );
});
