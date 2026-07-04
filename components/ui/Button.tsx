"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: HTMLMotionProps<"button"> & { variant?: Variant }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.1 }}
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-primary text-white shadow-sm shadow-primary/30 hover:bg-primary/90",
        variant === "secondary" && "bg-surface-muted text-primary hover:bg-surface-muted/70",
        variant === "ghost" && "text-secondary hover:bg-surface-muted",
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}
