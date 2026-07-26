"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpen, CalendarBlank, ChatCircle, Notebook, Wrench } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useUnreadIndicator } from "@/components/UnreadIndicatorContext";
import { useGroupFeatures } from "@/components/GroupFeaturesContext";
import { trackEvent } from "@/lib/analytics";

const ALL_TABS = [
  { href: "/calendar", label: "Calendar", icon: CalendarBlank, feature: null },
  { href: "/topics", label: "Topics", icon: Notebook, feature: null },
  { href: "/chat", label: "Chat", icon: ChatCircle, feature: null },
  { href: "/bible", label: "Bible", icon: BookOpen, feature: "bible" as const },
  { href: "/tools", label: "Tools", icon: Wrench, feature: null },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { chatUnread } = useUnreadIndicator();
  const { bibleEnabled } = useGroupFeatures();

  const tabs = ALL_TABS.filter((t) => t.feature !== "bible" || bibleEnabled);

  const unreadByHref: Record<string, boolean> = {
    "/chat": chatUnread,
  };

  return (
    <nav className="border-t border-border bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm">
      <ul className="flex">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          const unread = unreadByHref[href];
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                onClick={() => { if (!active) trackEvent('tab_view', { tab_name: label.toLowerCase() }) }}
                className="relative flex flex-col items-center gap-1 py-2.5 text-xs font-medium"
              >
                {active && (
                  <motion.div
                    layoutId="bottom-nav-pill"
                    className="absolute inset-x-3 inset-y-1 rounded-xl bg-primary/10"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <span
                  className={cn(
                    "relative z-10 flex flex-col items-center gap-1",
                    active ? "text-primary" : "text-secondary"
                  )}
                >
                  <motion.span
                    key={active ? "active" : "inactive"}
                    initial={active ? { scale: 0.6 } : false}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    className="relative"
                  >
                    <Icon size={24} weight={active ? "fill" : "regular"} />
                    {unread && (
                      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent ring-2 ring-white" />
                    )}
                  </motion.span>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
