"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { ClockCounterClockwise, MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentMembership } from "@/lib/supabase/current-membership";
import { BottomNav } from "@/components/BottomNav";
import { BackButton } from "@/components/ui/BackButton";
import { SettingsLink } from "@/components/SettingsLink";
import { PushPermissionPrompt } from "@/components/PushPermissionPrompt";
import { AutoUpdater } from "@/components/AutoUpdater";
import { OfflineBanner } from "@/components/OfflineBanner";
import { TopicsSearchProvider, useTopicsSearch } from "@/components/topics/TopicsSearchContext";
import { TopicsAddMenu } from "@/components/topics/TopicsAddMenu";
import { UnreadIndicatorProvider } from "@/components/UnreadIndicatorContext";

const SECTION_TITLES: { prefix: string; title: string }[] = [
  { prefix: "/calendar", title: "Calendar" },
  { prefix: "/topics", title: "Topics" },
  { prefix: "/chat", title: "Chat" },
  { prefix: "/tools", title: "Tools" },
  { prefix: "/settings", title: "Settings" },
];

// Only the tab-root routes get a header "add" shortcut - sub-pages like
// /calendar/new or /topics/[id] already are the add/detail flow. Topics
// isn't listed here - it gets a small menu (New Topic/New Draft/Drafts)
// via TopicsAddMenu instead of a single direct link.
const ADD_ACTIONS: { path: string; href: string; label: string }[] = [
  { path: "/calendar", href: "/calendar/new", label: "Add event" },
  { path: "/tools/resources", href: "/tools/resources/new", label: "Add resource" },
  { path: "/tools/polls", href: "/tools/polls/new", label: "New poll" },
];

const MotionLink = motion.create(Link);

// Matches BottomNav's left-to-right tab order, so switching tabs slides the
// incoming page in from whichever side it actually sits on (like a segmented
// control or Android's ViewPager), rather than every tab switch defaulting
// to the same direction. Not exported from BottomNav itself - this is the
// only other place tab order matters, and duplicating four route strings is
// simpler than threading a shared export through for it.
const TAB_HREFS = ["/calendar", "/topics", "/chat", "/tools"];

// Functions of `custom`, not static objects computed from a closed-over
// `direction` - AnimatePresence re-broadcasts a fresh `custom` value to
// already-exiting children (see the `custom` prop below), but only variant
// functions actually re-read it. A plain object would freeze the *outgoing*
// page's exit direction at whatever it was when that page itself entered,
// which is the previous transition's direction, not the current one.
const slideVariants = {
  enter: (direction: number) => ({ x: direction >= 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction >= 0 ? -48 : 48, opacity: 0 }),
};

function TopicsSearchToggle() {
  const { open, setOpen } = useTopicsSearch();
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      aria-label="Search topics"
      className="rounded-full p-2 text-secondary transition-colors hover:bg-surface-muted hover:text-primary"
    >
      <MagnifyingGlass size={20} />
    </button>
  );
}

function AppHeader() {
  const pathname = usePathname();
  const title =
    SECTION_TITLES.find((section) => pathname.startsWith(section.prefix))?.title ?? "Men's Group";
  const addAction = ADD_ACTIONS.find((action) => action.path === pathname);

  return (
    <header className="flex items-center justify-between bg-background px-4 py-3">
      <div className="flex items-center gap-2">
        {/* Chat hides BottomNav (see below) to give the pill composer room,
            so it's the one tab-root screen with no other way back to the
            rest of the app - needs its own exit. */}
        {pathname === "/chat" && <BackButton href="/calendar" />}
        <span className="text-2xl font-extrabold tracking-tight text-primary">{title}</span>
      </div>
      <div className="flex items-center gap-1">
        {pathname === "/topics" && <TopicsSearchToggle />}
        {pathname === "/topics" && <TopicsAddMenu />}
        {pathname === "/calendar" && (
          <MotionLink
            href="/calendar/past"
            aria-label="Past events"
            whileTap={{ scale: 0.85 }}
            transition={{ duration: 0.15 }}
            className="rounded-full p-2 text-secondary transition-colors hover:bg-surface-muted hover:text-primary"
          >
            <ClockCounterClockwise size={22} />
          </MotionLink>
        )}
        {addAction && (
          <MotionLink
            href={addAction.href}
            aria-label={addAction.label}
            whileTap={{ scale: 0.85 }}
            transition={{ duration: 0.15 }}
            className="rounded-full p-2 text-secondary transition-colors hover:bg-surface-muted hover:text-primary"
          >
            <Plus size={22} />
          </MotionLink>
        )}
        <SettingsLink />
      </div>
    </header>
  );
}

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const [hasGroup, setHasGroup] = useState<boolean | null>(null);

  // -1 for anything that isn't exactly a tab root (sub-pages like
  // /calendar/new, /settings, etc.) - those keep their existing per-page
  // PageEnter transition untouched; only actual tab-to-tab switches get the
  // sliding treatment below.
  const tabIndex = TAB_HREFS.indexOf(pathname);
  // Deriving "previous tab index" via a ref read during render is exactly
  // what the newer react-hooks/refs rule forbids - this is React's own
  // sanctioned alternative ("adjusting state during render"): comparing
  // against state and calling its setter mid-render bails out and re-renders
  // immediately with the update already applied, before anything commits to
  // the screen, so no ref and no extra effect round-trip are needed.
  const [prevTabIndex, setPrevTabIndex] = useState(tabIndex);
  const [direction, setDirection] = useState(1);
  if (tabIndex !== prevTabIndex) {
    if (tabIndex !== -1 && prevTabIndex !== -1) {
      setDirection(Math.sign(tabIndex - prevTabIndex));
    }
    setPrevTabIndex(tabIndex);
  }

  // Re-checks on every navigation, not just on first mount - Next.js keeps
  // this layout mounted across sibling routes under (app), so a mount-only
  // check would miss a group disappearing (e.g. deleted by its creator)
  // while this tab was already sitting on one of its pages.
  useEffect(() => {
    async function checkMembership() {
      const supabase = createClient();
      const membership = await getCurrentMembership(supabase);
      // proxy.ts already guarantees a session by the time this layout
      // renders, so a null result here specifically means "no group"
      // (e.g. their group was just deleted) rather than "signed out".
      if (!membership) {
        router.replace("/onboarding");
        return;
      }

      // Sign-up redirects straight to /welcome when it already has a
      // session, but there's no client-side code driving that for the
      // email-confirmation path - this catches it the first time that
      // account lands anywhere in the app instead. Only ever true once;
      // /welcome marks it done before sending them back here.
      const { data: profile } = await supabase
        .from("profiles")
        .select("has_completed_welcome")
        .eq("id", membership.userId)
        .single();
      if (profile && !profile.has_completed_welcome) {
        router.replace("/welcome");
        return;
      }

      setHasGroup(true);
    }
    checkMembership();
  }, [pathname, router]);

  // Only block rendering on the very first check - once membership is
  // confirmed, later re-checks happen quietly and just redirect if needed,
  // instead of flashing this blank state on every navigation.
  if (hasGroup === null) return <div className="bg-background" style={{ height: "var(--dvh, 100dvh)" }} />;

  return (
    <UnreadIndicatorProvider>
      <TopicsSearchProvider>
        {/* var(--dvh, 100dvh), not the h-dvh utility directly - see
            ViewportFix, which corrects 100dvh's own iOS unreliability. */}
        <div className="flex flex-col bg-background" style={{ height: "var(--dvh, 100dvh)" }}>
          <AppHeader />
          <OfflineBanner />
          <AutoUpdater />
          <PushPermissionPrompt />
          {tabIndex === -1 ? (
            <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
          ) : (
            <main className="relative min-h-0 flex-1 overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false} custom={direction}>
                <motion.div
                  key={pathname}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="h-full overflow-y-auto"
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </main>
          )}
          {/* Hidden on Chat - the composer is now a full-width pill itself,
              and having both it and the nav pill float at the bottom
              crowded the space this was meant to open up. AppHeader's back
              button covers getting back out of Chat instead. */}
          {pathname !== "/chat" && <BottomNav />}
        </div>
      </TopicsSearchProvider>
    </UnreadIndicatorProvider>
  );
}
