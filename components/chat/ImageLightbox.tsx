"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { CaretLeft, CaretRight, X } from "@phosphor-icons/react";

export function ImageLightbox({
  images,
  initialIndex,
  open,
  onClose,
}: {
  images: string[];
  initialIndex: number;
  open: boolean;
  onClose: () => void;
}) {
  // Each message bubble animates in with a framer-motion transform, which
  // (like backdrop-filter) creates a new containing block for fixed-position
  // descendants - a "fixed inset-0" overlay rendered inline here would get
  // trapped inside that one bubble's box instead of covering the viewport.
  // Portaling to document.body sidesteps any ancestor's CSS entirely.
  const [mounted, setMounted] = useState(false);
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    function markMounted() {
      setMounted(true);
    }
    markMounted();
  }, []);

  // Re-sync whenever the lightbox is (re)opened, so it starts on whichever
  // thumbnail was actually tapped rather than wherever it was last left.
  useEffect(() => {
    function syncIndex() {
      if (open) setIndex(initialIndex);
    }
    syncIndex();
  }, [open, initialIndex]);

  if (!mounted) return null;

  const hasMultiple = images.length > 1;

  function showPrevious(e: React.MouseEvent) {
    e.stopPropagation();
    setIndex((i) => (i - 1 + images.length) % images.length);
  }

  function showNext(e: React.MouseEvent) {
    e.stopPropagation();
    setIndex((i) => (i + 1) % images.length);
  }

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
            className="absolute right-4 top-[calc(env(safe-area-inset-top)+1rem)] z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          >
            <X size={22} />
          </button>
          {hasMultiple && (
            <p className="absolute top-[calc(env(safe-area-inset-top)+1.25rem)] left-1/2 -translate-x-1/2 text-sm font-medium text-white/80">
              {index + 1} / {images.length}
            </p>
          )}
          {hasMultiple && (
            <button
              type="button"
              onClick={showPrevious}
              aria-label="Previous photo"
              className="absolute left-2 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            >
              <CaretLeft size={22} />
            </button>
          )}
          <motion.div
            key={index}
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative h-[80vh] w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image src={images[index]} alt="Shared photo" fill sizes="100vw" className="object-contain" />
          </motion.div>
          {hasMultiple && (
            <button
              type="button"
              onClick={showNext}
              aria-label="Next photo"
              className="absolute right-2 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            >
              <CaretRight size={22} />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
