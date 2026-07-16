"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Crown } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentMembership } from "@/lib/supabase/current-membership";
import { Avatar } from "@/components/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";

interface Member {
  id: string;
  display_name: string;
  avatar_color: string | null;
  avatar_url: string | null;
}

export function MembersView() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [creatorId, setCreatorId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const membership = await getCurrentMembership(supabase);
      if (!membership) {
        setLoading(false);
        return;
      }

      const [{ data: profiles }, { data: group }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, display_name, avatar_color, avatar_url")
          .eq("group_id", membership.groupId)
          .order("created_at", { ascending: true }),
        supabase.from("groups").select("created_by").eq("id", membership.groupId).single(),
      ]);

      setMembers(profiles ?? []);
      setCreatorId(group?.created_by ?? null);
      setLoading(false);
    }
    init();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      <p className="px-1 text-sm text-secondary">
        {members.length} {members.length === 1 ? "member" : "members"}
      </p>
      {members.map((member, i) => (
        <motion.div
          key={member.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: Math.min(i, 8) * 0.05, ease: "easeOut" }}
          className="flex items-center gap-3 rounded-2xl border border-border/60 bg-white p-3 shadow-sm"
        >
          <Avatar name={member.display_name} color={member.avatar_color} imageUrl={member.avatar_url} size={40} />
          <p className="flex-1 font-medium text-primary">{member.display_name}</p>
          {member.id === creatorId && (
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
              <Crown size={12} weight="fill" /> Creator
            </span>
          )}
        </motion.div>
      ))}
    </div>
  );
}
