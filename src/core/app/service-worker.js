const CACHE = 'code-atlas-app-__ATLAS_VERSION__';
const SHELL = [];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const old = (await caches.keys()).filter(
        (key) => key.startsWith('code-atlas-app-') && key !== CACHE,
      );
      await Promise.all(old.slice(0, -1).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});
self.addEventListener('message', (event) => {
  if (event.data?.type === 'ACTIVATE_UPDATE') void self.skipWaiting();
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  const supported =
    request.mode === 'navigate' ||
    ['/assets/', '/runtime/', '/icons/', '/fonts/'].some((prefix) =>
      url.pathname.startsWith(prefix),
    ) ||
    url.pathname === '/manifest.webmanifest';
  if (!supported) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request, { ignoreVary: true });
      if (cached && ['/assets/', '/fonts/'].some((prefix) => url.pathname.startsWith(prefix)))
        return cached;
      try {
        const response = await fetch(request);
        if (response.ok && response.type === 'basic') await cache.put(request, response.clone());
        return response;
      } catch {
        if (cached) return cached;
        if (request.mode === 'navigate') {
          const shell = await cache.match('/', { ignoreVary: true });
          if (shell) return shell;
        }
        return new Response(
          'This tool has not been cached yet. Reconnect and open it once to make it available offline.',
          { status: 503, headers: { 'Content-Type': 'text/plain' } },
        );
      }
    })(),
  );
});
