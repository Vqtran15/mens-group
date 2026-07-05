"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

const SHOWN_KEY = "splash-shown";
const MIN_VISIBLE_MS = 1100;

export function SplashScreen() {
  // Default to visible so the splash is part of the very first paint (both
  // the server-rendered HTML and the client's pre-hydration render agree on
  // this, so there's no hydration mismatch). Starting hidden and flipping to
  // visible from a useEffect - which only runs after hydration - left a gap
  // where the real page was visible first, then the splash suddenly
  // appeared on top of it, then disappeared again: a visible flicker
  // instead of a clean "cover immediately, then reveal" sequence.
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    function checkShouldDismiss() {
      if (sessionStorage.getItem(SHOWN_KEY)) {
        // Already shown earlier this session (e.g. a page refresh) - dismiss
        // right away instead of holding up a page the user has already seen
        // the intro for.
        setVisible(false);
        return;
      }

      sessionStorage.setItem(SHOWN_KEY, "1");
      timer = setTimeout(() => setVisible(false), MIN_VISIBLE_MS);
    }

    checkShouldDismiss();
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-primary"
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <Image
              src="/icons/icon-512.png"
              alt=""
              width={96}
              height={96}
              priority
              className="rounded-2xl shadow-xl"
            />
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.3 }}
            className="text-xl font-extrabold tracking-tight text-white"
          >
            Men&apos;s Group
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
