"use client";

import { useCallback, useEffect, useId, useState } from "react";
import Link from "next/link";
import { ForkKnife, Plus } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentMembership } from "@/lib/supabase/current-membership";
import { Avatar } from "@/components/Avatar";
import { cn } from "@/lib/utils";
import type { PotluckItem } from "@/lib/types";

const MAX_VISIBLE_ITEMS = 6;

// Renders the group's shared potluck list live in chat, same idea as
// InlinePollCard - lets people add what they're bringing and claim/unclaim
// an item without leaving the thread. Unlike a poll (one row per share),
// there's only ever one ongoing potluck list per group, so every "potluck"
// share renders the same live list rather than being tied to a specific
// message. Renaming/removing an item stays a Potluck-tool-only action (see
// restrict_potluck_item_edits() in 0046) - this card only covers the two
// actions meant to stay open to everyone: adding and claiming.
export function InlinePotluckCard({ currentUserId }: { currentUserId: string }) {
  // There's only one potluck list per group, so every share of it in chat
  // resolves to the same groupId - if the channel topic were keyed on that
  // alone, a second shared-list message would try to .on() a channel the
  // first one already .subscribe()'d (Supabase's client reuses channel
  // objects by topic name), which throws and crashes the whole page. The
  // instance-unique suffix keeps every card's channel independent.
  const instanceId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [groupId, setGroupId] = useState<string | null>(null);
  const [items, setItems] = useState<PotluckItem[] | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async (gid: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("potluck_items")
      .select("*, claimed_by_profile:profiles!potluck_items_claimed_by_fkey(display_name, avatar_color, avatar_url)")
      .eq("group_id", gid)
      .is("archived_at", null)
      .order("created_at", { ascending: true });
    setItems(data ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    function init() {
      const supabase = createClient();
      getCurrentMembership(supabase).then((membership) => {
        if (!membership || cancelled) return;
        setGroupId(membership.groupId);
        load(membership.groupId);
      });
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    if (!groupId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`inline_potluck_${groupId}_${instanceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "potluck_items", filter: `group_id=eq.${groupId}` },
        () => load(groupId)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, load, instanceId]);

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItemName.trim() || !groupId) return;
    setAdding(true);
    const supabase = createClient();
    await supabase.from("potluck_items").insert({
      item_name: newItemName.trim(),
      created_by: currentUserId,
      group_id: groupId,
    });
    setNewItemName("");
    setAdding(false);
    load(groupId);
  }

  async function handleClaim(item: PotluckItem) {
    if (!groupId) return;
    const supabase = createClient();
    await supabase.from("potluck_items").update({ claimed_by: currentUserId }).eq("id", item.id);
    load(groupId);
  }

  async function handleRelease(item: PotluckItem) {
    if (!groupId) return;
    const supabase = createClient();
    await supabase.from("potluck_items").update({ claimed_by: null }).eq("id", item.id);
    load(groupId);
  }

  if (items === null) {
    return <div className="h-24 w-[280px] max-w-full animate-pulse rounded-2xl bg-surface-muted" />;
  }

  const visibleItems = items.slice(0, MAX_VISIBLE_ITEMS);
  const hiddenCount = items.length - visibleItems.length;

  return (
    <div className="w-[280px] max-w-full space-y-2 rounded-2xl bg-white p-3 shadow-sm">
      <Link
        href="/tools/potluck"
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-1.5 text-sm font-medium text-primary"
      >
        <ForkKnife size={16} weight="duotone" className="shrink-0" />
        <span className="truncate">Potluck list</span>
      </Link>

      {items.length === 0 ? (
        <p className="text-xs text-muted">Nothing on the list yet - add the first item below.</p>
      ) : (
        <div className="space-y-1.5">
          {visibleItems.map((item) => {
            const isMine = item.claimed_by === currentUserId;
            return (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded-xl border border-border bg-white p-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-secondary">{item.item_name}</p>
                  {item.claimed_by_profile && (
                    <span className="flex items-center gap-1">
                      <Avatar
                        name={item.claimed_by_profile.display_name}
                        color={item.claimed_by_profile.avatar_color}
                        imageUrl={item.claimed_by_profile.avatar_url}
                        size={14}
                      />
                      <span className="text-xs text-muted">
                        {isMine ? "You" : item.claimed_by_profile.display_name}
                      </span>
                    </span>
                  )}
                </div>
                {item.claimed_by ? (
                  <button
                    type="button"
                    onClick={() => handleRelease(item)}
                    disabled={!isMine}
                    aria-label={isMine ? "Unclaim this item" : `${item.item_name} is claimed`}
                    className={cn(
                      "shrink-0 rounded-full px-2 py-1 text-xs font-medium transition-colors disabled:cursor-default",
                      isMine
                        ? "bg-primary/10 text-primary hover:bg-primary/20"
                        : "bg-surface-muted text-muted"
                    )}
                  >
                    {isMine ? "Unclaim" : "Claimed"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleClaim(item)}
                    className="shrink-0 rounded-full bg-primary px-2 py-1 text-xs font-medium text-white shadow-sm shadow-primary/30"
                  >
                    Claim
                  </button>
                )}
              </div>
            );
          })}
          {hiddenCount > 0 && (
            <Link
              href="/tools/potluck"
              onClick={(e) => e.stopPropagation()}
              className="block text-center text-xs text-muted underline underline-offset-2"
            >
              +{hiddenCount} more · View full list
            </Link>
          )}
        </div>
      )}

      <form onSubmit={handleAddItem} className="flex items-center gap-1.5">
        <input
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          placeholder="What are you bringing?"
          className="min-w-0 flex-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="submit"
          disabled={adding || !newItemName.trim()}
          aria-label="Add item"
          className="shrink-0 rounded-lg bg-primary p-1.5 text-white shadow-sm shadow-primary/30 disabled:opacity-50"
        >
          <Plus size={16} />
        </button>
      </form>
    </div>
  );
}
