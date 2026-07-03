"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignUpForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName || email.split("@")[0] } },
    });

    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    // If email confirmation is disabled, signUp already returns a live session.
    if (data.session) {
      router.push("/calendar");
      router.refresh();
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="w-full max-w-sm text-center">
        <h2 className="text-lg font-semibold text-primary">Check your email</h2>
        <p className="mt-2 text-secondary">
          We sent a confirmation link to {email}. Click it to finish creating your account.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
      <div>
        <label htmlFor="displayName" className="mb-1 block text-sm font-medium text-secondary">
          Name
        </label>
        <input
          id="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-base outline-none focus:border-primary"
        />
      </div>
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
      <div>
        <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-secondary">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-base outline-none focus:border-primary"
        />
      </div>
      {error && <p className="text-sm text-accent">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-primary px-4 py-2 font-medium text-white disabled:opacity-60"
      >
        {submitting ? "Creating account..." : "Sign up"}
      </button>
      <p className="text-center text-sm text-secondary">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-primary">
          Sign in
        </Link>
      </p>
    </form>
  );
}
