"use client";

import Link from "next/link";
import { Gear } from "@phosphor-icons/react";

export function SettingsLink() {
  return (
    <Link
      href="/settings"
      aria-label="Settings"
      className="rounded-full p-2 text-secondary transition-colors hover:bg-surface-muted"
    >
      <Gear size={20} />
    </Link>
  );
}
