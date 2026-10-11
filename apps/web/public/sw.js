/* Build 045: deliberately tiny static-shell service worker.
 * Never persist an authenticated page, API response, stream, command, media or private data.
 * No background sync, push, offline action queue, or broad dynamic route caching.
 */
const CACHE_VERSION = "rosevear-pwa-static-v045";
const OFFLINE_URL = "/offline.html";
const SAFE_PRECACHE = [OFFLINE_URL, "/manifest.webmanifest", "/icons/rosevear-192.png", "/icons/rosevear-512.png"];

function isSafeStaticAsset(url) {
  return /^\/assets\/[a-zA-Z0-9_.-]+\.(js|css|woff2?|png|svg)$/.test(url.pathname);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(SAFE_PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith("rosevear-pwa-static-") && key !== CACHE_VERSION)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Explicitly never intercept API, accounts, camera endpoints, websocket upgrades or private uploads.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/ws/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request, { cache: "no-store" }).catch(async () => {
        const cached = await caches.match(OFFLINE_URL);
        return cached || Response.error();
      }),
    );
    return;
  }

  if (!isSafeStaticAsset(url)) return;
  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      // Only same-origin public static build outputs, never user-specific content.
      if (response.ok && response.type === "basic") await cache.put(request, response.clone());
      return response;
    }),
  );
});
