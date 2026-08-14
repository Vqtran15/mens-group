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
    // Fixed overlay, not a normal-flow flex sibling of <main> - the latter
    // is what was actually causing the "grey rectangle behind the pill"
    // reports: as a normal-flow element, this <nav> claimed its own row
    // below the scrollable area, so the page's own background color always
    // showed through its transparent margins as a solid band, and content
    // could never scroll underneath it no matter how translucent the pill
    // itself was. Fixed positioning overlays it directly on top of <main>
    // (which now pads its bottom by the pill's height - see AppLayout), so
    // scrolled content actually passes behind the translucent/blurred pill,
    // the Instagram-style effect this was always meant to have.
    // pointer-events-none/auto split - the <nav>'s own padding is only a
    // transparent margin for the pill to float in, not part of the pill
    // itself, so it shouldn't intercept taps/scroll meant for the content
    // now sitting underneath it.
    // var(--sab), not env(safe-area-inset-bottom) directly - see
    // ViewportFix/globals.css for why the raw env() value can't be trusted
    // in this app's shell.
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-4 pb-[max(0.75rem,var(--sab,0px))] pt-1">
      {/* More translucent than a typical card (bg-white/60 vs. the usual
          /90-ish) so content keeps showing through as it scrolls underneath -
          the frosted-glass look Instagram's floating nav has - with a
          stronger blur to keep icons/labels legible against whatever's
          moving behind it. shadow-sm (not the larger, primary-tinted shadow
          this had before) - a big diffuse tinted shadow behind a mostly-
          transparent pill just reads as a grey haze hanging between the
          pill and the page, not a natural drop shadow. overflow-hidden is
          load-bearing here, not decorative - without it, some browsers
          don't clip backdrop-blur's own paint area to the rounded-full
          shape, so the blur's rectangular bounding box can show through as
          a visible grey rectangle behind the pill instead of following its
          curve. */}
      <ul className="pointer-events-auto flex overflow-hidden rounded-full border border-border/60 bg-white/60 shadow-sm backdrop-blur-xl">
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
