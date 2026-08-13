"use client";

import { useEffect } from "react";

// Two iOS Safari/WKWebView quirks this works around - ported from a sibling
// app (coveyspace-app) that already solved them in production. Renders
// nothing; it's a background effect only.
//
// 1. 100dvh doesn't reliably track the real visible viewport as Safari's
//    own chrome (URL bar) shows/hides - --dvh is computed directly from
//    window.innerHeight instead, and kept in sync on resize.
//
// 2. env(safe-area-inset-bottom) can report 0 even on a notched device:
//    both before any native scroll event has occurred, and whenever the
//    document isn't taller than the viewport (this app's shell scrolls
//    its inner content area, not body itself - see globals.css's
//    `min-height: calc(100dvh + 1px)` on body, which exists specifically
//    to satisfy that second condition). This forces a 1px scroll, waits
//    for iOS to process it, then re-reads the real value via a temporary
//    probe element and caches it as --sab so nothing needs to re-query it
//    on every render.
export function ViewportFix() {
  useEffect(() => {
    function updateDvh() {
      document.documentElement.style.setProperty("--dvh", `${window.innerHeight}px`);
    }
    updateDvh();
    window.addEventListener("resize", updateDvh);

    let innerTimer: ReturnType<typeof setTimeout> | undefined;
    const outerTimer = setTimeout(() => {
      window.scrollTo(0, 1);
      innerTimer = setTimeout(() => {
        const probe = document.createElement("div");
        probe.style.cssText =
          "position:fixed;bottom:0;height:env(safe-area-inset-bottom,0px);pointer-events:none;visibility:hidden;opacity:0";
        document.body.appendChild(probe);
        const sab = probe.getBoundingClientRect().height;
        document.body.removeChild(probe);
        if (sab > 0) document.documentElement.style.setProperty("--sab", `${sab}px`);
      }, 100);
    }, 50);

    return () => {
      window.removeEventListener("resize", updateDvh);
      clearTimeout(outerTimer);
      clearTimeout(innerTimer);
    };
  }, []);

  return null;
}
