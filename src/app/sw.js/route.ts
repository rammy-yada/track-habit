export const dynamic = "force-dynamic";

// The service worker is served from here rather than /public so that its text
// contains the build id: a new deploy changes the file, which is how the
// browser knows there is a new worker to install.
export function GET() {
  return new Response(WORKER.replace("__BUILD__", process.env.NEXT_PUBLIC_BUILD_ID ?? "dev"), {
    headers: { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "no-cache, no-store", "Service-Worker-Allowed": "/" },
  });
}

const WORKER = String.raw`// HabitFlow service worker — makes the app usable without a connection.
//
//   • App files (scripts, styles, fonts, icons) are kept on the device.
//   • The main screens are saved each time they load, and served from that
//     copy when the network is unavailable.
//   • Nothing is ever *written* from here: habit ticks made offline wait in a
//     queue in the page (src/lib/offline.ts) and are sent when back online.
//
// A new version installs in the background and waits. It only takes over when
// the page says so ("ACTIVATE"), which happens after pending changes are synced.

const BUILD = "__BUILD__";
const ASSETS = "habitflow-assets-" + BUILD;
const PAGES = "habitflow-pages-" + BUILD;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(ASSETS).then((cache) => cache.addAll([OFFLINE_URL, "/icons/icon-192.png"])));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n.startsWith("habitflow-") && n !== ASSETS && n !== PAGES).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  const message = event.data || {};
  if (message.type === "ACTIVATE") self.skipWaiting();
  if (message.type === "FORGET_PAGES") event.waitUntil(caches.delete(PAGES));
  if (message.type === "SAVE_PAGES") event.waitUntil(savePages(message.pages || []));
});

// A push arrives (possibly while the app is closed): show it.
self.addEventListener("push", (event) => {
  let message = {};
  try { message = event.data ? event.data.json() : {}; } catch (_) {}
  event.waitUntil(
    self.registration.showNotification(message.title || "HabitFlow", {
      body: message.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: message.tag || "habitflow", // a newer one of the same kind replaces the older
      data: { url: message.url || "/dashboard" },
    }),
  );
});

// Tapping a notification brings the app forward (or opens it) on the right screen.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/dashboard", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) if ("focus" in client) return client.navigate(target).then((c) => (c || client).focus());
      return self.clients.openWindow(target);
    }),
  );
});

const isAsset = (url) => url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || /\.(png|svg|ico|woff2?)$/.test(url.pathname);

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;

  // App files never change for a given build: device copy first.
  if (isAsset(url)) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((response) => {
        if (response.ok) { const copy = response.clone(); caches.open(ASSETS).then((cache) => cache.put(request, copy)); }
        return response;
      })),
    );
    return;
  }

  // Full page loads: network first, saved copy if that fails or stalls.
  if (request.mode === "navigate") {
    event.respondWith(pageFromNetwork(request).catch(async () => (await caches.match(pageKey(url))) || (await caches.match(OFFLINE_URL))));
    return;
  }
  // Everything else (in-app data fetches) goes straight to the network. When
  // that fails, Next.js falls back to a full page load, which lands above.
});

const pageKey = (url) => url.origin + url.pathname + url.search;

async function pageFromNetwork(request) {
  const url = new URL(request.url);
  const saved = await caches.match(pageKey(url));
  const network = fetch(request).then((response) => {
    remember(url, response.clone());
    return response;
  });
  if (!saved) return network;
  // with a saved copy to fall back on, don't make a weak connection wait forever
  return Promise.race([network, new Promise((_, reject) => setTimeout(() => reject(new Error("slow")), 5000))]);
}

// Save a page — but only a real, signed-in page, never a redirect to /login or an error.
async function remember(url, response) {
  if (!response.ok || response.redirected || !(response.headers.get("content-type") || "").includes("text/html")) return;
  const cache = await caches.open(PAGES);
  await cache.put(pageKey(url), response);
}

// One screen at a time, with a pause between: each one is a real request to
// the server (and its database), so they must not arrive as a burst.
async function savePages(pages) {
  for (const path of pages) {
    await savePage(path);
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
}

// Fetch a screen in the background and keep it, along with every app file it needs.
async function savePage(path) {
  try {
    const url = new URL(path, self.location.origin);
    const response = await fetch(url, { credentials: "same-origin" });
    if (!response.ok || response.redirected) return;
    const html = await response.clone().text();
    await remember(url, response);
    const assets = caches.open(ASSETS);
    const files = [...new Set(html.match(/\/_next\/static\/[^"'\\\s)<]+/g) || [])];
    await Promise.all(files.map(async (file) => {
      const cache = await assets;
      if (!(await cache.match(file))) await cache.add(file).catch(() => {});
    }));
  } catch (_) {}
}
`;
