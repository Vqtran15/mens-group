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
      aria-label="Sign out"
      className="rounded-full p-2 text-secondary hover:bg-surface-muted"
    >
      <SignOut size={20} />
    </button>
  );
}
