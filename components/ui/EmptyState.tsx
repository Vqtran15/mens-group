import { motion } from "framer-motion";
import type { Icon } from "@phosphor-icons/react";

export function EmptyState({
  icon: IconComponent,
  title,
  subtitle,
  children,
}: {
  icon: Icon;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-white/60 px-6 py-10 text-center">
      <motion.span
        initial={{ scale: 0.6, rotate: -10, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        className="flex items-center justify-center text-primary"
      >
        <IconComponent size={40} weight="duotone" />
      </motion.span>
      <p className="font-semibold text-primary">{title}</p>
      {subtitle && <p className="max-w-xs text-sm text-secondary">{subtitle}</p>}
      {children}
    </div>
  );
}
