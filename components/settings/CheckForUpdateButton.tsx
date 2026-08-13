"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowClockwise, CheckCircle } from "@phosphor-icons/react";
import { registerServiceWorker } from "@/lib/push/register-sw";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type Status = "idle" | "checking" | "found" | "up-to-date" | "error";

// Forces an immediate update check instead of waiting up to a minute for
// AutoUpdater's own background poll. This button doesn't apply the update
// itself - AutoUpdater (mounted for the whole app) already has its own
// listener on this same service worker registration, so once this triggers
// an updatefound event, AutoUpdater installs it and reloads on its own.
// This just surfaces what happened.
export function CheckForUpdateButton() {
  const [status, setStatus] = useState<Status>("idle");

  async function handleCheck() {
    setStatus("checking");
    const registration = await registerServiceWorker();
    if (!registration) {
      setStatus("error");
      return;
    }

    const found = await new Promise<boolean>((resolve) => {
      let settled = false;
      function onUpdateFound() {
        settled = true;
        resolve(true);
      }
      registration.addEventListener("updatefound", onUpdateFound);
      registration
        .update()
        .catch(() => {})
        .finally(() => {
          // updatefound fires synchronously off the byte-diff this update()
          // check performs, so a short grace window after it settles is
          // enough to know either way.
          setTimeout(() => {
            registration.removeEventListener("updatefound", onUpdateFound);
            if (!settled) resolve(false);
          }, 1000);
        });
    });

    setStatus(found ? "found" : "up-to-date");
    if (!found) {
      setTimeout(() => setStatus("idle"), 2500);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="secondary"
        onClick={handleCheck}
        disabled={status === "checking" || status === "found"}
      >
        <ArrowClockwise size={16} className={cn(status === "checking" && "animate-spin")} />
        {status === "checking" ? "Checking..." : "Check for new version"}
      </Button>
      <AnimatePresence mode="wait">
        {status === "found" && (
          <motion.p
            key="found"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-sm text-teal"
          >
            <CheckCircle size={16} weight="fill" /> Update found, reloading...
          </motion.p>
        )}
        {status === "up-to-date" && (
          <motion.p
            key="up-to-date"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-sm text-secondary"
          >
            You&apos;re on the latest version.
          </motion.p>
        )}
        {status === "error" && (
          <motion.p
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-sm text-accent"
          >
            Couldn&apos;t check for updates.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
