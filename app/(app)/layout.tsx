"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentMembership } from "@/lib/supabase/current-membership";
import { BottomNav } from "@/components/BottomNav";
import { SettingsLink } from "@/components/SettingsLink";
import { PushPermissionPrompt } from "@/components/PushPermissionPrompt";
import { UpdatePrompt } from "@/components/UpdatePrompt";
import { OfflineBanner } from "@/components/OfflineBanner";
import { TopicsSearchProvider, useTopicsSearch } from "@/components/topics/TopicsSearchContext";
import { TopicsAddMenu } from "@/components/topics/TopicsAddMenu";
import { UnreadIndicatorProvider } from "@/components/UnreadIndicatorContext";

const SECTION_TITLES: { prefix: string; title: string }[] = [
  { prefix: "/calendar", title: "Calendar" },
  { prefix: "/topics", title: "Topics" },
  { prefix: "/chat", title: "Chat" },
  { prefix: "/settings", title: "Settings" },
];

// Only the tab-root routes get a header "add" shortcut - sub-pages like
// /calendar/new or /topics/[id] already are the add/detail flow. Topics
// isn't listed here - it gets a small menu (New Topic/New Draft/Drafts)
// via TopicsAddMenu instead of a single direct link.
const ADD_ACTIONS: { path: string; href: string; label: string }[] = [
  { path: "/calendar", href: "/calendar/new", label: "Add event" },
];

const MotionLink = motion.create(Link);

function TopicsSearchToggle() {
  const { open, setOpen } = useTopicsSearch();
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      aria-label="Search topics"
      className="rounded-full p-2 text-secondary transition-colors hover:bg-surface-muted hover:text-primary"
    >
      <MagnifyingGlass size={20} />
    </button>
  );
}

function AppHeader() {
  const pathname = usePathname();
  const title =
    SECTION_TITLES.find((section) => pathname.startsWith(section.prefix))?.title ?? "Men's Group";
  const addAction = ADD_ACTIONS.find((action) => action.path === pathname);

  return (
    <header className="flex items-center justify-between bg-background px-4 py-3">
      <span className="text-2xl font-extrabold tracking-tight text-primary">{title}</span>
      <div className="flex items-center gap-1">
        {pathname === "/topics" && <TopicsSearchToggle />}
        {pathname === "/topics" && <TopicsAddMenu />}
        {addAction && (
          <MotionLink
            href={addAction.href}
            aria-label={addAction.label}
            whileTap={{ scale: 0.85 }}
            transition={{ duration: 0.15 }}
            className="rounded-full p-2 text-secondary transition-colors hover:bg-surface-muted hover:text-primary"
          >
            <Plus size={22} />
          </MotionLink>
        )}
        <SettingsLink />
      </div>
    </header>
  );
}

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const [hasGroup, setHasGroup] = useState<boolean | null>(null);

  // Re-checks on every navigation, not just on first mount - Next.js keeps
  // this layout mounted across sibling routes under (app), so a mount-only
  // check would miss a group disappearing (e.g. deleted by its creator)
  // while this tab was already sitting on one of its pages.
  useEffect(() => {
    async function checkMembership() {
      const supabase = createClient();
      const membership = await getCurrentMembership(supabase);
      // proxy.ts already guarantees a session by the time this layout
      // renders, so a null result here specifically means "no group"
      // (e.g. their group was just deleted) rather than "signed out".
      if (!membership) {
        router.replace("/onboarding");
        return;
      }

      // Sign-up redirects straight to /welcome when it already has a
      // session, but there's no client-side code driving that for the
      // email-confirmation path - this catches it the first time that
      // account lands anywhere in the app instead. Only ever true once;
      // /welcome marks it done before sending them back here.
      const { data: profile } = await supabase
        .from("profiles")
        .select("has_completed_welcome")
        .eq("id", membership.userId)
        .single();
      if (profile && !profile.has_completed_welcome) {
        router.replace("/welcome");
        return;
      }

      setHasGroup(true);
    }
    checkMembership();
  }, [pathname, router]);

  // Only block rendering on the very first check - once membership is
  // confirmed, later re-checks happen quietly and just redirect if needed,
  // instead of flashing this blank state on every navigation.
  if (hasGroup === null) return <div className="h-dvh bg-background" />;

  return (
    <UnreadIndicatorProvider>
      <TopicsSearchProvider>
        <div className="flex h-dvh flex-col bg-background">
          <AppHeader />
          <OfflineBanner />
          <UpdatePrompt />
          <PushPermissionPrompt />
          <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
          <BottomNav />
        </div>
      </TopicsSearchProvider>
    </UnreadIndicatorProvider>
  );
}
