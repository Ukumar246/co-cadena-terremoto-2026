/* Service worker de "Cadena Terremoto Colombia".
 *
 * Prioridades, en orden:
 *  1. Que la app abra aunque no haya señal (shell cacheado).
 *  2. Que el mapa se vea aunque la red esté saturada (teselas cacheadas).
 *  3. Que los datos de solicitudes NUNCA se sirvan viejos sin avisar
 *     — mandar a alguien a una dirección ya resuelta cuesta tiempo real.
 */

const VERSION = "v1";
const SHELL_CACHE = `shell-${VERSION}`;
const TILE_CACHE = `tiles-${VERSION}`;
const MAX_TILES = 400;

const SHELL_ASSETS = ["/", "/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // `reload` evita quedarnos con una copia HTTP vieja del navegador.
      .then((cache) =>
        cache.addAll(SHELL_ASSETS.map((url) => new Request(url, { cache: "reload" }))),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.endsWith(VERSION))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isTileRequest(url) {
  return (
    url.hostname.includes("openfreemap.org") ||
    url.hostname.includes("maptiler.com") ||
    url.hostname.includes("basemaps.cartocdn.com") ||
    /\/tiles?\//.test(url.pathname)
  );
}

function isSupabaseRequest(url) {
  return url.hostname.endsWith(".supabase.co");
}

/** Cache con tope: al pasarse, tira las entradas más viejas. */
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((k) => cache.delete(k)));
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response.ok || response.type === "opaque") {
        cache.put(request, response.clone());
        trimCache(cacheName, MAX_TILES);
      }
      return response;
    })
    .catch(() => null);

  return cached ?? (await network) ?? Response.error();
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error("offline");
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Los datos de solicitudes van siempre a la red. Sin fallback silencioso:
  // preferimos que la interfaz muestre "sin conexión" a mostrar datos viejos
  // como si fueran de ahora.
  if (isSupabaseRequest(url)) return;

  if (isTileRequest(url)) {
    event.respondWith(staleWhileRevalidate(request, TILE_CACHE));
    return;
  }

  // Navegación: red primero, y si no hay, lo último que se vio.
  if (request.mode === "navigate") {
    event.respondWith(
      networkFirst(request, SHELL_CACHE).catch(async () => {
        const cache = await caches.open(SHELL_CACHE);
        return (
          (await cache.match(request)) ??
          (await cache.match("/offline")) ??
          (await cache.match("/")) ??
          Response.error()
        );
      }),
    );
    return;
  }

  // Estáticos de Next (hasheados, inmutables): caché primero.
  if (url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(SHELL_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
  }
});
