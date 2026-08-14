"use client";

import { useContext, useState } from "react";
import { usePathname, useSelectedLayoutSegment } from "next/navigation";
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { AnimatePresence, motion } from "framer-motion";

const TOOL_CARD_HREFS = ["/tools/resources", "/tools/potluck", "/tools/polls"];

// 0 = the Tools list itself, 1 = one of its three cards' top-level page.
// Deeper pages within a tool (e.g. /tools/resources/new, /tools/polls/[id])
// return null and fall through unwrapped below, keeping their own existing
// PageEnter transition untouched - this is scoped to just the list<->card
// transition the user asked for, not every route under /tools.
function depthFor(pathname: string): number | null {
  if (pathname === "/tools") return 0;
  if (TOOL_CARD_HREFS.includes(pathname)) return 1;
  return null;
}

const pushVariants = {
  enter: (direction: number) => ({ x: direction >= 0 ? 32 : -32, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction >= 0 ? -32 : 32, opacity: 0 }),
};

// Tracks the previous *distinct* value across renders without reading a ref
// during render (disallowed by this project's react-hooks/refs rule - see
// the direction-tracking state in AppLayout for the same constraint).
function usePreviousValue<T>(value: T): T | undefined {
  const [current, setCurrent] = useState(value);
  const [previous, setPrevious] = useState<T | undefined>(undefined);
  if (value !== current) {
    setPrevious(current);
    setCurrent(value);
  }
  return previous;
}

// The missing piece that made the very first version of this file broken in
// a way that only showed up against *real* Next.js navigation, not a mocked
// test: Next's LayoutRouterContext (which tells the <LayoutRouter> further
// down inside {children} which segment's content to actually resolve) is a
// live, shared reference provided by an ancestor - not a per-navigation
// snapshot. Storing {children} itself in React state doesn't help, because
// the deep <LayoutRouter> inside it still reads this context directly and
// live, so the "exiting" instance silently rendered the *new* page's
// content instead of staying on the old page while it slid away (confirmed
// with a real two-route Playwright test against a production build - a
// mocked/local-state version of this same AnimatePresence pattern didn't
// reveal the bug at all). Freezing the context specifically for the
// instance whose own segment just changed is the documented fix for this
// exact class of bug for Next.js App Router + Framer Motion exit
// animations.
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

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const depth = depthFor(pathname);

  // Same render-phase state-adjustment pattern as AppLayout's tab slide -
  // see that file for why (a ref read during render is disallowed).
  const [renderedPathname, setRenderedPathname] = useState(pathname);
  const [renderedDepth, setRenderedDepth] = useState(depth);
  const [direction, setDirection] = useState(1);
  if (pathname !== renderedPathname) {
    if (depth !== null && renderedDepth !== null) {
      setDirection(Math.sign(depth - renderedDepth));
    }
    setRenderedPathname(pathname);
    setRenderedDepth(depth);
  }

  if (depth === null) return <>{children}</>;

  return (
    // No explicit height/overflow here, deliberately - this sits inside
    // whichever scroll container AppLayout already provides for the route
    // (its <main>, or the tab-slide wrapper for the /tools root itself), so
    // it just needs to participate in that flow, not own scrolling itself.
    <div className="relative">
      <AnimatePresence mode="popLayout" initial={false} custom={direction}>
        <motion.div
          key={renderedPathname}
          custom={direction}
          variants={pushVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <FrozenRouter>{children}</FrozenRouter>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
