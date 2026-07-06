import { motion } from "framer-motion";
import type { Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: IconComponent,
  title,
  subtitle,
  children,
  onClick,
}: {
  icon: Icon;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}) {
  const Container = onClick ? motion.button : motion.div;

  return (
    <Container
      {...(onClick ? { type: "button", onClick, whileTap: { scale: 0.98 } } : {})}
      className={cn(
        "flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-white/60 px-6 py-10 text-center",
        onClick && "transition-colors hover:bg-white/80"
      )}
    >
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
    </Container>
  );
}
