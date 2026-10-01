// HabitFlow service worker — deliberately tiny.
//
// Habits live in the database, so pages are always fetched fresh from the
// network and nothing private is ever cached. The only job here is to show a
// friendly page instead of the browser's error screen when you're offline.

const CACHE = "habitflow-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll([OFFLINE_URL, "/icons/icon-192.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return; // everything else: untouched
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
});
