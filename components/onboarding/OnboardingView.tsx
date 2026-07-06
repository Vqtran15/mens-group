"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkle, WarningCircle } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentMembership } from "@/lib/supabase/current-membership";
import { GroupSection, type GroupSelection } from "@/components/AuthForm/GroupSection";
import { Button } from "@/components/ui/Button";
import { SignOutButton } from "@/components/SignOutButton";

export function OnboardingView() {
  const router = useRouter();
  const [group, setGroup] = useState<GroupSelection>({
    mode: "join",
    groupName: "",
    inviteCode: "",
    selectedGroupId: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function redirectIfAlreadyInGroup() {
      const supabase = createClient();
      const membership = await getCurrentMembership(supabase);
      if (membership) {
        router.replace("/calendar");
      }
    }
    redirectIfAlreadyInGroup();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();

    if (group.mode === "create") {
      const { error: createError } = await supabase.rpc("create_group_for_self", {
        p_name: group.groupName,
        p_invite_code: group.inviteCode,
      });
      if (createError) {
        setSubmitting(false);
        setError(createError.message);
        return;
      }
    } else {
      if (!group.selectedGroupId) {
        setSubmitting(false);
        setError("Please select a group.");
        return;
      }
      const { error: joinError } = await supabase.rpc("join_group_for_self", {
        p_group_id: group.selectedGroupId,
        p_invite_code: group.inviteCode,
      });
      if (joinError) {
        setSubmitting(false);
        setError("Invalid invite code for that group.");
        return;
      }
    }

    router.push("/calendar");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-full flex-1 items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/30">
            <Sparkle size={28} weight="fill" />
          </div>
          <h1 className="text-2xl font-semibold text-primary">Join or create a group</h1>
          <p className="mt-1 text-sm text-secondary">
            You&apos;re not part of a group yet - pick one to continue.
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-white/90 p-6 shadow-xl shadow-primary/5 backdrop-blur">
          <form onSubmit={handleSubmit} className="space-y-4">
            <GroupSection value={group} onChange={setGroup} />
            {error && (
              <p className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
                <WarningCircle size={16} className="shrink-0" />
                {error}
              </p>
            )}
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Just a moment..." : "Continue"}
            </Button>
          </form>
        </div>

        <div className="mt-4">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
