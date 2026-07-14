"use client";

// ⚠️ STAGING ONLY — DO NOT ENABLE IN PRODUCTION.
// This banner lets testers manually apply service-worker updates without
// waiting for the auto-reload cycle. Gate is process.env.NEXT_PUBLIC_APP_ENV === 'staging'.
// In Vercel: set NEXT_PUBLIC_APP_ENV=staging on the staging branch env only.
// Production must NOT have this variable set (or set it to anything other than 'staging').

import { useEffect, useState } from "react";
import { ArrowClockwise } from "@phosphor-icons/react";
import { registerServiceWorker } from "@/lib/push/register-sw";

const IS_STAGING = process.env.NEXT_PUBLIC_APP_ENV === "staging";
const CHECK_INTERVAL_MS = 60_000;

export function UpdatePrompt() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [reloadRequested, setReloadRequested] = useState(false);

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
    // Only reload in response to a controllerchange once the user has
    // actually asked for it. A waiting worker can also get activated by the
    // browser's own lifecycle (e.g. once no other tab holds the old one),
    // which fires this same event with no user action involved - listening
    // unconditionally as soon as a banner is shown meant an unrelated
    // activation could force an unannounced reload.
    if (!reloadRequested) return;

    function handleControllerChange() {
      window.location.reload();
    }

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    return () =>
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
  }, [reloadRequested]);

  if (!waitingWorker || !IS_STAGING) return null;

  function handleReload() {
    setReloadRequested(true);
    waitingWorker?.postMessage("SKIP_WAITING");
  }

  return (
    <div className="flex items-center gap-3 border-b border-primary/20 bg-primary/10 px-4 py-3">
      <ArrowClockwise size={20} weight="fill" className="shrink-0 text-primary" />
      <p className="flex-1 text-sm text-secondary">New version available.</p>
      <button
        type="button"
        onClick={handleReload}
        className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-white shadow-md shadow-primary/30 transition-transform active:scale-95"
      >
        Update
      </button>
    </div>
  );
}
