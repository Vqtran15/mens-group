"use client";

import { useEffect, useState } from "react";
import { ArrowClockwise } from "@phosphor-icons/react";
import { registerServiceWorker } from "@/lib/push/register-sw";

const CHECK_INTERVAL_MS = 60_000;

export function UpdatePrompt() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    let registration: ServiceWorkerRegistration | null = null;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    async function init() {
      registration = await registerServiceWorker();
      if (!registration) return;

      if (registration.waiting && navigator.serviceWorker.controller) {
        setWaitingWorker(registration.waiting);
      }

      registration.addEventListener("updatefound", () => {
        const newWorker = registration!.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker);
          }
        });
      });

      // A PWA left open for a long time (esp. launched from a home-screen
      // icon rather than a fresh navigation) may not get the browser's
      // automatic update check for a while, so poll for it explicitly.
      intervalId = setInterval(() => registration?.update(), CHECK_INTERVAL_MS);
    }

    init();

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!waitingWorker) return;

    let reloaded = false;
    function handleControllerChange() {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    }

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    return () =>
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
  }, [waitingWorker]);

  if (!waitingWorker) return null;

  function handleReload() {
    waitingWorker?.postMessage("SKIP_WAITING");
  }

  return (
    <div className="flex items-center gap-3 border-b border-primary/20 bg-primary/10 px-4 py-3">
      <ArrowClockwise size={20} weight="fill" className="shrink-0 text-primary" />
      <p className="flex-1 text-sm text-secondary">A new version of the app is available.</p>
      <button
        type="button"
        onClick={handleReload}
        className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-white shadow-md shadow-primary/30 transition-transform active:scale-95"
      >
        Reload
      </button>
    </div>
  );
}
