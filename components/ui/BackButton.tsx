"use client";

import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react";

export function BackButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      aria-label="Back"
      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-secondary transition-colors hover:bg-surface-muted"
    >
      <ArrowLeft size={20} />
    </Link>
  );
}
