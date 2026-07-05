"use client";

import { useEffect } from "react";

const RELOAD_GUARD_KEY = "chunk-error-reload-attempted";
const CHUNK_ERROR_PATTERN =
  /loading chunk .* failed|failed to load chunk|failed to fetch dynamically imported module/i;

// Vercel only serves the latest deployment's hashed JS chunks. A tab left
// open across a deploy still references the old hashes, so its first
// client-side navigation after that fails to fetch a chunk and the app
// hangs - the fix is just a reload to pick up the current build. Guarded by
// sessionStorage so a genuinely broken deploy doesn't reload-loop forever.
export function ChunkErrorRecovery() {
  useEffect(() => {
    function attemptRecovery() {
      if (sessionStorage.getItem(RELOAD_GUARD_KEY)) return;
      sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
      window.location.reload();
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

  return null;
}
