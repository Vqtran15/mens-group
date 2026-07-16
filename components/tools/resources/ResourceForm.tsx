"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { WarningCircle } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentMembership } from "@/lib/supabase/current-membership";
import { SuccessButton, type SubmitStatus } from "@/components/ui/SuccessButton";
import { Skeleton } from "@/components/ui/Skeleton";

const fieldClass =
  "w-full rounded-xl border border-border bg-white shadow-sm px-3 py-2.5 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export function ResourceForm({ resourceId }: { resourceId?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(!!resourceId);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const membership = await getCurrentMembership(supabase);
      if (!membership) return;
      setGroupId(membership.groupId);
      setUserId(membership.userId);

      if (resourceId) {
        const { data } = await supabase
          .from("resources")
          .select("title, url, description")
          .eq("id", resourceId)
          .single();
        if (data) {
          setTitle(data.title);
          setUrl(data.url ?? "");
          setDescription(data.description ?? "");
        }
        setLoading(false);
      }
    }
    init();
  }, [resourceId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!groupId || !userId) {
      setError("You must be signed in and belong to a group.");
      return;
    }

    const normalizedUrl = url.trim()
      ? /^(https?:\/\/|mailto:)/i.test(url.trim())
        ? url.trim()
        : `https://${url.trim()}`
      : null;

    setStatus("submitting");
    const supabase = createClient();

    if (resourceId) {
      const { error } = await supabase
        .from("resources")
        .update({ title, url: normalizedUrl, description: description || null })
        .eq("id", resourceId);
      if (error) {
        setError(error.message);
        setStatus("idle");
        return;
      }
    } else {
      const { error } = await supabase.from("resources").insert({
        title,
        url: normalizedUrl,
        description: description || null,
        created_by: userId,
        group_id: groupId,
      });
      if (error) {
        setError(error.message);
        setStatus("idle");
        return;
      }
    }

    setStatus("success");
    setTimeout(() => {
      router.push("/tools/resources");
      router.refresh();
    }, 500);
  }

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: "easeOut" }}>
        <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-secondary">
          Title
        </label>
        <input
          id="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Atomic Habits"
          className={fieldClass}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.06, ease: "easeOut" }}
      >
        <label htmlFor="url" className="mb-1.5 block text-sm font-medium text-secondary">
          Link (optional)
        </label>
        <input
          id="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="example.com/article"
          className={fieldClass}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.12, ease: "easeOut" }}
      >
        <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-secondary">
          Why it&apos;s worth checking out (optional)
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={fieldClass}
        />
      </motion.div>

      {error && (
        <p className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
          <WarningCircle size={16} className="shrink-0" />
          {error}
        </p>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.18, ease: "easeOut" }}
      >
        <SuccessButton
          status={status}
          idleLabel={resourceId ? "Save changes" : "Add resource"}
          submittingLabel={resourceId ? "Saving..." : "Adding..."}
          className="w-full"
        />
      </motion.div>
    </form>
  );
}
