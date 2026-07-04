"use client";

import { useRouter } from "next/navigation";
import { SignOut } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="flex w-full items-center gap-2 rounded-xl border border-border/60 bg-white px-4 py-3 text-left font-medium text-accent transition-colors hover:bg-accent/10"
    >
      <SignOut size={18} />
      Sign out
    </button>
  );
}
