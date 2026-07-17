"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen, CaretRight, ChartBar, ForkKnife, type Icon } from "@phosphor-icons/react";

const TOOLS: { href: string; title: string; description: string; icon: Icon }[] = [
  {
    href: "/tools/resources",
    title: "Resource Library",
    description: "Articles the group recommends",
    icon: BookOpen,
  },
  {
    href: "/tools/potluck",
    title: "Potluck",
    description: "Add what you're bringing, or claim something on the list",
    icon: ForkKnife,
  },
  {
    href: "/tools/polls",
    title: "Polls",
    description: "Ask a question and see where everyone lands",
    icon: ChartBar,
  },
];

export function ToolsView() {
  return (
    <div className="space-y-3 p-4">
      {TOOLS.map((tool, i) => (
        <motion.div
          key={tool.href}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: i * 0.06, ease: "easeOut" }}
        >
          <Link
            href={tool.href}
            className="flex items-center gap-3 rounded-2xl border border-border/60 bg-white p-4 shadow-sm transition-colors hover:bg-surface-muted/40 active:scale-[0.99]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <tool.icon size={22} weight="duotone" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-primary">{tool.title}</span>
              <span className="block text-sm text-secondary">{tool.description}</span>
            </span>
            <CaretRight size={18} className="shrink-0 text-muted" />
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
