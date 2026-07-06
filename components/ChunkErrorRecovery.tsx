"use client";

import { useEffect, useState } from "react";

const RELOAD_GUARD_KEY = "chunk-error-reload-attempted";
const CHUNK_ERROR_PATTERN =
  /loading chunk .* failed|failed to load chunk|failed to fetch dynamically imported module/i;

// Vercel only serves the latest deployment's hashed JS chunks. A tab left
// open across a deploy still references the old hashes, so its first
// client-side navigation after that fails to fetch a chunk and the app
// hangs - the fix is just a reload to pick up the current build. Guarded by
// sessionStorage so a genuinely broken deploy doesn't reload-loop forever.
export function ChunkErrorRecovery() {
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    function attemptRecovery() {
      if (sessionStorage.getItem(RELOAD_GUARD_KEY)) return;
      sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
      setRecovering(true);
      // Reloading right away can win the race against React's next paint,
      // so the "Updating..." overlay below never actually appears and the
      // stale screen just silently swaps to a blank one instead - this is
      // what read as the app "freezing". Give it two frames to paint first.
      requestAnimationFrame(() => requestAnimationFrame(() => window.location.reload()));
    }

    function handleError(event: ErrorEvent) {
      if (CHUNK_ERROR_PATTERN.test(event.message)) attemptRecovery();
    }

    function handleRejection(event: PromiseRejectionEvent) {
      const message = event.reason?.message ?? String(event.reason);
      if (CHUNK_ERROR_PATTERN.test(message)) attemptRecovery();
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  if (!recovering) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-primary">
      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-white/30 border-t-white" />
      <p className="text-sm font-medium text-white">Updating to the latest version...</p>
    </div>
  );
}
