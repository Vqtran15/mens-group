"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Gear } from "@phosphor-icons/react";

const MotionLink = motion.create(Link);

export function SettingsLink() {
  return (
    <MotionLink
      href="/settings"
      aria-label="Settings"
      whileTap={{ scale: 0.85 }}
      transition={{ duration: 0.15 }}
      className="rounded-full p-2 text-secondary transition-colors hover:bg-surface-muted hover:text-primary"
    >
      <Gear size={20} />
    </MotionLink>
  );
}
