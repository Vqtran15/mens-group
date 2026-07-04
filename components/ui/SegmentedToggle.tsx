"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  layoutId,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  layoutId: string;
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-surface-muted p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className="relative flex-1 rounded-lg px-3 py-2 text-sm font-medium"
        >
          {value === opt.value && (
            <motion.div
              layoutId={layoutId}
              className="absolute inset-0 rounded-lg bg-primary shadow-sm"
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            />
          )}
          <span
            className={cn(
              "relative z-10 transition-colors",
              value === opt.value ? "text-white" : "text-secondary"
            )}
          >
            {opt.label}
          </span>
        </button>
      ))}
    </div>
  );
}
