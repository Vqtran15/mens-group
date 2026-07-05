"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { SettingsLink } from "@/components/SettingsLink";
import { PushPermissionPrompt } from "@/components/PushPermissionPrompt";

const SECTION_TITLES: { prefix: string; title: string }[] = [
  { prefix: "/calendar", title: "Calendar" },
  { prefix: "/topics", title: "Topics" },
  { prefix: "/chat", title: "Chat" },
  { prefix: "/settings", title: "Settings" },
];

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const title =
    SECTION_TITLES.find((section) => pathname.startsWith(section.prefix))?.title ?? "Men's Group";

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="flex items-center justify-between bg-background px-4 py-3">
        <span className="text-2xl font-extrabold tracking-tight text-primary">{title}</span>
        <SettingsLink />
      </header>
      <PushPermissionPrompt />
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      <BottomNav />
    </div>
  );
}
