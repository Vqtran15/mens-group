"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, DotsThreeVertical, LinkSimple } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentMembership } from "@/lib/supabase/current-membership";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { EditDeleteActionSheet } from "@/components/ui/EditDeleteActionSheet";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import type { Resource } from "@/lib/types";

export function ResourcesView() {
  const [resources, setResources] = useState<Resource[] | null>(null);
  const [actionSheetId, setActionSheetId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Resource | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const membership = await getCurrentMembership(supabase);
    if (!membership) return;
    const { data } = await supabase
      .from("resources")
      .select("*, profiles(display_name, avatar_color, avatar_url)")
      .order("created_at", { ascending: false });
    setResources(data ?? []);
  }, []);

  useEffect(() => {
    function init() {
      load();
    }
    init();
  }, [load]);

  async function handleDelete() {
    if (!confirmDelete) return;
    const supabase = createClient();
    await supabase.from("resources").delete().eq("id", confirmDelete.id);
    setConfirmDelete(null);
    load();
  }

  if (resources === null) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    );
  }

  const actionSheetResource = resources.find((r) => r.id === actionSheetId) ?? null;

  return (
    <div className="space-y-3 p-4">
      {resources.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title="No resources yet"
          subtitle="Share an article the group should check out."
        />
      )}
      {resources.map((resource, i) => (
        <motion.div
          key={resource.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: Math.min(i, 8) * 0.05, ease: "easeOut" }}
          className="relative rounded-2xl border border-border/60 bg-white p-4 shadow-sm"
        >
          <button
            type="button"
            onClick={() => setActionSheetId(resource.id)}
            aria-label="Resource actions"
            className="absolute right-2 top-2 rounded-full p-1.5 text-secondary transition-colors hover:bg-surface-muted"
          >
            <DotsThreeVertical size={18} weight="bold" />
          </button>
          <div className="pr-7">
            <p className="font-medium text-primary">{resource.title}</p>
            {resource.description && (
              <p className="mt-1 text-sm text-secondary">{resource.description}</p>
            )}
            {resource.url && (
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center gap-1.5 text-sm text-primary underline underline-offset-2"
              >
                <LinkSimple size={14} className="shrink-0" />
                <span className="truncate">{resource.url}</span>
              </a>
            )}
            <div className="mt-3 flex items-center gap-1.5">
              <Avatar
                name={resource.profiles?.display_name ?? "Someone"}
                color={resource.profiles?.avatar_color}
                imageUrl={resource.profiles?.avatar_url}
                size={18}
              />
              <span className="text-xs text-muted">
                {resource.profiles?.display_name ?? "Someone"}
              </span>
            </div>
          </div>
        </motion.div>
      ))}

      <EditDeleteActionSheet
        open={actionSheetId !== null}
        onClose={() => setActionSheetId(null)}
        editHref={actionSheetResource ? `/tools/resources/${actionSheetResource.id}/edit` : "#"}
        onDelete={() => actionSheetResource && setConfirmDelete(actionSheetResource)}
      />

      <ConfirmSheet
        open={confirmDelete !== null}
        title="Delete this resource?"
        description="This can't be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
