// Served dynamically (instead of a static public/sw.js) so the response can
// be stamped with a per-deployment version comment and served with
// cache-busting headers. Most deploys never touch the service worker's own
// logic, so if its bytes stayed identical across deploys the browser's
// update check would never see a change and UpdatePrompt's "new version
// available" banner would never fire - a tab left open across such a
// deploy would then hit a stale JS chunk on its next client-side navigation
// instead of getting a chance to reload gracefully first.
export const dynamic = "force-dynamic";

const BUILD_VERSION = process.env.VERCEL_GIT_COMMIT_SHA ?? String(Date.now());

const SERVICE_WORKER_SOURCE = `
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Men's Group";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: data.url || "/" },
  };

  event.waitUntil(
    (async () => {
      // Only chat/reaction pushes (url: "/chat") represent an unread
      // message - the meeting-reminder push has nothing to do with unread
      // state.
      //
      // The badge is meant to be purely an "app is fully closed" fallback -
      // UnreadIndicatorContext.tsx's own badge-mirroring effect is the real
      // source of truth whenever any window for this app is actually open,
      // since it reflects the genuine seen/unread status (driven by a live
      // Realtime subscription), not just "a push for /chat happened to
      // arrive". Setting the badge here unconditionally raced against
      // that: the server sends a push to every group member regardless of
      // whether they're already connected, and Web Push delivery (through
      // the OS push relay) is often slower than Realtime (a live
      // WebSocket) - so a push can land *after* the user already viewed
      // the message and the open app had already cleared the badge,
      // re-lighting it with no code path left to ever clear it again
      // (chatUnread never changes a second time for a message already
      // marked seen). Checking for *any* open client, not just one
      // focused on /chat, avoids the race entirely rather than just
      // narrowing its window - a backgrounded-but-still-alive tab keeps
      // its Realtime subscription live and will have already handled this
      // correctly; only when no client exists at all (the app is actually
      // closed) does this become the sole source of truth, which is
      // exactly the fallback role it was documented to have.
      // Own try/catch, not left to propagate - a failure here must never
      // take showNotification() below down with it. Falling back to []
      // (same as "nothing is open") also reproduces the old unconditional-
      // set behavior as the fail-safe direction, rather than silently
      // dropping the badge update instead.
      let openClients = [];
      try {
        openClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      } catch {}
      // Rejects (e.g. not installed as a home-screen app) if the badge
      // can't be set - not fatal, so swallow it instead of an unhandled
      // rejection.
      if (openClients.length === 0 && data.url === "/chat" && "setAppBadge" in navigator) {
        await navigator.setAppBadge(1).catch(() => {});
      }
      await self.registration.showNotification(title, options);
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});

// Cache-first for hashed, immutable static assets only - _next/static
// chunks are content-hashed so cache-first can never serve stale content
// for them. Everything else (HTML navigations, API/Supabase calls) is left
// untouched (network-only) since those are auth-gated/dynamic and must
// never be served from a cache.
//
// /icons/*.png filenames are NOT content-hashed, so they're cached under
// this same build-tagged name rather than a fixed one: a stale icon would
// otherwise be cached forever with no way to invalidate it. Tagging the
// cache name with BUILD_VERSION (already used above to force the browser's
// update check on every deploy) means a deploy that changes an icon also
// gets a fresh cache automatically, and the activate handler below cleans
// up the previous deploy's cache instead of letting it accumulate forever.
const STATIC_CACHE = "static-assets-${BUILD_VERSION}";

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("static-assets-") && key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isStaticAsset =
    event.request.method === "GET" &&
    (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/"));
  if (!isStaticAsset) return;

  event.respondWith(
    caches.open(STATIC_CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) cache.put(event.request, response.clone());
      return response;
    })
  );
});
`;

export async function GET() {
  const body = `// build: ${BUILD_VERSION}\n${SERVICE_WORKER_SOURCE}`;
  return new Response(body, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
