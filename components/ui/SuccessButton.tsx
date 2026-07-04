"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";

export type SubmitStatus = "idle" | "submitting" | "success";

export function SuccessButton({
  status,
  idleLabel,
  submittingLabel,
  className,
}: {
  status: SubmitStatus;
  idleLabel: string;
  submittingLabel: string;
  className?: string;
}) {
  return (
    <Button type="submit" disabled={status !== "idle"} className={className}>
      <AnimatePresence mode="wait" initial={false}>
        {status === "success" ? (
          <motion.span
            key="success"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="flex items-center gap-1.5"
          >
            <Check size={18} weight="bold" /> Done
          </motion.span>
        ) : (
          <motion.span
            key="label"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            {status === "submitting" ? submittingLabel : idleLabel}
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );
}
