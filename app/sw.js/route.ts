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
  // Only chat/reaction pushes (url: "/chat") represent an unread message -
  // the meeting-reminder push has nothing to do with unread state. The app
  // itself clears this the next time it's opened and re-evaluates chatUnread.
  if (data.url === "/chat" && "setAppBadge" in navigator) {
    navigator.setAppBadge(1);
  }
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});

// Cache-first for hashed, immutable static assets only - _next/static
// chunks and /icons are content-hashed so a cache-first strategy can never
// serve stale content for them. Everything else (HTML navigations, API/
// Supabase calls) is left untouched (network-only) since those are
// auth-gated/dynamic and must never be served from a cache.
const STATIC_CACHE = "static-assets-v1";

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
