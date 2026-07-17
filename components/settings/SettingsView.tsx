"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Camera, CaretRight, CheckCircle, Copy, ShareNetwork, Trash, UsersThree, WarningCircle } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AVATAR_COLORS } from "@/components/Avatar";
import { AvatarCropModal } from "@/components/settings/AvatarCropModal";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { SignOutButton } from "@/components/SignOutButton";
import { uploadAvatar } from "@/lib/supabase/uploadAvatar";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded-xl border border-border bg-white shadow-sm px-3 py-2.5 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export function SettingsView() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isGroupCreator, setIsGroupCreator] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkShared, setLinkShared] = useState(false);
  const [nameStatus, setNameStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [nameError, setNameError] = useState<string | null>(null);

  const [deleteGroupConfirmOpen, setDeleteGroupConfirmOpen] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [deleteGroupError, setDeleteGroupError] = useState<string | null>(null);

  const [deleteAccountConfirmOpen, setDeleteAccountConfirmOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);

  const [avatarColor, setAvatarColor] = useState<string | null>(null);
  const [colorStatus, setColorStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

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
        .select("display_name, group_id, avatar_color, avatar_url, groups(name, invite_code, created_by)")
        .eq("id", data.user.id)
        .single();
      setDisplayName(profile?.display_name ?? "");
      setAvatarColor(profile?.avatar_color ?? null);
      setAvatarUrl(profile?.avatar_url ?? null);
      setGroupId(profile?.group_id ?? null);
      const group = profile?.groups as unknown as {
        name: string;
        invite_code: string;
        created_by: string | null;
      } | null;
      setGroupName(group?.name ?? "");
      setInviteCode(group?.invite_code ?? "");
      setIsGroupCreator(!!group?.created_by && group.created_by === data.user.id);
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

  function handleAvatarFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarError(null);
    setCropSrc(URL.createObjectURL(file));
  }

  async function handleSaveAvatar(blob: Blob) {
    setAvatarSaving(true);
    setAvatarError(null);

    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;

    try {
      const url = await uploadAvatar(supabase, data.user.id, blob);
      const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", data.user.id);
      if (error) throw error;
      setAvatarUrl(url);
      if (cropSrc) URL.revokeObjectURL(cropSrc);
      setCropSrc(null);
    } catch {
      setAvatarError("Couldn't save that photo. Try again.");
    } finally {
      setAvatarSaving(false);
    }
  }

  function handleCancelCrop() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  async function handleShareInviteLink() {
    // ?group=&code= is read by SignUpForm/OnboardingView to pre-fill "Join
    // a Group" - the invite code alone isn't enough to identify which group,
    // since verify_group_invite needs both.
    const url = `${window.location.origin}/sign-up?group=${groupId}&code=${encodeURIComponent(inviteCode)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Join ${groupName} on Men's Group`, url });
      } catch {
        // User cancelled the share sheet - not an error.
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    setLinkShared(true);
    setTimeout(() => setLinkShared(false), 1500);
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

  async function handleDeleteGroup() {
    if (!groupId) return;
    setDeletingGroup(true);
    setDeleteGroupError(null);

    const supabase = createClient();
    const { error } = await supabase.from("groups").delete().eq("id", groupId);

    if (error) {
      setDeleteGroupError(error.message);
      setDeletingGroup(false);
      return;
    }

    setDeleteGroupConfirmOpen(false);
    // The group (and this account's own membership in it) is gone, so there's
    // nothing left for this session to show - sign out rather than leave the
    // app sitting on a now-groupless profile with no recovery flow yet.
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  async function handleDeleteAccount() {
    setDeletingAccount(true);
    setDeleteAccountError(null);

    const supabase = createClient();
    const { error } = await supabase.rpc("delete_own_account");

    if (error) {
      setDeleteAccountError(error.message);
      setDeletingAccount(false);
      return;
    }

    setDeleteAccountConfirmOpen(false);
    // The account is already gone server-side at this point, so the auth
    // server has nothing left to invalidate - signOut()'s own network call
    // predictably 403s. It still clears the local session either way, which
    // is all that's left to do, so the failure is expected and safe to ignore.
    await supabase.auth.signOut().catch(() => {});
    router.push("/sign-in");
    router.refresh();
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
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="space-y-3 rounded-2xl border border-border/60 bg-white p-4 shadow-sm"
      >
        <h2 className="font-semibold text-primary">Profile</h2>
        <p className="text-sm text-muted">{email}</p>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar name={displayName || email} color={avatarColor} imageUrl={avatarUrl} size={64} />
            <button
              type="button"
              onClick={() => avatarFileInputRef.current?.click()}
              aria-label="Change photo"
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white shadow-sm ring-2 ring-white transition-transform active:scale-90"
            >
              <Camera size={14} weight="fill" />
            </button>
            <input
              ref={avatarFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFileSelected}
            />
          </div>
          {avatarError && (
            <p className="flex items-center gap-1.5 text-sm text-accent">
              <WarningCircle size={16} className="shrink-0" />
              {avatarError}
            </p>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <p className="text-sm font-medium text-secondary">Fallback color</p>
            {colorStatus === "saved" && (
              <p className="flex items-center gap-1 text-xs text-teal">
                <CheckCircle size={14} /> Saved
              </p>
            )}
          </div>
          <p className="mb-2 text-xs text-muted">Shown when you don&apos;t have a photo set.</p>
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
        </div>

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
      </motion.section>

      <NotificationSettings />

      {inviteCode && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.12, ease: "easeOut" }}
          className="space-y-3 rounded-2xl border border-border/60 bg-white p-4 shadow-sm"
        >
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
          <Button type="button" variant="secondary" onClick={handleShareInviteLink} className="w-full">
            {linkShared ? <CheckCircle size={16} /> : <ShareNetwork size={16} />}
            {linkShared ? "Link copied" : "Share invite link"}
          </Button>
          <Link
            href="/settings/members"
            className="flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2.5 text-secondary transition-colors hover:bg-surface-muted"
          >
            <UsersThree size={18} />
            <span className="flex-1 text-sm font-medium">View members</span>
            <CaretRight size={16} className="text-muted" />
          </Link>
        </motion.section>
      )}

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.18, ease: "easeOut" }}
        className="space-y-3 rounded-2xl border border-border/60 bg-white p-4 shadow-sm"
      >
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
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.24, ease: "easeOut" }}
        className="space-y-4 rounded-2xl border border-accent/30 bg-accent/5 p-4 shadow-sm"
      >
        <h2 className="font-semibold text-accent">Danger zone</h2>

        {isGroupCreator && (
          <div className="space-y-3 border-b border-accent/20 pb-4">
            <p className="text-sm text-secondary">
              Permanently delete {groupName}{" "}
              and everything in it - the calendar, topics, and chat. Other members will be removed
              from the group too. This can&apos;t be undone.
            </p>
            {deleteGroupError && (
              <p className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
                <WarningCircle size={16} className="shrink-0" />
                {deleteGroupError}
              </p>
            )}
            <Button type="button" variant="danger" onClick={() => setDeleteGroupConfirmOpen(true)}>
              <Trash size={16} /> Delete group
            </Button>
          </div>
        )}

        <div className="space-y-3">
          <p className="text-sm text-secondary">
            {isGroupCreator
              ? "Delete your group above before you can delete your account."
              : "Permanently delete your account. Topics, events, and messages you've posted will stay, just credited to \"Someone\" instead of your name."}
          </p>
          {deleteAccountError && (
            <p className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
              <WarningCircle size={16} className="shrink-0" />
              {deleteAccountError}
            </p>
          )}
          <Button
            type="button"
            variant="danger"
            disabled={isGroupCreator}
            onClick={() => setDeleteAccountConfirmOpen(true)}
          >
            <Trash size={16} /> Delete account
          </Button>
        </div>
      </motion.section>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.3, ease: "easeOut" }}
      >
        <SignOutButton />
      </motion.div>

      <ConfirmSheet
        open={deleteGroupConfirmOpen}
        title={`Delete ${groupName}?`}
        description="This permanently deletes the group's calendar, topics, and chat, and removes every member (including you). This can't be undone."
        confirmLabel={deletingGroup ? "Deleting..." : "Delete group"}
        onConfirm={handleDeleteGroup}
        onCancel={() => setDeleteGroupConfirmOpen(false)}
      />

      <ConfirmSheet
        open={deleteAccountConfirmOpen}
        title="Delete your account?"
        description="This can't be undone. You'll be signed out and removed from the group; anything you've posted stays, credited to &quot;Someone&quot;."
        confirmLabel={deletingAccount ? "Deleting..." : "Delete account"}
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeleteAccountConfirmOpen(false)}
      />

      {cropSrc && (
        <AvatarCropModal
          imageSrc={cropSrc}
          saving={avatarSaving}
          onCancel={handleCancelCrop}
          onSave={handleSaveAvatar}
        />
      )}
    </div>
  );
}
