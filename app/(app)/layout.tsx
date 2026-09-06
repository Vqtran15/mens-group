"use client";

import { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter, useSelectedLayoutSegment } from "next/navigation";
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
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
import { cn } from "@/lib/utils";

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
  { path: "/tools/potluck", href: "/tools/potluck/new", label: "New potluck" },
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

// Same shape as slideVariants, smaller offset - a header title is a couple
// words, not a full page, so sliding it the same 48px as the content below
// reads as too big a jump for how little space it occupies.
const titleSlideVariants = {
  enter: (direction: number) => ({ x: direction >= 0 ? 16 : -16, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction >= 0 ? -16 : 16, opacity: 0 }),
};

// Tracks the previous *distinct* value across renders without reading a ref
// during render (disallowed by this project's react-hooks/refs rule).
function usePreviousValue<T>(value: T): T | undefined {
  const [current, setCurrent] = useState(value);
  const [previous, setPrevious] = useState<T | undefined>(undefined);
  if (value !== current) {
    setPrevious(current);
    setCurrent(value);
  }
  return previous;
}

// Load-bearing, not decorative - without this, the tab-slide below animated
// correctly but showed the *wrong content*: the "exiting" tab's page
// silently swapped to the new tab's content mid-slide instead of staying on
// its own content while it animated away. Root cause: Next's
// LayoutRouterContext (which tells the <LayoutRouter> further down inside
// {children} which segment to actually render) is a live, shared reference
// from an ancestor, not a per-navigation snapshot - so simply keying a
// motion.div by pathname doesn't freeze what's inside it, since the deep
// router component reads this context directly and live regardless of
// which "old" element wraps it. Confirmed with a real two-route Playwright
// test against a production build (a mocked/local-state version of the
// same AnimatePresence pattern didn't reveal the bug at all - it only shows
// up against real Next.js route children). Freezing the context
// specifically for the instance whose own segment just changed is the
// documented fix for this class of bug in Next.js App Router + Framer
// Motion exit animations.
function FrozenRouter({ children }: { children: React.ReactNode }) {
  const context = useContext(LayoutRouterContext);
  const prevContext = usePreviousValue(context) ?? null;
  const segment = useSelectedLayoutSegment();
  const prevSegment = usePreviousValue(segment);
  const changed = segment !== prevSegment && segment !== undefined && prevSegment !== undefined;
  return (
    <LayoutRouterContext.Provider value={changed ? prevContext : context}>
      {children}
    </LayoutRouterContext.Provider>
  );
}

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

function AppHeader({ direction, lastNonChatTab }: { direction: number; lastNonChatTab: string }) {
  const pathname = usePathname();
  const title =
    SECTION_TITLES.find((section) => pathname.startsWith(section.prefix))?.title ?? "Men's Group";
  const addAction = ADD_ACTIONS.find((action) => action.path === pathname);

  return (
    <header className="flex items-center justify-between bg-background px-4 py-3">
      <div className="flex items-center gap-2">
        {/* Chat hides BottomNav (see below) to give the pill composer room,
            so it's the one tab-root screen with no other way back to the
            rest of the app - needs its own exit. Goes back to whichever tab
            the user actually came from (lastNonChatTab), not a hardcoded
            /calendar - someone entering Chat from Topics or Tools shouldn't
            get dumped on Calendar instead of back where they were. */}
        {pathname === "/chat" && <BackButton href={lastNonChatTab} />}
        {/* Keyed on title, not pathname - sub-pages within the same section
            (e.g. /calendar/new) share the "Calendar" title, and shouldn't
            replay this transition just because the path changed underneath
            an unchanged heading. */}
        <span className="relative inline-block">
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            <motion.span
              key={title}
              custom={direction}
              variants={titleSlideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="block text-2xl font-extrabold tracking-tight text-primary"
            >
              {title}
            </motion.span>
          </AnimatePresence>
        </span>
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
  // Chat hides BottomNav for its own composer pill instead (see below) -
  // every other route reserves space for it via bottom padding, now that
  // it's a fixed overlay rather than a normal-flow row.
  const showBottomNav = pathname !== "/chat";

  // -1 for anything that isn't under a tab at all (e.g. /settings) - those
  // keep the plain, unwrapped branch below. This is deliberately a *prefix*
  // match, not an exact one: /calendar/new, /tools/resources, etc. all
  // belong to their tab's subtree too, and need to land in the wrapped
  // branch alongside their tab root - see the comment on the branch itself
  // for why that's load-bearing, not just for consistency.
  const activeTabIndex = TAB_HREFS.findIndex(
    (href) => pathname === href || pathname.startsWith(`${href}/`)
  );
  // Deriving "previous tab index" via a ref read during render is exactly
  // what the newer react-hooks/refs rule forbids - this is React's own
  // sanctioned alternative ("adjusting state during render"): comparing
  // against state and calling its setter mid-render bails out and re-renders
  // immediately with the update already applied, before anything commits to
  // the screen, so no ref and no extra effect round-trip are needed.
  const [prevTabIndex, setPrevTabIndex] = useState(activeTabIndex);
  const [direction, setDirection] = useState(1);
  if (activeTabIndex !== prevTabIndex) {
    if (activeTabIndex !== -1 && prevTabIndex !== -1) {
      setDirection(Math.sign(activeTabIndex - prevTabIndex));
    }
    setPrevTabIndex(activeTabIndex);
  }

  // What Chat's back button returns to. Updated (during render, same
  // adjustment pattern as above) any time the active tab is a real,
  // non-Chat tab, and left alone otherwise - so it keeps pointing at
  // wherever the user actually came from for as long as they're sitting on
  // /chat, instead of resetting the moment Chat itself becomes active.
  // Defaults to Calendar for a cold load straight into /chat (e.g. a
  // deep link), where there's no real "came from" tab to point back to.
  const [lastNonChatTab, setLastNonChatTab] = useState(TAB_HREFS[0]);
  if (
    activeTabIndex !== -1 &&
    TAB_HREFS[activeTabIndex] !== "/chat" &&
    TAB_HREFS[activeTabIndex] !== lastNonChatTab
  ) {
    setLastNonChatTab(TAB_HREFS[activeTabIndex]);
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
          <AppHeader direction={direction} lastNonChatTab={lastNonChatTab} />
          <OfflineBanner />
          <AutoUpdater />
          <PushPermissionPrompt />
          {/* BottomNav is a fixed overlay (see BottomNav.tsx), not a normal-
              flow sibling - it no longer claims its own row here, so the
              scroll containers below reserve that space themselves via
              bottom padding, tall enough to clear the pill (roughly its own
              height plus the safe-area inset) so the last item can still
              scroll fully into view above it rather than under it. */}
          {activeTabIndex === -1 ? (
            <main
              className={cn(
                "min-h-0 flex-1 overflow-y-auto",
                showBottomNav && "pb-[calc(5rem+var(--sab,0px))]"
              )}
            >
              {children}
            </main>
          ) : (
            <main className="relative min-h-0 flex-1 overflow-hidden">
              {/* Keyed on the *tab*, not the raw pathname - sub-pages within
                  a tab (e.g. /tools/resources) share their tab root's key,
                  so this wrapper's shape and identity stay stable across
                  navigation within a tab and only actually change (playing
                  the slide) on a genuine tab-to-tab switch. Keying on
                  pathname directly used to force this whole branch to
                  remount on every /tools <-> /tools/resources-style
                  navigation - both because the *other* branch (the plain
                  one above) doesn't exist here at all for an exact-pathname
                  key, and because any nested layout further down inside
                  {children} (e.g. app/(app)/tools/layout.tsx's own
                  list<->card push/pop) got torn down and rebuilt from
                  scratch every time, discarding its own transition-tracking
                  state before it ever got to animate - in both directions,
                  not just one. */}
              <AnimatePresence mode="popLayout" initial={false} custom={direction}>
                <motion.div
                  key={TAB_HREFS[activeTabIndex]}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className={cn(
                    "h-full overflow-y-auto",
                    showBottomNav && "pb-[calc(5rem+var(--sab,0px))]"
                  )}
                >
                  <FrozenRouter>{children}</FrozenRouter>
                </motion.div>
              </AnimatePresence>
            </main>
          )}
          {/* Hidden on Chat - the composer is now a full-width pill itself,
              and having both it and the nav pill float at the bottom
              crowded the space this was meant to open up. AppHeader's back
              button covers getting back out of Chat instead. Wrapped in
              AnimatePresence (BottomNav is a motion.nav with its own
              enter/exit variants) so it fades in/out at the Chat boundary
              instead of popping, matching MessageComposer's equivalent fix
              and the rest of the app's motion language. */}
          <AnimatePresence>{showBottomNav && <BottomNav />}</AnimatePresence>
        </div>
      </TopicsSearchProvider>
    </UnreadIndicatorProvider>
  );
}
