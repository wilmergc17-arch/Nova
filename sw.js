// Service worker de Nova: guarda la app en el dispositivo para que abra sin internet.
// El cerebro (modelo) lo guarda aparte el motor de IA, en el almacenamiento privado.
const CACHE = 'nova-app-v1.5.0';
const SHELL = [
  './', 'index.html', 'styles.css', 'app.js', 'memory.js', 'brain.js', 'sources.js', 'conocimiento.js',
  'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
  'vendor/wllama/index.js', 'vendor/wllama/wllama.wasm',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Añade cabeceras que permiten usar varios núcleos del procesador (más rápido).
function isolate(res) {
  if (!res || res.status === 0 || res.type === 'opaque') return res;
  const h = new Headers(res.headers);
  h.set('Cross-Origin-Embedder-Policy', 'credentialless');
  h.set('Cross-Origin-Opener-Policy', 'same-origin');
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(e.request, { ignoreSearch: true });
    if (cached) {
      // Actualiza en segundo plano si hay internet.
      if (!url.pathname.includes('/vendor/')) fetch(e.request).then(r => { if (r.ok) cache.put(e.request, r.clone()); }).catch(() => {});
      return isolate(cached);
    }
    try {
      const r = await fetch(e.request);
      if (r.ok) cache.put(e.request, r.clone());
      return isolate(r);
    } catch {
      const fallback = await cache.match('index.html');
      return fallback ? isolate(fallback) : Response.error();
    }
  })());
});
