"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { CalendarBlank, Notebook, ChatCircle, Wrench } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useUnreadIndicator } from "@/components/UnreadIndicatorContext";
import { trackEvent } from "@/lib/analytics";

const TABS = [
  { href: "/calendar", label: "Calendar", icon: CalendarBlank },
  { href: "/topics", label: "Topics", icon: Notebook },
  { href: "/chat", label: "Chat", icon: ChatCircle },
  { href: "/tools", label: "Tools", icon: Wrench },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { chatUnread } = useUnreadIndicator();

  const unreadByHref: Record<string, boolean> = {
    "/chat": chatUnread,
  };

  return (
    // Floating pill instead of a flush full-width bar (Instagram/Facebook/
    // GroupMe-style) - the outer <nav> only provides the margin that lets
    // the pill float above the bottom edge; the bg/border/shadow/rounding
    // all live on the <ul> itself, which is the actual pill.
    <nav className="px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1">
      {/* More translucent than a typical card (bg-white/60 vs. the usual
          /90-ish) so content keeps showing through as it scrolls underneath -
          the frosted-glass look Instagram's floating nav has - with a
          stronger blur to keep icons/labels legible against whatever's
          moving behind it. shadow-sm (not the larger, primary-tinted shadow
          this had before) - a big diffuse tinted shadow behind a mostly-
          transparent pill just reads as a grey haze hanging between the
          pill and the page, not a natural drop shadow. */}
      <ul className="flex rounded-full border border-border/60 bg-white/60 shadow-sm backdrop-blur-xl">
        {TABS.map(({ href, label, icon: Icon }) => {
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
                    className="absolute inset-x-2 inset-y-1 rounded-full bg-primary/10"
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
