"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarBlank, Notebook, ChatCircle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/calendar", label: "Calendar", icon: CalendarBlank },
  { href: "/topics", label: "Topics", icon: Notebook },
  { href: "/chat", label: "Chat", icon: ChatCircle },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="border-t border-border bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="flex">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-xs font-medium",
                  active ? "text-primary" : "text-secondary"
                )}
              >
                <Icon size={24} weight={active ? "fill" : "regular"} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
