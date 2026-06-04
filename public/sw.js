const APP_CACHE_NAME = "wovops-shell-v1";
const RUNTIME_CACHE_NAME = "wovops-runtime-v1";

const PRECACHE_URLS = [
  "/",
  "/manifest.webmanifest",
  "/assets/dashboard-concept.png",
  "/icons/wovops-icon-192.png",
  "/icons/wovops-icon-512.png"
];

function isGetRequest(event) {
  return event.request.method === "GET";
}

function isApiRequest(url) {
  return url.pathname.includes("/sync/");
}

function isNavigationRequest(request) {
  return request.mode === "navigate";
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/assets/") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".json") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".gif")
  );
}

async function preCacheShell() {
  const cache = await caches.open(APP_CACHE_NAME);
  await cache.addAll(PRECACHE_URLS.filter(Boolean));
}

async function purgeOldCaches() {
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((key) => key !== APP_CACHE_NAME && key !== RUNTIME_CACHE_NAME)
      .map((key) => caches.delete(key))
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    preCacheShell().then(() => {
      self.skipWaiting();
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    purgeOldCaches().then(() => self.clients.claim())
  );
});

async function networkFirst(event) {
  try {
    const networkResponse = await fetch(event.request);
    const runtimeCache = await caches.open(RUNTIME_CACHE_NAME);
    runtimeCache.put(event.request, networkResponse.clone());
    return networkResponse;
  } catch (_err) {
    const cachedResponse = await caches.match(event.request);
    if (cachedResponse) {
      return cachedResponse;
    }

    if (isNavigationRequest(event.request)) {
      return caches.match("/");
    }

    return new Response("offline", {
      status: 503,
      statusText: "Offline",
      headers: { "content-type": "text/plain; charset=utf-8" }
    });
  }
}

async function staleWhileRevalidate(event) {
  const runtimeCache = await caches.open(RUNTIME_CACHE_NAME);
  const cachedResponse = await caches.match(event.request);

  const responsePromise = fetch(event.request)
    .then((networkResponse) => {
      runtimeCache.put(event.request, networkResponse.clone());
      return networkResponse;
    })
    .catch(() => null);

  return cachedResponse ?? (await responsePromise) ?? (await caches.match("/"));
}

async function cacheFirst(event) {
  const cachedResponse = await caches.match(event.request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(event.request);
    const runtimeCache = await caches.open(RUNTIME_CACHE_NAME);
    runtimeCache.put(event.request, networkResponse.clone());
    return networkResponse;
  } catch {
    return new Response("not-available", {
      status: 404,
      statusText: "Not Found"
    });
  }
}

self.addEventListener("fetch", (event) => {
  if (!isGetRequest(event)) {
    return;
  }

  const url = new URL(event.request.url);
  const useStaticCache = isNavigationRequest(event.request) || isStaticAsset(url);
  const useNetworkFirst = isApiRequest(url);

  if (useNetworkFirst) {
    event.respondWith(networkFirst(event));
    return;
  }

  if (useStaticCache) {
    event.respondWith(staleWhileRevalidate(event));
    return;
  }

  event.respondWith(cacheFirst(event));
});
