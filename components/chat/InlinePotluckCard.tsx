"use client";

import { useCallback, useEffect, useId, useState } from "react";
import Link from "next/link";
import { ForkKnife, LockSimple, Plus } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/Avatar";
import type { PotluckItem } from "@/lib/types";

const MAX_VISIBLE_ITEMS = 6;

type PotluckRow = {
  id: string;
  title: string;
  closed: boolean;
  archived_at: string | null;
};

// Renders one potluck list live in chat, same idea as InlinePollCard - lets
// people add what they're bringing without leaving the thread, kept in sync
// via a realtime subscription scoped to this one potluck. Adding an item
// *is* signing up to bring it - there's no separate claim step, so whoever
// typed it in is who the card shows next to it. Renaming/removing an item
// (or closing/deleting the whole list) stays a Potluck-page-only action.
export function InlinePotluckCard({ potluckId, currentUserId }: { potluckId: string; currentUserId: string }) {
  // If the same potluck gets shared to chat more than once, each share
  // resolves to the same potluckId - if the channel topic were keyed on
  // that alone, the second card's .on() would land on a channel the first
  // card already .subscribe()'d (Supabase's client reuses channel objects
  // by topic name), which throws and crashes the whole page. The
  // instance-unique suffix keeps every card's channel independent.
  const instanceId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [potluck, setPotluck] = useState<PotluckRow | null | undefined>(undefined);
  const [items, setItems] = useState<PotluckItem[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: potluckData }, { data: itemsData }] = await Promise.all([
      supabase.from("potlucks").select("id, title, closed, archived_at").eq("id", potluckId).maybeSingle(),
      supabase
        .from("potluck_items")
        .select("*, created_by_profile:profiles!potluck_items_created_by_fkey(display_name, avatar_color, avatar_url)")
        .eq("potluck_id", potluckId)
        .is("archived_at", null)
        .order("created_at", { ascending: true }),
    ]);
    setPotluck(potluckData ?? null);
    setItems(itemsData ?? []);
  }, [potluckId]);

  useEffect(() => {
    function init() {
      load();
    }
    init();
    const supabase = createClient();
    const channel = supabase
      .channel(`inline_potluck_${potluckId}_${instanceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "potluck_items", filter: `potluck_id=eq.${potluckId}` },
        load
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "potlucks", filter: `id=eq.${potluckId}` },
        load
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [potluckId, load, instanceId]);

  const signupsClosed = !potluck || potluck.closed || potluck.archived_at !== null;

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItemName.trim() || signupsClosed) return;
    setAdding(true);
    const supabase = createClient();
    await supabase.from("potluck_items").insert({
      potluck_id: potluckId,
      item_name: newItemName.trim(),
      created_by: currentUserId,
    });
    setNewItemName("");
    setAdding(false);
    load();
  }

  if (potluck === undefined) {
    return <div className="h-24 w-[280px] max-w-full animate-pulse rounded-2xl bg-surface-muted" />;
  }

  if (potluck === null) {
    return (
      <div className="flex w-[280px] max-w-full items-center gap-2.5 rounded-2xl bg-white px-3 py-2.5 shadow-sm">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ForkKnife size={18} weight="duotone" />
        </span>
        <span className="text-sm text-muted">This potluck was deleted</span>
      </div>
    );
  }

  const visibleItems = items.slice(0, MAX_VISIBLE_ITEMS);
  const hiddenCount = items.length - visibleItems.length;

  return (
    <div className="w-[280px] max-w-full space-y-2 rounded-2xl bg-white p-3 shadow-sm">
      <Link
        href={`/tools/potluck/${potluckId}`}
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-1.5 text-sm font-medium text-primary"
      >
        <ForkKnife size={16} weight="duotone" className="shrink-0" />
        <span className="truncate">{potluck.title}</span>
      </Link>

      {items.length === 0 ? (
        <p className="text-xs text-muted">Nothing on the list yet - add the first item below.</p>
      ) : (
        <div className="space-y-1.5">
          {visibleItems.map((item) => {
            const isMine = item.created_by === currentUserId;
            return (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded-xl border border-border bg-white p-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-secondary">{item.item_name}</p>
                  {item.created_by_profile && (
                    <span className="flex items-center gap-1">
                      <Avatar
                        name={item.created_by_profile.display_name}
                        color={item.created_by_profile.avatar_color}
                        imageUrl={item.created_by_profile.avatar_url}
                        size={14}
                      />
                      <span className="text-xs text-muted">
                        {isMine ? "You" : item.created_by_profile.display_name}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {hiddenCount > 0 && (
            <Link
              href={`/tools/potluck/${potluckId}`}
              onClick={(e) => e.stopPropagation()}
              className="block text-center text-xs text-muted underline underline-offset-2"
            >
              +{hiddenCount} more · View full list
            </Link>
          )}
        </div>
      )}

      {signupsClosed ? (
        <p className="flex items-center gap-1 text-xs text-muted">
          <LockSimple size={11} /> Signups closed
        </p>
      ) : (
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
      )}
    </div>
  );
}
