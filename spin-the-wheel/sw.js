const CACHE_VERSION = "wheel-spinner-v5-20260708-1";
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;

const APP_SHELL_ASSETS = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/audio-engine.js",
  "/defaults.js",
  "/i18n.js",
  "/share-codec.js",
  "/state-manager.js",
  "/templates.js",
  "/themes.js",
  "/utils.js",
  "/wheel-engine.js",
  "/wheel-library.js",
  "/manifest.json",
  "/favicon.ico",
  "/logo_clb.png",
  "/icon-192.png",
  "/icon-512.png",
  "/og-image.png",
  "/og-image.svg",
  "/sitemap.xml",
  "/CNAME",
  "/lang/en.json",
  "/lang/vi.json",
  "/lang/es.json",
  "/lang/pt.json",
  "/lang/fr.json",
  "/lang/de.json",
  "/lang/ja.json",
  "/lang/ko.json",
  "/lang/zh.json",
  "/lang/id.json"
];

const APP_SHELL_PATHS = new Set(APP_SHELL_ASSETS.map((assetPath) => {
  const assetUrl = new URL(assetPath, self.location.origin);
  return assetUrl.pathname;
}));

function isCacheablePath(pathname) {
  return APP_SHELL_PATHS.has(pathname);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key !== APP_SHELL_CACHE)
        .map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const pathname = url.pathname;
  const isNavigation = request.mode === "navigate";

  // Network-first avoids stale app-shell mismatches after deployments.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200 && response.type === "basic") {
          const responseClone = response.clone();
          caches.open(APP_SHELL_CACHE).then((cache) => {
            if (isNavigation) {
              const navigationCacheKey = isCacheablePath(pathname) ? pathname : "/index.html";
              cache.put(navigationCacheKey, responseClone);
              return;
            }
            if (isCacheablePath(pathname)) {
              cache.put(pathname, responseClone);
            }
          });
        }
        return response;
      })
      .catch(async () => {
        const cache = await caches.open(APP_SHELL_CACHE);
        if (isNavigation) {
          const cachedPage = await cache.match(pathname);
          if (cachedPage) return cachedPage;
          const fallback = await cache.match("/index.html");
          return fallback || Response.error();
        }

        if (!isCacheablePath(pathname)) {
          return Response.error();
        }

        const cached = await cache.match(pathname);
        return cached || Response.error();
      })
  );
});
