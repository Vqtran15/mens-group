"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

const SHOWN_KEY = "splash-shown";
const MIN_VISIBLE_MS = 1100;

export function SplashScreen() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    function checkShouldShow() {
      if (sessionStorage.getItem(SHOWN_KEY)) return;
      sessionStorage.setItem(SHOWN_KEY, "1");
      setVisible(true);
      timer = setTimeout(() => setVisible(false), MIN_VISIBLE_MS);
    }

    checkShouldShow();
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
