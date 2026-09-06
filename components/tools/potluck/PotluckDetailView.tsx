"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CalendarBlank,
  CalendarPlus,
  LinkBreak,
  LockSimple,
  LockSimpleOpen,
  PaperPlaneTilt,
  Plus,
  Trash,
  X,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentMembership } from "@/lib/supabase/current-membership";
import { shareToChat } from "@/lib/supabase/shareToChat";
import { isAdminEmail } from "@/lib/admin";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { EventPickerSheet, type PickableEvent } from "@/components/ui/EventPickerSheet";
import { cn, startOfToday } from "@/lib/utils";
import type { Potluck, PotluckItem } from "@/lib/types";

const CATEGORIES = ["Main", "Side", "Dessert", "Drink", "Other"];

export function PotluckDetailView({ potluckId }: { potluckId: string }) {
  const router = useRouter();
  const [potluck, setPotluck] = useState<Potluck | null>(null);
  const [items, setItems] = useState<PotluckItem[] | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState(CATEGORIES[0]);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmShare, setConfirmShare] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [linkedEvent, setLinkedEvent] = useState<PickableEvent | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickableEvents, setPickableEvents] = useState<PickableEvent[] | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const membership = await getCurrentMembership(supabase);
    if (!membership) return;
    setUserId(membership.userId);
    setGroupId(membership.groupId);
    setEmail(membership.email);

    const [{ data: potluckData }, { data: itemsData }, { data: eventData }] = await Promise.all([
      supabase.from("potlucks").select("*").eq("id", potluckId).is("archived_at", null).single(),
      supabase
        .from("potluck_items")
        .select("*, claimed_by_profile:profiles!potluck_items_claimed_by_fkey(display_name, avatar_color, avatar_url)")
        .eq("potluck_id", potluckId)
        .is("archived_at", null)
        .order("created_at", { ascending: true }),
      supabase
        .from("events")
        .select("id, title, starts_at")
        .eq("potluck_id", potluckId)
        .is("archived_at", null)
        .maybeSingle(),
    ]);

    if (potluckData) {
      setPotluck(potluckData);
      setTitleValue(potluckData.title);
    }
    setItems(itemsData ?? []);
    setLinkedEvent(eventData ?? null);
  }, [potluckId]);

  useEffect(() => {
    function init() {
      load();
    }
    init();
  }, [load]);

  // Claiming/unclaiming and adding items stay open to every member (blocked
  // only once signups are closed, enforced server-side too - see
  // restrict_potluck_item_edits() in 0049_potluck_multi_instance.sql).
  // Renaming/removing an item, closing signups, editing the title, and
  // deleting the potluck are all limited to whoever created it or an admin.
  const canEdit = !!potluck && (isAdminEmail(email) || potluck.created_by === userId);
  const signupsClosed = !potluck || potluck.closed;

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItemName.trim() || !userId || signupsClosed) return;
    setAdding(true);
    const supabase = createClient();
    // group_id is derived server-side from potluck_id (see
    // derive_potluck_item_group_id() in 0051) - not this insert's job.
    await supabase.from("potluck_items").insert({
      potluck_id: potluckId,
      item_name: newItemName.trim(),
      category: newItemCategory,
      created_by: userId,
    });
    setNewItemName("");
    setAdding(false);
    load();
  }

  async function handleClaim(item: PotluckItem) {
    if (!userId || signupsClosed) return;
    const supabase = createClient();
    await supabase.from("potluck_items").update({ claimed_by: userId }).eq("id", item.id);
    load();
  }

  async function handleRelease(item: PotluckItem) {
    if (signupsClosed) return;
    const supabase = createClient();
    await supabase.from("potluck_items").update({ claimed_by: null }).eq("id", item.id);
    load();
  }

  async function handleDeleteItem(item: PotluckItem) {
    const supabase = createClient();
    await supabase.from("potluck_items").update({ archived_at: new Date().toISOString() }).eq("id", item.id);
    load();
  }

  function startEdit(item: PotluckItem) {
    setEditingId(item.id);
    setEditValue(item.item_name);
  }

  async function submitEdit(itemId: string) {
    const trimmed = editValue.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    const supabase = createClient();
    await supabase.from("potluck_items").update({ item_name: trimmed }).eq("id", itemId);
    setEditingId(null);
    load();
  }

  async function toggleClosed() {
    if (!potluck) return;
    const supabase = createClient();
    await supabase.from("potlucks").update({ closed: !potluck.closed }).eq("id", potluck.id);
    load();
  }

  async function submitTitleEdit() {
    const trimmed = titleValue.trim();
    setEditingTitle(false);
    if (!potluck || !trimmed || trimmed === potluck.title) return;
    const supabase = createClient();
    await supabase.from("potlucks").update({ title: trimmed }).eq("id", potluck.id);
    load();
  }

  async function handleShare() {
    if (!potluck || !userId || !groupId) return;
    setConfirmShare(false);
    const itemCount = items?.length ?? 0;
    const supabase = createClient();
    await shareToChat(supabase, {
      groupId,
      userId,
      kind: "potluck",
      refId: potluck.id,
      title: potluck.title,
      subtitle: `${itemCount} ${itemCount === 1 ? "item" : "items"}${potluck.closed ? " · Closed" : ""}`,
    });
    router.push("/chat");
  }

  async function openEventPicker() {
    if (!groupId) return;
    setPickerOpen(true);
    setPickableEvents(null);
    const supabase = createClient();
    const { data } = await supabase
      .from("events")
      .select("id, title, starts_at")
      .eq("group_id", groupId)
      .is("archived_at", null)
      .gte("starts_at", startOfToday().toISOString())
      .order("starts_at", { ascending: true })
      .limit(20);
    setPickableEvents(data ?? []);
  }

  async function handlePickEvent(eventId: string) {
    const supabase = createClient();
    // A potluck links to at most one event (events_potluck_id_key in
    // 0052_link_potluck_to_event.sql) - clear wherever it's currently
    // attached before pointing a different event at it, so re-picking moves
    // the link instead of colliding with the unique index.
    await supabase.from("events").update({ potluck_id: null }).eq("potluck_id", potluckId);
    await supabase.from("events").update({ potluck_id: potluckId }).eq("id", eventId);
    setPickerOpen(false);
    load();
  }

  async function handleUnlinkEvent() {
    const supabase = createClient();
    await supabase.from("events").update({ potluck_id: null }).eq("potluck_id", potluckId);
    load();
  }

  async function handleDeletePotluck() {
    const supabase = createClient();
    await supabase.from("potlucks").update({ archived_at: new Date().toISOString() }).eq("id", potluckId);
    setConfirmDelete(false);
    router.push("/tools/potluck");
    router.refresh();
  }

  if (!potluck || items === null) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-2">
        {editingTitle ? (
          <input
            autoFocus
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={submitTitleEdit}
            onKeyDown={(e) => e.key === "Enter" && submitTitleEdit()}
            className="min-w-0 flex-1 rounded-xl border border-border bg-white px-3 py-2 text-lg font-semibold text-primary outline-none focus:border-primary"
          />
        ) : canEdit ? (
          <button
            type="button"
            onClick={() => setEditingTitle(true)}
            className="min-w-0 flex-1 text-left text-lg font-semibold text-primary"
          >
            {potluck.title}
          </button>
        ) : (
          <p className="min-w-0 flex-1 text-lg font-semibold text-primary">{potluck.title}</p>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted">
          {items.length} {items.length === 1 ? "item" : "items"} {potluck.closed && "· Signups closed"}
        </p>
        <button
          type="button"
          onClick={() => setConfirmShare(true)}
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm text-secondary transition-colors hover:bg-surface-muted"
        >
          <PaperPlaneTilt size={16} /> Share to chat
        </button>
      </div>

      {linkedEvent ? (
        <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-white p-3 shadow-sm">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal/10 text-teal">
            <CalendarBlank size={18} />
          </span>
          <Link href="/calendar" className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-primary">{linkedEvent.title}</span>
            <span className="block text-xs text-muted">
              Attached to{" "}
              {new Date(linkedEvent.starts_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          </Link>
          <button
            type="button"
            onClick={handleUnlinkEvent}
            aria-label="Remove from calendar event"
            className="shrink-0 rounded-full p-1.5 text-muted transition-colors hover:bg-accent/10 hover:text-accent"
          >
            <LinkBreak size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={openEventPicker}
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border px-3 py-2.5 text-sm font-medium text-secondary transition-colors hover:bg-surface-muted"
        >
          <CalendarPlus size={16} /> Add to a calendar event
        </button>
      )}

      <form
        onSubmit={handleAddItem}
        className="space-y-2 rounded-2xl border border-border/60 bg-white p-4 shadow-sm"
      >
        <p className="text-sm font-medium text-secondary">What are you bringing?</p>
        <div className="flex gap-2">
          <input
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="e.g. Mac and cheese"
            disabled={signupsClosed}
            className="min-w-0 flex-1 rounded-xl border border-border bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
          />
          <select
            value={newItemCategory}
            onChange={(e) => setNewItemCategory(e.target.value)}
            disabled={signupsClosed}
            className="shrink-0 rounded-xl border border-border bg-white px-2 py-2.5 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={adding || !newItemName.trim() || signupsClosed} className="w-full">
          <Plus size={16} /> {adding ? "Adding..." : "Add to the list"}
        </Button>
      </form>

      <div className="space-y-2">
        {items.map((item, i) => {
          const isMine = item.claimed_by === userId;
          const canEditItem = isAdminEmail(email) || item.created_by === userId;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(i, 8) * 0.04, ease: "easeOut" }}
              className="flex items-center gap-2 rounded-2xl border border-border/60 bg-white p-3 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                {editingId === item.id ? (
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => submitEdit(item.id)}
                    onKeyDown={(e) => e.key === "Enter" && submitEdit(item.id)}
                    className="w-full rounded-lg border border-border px-2 py-1 text-sm outline-none focus:border-primary"
                  />
                ) : canEditItem ? (
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    className="block truncate text-left font-medium text-primary"
                  >
                    {item.item_name}
                  </button>
                ) : (
                  <p className="truncate font-medium text-primary">{item.item_name}</p>
                )}
                <div className="mt-1 flex items-center gap-1.5">
                  {item.category && (
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-secondary">
                      {item.category}
                    </span>
                  )}
                  {item.claimed_by_profile && (
                    <span className="flex items-center gap-1">
                      <Avatar
                        name={item.claimed_by_profile.display_name}
                        color={item.claimed_by_profile.avatar_color}
                        imageUrl={item.claimed_by_profile.avatar_url}
                        size={16}
                      />
                      <span className="text-xs text-muted">
                        {isMine ? "You" : item.claimed_by_profile.display_name}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {item.claimed_by ? (
                <button
                  type="button"
                  onClick={() => handleRelease(item)}
                  disabled={signupsClosed && !isMine}
                  aria-label="Release this item"
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-default disabled:opacity-50",
                    isMine
                      ? "bg-primary/10 text-primary hover:bg-primary/20"
                      : "bg-surface-muted text-secondary hover:bg-border/60"
                  )}
                >
                  {isMine ? "Unclaim" : <X size={14} />}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleClaim(item)}
                  disabled={signupsClosed}
                  className="shrink-0 rounded-full bg-primary px-2.5 py-1.5 text-xs font-medium text-white shadow-sm shadow-primary/30 disabled:opacity-50"
                >
                  Claim
                </button>
              )}
              {canEditItem && (
                <button
                  type="button"
                  onClick={() => handleDeleteItem(item)}
                  aria-label={`Delete ${item.item_name}`}
                  className="shrink-0 rounded-full p-1.5 text-muted transition-colors hover:bg-accent/10 hover:text-accent"
                >
                  <Trash size={16} />
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      {canEdit && (
        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={toggleClosed} className="flex-1">
            {potluck.closed ? <LockSimpleOpen size={16} /> : <LockSimple size={16} />}
            {potluck.closed ? "Reopen signups" : "Close signups"}
          </Button>
          <Button type="button" variant="danger" onClick={() => setConfirmDelete(true)} className="flex-1">
            <Trash size={16} /> Delete potluck
          </Button>
        </div>
      )}

      <ConfirmSheet
        open={confirmDelete}
        title="Delete this potluck?"
        description="This removes the list and everything on it. This can't be undone."
        confirmLabel="Delete"
        onConfirm={handleDeletePotluck}
        onCancel={() => setConfirmDelete(false)}
      />
      <ConfirmSheet
        open={confirmShare}
        title="Share to chat?"
        description={`Everyone in the group will see "${potluck.title}" in the chat and can sign up right from there.`}
        confirmLabel="Share"
        confirmVariant="primary"
        onConfirm={handleShare}
        onCancel={() => setConfirmShare(false)}
      />
      <EventPickerSheet
        open={pickerOpen}
        events={pickableEvents}
        onPick={handlePickEvent}
        onCancel={() => setPickerOpen(false)}
      />
    </div>
  );
}
