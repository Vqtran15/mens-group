"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/calendar");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-secondary">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-base outline-none focus:border-primary"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-secondary">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-base outline-none focus:border-primary"
        />
      </div>
      {error && <p className="text-sm text-accent">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-primary px-4 py-2 font-medium text-white disabled:opacity-60"
      >
        {submitting ? "Signing in..." : "Sign in"}
      </button>
      <p className="text-center text-sm text-secondary">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="font-medium text-primary">
          Sign up
        </Link>
      </p>
    </form>
  );
}
