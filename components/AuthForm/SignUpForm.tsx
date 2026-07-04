"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GroupSection, type GroupSelection } from "@/components/AuthForm/GroupSection";

export function SignUpForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [group, setGroup] = useState<GroupSelection>({
    mode: "create",
    groupName: "",
    inviteCode: "",
    selectedGroupId: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [createdGroupName, setCreatedGroupName] = useState<string | null>(null);
  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    let groupId: string;
    let inviteCode: string;

    if (group.mode === "create") {
      const { data, error } = await supabase.rpc("create_group", {
        p_name: group.groupName,
        p_invite_code: group.inviteCode,
      });
      if (error) {
        setSubmitting(false);
        setError(error.message);
        return;
      }
      groupId = data as string;
      inviteCode = group.inviteCode;
    } else {
      if (!group.selectedGroupId) {
        setSubmitting(false);
        setError("Please select a group.");
        return;
      }
      const { data: valid, error: verifyError } = await supabase.rpc("verify_group_invite", {
        p_group_id: group.selectedGroupId,
        p_invite_code: group.inviteCode,
      });
      if (verifyError || !valid) {
        setSubmitting(false);
        setError("Invalid invite code for that group.");
        return;
      }
      groupId = group.selectedGroupId;
      inviteCode = group.inviteCode;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split("@")[0],
          group_id: groupId,
          invite_code: inviteCode,
        },
      },
    });

    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (group.mode === "create") {
      setCreatedGroupName(group.groupName);
      setCreatedInviteCode(group.inviteCode);
    }

    // If email confirmation is disabled, signUp already returns a live session.
    if (data.session) {
      if (group.mode === "create") {
        setHasSession(true);
        setSubmitted(true);
        return;
      }
      router.push("/calendar");
      router.refresh();
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="w-full max-w-sm text-center">
        {createdGroupName && createdInviteCode && (
          <div className="mb-4 rounded-xl border border-highlight bg-white p-4 text-left">
            <p className="font-semibold text-primary">Group &quot;{createdGroupName}&quot; created!</p>
            <p className="mt-1 text-sm text-secondary">
              Share this invite code so others can join:
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-surface-muted px-3 py-2 font-mono text-sm">
                {createdInviteCode}
              </code>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(createdInviteCode)}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white"
              >
                Copy
              </button>
            </div>
          </div>
        )}
        {hasSession ? (
          <button
            type="button"
            onClick={() => {
              router.push("/calendar");
              router.refresh();
            }}
            className="w-full rounded-lg bg-primary px-4 py-2 font-medium text-white"
          >
            Continue to Calendar
          </button>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-primary">Check your email</h2>
            <p className="mt-2 text-secondary">
              We sent a confirmation link to {email}. Click it to finish creating your account.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
      <GroupSection value={group} onChange={setGroup} />
      <div>
        <label htmlFor="displayName" className="mb-1 block text-sm font-medium text-secondary">
          Name
        </label>
        <input
          id="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-base outline-none focus:border-primary"
        />
      </div>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-secondary">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-base outline-none focus:border-primary"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-secondary">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-base outline-none focus:border-primary"
        />
      </div>
      <div>
        <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-secondary">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-base outline-none focus:border-primary"
        />
      </div>
      {error && <p className="text-sm text-accent">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-primary px-4 py-2 font-medium text-white disabled:opacity-60"
      >
        {submitting ? "Creating account..." : "Sign up"}
      </button>
      <p className="text-center text-sm text-secondary">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-primary">
          Sign in
        </Link>
      </p>
    </form>
  );
}
