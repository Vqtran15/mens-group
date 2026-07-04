"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowsClockwise, Buildings, LockKey, Users } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { generateInviteCode } from "@/lib/utils";
import { SegmentedToggle } from "@/components/ui/SegmentedToggle";
import { AuthTextField } from "@/components/AuthForm/AuthTextField";
import type { Group } from "@/lib/types";

export type GroupMode = "create" | "join";

export interface GroupSelection {
  mode: GroupMode;
  groupName: string;
  inviteCode: string;
  selectedGroupId: string;
}

export function GroupSection({
  value,
  onChange,
}: {
  value: GroupSelection;
  onChange: (value: GroupSelection) => void;
}) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [spins, setSpins] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase.rpc("list_groups").then(({ data }) => {
      setGroups(data ?? []);
      setLoadingGroups(false);
    });
  }, []);

  // Seed an initial code so "Create a Group" never starts empty.
  useEffect(() => {
    if (value.mode === "create" && !value.inviteCode) {
      onChange({ ...value, inviteCode: generateInviteCode() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setMode(mode: GroupMode) {
    if (mode === "create") {
      onChange({ ...value, mode, inviteCode: generateInviteCode() });
    } else {
      onChange({ ...value, mode, inviteCode: "" });
    }
  }

  function refreshInviteCode() {
    onChange({ ...value, inviteCode: generateInviteCode() });
    setSpins((s) => s + 1);
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-background/40 p-4">
      <SegmentedToggle
        layoutId="group-mode"
        value={value.mode}
        onChange={setMode}
        options={[
          { value: "create", label: "Create a Group" },
          { value: "join", label: "Join a Group" },
        ]}
      />

      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          {value.mode === "create" ? (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="space-y-4"
            >
              <AuthTextField
                label="Group Name"
                icon={Buildings}
                required
                value={value.groupName}
                onChange={(groupName) => onChange({ ...value, groupName })}
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-secondary">
                  Invite Code
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <LockKey
                      size={18}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                    />
                    <input
                      readOnly
                      value={value.inviteCode}
                      className="w-full rounded-xl border border-border bg-background/50 py-2.5 pl-10 pr-3 font-mono text-base tracking-[0.2em] outline-none"
                    />
                  </div>
                  <motion.button
                    type="button"
                    animate={{ rotate: spins * 360 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    onClick={refreshInviteCode}
                    aria-label="Generate a new invite code"
                    className="shrink-0 rounded-xl border border-border bg-white p-2.5 text-secondary transition-colors hover:bg-surface-muted"
                  >
                    <ArrowsClockwise size={18} />
                  </motion.button>
                </div>
                <p className="mt-1.5 text-xs text-muted">
                  Share this code with people you want to invite to the group.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="join"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="groupSelect" className="mb-1.5 block text-sm font-medium text-secondary">
                  Group
                </label>
                <div className="relative">
                  <Users
                    size={18}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                  />
                  <select
                    id="groupSelect"
                    required
                    value={value.selectedGroupId}
                    onChange={(e) => onChange({ ...value, selectedGroupId: e.target.value })}
                    disabled={loadingGroups || groups.length === 0}
                    className="w-full appearance-none rounded-xl border border-border bg-background/50 py-2.5 pl-10 pr-3 text-base outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="" disabled>
                      {loadingGroups
                        ? "Loading groups..."
                        : groups.length === 0
                          ? "No groups yet"
                          : "Select a group"}
                    </option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <AuthTextField
                label="Invite Code"
                icon={LockKey}
                required
                value={value.inviteCode}
                onChange={(inviteCode) => onChange({ ...value, inviteCode })}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
