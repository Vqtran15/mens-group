"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "@phosphor-icons/react";

const MotionLink = motion.create(Link);

export function BackButton({ href }: { href: string }) {
  return (
    <MotionLink
      href={href}
      aria-label="Back"
      whileTap={{ scale: 0.85 }}
      transition={{ duration: 0.15 }}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-secondary transition-colors hover:bg-surface-muted"
    >
      <ArrowLeft size={20} />
    </MotionLink>
  );
}
