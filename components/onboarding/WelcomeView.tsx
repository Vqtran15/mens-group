"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AppleLogo,
  AndroidLogo,
  Sparkle,
  Export,
  DotsThreeVertical,
  PlusSquare,
  CaretLeft,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

type Platform = "ios" | "android";

const STEPS: Record<Platform, { icon: React.ReactNode; text: React.ReactNode }[]> = {
  ios: [
    {
      icon: <Export size={22} weight="bold" />,
      text: (
        <>
          Tap the <span className="font-semibold text-primary">Share</span>{" "}
          button in Safari&apos;s toolbar (the square with an arrow pointing up).
        </>
      ),
    },
    {
      icon: <PlusSquare size={22} weight="bold" />,
      text: (
        <>
          Scroll down and tap <span className="font-semibold text-primary">Add to Home Screen</span>.
        </>
      ),
    },
    {
      icon: <Sparkle size={22} weight="bold" />,
      text: (
        <>
          Tap <span className="font-semibold text-primary">Add</span>{" "}
          in the top right. That&apos;s it!
        </>
      ),
    },
  ],
  android: [
    {
      icon: <DotsThreeVertical size={22} weight="bold" />,
      text: (
        <>
          Tap the <span className="font-semibold text-primary">three-dot menu</span>{" "}
          in Chrome&apos;s toolbar.
        </>
      ),
    },
    {
      icon: <PlusSquare size={22} weight="bold" />,
      text: (
        <>
          Tap <span className="font-semibold text-primary">Add to Home screen</span> (or{" "}
          <span className="font-semibold text-primary">Install app</span>).
        </>
      ),
    },
    {
      icon: <Sparkle size={22} weight="bold" />,
      text: (
        <>
          Tap <span className="font-semibold text-primary">Install</span>{" "}
          to confirm. That&apos;s it!
        </>
      ),
    },
  ],
};

export function WelcomeView() {
  const router = useRouter();
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [finishing, setFinishing] = useState(false);

  async function finish() {
    setFinishing(true);
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await supabase.from("profiles").update({ has_completed_welcome: true }).eq("id", data.user.id);
    }
    router.push("/calendar");
    router.refresh();
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
          <h1 className="text-2xl font-semibold text-primary">Welcome to your men&apos;s group!</h1>
          <p className="mt-1 text-sm text-secondary">
            Add this app to your home screen so you never miss a meeting reminder or a chat message.
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-white/90 p-6 shadow-xl shadow-primary/5 backdrop-blur">
          <AnimatePresence mode="wait" initial={false}>
            {platform === null ? (
              <motion.div
                key="ask"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="space-y-4"
              >
                <p className="text-center font-medium text-secondary">
                  What kind of phone do you have?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPlatform("ios")}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-white p-5 shadow-sm transition-colors hover:bg-surface-muted active:scale-[0.98]"
                  >
                    <AppleLogo size={32} weight="fill" className="text-primary" />
                    <span className="text-sm font-medium text-secondary">iPhone</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlatform("android")}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-white p-5 shadow-sm transition-colors hover:bg-surface-muted active:scale-[0.98]"
                  >
                    <AndroidLogo size={32} weight="fill" className="text-teal" />
                    <span className="text-sm font-medium text-secondary">Android</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={finish}
                  disabled={finishing}
                  className="w-full text-center text-sm text-muted underline-offset-2 hover:underline"
                >
                  Skip for now
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="steps"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="space-y-4"
              >
                <button
                  type="button"
                  onClick={() => setPlatform(null)}
                  className="flex items-center gap-1 text-sm text-secondary hover:text-primary"
                >
                  <CaretLeft size={14} /> Change
                </button>
                <ol className="space-y-3">
                  {STEPS[platform].map((step, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.08, ease: "easeOut" }}
                      className="flex items-start gap-3 rounded-xl bg-background/60 p-3"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        {step.icon}
                      </span>
                      <p className="mt-1.5 text-sm text-secondary">{step.text}</p>
                    </motion.li>
                  ))}
                </ol>
                <Button type="button" disabled={finishing} onClick={finish} className="w-full">
                  {finishing ? "Just a moment..." : "I've added it - continue"}
                </Button>
                <button
                  type="button"
                  onClick={finish}
                  disabled={finishing}
                  className="w-full text-center text-sm text-muted underline-offset-2 hover:underline"
                >
                  Skip for now
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
