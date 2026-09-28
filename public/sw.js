/* car-log service worker: offline shell, cached pages for offline viewing, and push notifications. */
const VERSION = "v1";
const SHELL_CACHE = `carlog-shell-${VERSION}`;
const PAGE_CACHE = "carlog-pages";
const STATIC_CACHE = "carlog-static";
const SHELL_URLS = ["/offline", "/icons/icon-192.png", "/icons/badge-96.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  const keep = new Set([SHELL_CACHE, PAGE_CACHE, STATIC_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isRscRequest(request, url) {
  return request.headers.get("RSC") === "1" || url.searchParams.has("_rsc");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || isRscRequest(request, url)) return;

  // Content-hashed build assets never change: cache-first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      }),
    );
    return;
  }

  // Pages: always try the network (fresh data), keep a copy for offline viewing.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PAGE_CACHE);
        try {
          const res = await fetch(request);
          if (res.ok && !res.redirected && res.type === "basic") cache.put(request, res.clone());
          return res;
        } catch {
          return (await cache.match(request)) || (await caches.match("/offline"));
        }
      })(),
    );
  }
});

// In-app navigations fetch RSC payloads, which we don't cache. The page tells us which URL it is
// showing and we store the full document, so the same screen can be opened offline later.
async function cachePage(path) {
  const url = new URL(path, self.location.origin);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  const res = await fetch(url.href, { credentials: "same-origin", headers: { Accept: "text/html" } });
  if (res.ok && !res.redirected && res.type === "basic") {
    const cache = await caches.open(PAGE_CACHE);
    await cache.put(new Request(url.href), res);
  }
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "CLEAR_USER_CACHE") {
    event.waitUntil(caches.delete(PAGE_CACHE));
  }
  if (event.data?.type === "CACHE_PAGE" && typeof event.data.url === "string") {
    event.waitUntil(cachePage(event.data.url).catch(() => {}));
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "car-log", body: event.data?.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "car-log", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: data.tag,
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(target);
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
