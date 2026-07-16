"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, Copy, Envelope, LockKey, ShareNetwork, UserCircle, WarningCircle } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { GroupSection, type GroupSelection } from "@/components/AuthForm/GroupSection";
import { AuthTextField } from "@/components/AuthForm/AuthTextField";
import { Button } from "@/components/ui/Button";
import { trackEvent } from "@/lib/analytics";

export function SignUpForm({ onSwitchToSignIn }: { onSwitchToSignIn: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // A shared invite link (built in Settings) carries ?group=<id>&code=<code>
  // so a new member lands here with "Join a Group" already filled in
  // instead of having to copy-paste the code by hand.
  const [group, setGroup] = useState<GroupSelection>(() => {
    const groupId = searchParams.get("group");
    const inviteCode = searchParams.get("code");
    if (groupId && inviteCode) {
      return { mode: "join", groupName: "", inviteCode, selectedGroupId: groupId };
    }
    return { mode: "join", groupName: "", inviteCode: "", selectedGroupId: "" };
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [createdGroupId, setCreatedGroupId] = useState<string | null>(null);
  const [createdGroupName, setCreatedGroupName] = useState<string | null>(null);
  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkShared, setLinkShared] = useState(false);

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
          is_creator: group.mode === "create",
        },
      },
    });

    if (error) {
      setSubmitting(false);
      setError(error.message);
      return;
    }

    if (group.mode === "create") {
      setCreatedGroupId(groupId);
      setCreatedGroupName(group.groupName);
      setCreatedInviteCode(group.inviteCode);
    }

    // If email confirmation is disabled, signUp already returns a live session.
    // `submitting` is intentionally left true on every path below - each one
    // either navigates away (so the button reverting first would flicker
    // right before the page changes) or swaps to a different view entirely.
    if (data.session) {
      if (group.mode === "create") {
        setHasSession(true);
        setSubmitted(true);
        return;
      }
      trackEvent('sign_up')
      router.push("/calendar");
      router.refresh();
      return;
    }

    setSubmitted(true);
  }

  async function handleShareInviteLink() {
    if (!createdGroupId || !createdInviteCode) return;
    const url = `${window.location.origin}/sign-up?group=${createdGroupId}&code=${encodeURIComponent(createdInviteCode)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Join ${createdGroupName} on Men's Group`, url });
      } catch {
        // User cancelled the share sheet - not an error.
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    setLinkShared(true);
    setTimeout(() => setLinkShared(false), 1500);
  }

  if (submitted) {
    return (
      <div className="w-full text-center">
        {createdGroupName && createdInviteCode && (
          <div className="mb-4 rounded-2xl border border-highlight bg-highlight/10 p-4 text-left">
            <p className="font-semibold text-primary">Group &quot;{createdGroupName}&quot; created!</p>
            <p className="mt-1 text-sm text-secondary">
              Share this invite code so others can join:
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg bg-white px-3 py-2 font-mono text-sm">
                {createdInviteCode}
              </code>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(createdInviteCode);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <Button type="button" variant="secondary" onClick={handleShareInviteLink} className="mt-2 w-full">
              {linkShared ? <CheckCircle size={16} /> : <ShareNetwork size={16} />}
              {linkShared ? "Link copied" : "Share invite link"}
            </Button>
          </div>
        )}
        {hasSession ? (
          <Button
            type="button"
            className="w-full"
            onClick={() => {
              router.push("/calendar");
              router.refresh();
            }}
          >
            Continue to Calendar
          </Button>
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
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <AuthTextField
        label="Name"
        icon={UserCircle}
        autoComplete="name"
        value={displayName}
        onChange={setDisplayName}
      />
      <AuthTextField
        label="Email"
        type="email"
        icon={Envelope}
        required
        autoComplete="email"
        value={email}
        onChange={setEmail}
      />
      <AuthTextField
        label="Password"
        type="password"
        icon={LockKey}
        required
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
      />
      <AuthTextField
        label="Confirm password"
        type="password"
        icon={LockKey}
        required
        autoComplete="new-password"
        value={confirmPassword}
        onChange={setConfirmPassword}
      />
      <GroupSection value={group} onChange={setGroup} />
      {error && (
        <p className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
          <WarningCircle size={16} className="shrink-0" />
          {error}
        </p>
      )}
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Creating account..." : "Sign up"}
      </Button>
      <p className="text-center text-sm text-secondary">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToSignIn}
          className="font-medium text-primary hover:underline"
        >
          Sign in
        </button>
      </p>
    </form>
  );
}
