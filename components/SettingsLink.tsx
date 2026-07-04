"use client";

import Link from "next/link";
import { Gear } from "@phosphor-icons/react";

export function SettingsLink() {
  return (
    <Link
      href="/settings"
      aria-label="Settings"
      className="rounded-full p-2 text-white/90 transition-colors hover:bg-white/15 hover:text-white"
    >
      <Gear size={20} />
    </Link>
  );
}
