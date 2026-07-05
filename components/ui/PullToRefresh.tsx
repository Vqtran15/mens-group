"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowClockwise } from "@phosphor-icons/react";

const THRESHOLD = 64;
const MAX_PULL = 90;

export function PullToRefresh({
  onRefresh,
  getScrollParent,
  children,
}: {
  onRefresh: () => Promise<void> | void;
  getScrollParent?: () => HTMLElement | null;
  children: React.ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const state = { startY: 0, dragging: false, refreshing: false };
    const resolveScrollParent = getScrollParent ?? (() => document.querySelector("main"));

    function onTouchStart(e: TouchEvent) {
      const scrollParent = resolveScrollParent();
      if (state.refreshing || !scrollParent || scrollParent.scrollTop > 0) {
        state.dragging = false;
        return;
      }
      state.startY = e.touches[0].clientY;
      state.dragging = true;
    }

    function onTouchMove(e: TouchEvent) {
      if (!state.dragging) return;
      const delta = e.touches[0].clientY - state.startY;
      if (delta > 0) {
        // Only take over the gesture once it's unambiguously a downward pull -
        // otherwise a normal upward scroll from the very top would get eaten.
        e.preventDefault();
        setPull(Math.min(delta * 0.4, MAX_PULL));
      }
    }

    function onTouchEnd() {
      if (!state.dragging) return;
      state.dragging = false;
      setPull((current) => {
        if (current > THRESHOLD) {
          state.refreshing = true;
          setRefreshing(true);
          Promise.resolve(onRefresh()).finally(() => {
            state.refreshing = false;
            setRefreshing(false);
            setPull(0);
          });
          return 48;
        }
        return 0;
      });
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [onRefresh, getScrollParent]);

  return (
    <div ref={rootRef} data-pull-to-refresh-root>
      <div
        className="flex items-center justify-center overflow-hidden transition-[height]"
        style={{ height: refreshing ? 48 : pull, transitionDuration: refreshing ? "150ms" : "0ms" }}
      >
        <motion.div
          animate={refreshing ? { rotate: 360 } : { rotate: (pull / MAX_PULL) * 180 }}
          transition={refreshing ? { repeat: Infinity, duration: 0.7, ease: "linear" } : { duration: 0 }}
        >
          <ArrowClockwise size={20} weight="bold" className="text-primary" />
        </motion.div>
      </div>
      {children}
    </div>
  );
}
