"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
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

  useEffect(() => {
    const supabase = createClient();
    supabase.rpc("list_groups").then(({ data }) => {
      setGroups(data ?? []);
      setLoadingGroups(false);
    });
  }, []);

  function setMode(mode: GroupMode) {
    onChange({ ...value, mode });
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-white p-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("create")}
          className={cn(
            "flex-1 rounded-lg px-3 py-2 text-sm font-medium",
            value.mode === "create" ? "bg-primary text-white" : "bg-surface-muted text-secondary"
          )}
        >
          Create a Group
        </button>
        <button
          type="button"
          onClick={() => setMode("join")}
          className={cn(
            "flex-1 rounded-lg px-3 py-2 text-sm font-medium",
            value.mode === "join" ? "bg-primary text-white" : "bg-surface-muted text-secondary"
          )}
        >
          Join a Group
        </button>
      </div>

      {value.mode === "create" ? (
        <>
          <div>
            <label htmlFor="groupName" className="mb-1 block text-sm font-medium text-secondary">
              Group Name
            </label>
            <input
              id="groupName"
              type="text"
              required
              value={value.groupName}
              onChange={(e) => onChange({ ...value, groupName: e.target.value })}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-base outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="createInviteCode" className="mb-1 block text-sm font-medium text-secondary">
              Invite Code
            </label>
            <input
              id="createInviteCode"
              type="text"
              required
              value={value.inviteCode}
              onChange={(e) => onChange({ ...value, inviteCode: e.target.value })}
              placeholder="e.g. MensGroupPDX1!"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-base outline-none focus:border-primary"
            />
            <p className="mt-1 text-xs text-muted">
              Share this code with people you want to invite to the group.
            </p>
          </div>
        </>
      ) : (
        <>
          <div>
            <label htmlFor="groupSelect" className="mb-1 block text-sm font-medium text-secondary">
              Group
            </label>
            <select
              id="groupSelect"
              required
              value={value.selectedGroupId}
              onChange={(e) => onChange({ ...value, selectedGroupId: e.target.value })}
              disabled={loadingGroups || groups.length === 0}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-base outline-none focus:border-primary"
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
          <div>
            <label htmlFor="joinInviteCode" className="mb-1 block text-sm font-medium text-secondary">
              Invite Code
            </label>
            <input
              id="joinInviteCode"
              type="text"
              required
              value={value.inviteCode}
              onChange={(e) => onChange({ ...value, inviteCode: e.target.value })}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-base outline-none focus:border-primary"
            />
          </div>
        </>
      )}
    </div>
  );
}
