"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/push/register-sw";

const CHECK_INTERVAL_MS = 60_000;

// Silently applies an app update the moment one is detected - no banner, no
// confirmation. Renders nothing; it's a background effect only. A dropped
// chat draft is the main risk of an unannounced reload, and that's handled
// separately by MessageComposer persisting the in-progress message.
export function AutoUpdater() {
  useEffect(() => {
    let registration: ServiceWorkerRegistration | null = null;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    function applyUpdate(worker: ServiceWorker) {
      worker.postMessage("SKIP_WAITING");
    }

    async function init() {
      registration = await registerServiceWorker();
      if (!registration) return;

      if (registration.waiting && navigator.serviceWorker.controller) {
        applyUpdate(registration.waiting);
      }

      registration.addEventListener("updatefound", () => {
        const newWorker = registration!.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            applyUpdate(newWorker);
          }
        });
      });

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.location.reload();
      });

      // A PWA left open for a long time (esp. launched from a home-screen
      // icon rather than a fresh navigation) may not get the browser's
      // automatic update check for a while, so poll for it explicitly.
      intervalId = setInterval(() => registration?.update(), CHECK_INTERVAL_MS);
    }

    init();

    return () => clearInterval(intervalId);
  }, []);

  return null;
}
