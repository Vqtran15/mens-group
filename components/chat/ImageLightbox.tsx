"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "@phosphor-icons/react";

export function ImageLightbox({
  src,
  open,
  onClose,
}: {
  src: string;
  open: boolean;
  onClose: () => void;
}) {
  // Each message bubble animates in with a framer-motion transform, which
  // (like backdrop-filter) creates a new containing block for fixed-position
  // descendants - a "fixed inset-0" overlay rendered inline here would get
  // trapped inside that one bubble's box instead of covering the viewport.
  // Portaling to document.body sidesteps any ancestor's CSS entirely.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    function markMounted() {
      setMounted(true);
    }
    markMounted();
  }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={onClose}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-[calc(env(safe-area-inset-top)+1rem)] rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          >
            <X size={22} />
          </button>
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative h-[80vh] w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image src={src} alt="Shared photo" fill sizes="100vw" className="object-contain" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
