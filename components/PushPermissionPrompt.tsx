"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "@phosphor-icons/react";
import { registerServiceWorker } from "@/lib/push/register-sw";
import { subscribeToPush } from "@/lib/push/subscribe";

const DISMISSED_KEY = "push-prompt-dismissed";

export function PushPermissionPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function checkShouldPrompt() {
      registerServiceWorker();

      if (
        typeof Notification === "undefined" ||
        Notification.permission !== "default" ||
        localStorage.getItem(DISMISSED_KEY)
      ) {
        return;
      }
      setVisible(true);
    }

    checkShouldPrompt();
  }, []);

  async function handleEnable() {
    await subscribeToPush();
    setVisible(false);
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="flex items-center gap-3 border-b border-border bg-surface-muted px-4 py-3">
      <Bell size={20} className="shrink-0 text-primary" />
      <p className="flex-1 text-sm text-secondary">
        Enable notifications for new chat messages and meeting reminders.
      </p>
      <button
        onClick={handleEnable}
        className="rounded-full bg-primary px-3 py-1 text-sm font-medium text-white"
      >
        Enable
      </button>
      <button onClick={handleDismiss} aria-label="Dismiss" className="text-secondary">
        <X size={18} />
      </button>
    </div>
  );
}
