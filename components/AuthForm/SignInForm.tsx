"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Envelope, LockKey, WarningCircle } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { AuthTextField } from "@/components/AuthForm/AuthTextField";
import { Button } from "@/components/ui/Button";
import { trackEvent } from "@/lib/analytics";

export function SignInForm({ onSwitchToSignUp }: { onSwitchToSignUp: () => void }) {
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

    if (error) {
      setSubmitting(false);
      setError(error.message);
      return;
    }

    // Leave `submitting` true (button stays showing "Signing in...") instead
    // of resetting it here - router.push/refresh aren't instant, and
    // flipping back to "Sign in" while that's still in flight is what
    // caused the button to visibly revert right before the page changed.
    trackEvent('login')
    router.push("/calendar");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <AuthTextField
        label="Email"
        type="email"
        icon={Envelope}
        required
        autoComplete="email"
        value={email}
        onChange={setEmail}
      />
      <AuthTextField
        label="Password"
        type="password"
        icon={LockKey}
        required
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
      />
      {error && (
        <p className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
          <WarningCircle size={16} className="shrink-0" />
          {error}
        </p>
      )}
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Signing in..." : "Sign in"}
      </Button>
      <p className="text-center text-sm text-secondary">
        Don&apos;t have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToSignUp}
          className="font-medium text-primary hover:underline"
        >
          Sign up
        </button>
      </p>
    </form>
  );
}
