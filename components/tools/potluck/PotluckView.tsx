"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Broom, ForkKnife, Plus, Trash, X } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentMembership } from "@/lib/supabase/current-membership";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { cn } from "@/lib/utils";
import type { PotluckItem } from "@/lib/types";

const CATEGORIES = ["Main", "Side", "Dessert", "Drink", "Other"];

export function PotluckView() {
  const [items, setItems] = useState<PotluckItem[] | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState(CATEGORIES[0]);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [clearing, setClearing] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const membership = await getCurrentMembership(supabase);
    if (!membership) return;
    setUserId(membership.userId);
    setGroupId(membership.groupId);
    const { data } = await supabase
      .from("potluck_items")
      .select("*, claimed_by_profile:profiles!potluck_items_claimed_by_fkey(display_name, avatar_color, avatar_url)")
      .order("created_at", { ascending: true });
    setItems(data ?? []);
  }, []);

  useEffect(() => {
    function init() {
      load();
    }
    init();
  }, [load]);

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItemName.trim() || !groupId || !userId) return;
    setAdding(true);
    const supabase = createClient();
    await supabase.from("potluck_items").insert({
      item_name: newItemName.trim(),
      category: newItemCategory,
      created_by: userId,
      group_id: groupId,
    });
    setNewItemName("");
    setAdding(false);
    load();
  }

  async function handleClaim(item: PotluckItem) {
    if (!userId) return;
    const supabase = createClient();
    await supabase.from("potluck_items").update({ claimed_by: userId }).eq("id", item.id);
    load();
  }

  async function handleRelease(item: PotluckItem) {
    const supabase = createClient();
    await supabase.from("potluck_items").update({ claimed_by: null }).eq("id", item.id);
    load();
  }

  async function handleDelete(item: PotluckItem) {
    const supabase = createClient();
    await supabase.from("potluck_items").delete().eq("id", item.id);
    load();
  }

  // Clears the whole shared list at once, e.g. between potluck occasions -
  // this is the one bulk/irreversible action here, so it's the only thing
  // in this tool that gets a confirmation step.
  async function handleClearAll() {
    if (!groupId) return;
    setClearing(true);
    const supabase = createClient();
    await supabase.from("potluck_items").delete().eq("group_id", groupId);
    setClearing(false);
    setConfirmClearAll(false);
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

  if (items === null) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
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
            className="min-w-0 flex-1 rounded-xl border border-border bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <select
            value={newItemCategory}
            onChange={(e) => setNewItemCategory(e.target.value)}
            className="shrink-0 rounded-xl border border-border bg-white px-2 py-2.5 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={adding || !newItemName.trim()} className="w-full">
          <Plus size={16} /> {adding ? "Adding..." : "Add to the list"}
        </Button>
      </form>

      {items.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-secondary">
            {items.length} {items.length === 1 ? "item" : "items"}
          </p>
          <button
            type="button"
            onClick={() => setConfirmClearAll(true)}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm text-accent transition-colors hover:bg-accent/10"
          >
            <Broom size={16} /> Clear all
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={ForkKnife}
          title="Nothing on the list yet"
          subtitle="Add the first item above so people can claim what they're bringing."
        />
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => {
            const isMine = item.claimed_by === userId;
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
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="block truncate text-left font-medium text-primary"
                    >
                      {item.item_name}
                    </button>
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
                    aria-label="Release this item"
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors",
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
                    className="shrink-0 rounded-full bg-primary px-2.5 py-1.5 text-xs font-medium text-white shadow-sm shadow-primary/30"
                  >
                    Claim
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  aria-label={`Delete ${item.item_name}`}
                  className="shrink-0 rounded-full p-1.5 text-muted transition-colors hover:bg-accent/10 hover:text-accent"
                >
                  <Trash size={16} />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      <ConfirmSheet
        open={confirmClearAll}
        title="Clear the whole list?"
        description="Removes every item, including what people have claimed. Good for starting fresh before the next potluck - this can't be undone."
        confirmLabel={clearing ? "Clearing..." : "Clear all"}
        onConfirm={handleClearAll}
        onCancel={() => setConfirmClearAll(false)}
      />
    </div>
  );
}
