// ============================================================
// Hot—Pots Service Worker
// Strategy: Cache-first for static assets, Network-first for API
// ============================================================

const APP_VERSION = "hotpots-v1.0.0";

const STATIC_CACHE  = `${APP_VERSION}-static`;
const DYNAMIC_CACHE = `${APP_VERSION}-dynamic`;
const IMAGE_CACHE   = `${APP_VERSION}-images`;

// Static assets to pre-cache on install
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  // Vite/React build outputs — update these to match your actual build filenames
  // e.g. "/assets/index-XXXXXXXX.js"
  // e.g. "/assets/index-XXXXXXXX.css"
];

// API origins that should NEVER be served from cache
const NETWORK_ONLY_PATTERNS = [
  /supabase\.co\/rest\//,      // Supabase DB queries
  /supabase\.co\/auth\//,      // Supabase Auth
  /supabase\.co\/realtime\//,  // Supabase Realtime (websocket)
  /supabase\.co\/storage\//,   // Supabase Storage uploads
];

// ── INSTALL — pre-cache static shell ─────────────────────────
self.addEventListener("install", (event) => {
  console.log("[SW] Installing", APP_VERSION);
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  // Take over immediately without waiting for old SW to finish
  self.skipWaiting();
});

// ── ACTIVATE — clean up old caches ───────────────────────────
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating", APP_VERSION);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("hotpots-") && key !== STATIC_CACHE
                        && key !== DYNAMIC_CACHE && key !== IMAGE_CACHE)
          .map((key) => {
            console.log("[SW] Deleting old cache:", key);
            return caches.delete(key);
          })
      )
    )
  );
  // Claim all open tabs immediately
  self.clients.claim();
});

// ── FETCH — routing logic ─────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and chrome-extension requests
  if (request.method !== "GET") return;
  if (url.protocol === "chrome-extension:") return;

  // 1. Network-only for Supabase API calls
  if (NETWORK_ONLY_PATTERNS.some((p) => p.test(request.url))) {
    event.respondWith(fetch(request));
    return;
  }

  // 2. Cache-first for images (pottery photos)
  if (request.destination === "image") {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // 3. Cache-first for static assets (JS, CSS, fonts)
  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".woff")
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // 4. Network-first for HTML pages (always try to get fresh shell)
  if (request.destination === "document") {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
    return;
  }

  // 5. Stale-while-revalidate for everything else
  event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
});

// ── Caching strategies ────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return offlineFallback(request);
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || offlineFallback(request);
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached || fetchPromise || offlineFallback(request);
}

// Offline fallback — return cached index.html for navigation requests
async function offlineFallback(request) {
  if (request.destination === "document") {
    const cached = await caches.match("/index.html");
    if (cached) return cached;
  }
  return new Response("Offline — please check your connection.", {
    status: 503,
    headers: { "Content-Type": "text/plain" },
  });
}

// ── MESSAGE — handle SKIP_WAITING from usePWA applyUpdate() ──
// usePWA.js calls: swRegistration.waiting.postMessage({ type: "SKIP_WAITING" })
// Without this listener, the update banner button never triggers a reload.
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ── PUSH NOTIFICATIONS ────────────────────────────────────────
// Triggered by Supabase Edge Function when:
//   - A new raffle round opens
//   - You receive a new message from a match partner
//   - Your match results are ready
//   - A conversation is expiring in 3 days

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Hot—Pots", body: event.data.text(), type: "generic" };
  }

  const { title, body, type, url = "/" } = payload;

  // Icon and badge vary by notification type
  const iconMap = {
    match:   "/icons/notif-match.png",
    message: "/icons/notif-message.png",
    round:   "/icons/notif-round.png",
    expiry:  "/icons/notif-expiry.png",
    generic: "/icons/icon-192.png",
  };

  const options = {
    body,
    icon:  iconMap[type] || "/icons/icon-192.png",
    badge: "/icons/badge-96.png",   // small monochrome icon shown in status bar (Android)
    tag:   `hotpots-${type}`,       // replaces previous notification of same type
    renotify: type === "message",   // re-alert for new messages even if tag matches
    vibrate: [100, 50, 100],
    data: { url },
    actions: getActions(type),
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

function getActions(type) {
  if (type === "message")
    return [{ action: "reply",  title: "Open Chat" }];
  if (type === "match")
    return [{ action: "view",   title: "See Your Match 🏺" }];
  if (type === "round")
    return [{ action: "enter",  title: "Enter Round" }];
  if (type === "expiry")
    return [{ action: "open",   title: "Message Now" }];
  return [];
}

// ── NOTIFICATION CLICK ────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if app is already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.postMessage({ type: "NAVIGATE", url: targetUrl });
          return;
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ── BACKGROUND SYNC ───────────────────────────────────────────
// If a message fails to send (offline), retry when connection returns
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-messages") {
    event.waitUntil(syncPendingMessages());
  }
});

async function syncPendingMessages() {
  // In the real app:
  // 1. Read pending messages from IndexedDB
  // 2. POST each to Supabase
  // 3. Clear from IndexedDB on success
  console.log("[SW] Background sync: retrying pending messages");
}
