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
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
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
