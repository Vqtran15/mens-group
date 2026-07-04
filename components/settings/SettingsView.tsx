"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Copy, WarningCircle } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AVATAR_COLORS } from "@/components/Avatar";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { SignOutButton } from "@/components/SignOutButton";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded-xl border border-border bg-background/50 px-3 py-2.5 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20";

export function SettingsView() {
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);
  const [nameStatus, setNameStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [nameError, setNameError] = useState<string | null>(null);

  const [avatarColor, setAvatarColor] = useState<string | null>(null);
  const [colorStatus, setColorStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setEmail(data.user.email ?? "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, group_id, avatar_color, groups(name, invite_code)")
        .eq("id", data.user.id)
        .single();
      setDisplayName(profile?.display_name ?? "");
      setAvatarColor(profile?.avatar_color ?? null);
      const group = profile?.groups as unknown as { name: string; invite_code: string } | null;
      setGroupName(group?.name ?? "");
      setInviteCode(group?.invite_code ?? "");
      setLoading(false);
    });
  }, []);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setNameStatus("saving");
    setNameError(null);

    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", data.user.id);

    if (error) {
      setNameError(error.message);
      setNameStatus("error");
      return;
    }

    setNameStatus("saved");
    setTimeout(() => setNameStatus("idle"), 1500);
  }

  async function handleSaveAvatarColor(color: string) {
    setAvatarColor(color);
    setColorStatus("saving");

    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ avatar_color: color })
      .eq("id", data.user.id);

    if (error) {
      setColorStatus("error");
      return;
    }

    setColorStatus("saved");
    setTimeout(() => setColorStatus("idle"), 1500);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setPasswordStatus("saving");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setPasswordError(error.message);
      setPasswordStatus("error");
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setPasswordStatus("saved");
    setTimeout(() => setPasswordStatus("idle"), 1500);
  }

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <section className="space-y-3 rounded-2xl border border-border/60 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-primary">Profile</h2>
        <p className="text-sm text-muted">{email}</p>
        <form onSubmit={handleSaveName} className="space-y-3">
          <div>
            <label htmlFor="displayName" className="mb-1.5 block text-sm font-medium text-secondary">
              Name
            </label>
            <input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={fieldClass}
            />
          </div>
          {nameError && (
            <p className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
              <WarningCircle size={16} className="shrink-0" />
              {nameError}
            </p>
          )}
          <Button type="submit" disabled={nameStatus === "saving"} variant="secondary">
            {nameStatus === "saved" ? (
              <>
                <CheckCircle size={16} /> Saved
              </>
            ) : nameStatus === "saving" ? (
              "Saving..."
            ) : (
              "Save name"
            )}
          </Button>
        </form>
      </section>

      <section className="space-y-3 rounded-2xl border border-border/60 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-primary">Avatar color</h2>
        <div className="flex items-center gap-3">
          <Avatar name={displayName || "?"} color={avatarColor} size={40} />
          {colorStatus === "saved" && (
            <p className="flex items-center gap-1.5 text-sm text-teal">
              <CheckCircle size={16} /> Saved
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {AVATAR_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`Use color ${color}`}
              onClick={() => handleSaveAvatarColor(color)}
              style={{ backgroundColor: color }}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-white transition-transform active:scale-90",
                avatarColor === color ? "ring-primary" : "ring-transparent"
              )}
            >
              {avatarColor === color && <CheckCircle size={18} weight="fill" className="text-white" />}
            </button>
          ))}
        </div>
      </section>

      {inviteCode && (
        <section className="space-y-3 rounded-2xl border border-border/60 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-primary">{groupName}</h2>
          <p className="text-sm text-secondary">Share this invite code so others can join:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg bg-background/60 px-3 py-2 font-mono text-sm">
              {inviteCode}
            </code>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                navigator.clipboard.writeText(inviteCode);
                setCodeCopied(true);
                setTimeout(() => setCodeCopied(false), 1500);
              }}
            >
              {codeCopied ? <CheckCircle size={16} /> : <Copy size={16} />}
              {codeCopied ? "Copied" : "Copy"}
            </Button>
          </div>
        </section>
      )}

      <section className="space-y-3 rounded-2xl border border-border/60 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-primary">Change password</h2>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label htmlFor="newPassword" className="mb-1.5 block text-sm font-medium text-secondary">
              New password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="confirmNewPassword" className="mb-1.5 block text-sm font-medium text-secondary">
              Confirm new password
            </label>
            <input
              id="confirmNewPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={fieldClass}
            />
          </div>
          {passwordError && (
            <p className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
              <WarningCircle size={16} className="shrink-0" />
              {passwordError}
            </p>
          )}
          <Button type="submit" disabled={passwordStatus === "saving"} variant="secondary">
            {passwordStatus === "saved" ? (
              <>
                <CheckCircle size={16} /> Updated
              </>
            ) : passwordStatus === "saving" ? (
              "Updating..."
            ) : (
              "Update password"
            )}
          </Button>
        </form>
      </section>

      <SignOutButton />
    </div>
  );
}
