"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkle } from "@phosphor-icons/react";
import { SegmentedToggle } from "@/components/ui/SegmentedToggle";
import { SignInForm } from "@/components/AuthForm/SignInForm";
import { SignUpForm } from "@/components/AuthForm/SignUpForm";

export type AuthMode = "signin" | "signup";

export function AuthCard({ initialMode }: { initialMode: AuthMode }) {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  function switchMode(next: AuthMode) {
    setMode(next);
    window.history.replaceState(null, "", next === "signin" ? "/sign-in" : "/sign-up");
  }

  return (
    <div className="relative flex min-h-full flex-1 items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/30">
            <Sparkle size={28} weight="fill" />
          </div>
          <h1 className="text-2xl font-semibold text-primary">Men&apos;s Group</h1>
          <p className="mt-1 text-sm text-secondary">
            {mode === "signin" ? "Welcome back" : "Let's get you set up"}
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-white/90 p-6 shadow-xl shadow-primary/5 backdrop-blur">
          <SegmentedToggle
            layoutId="auth-mode"
            value={mode}
            onChange={switchMode}
            options={[
              { value: "signin", label: "Sign In" },
              { value: "signup", label: "Sign Up" },
            ]}
          />

          <div className="relative mt-6 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                {mode === "signin" ? (
                  <SignInForm onSwitchToSignUp={() => switchMode("signup")} />
                ) : (
                  <SignUpForm onSwitchToSignIn={() => switchMode("signin")} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
