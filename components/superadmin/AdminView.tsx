"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CaretDown,
  Copy,
  Crown,
  MagnifyingGlass,
  PencilSimple,
  SignOut,
  Trash,
  UsersThree,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { TypedConfirmDialog } from "@/components/admin/TypedConfirmDialog";
import { cn, formatDate } from "@/lib/utils";
import {
  deleteGroupAction,
  deleteUserAccountAction,
  getAdminData,
  getUnassignedUsers,
  removeUserFromGroupAction,
  renameGroupAction,
  type AdminGroup,
  type AdminMember,
} from "@/app/admin/actions";

type PendingDelete =
  | { kind: "group"; group: AdminGroup }
  | { kind: "removeMember"; member: AdminMember; groupName: string }
  | { kind: "deleteAccount"; member: AdminMember };

export function AdminView() {
  const [groups, setGroups] = useState<AdminGroup[] | null>(null);
  const [unassigned, setUnassigned] = useState<AdminMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    try {
      const [groupData, unassignedData] = await Promise.all([getAdminData(), getUnassignedUsers()]);
      setGroups(groupData);
      setUnassigned(unassignedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    function init() {
      load();
    }
    init();
  }, [load]);

  const filteredGroups = useMemo(() => {
    if (!groups) return null;
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.profiles.some((p) => p.display_name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q))
    );
  }, [groups, query]);

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function startRename(group: AdminGroup) {
    setRenamingId(group.id);
    setRenameValue(group.name);
  }

  async function submitRename(groupId: string) {
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    setWorking(true);
    try {
      await renameGroupAction(groupId, trimmed);
      setRenamingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rename failed");
    } finally {
      setWorking(false);
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setWorking(true);
    try {
      if (pendingDelete.kind === "group") {
        await deleteGroupAction(pendingDelete.group.id);
      } else if (pendingDelete.kind === "removeMember") {
        await removeUserFromGroupAction(pendingDelete.member.id);
      } else {
        await deleteUserAccountAction(pendingDelete.member.id);
      }
      setPendingDelete(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setWorking(false);
    }
  }

  if (groups === null || unassigned === null) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  const totalMembers = groups.reduce((sum, g) => sum + g.profiles.length, 0) + unassigned.length;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-primary">Admin</h1>
        <a href="/calendar" className="flex items-center gap-1.5 text-sm text-secondary hover:text-primary">
          <SignOut size={16} /> Back to app
        </a>
      </div>

      <div className="flex gap-3 text-sm text-secondary">
        <span>{groups.length} groups</span>
        <span>&middot;</span>
        <span>{totalMembers} users</span>
      </div>

      {error && (
        <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">{error}</p>
      )}

      <div className="relative">
        <MagnifyingGlass size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search groups or people..."
          className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-3 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="space-y-3">
        {filteredGroups?.map((group) => {
          const isOpen = expanded.has(group.id);
          const isRenaming = renamingId === group.id;
          return (
            <motion.div
              key={group.id}
              layout
              className="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm"
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {isRenaming ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          autoFocus
                          className="w-full rounded-lg border border-border px-2 py-1 text-sm font-semibold outline-none focus:border-primary"
                        />
                        <Button
                          variant="secondary"
                          className="shrink-0 px-2 py-1 text-xs"
                          disabled={working}
                          onClick={() => submitRename(group.id)}
                        >
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          className="shrink-0 px-2 py-1 text-xs"
                          onClick={() => setRenamingId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(group.id)}
                        className="flex w-full items-center gap-1.5 text-left"
                      >
                        <motion.span animate={{ rotate: isOpen ? 180 : 0 }} className="shrink-0 text-muted">
                          <CaretDown size={16} />
                        </motion.span>
                        <span className="truncate font-semibold text-primary">{group.name}</span>
                      </button>
                    )}
                    <p className="mt-1 text-xs text-muted">
                      Created {formatDate(new Date(group.created_at))} &middot; {group.profiles.length}{" "}
                      {group.profiles.length === 1 ? "member" : "members"}
                    </p>
                  </div>
                  {!isRenaming && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        aria-label="Rename group"
                        onClick={() => startRename(group)}
                        className="rounded-full p-1.5 text-secondary transition-colors hover:bg-surface-muted"
                      >
                        <PencilSimple size={16} />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete group"
                        onClick={() => setPendingDelete({ kind: "group", group })}
                        className="rounded-full p-1.5 text-accent transition-colors hover:bg-accent/10"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-1.5">
                  <code className="rounded bg-background/60 px-1.5 py-0.5 font-mono text-xs text-secondary">
                    {group.invite_code}
                  </code>
                  <button
                    type="button"
                    aria-label="Copy invite code"
                    onClick={() => navigator.clipboard.writeText(group.invite_code)}
                    className="text-muted transition-colors hover:text-secondary"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="space-y-2 border-t border-border/60 bg-background/40 p-3">
                  {group.profiles.length === 0 ? (
                    <p className="px-1 py-2 text-sm text-muted">No members.</p>
                  ) : (
                    group.profiles.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between gap-2 rounded-xl bg-white p-2.5 shadow-sm"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-sm font-medium text-primary">{member.display_name}</p>
                            {member.id === group.created_by && (
                              <Crown size={12} weight="fill" className="shrink-0 text-highlight" />
                            )}
                          </div>
                          <p className="truncate text-xs text-muted">{member.email}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            aria-label={`Remove ${member.display_name} from group`}
                            onClick={() => setPendingDelete({ kind: "removeMember", member, groupName: group.name })}
                            className="rounded-full p-1.5 text-secondary transition-colors hover:bg-surface-muted"
                          >
                            <UsersThree size={14} />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${member.display_name}'s account`}
                            onClick={() => setPendingDelete({ kind: "deleteAccount", member })}
                            className="rounded-full p-1.5 text-accent transition-colors hover:bg-accent/10"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </motion.div>
          );
        })}

        {filteredGroups?.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">No groups match &quot;{query}&quot;.</p>
        )}
      </div>

      {unassigned.length > 0 && (
        <div className={cn("space-y-2 rounded-2xl border border-border/60 bg-white p-4 shadow-sm")}>
          <h2 className="font-semibold text-primary">Unassigned users</h2>
          <p className="text-xs text-muted">Signed up but not in a group.</p>
          <div className="space-y-2">
            {unassigned.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-background/40 p-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-primary">{member.display_name}</p>
                  <p className="truncate text-xs text-muted">{member.email}</p>
                </div>
                <button
                  type="button"
                  aria-label={`Delete ${member.display_name}'s account`}
                  onClick={() => setPendingDelete({ kind: "deleteAccount", member })}
                  className="shrink-0 rounded-full p-1.5 text-accent transition-colors hover:bg-accent/10"
                >
                  <Trash size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <TypedConfirmDialog
        open={pendingDelete !== null}
        pending={working}
        title={
          pendingDelete?.kind === "group"
            ? `Delete group "${pendingDelete.group.name}"?`
            : pendingDelete?.kind === "removeMember"
              ? `Remove ${pendingDelete.member.display_name} from ${pendingDelete.groupName}?`
              : pendingDelete?.kind === "deleteAccount"
                ? `Delete ${pendingDelete.member.display_name}'s account?`
                : ""
        }
        description={
          pendingDelete?.kind === "group"
            ? "Permanently deletes the group's calendar, topics, and chat. Members keep their accounts but lose this group."
            : pendingDelete?.kind === "removeMember"
              ? "They keep their account and can join or create another group next time they open the app."
              : pendingDelete?.kind === "deleteAccount"
                ? "Permanently deletes their login. Content they posted stays, credited to \"Someone\". This can't be undone."
                : undefined
        }
        confirmWord={
          pendingDelete?.kind === "group"
            ? pendingDelete.group.name
            : pendingDelete?.kind === "removeMember" || pendingDelete?.kind === "deleteAccount"
              ? pendingDelete.member.email
              : ""
        }
        confirmLabel={pendingDelete?.kind === "removeMember" ? "Remove" : "Delete"}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
