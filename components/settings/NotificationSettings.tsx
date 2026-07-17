"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Bell, WarningCircle } from "@phosphor-icons/react";
import { Switch } from "@/components/ui/Switch";
import { registerServiceWorker } from "@/lib/push/register-sw";
import { subscribeToPush, unsubscribeFromPush } from "@/lib/push/subscribe";

type Status = "loading" | "unsupported" | "denied" | "off" | "on";

export function NotificationSettings() {
  const [status, setStatus] = useState<Status>("loading");
  const [working, setWorking] = useState(false);

  async function refreshStatus() {
    if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    await registerServiceWorker();
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    setStatus(existing ? "on" : "off");
  }

  useEffect(() => {
    function init() {
      refreshStatus();
    }
    init();
  }, []);

  async function handleToggle(next: boolean) {
    setWorking(true);
    if (next) {
      const subscription = await subscribeToPush();
      // requestPermission() resolving to anything but "granted" (including
      // the user dismissing the native prompt) leaves subscription null -
      // re-checking Notification.permission directly distinguishes "they
      // said no" from a generic failure, so the right explanation shows.
      setStatus(subscription ? "on" : Notification.permission === "denied" ? "denied" : "off");
    } else {
      await unsubscribeFromPush();
      setStatus("off");
    }
    setWorking(false);
  }

  if (status === "loading") return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="space-y-3 rounded-2xl border border-border/60 bg-white p-4 shadow-sm"
    >
      <h2 className="font-semibold text-primary">Notifications</h2>

      {status === "unsupported" ? (
        <p className="flex items-start gap-1.5 text-sm text-secondary">
          <WarningCircle size={16} className="mt-0.5 shrink-0" />
          <span>
            Add this app to your home screen to turn on notifications - see the{" "}
            <Link href="/welcome" className="text-primary underline underline-offset-2">
              setup steps
            </Link>
            .
          </span>
        </p>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bell size={18} className="shrink-0 text-secondary" />
            <div>
              <p className="text-sm font-medium text-secondary">Meeting &amp; chat alerts</p>
              {status === "denied" && (
                <p className="text-xs text-muted">
                  Blocked in your browser&apos;s settings for this site.
                </p>
              )}
            </div>
          </div>
          <Switch
            checked={status === "on"}
            onChange={handleToggle}
            disabled={working || status === "denied"}
            ariaLabel="Meeting and chat notifications"
          />
        </div>
      )}
    </motion.section>
  );
}
