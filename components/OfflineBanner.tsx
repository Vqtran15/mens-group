"use client";

import { useEffect, useState } from "react";
import { WifiSlash } from "@phosphor-icons/react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    function syncOnlineState() {
      setOffline(!navigator.onLine);
    }
    syncOnlineState();

    function handleOnline() {
      setOffline(false);
    }
    function handleOffline() {
      setOffline(true);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="flex items-center gap-2 border-b border-accent/20 bg-accent/10 px-4 py-2.5 text-sm text-accent">
      <WifiSlash size={18} weight="fill" className="shrink-0" />
      You&apos;re offline — changes won&apos;t save until you&apos;re back online.
    </div>
  );
}
