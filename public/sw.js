// TIMELINER service worker: the whole app works offline after the first visit.
// `npm run build:web` (scripts/precache.js) replaces BUILD with this deploy's version and file list.
const BUILD = { version: 'dev', files: [] };
const CACHE = `timeliner-${BUILD.version}`;

self.addEventListener('install', (event) => {
  // One by one, so a single failure doesn't abort the install.
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => Promise.all(['/', ...BUILD.files].map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  // Drop the previous deploys' caches.
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('timeliner-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // Every route (/settings, /inbox…) is the same single page: network first, cached copy offline.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }

  // Build files are content-hashed: cache first. Anything else: network first, cache as fallback.
  const hashed = url.pathname.startsWith('/_expo/static/') || url.pathname.startsWith('/assets/');
  const save = (res) => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
    }
    return res;
  };
  event.respondWith(
    hashed
      ? caches.match(req).then((hit) => hit || fetch(req).then(save))
      : fetch(req)
          .then(save)
          .catch(() => caches.match(req)),
  );
});
