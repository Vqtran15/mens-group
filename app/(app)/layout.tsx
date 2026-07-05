"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "@phosphor-icons/react";
import { BottomNav } from "@/components/BottomNav";
import { SettingsLink } from "@/components/SettingsLink";
import { PushPermissionPrompt } from "@/components/PushPermissionPrompt";

const SECTION_TITLES: { prefix: string; title: string }[] = [
  { prefix: "/calendar", title: "Calendar" },
  { prefix: "/topics", title: "Topics" },
  { prefix: "/chat", title: "Chat" },
  { prefix: "/settings", title: "Settings" },
];

// Only the tab-root routes get a header "add" shortcut - sub-pages like
// /calendar/new or /topics/[id] already are the add/detail flow.
const ADD_ACTIONS: { path: string; href: string; label: string }[] = [
  { path: "/calendar", href: "/calendar/new", label: "Add event" },
  { path: "/topics", href: "/topics/new", label: "Add topic" },
];

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const title =
    SECTION_TITLES.find((section) => pathname.startsWith(section.prefix))?.title ?? "Men's Group";
  const addAction = ADD_ACTIONS.find((action) => action.path === pathname);

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="flex items-center justify-between bg-background px-4 py-3">
        <span className="text-2xl font-extrabold tracking-tight text-primary">{title}</span>
        <div className="flex items-center gap-1">
          {addAction && (
            <Link
              href={addAction.href}
              aria-label={addAction.label}
              className="rounded-full p-2 text-secondary transition-colors hover:bg-surface-muted hover:text-primary"
            >
              <Plus size={22} />
            </Link>
          )}
          <SettingsLink />
        </div>
      </header>
      <PushPermissionPrompt />
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      <BottomNav />
    </div>
  );
}
