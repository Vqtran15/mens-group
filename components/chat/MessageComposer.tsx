"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { At, Image as ImageIcon, PaperPlaneTilt, X } from "@phosphor-icons/react";
import { EmojiPickerPopover } from "@/components/chat/EmojiPickerPopover";
import type { ChatMessage } from "@/lib/types";

// Caps how tall the composer can grow before it scrolls internally instead -
// about 6 lines, so a long message never pushes the message list and send
// button off the top of a short phone screen.
const MAX_TEXTAREA_HEIGHT_PX = 144;
const MAX_MENTION_SUGGESTIONS = 5;

// Persists an in-progress message across a forced reload (see AutoUpdater,
// which applies a detected app update immediately with no confirmation) so
// an unsent draft doesn't just vanish. Not scoped per-group since a member
// only ever belongs to one group at a time in this app.
const DRAFT_KEY = "chat-draft";

export const MessageComposer = forwardRef<HTMLTextAreaElement, {
  onSend: (input: { body: string; imageFiles: File[] }) => void;
  replyingTo: ChatMessage | null;
  onCancelReply: () => void;
  memberNames?: string[];
}>(function MessageComposer({ onSend, replyingTo, onCancelReply, memberNames = [] }, forwardedRef) {
  const [body, setBody] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  // start is the index of the "@" itself, so the matched text can be sliced
  // back out and replaced regardless of where the cursor has since moved.
  const [mention, setMention] = useState<{ query: string; start: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bodyInputRef = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(forwardedRef, () => bodyInputRef.current as HTMLTextAreaElement);

  // Portalled to document.body rather than rendered in place - see the
  // return statement below for why (this component sits several levels
  // deep inside AppLayout's tab-slide AnimatePresence wrapper, which
  // applies a CSS transform while animating; a `position: fixed` descendant
  // of a transformed ancestor is fixed to *that ancestor's* box, not the
  // real viewport, so without the portal this would visibly drag along with
  // the page during every tab transition into or out of Chat instead of
  // staying pinned to the screen edge). document.body doesn't exist during
  // SSR, hence the mounted gate.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Drives the composer's own exit animation below. Deliberately reading
  // pathname directly rather than relying on ChatView/this component simply
  // unmounting when navigation leaves /chat: this whole subtree stays alive
  // for the page-slide's exit duration (see FrozenRouter in
  // app/(app)/layout.tsx), but usePathname() is a separate, unfrozen context
  // that updates immediately - so this flips to false well before the
  // eventual unmount, giving AnimatePresence below room to actually play the
  // exit instead of the portal's DOM node just vanishing with the rest of
  // the page at the very end.
  const pathname = usePathname();
  const isChatRoute = pathname === "/chat";

  // Re-measures on every change to body, not just keystrokes in this field -
  // the emoji picker and "replying to" state both set body programmatically,
  // which wouldn't otherwise fire a native input event to trigger a resize.
  useEffect(() => {
    const el = bodyInputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT_PX)}px`;
  }, [body]);

  // Restored once on mount rather than in useState's initializer, since
  // localStorage doesn't exist during server rendering and reading it there
  // would be a hydration mismatch.
  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) setBody(draft);
  }, []);

  useEffect(() => {
    if (body) {
      localStorage.setItem(DRAFT_KEY, body);
    } else {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, [body]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed && imageFiles.length === 0) return;
    onSend({ body: trimmed, imageFiles });
    setBody("");
    setImageFiles([]);
    setMention(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Enter sends, Shift+Enter inserts a newline - matches the convention
  // every other modern chat app uses once the input can hold multiple lines.
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape" && mention) {
      setMention(null);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  }

  function handleBodyChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setBody(value);

    const cursor = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursor);
    // "@" at the start of the message or right after whitespace, with no
    // space typed since - matches mid-typing ("@ji") but stops matching the
    // instant a space or newline follows, so the popover naturally closes
    // once the user moves on rather than needing an explicit dismiss.
    const match = textBeforeCursor.match(/(?:^|\s)@(\w*)$/);
    setMention(match ? { query: match[1], start: cursor - match[1].length - 1 } : null);
  }

  function selectMention(name: string) {
    if (!mention) return;
    const el = bodyInputRef.current;
    const cursor = el ? el.selectionStart : body.length;
    const before = body.slice(0, mention.start);
    const after = body.slice(cursor);
    const newValue = `${before}@${name} ${after}`;
    setBody(newValue);
    setMention(null);
    // Selecting via tap moves focus off the textarea - bring it back with
    // the cursor landed right after the inserted mention, not at the end.
    requestAnimationFrame(() => {
      if (!el) return;
      const newCursor = before.length + name.length + 2;
      el.focus();
      el.setSelectionRange(newCursor, newCursor);
    });
  }

  const mentionMatches = mention
    ? memberNames
        // A substring match anywhere in the name, not just a prefix of the
        // whole string - matching only the literal start ("QaB" but not
        // "Bob" for "QaBob", or "Baker" for "Bob Baker") missed most
        // realistic partial typing (a last name, a nickname mid-string).
        // A handful of group members means over-matching is harmless.
        .filter((n) => n.toLowerCase().includes(mention.query.toLowerCase()))
        .slice(0, MAX_MENTION_SUGGESTIONS)
    : [];

  function removeImageAt(index: number) {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    // The file input itself still holds the original FileList - clearing it
    // avoids re-adding a removed file if the user picks "attach photo" again
    // without having changed the underlying selection.
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (!mounted) return null;

  return createPortal(
    // Fixed overlay, not a normal-flow row - same fix as BottomNav's
    // (see BottomNav.tsx): in normal flow, this claimed its own row below
    // the message list, so the page's own background always showed through
    // its transparent margins as a solid band, and messages could never
    // scroll underneath no matter how translucent the pill was. Now it
    // overlays the bottom of the screen directly, and ChatView pads its
    // scroll container's bottom to clear it instead of it taking up flex
    // space - see ChatView.tsx.
    // pointer-events-none/auto split - the padding around the actual
    // content (reply banner, image chips, pill) is a transparent margin,
    // not part of any of those, so it shouldn't block taps/scroll on
    // messages now sitting underneath it.
    // var(--sab), not env(safe-area-inset-bottom) directly - see
    // ViewportFix/globals.css for why the raw env() value can't be trusted
    // in this app's shell.
    <AnimatePresence>
      {isChatRoute && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-3 pb-[max(0.75rem,var(--sab,0px))] pt-2"
        >
      <div className="pointer-events-auto">
        {replyingTo && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-2xl border border-border/60 bg-white/90 px-3 py-2 text-sm shadow-sm backdrop-blur-md">
            <p className="truncate text-secondary">
              Replying to <span className="font-medium">{replyingTo.profiles?.display_name ?? "Someone"}</span>:{" "}
              {replyingTo.body || (replyingTo.image_urls.length > 0 ? "Photo" : replyingTo.shared_title ?? "")}
            </p>
            <button type="button" onClick={onCancelReply} aria-label="Cancel reply" className="shrink-0 text-muted">
              <X size={16} />
            </button>
          </div>
        )}
        {imageFiles.length > 0 && (
          <div className="mb-2 flex items-center gap-2 overflow-x-auto">
            {imageFiles.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className="relative flex shrink-0 items-center gap-1.5 rounded-full bg-surface-muted py-1 pl-3 pr-1.5 text-sm"
              >
                <p className="max-w-[120px] truncate text-secondary">{file.name}</p>
                <button
                  type="button"
                  onClick={() => removeImageAt(i)}
                  aria-label={`Remove ${file.name}`}
                  className="shrink-0 rounded-full p-1 text-muted transition-colors hover:bg-border/60"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        {/* The whole bar - attach, emoji, input, send - is one pill, rather
            than a plain input pill sitting inside a separate flush bar. The
            pill's background/blur is a separate absolutely-positioned layer
            (clipped via its own overflow-hidden, fixing backdrop-blur's
            rectangular-bounding-box clipping bug against rounded-full)
            instead of living directly on <form> - putting overflow-hidden on
            <form> itself would also clip the @mention dropdown below, which
            intentionally renders outside the form's own box (bottom-full). */}
        {/* isolate is load-bearing, not decorative: relative alone doesn't
            give <form> its own stacking context, so the backdrop's -z-10
            would escape past it and stack behind the *page's* background
            instead of just behind its own siblings - making the whole pill
            invisible (this is exactly what happened without it). */}
        <form onSubmit={handleSubmit} className="relative isolate flex items-center gap-1 rounded-full p-1.5">
          <div className="absolute inset-0 -z-10 overflow-hidden rounded-full border border-border/60 bg-white/80 shadow-sm backdrop-blur-lg" />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => setImageFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach photos"
            className="shrink-0 rounded-full p-2 text-secondary transition-colors hover:bg-surface-muted"
          >
            <ImageIcon size={20} />
          </button>
          <EmojiPickerPopover onSelect={(emoji) => setBody((b) => b + emoji)} />
          <div className="relative min-w-0 flex-1">
            {mentionMatches.length > 0 && (
              <div className="absolute bottom-full left-0 z-20 mb-2 w-56 overflow-hidden rounded-2xl border border-border bg-white shadow-xl">
                {mentionMatches.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => selectMention(name)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-secondary transition-colors hover:bg-surface-muted"
                  >
                    <At size={14} className="shrink-0 text-muted" />
                    {name}
                  </button>
                ))}
              </div>
            )}
            <textarea
              ref={bodyInputRef}
              value={body}
              onChange={handleBodyChange}
              onKeyDown={handleKeyDown}
              placeholder="Message..."
              rows={1}
              // No border/background of its own now - the form itself is the
              // pill, so a nested one here would look like a pill-in-a-pill.
              className="max-h-36 w-full resize-none overflow-y-auto bg-transparent px-2 py-2 outline-none"
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.85, rotate: -15 }}
            type="submit"
            disabled={!body.trim() && imageFiles.length === 0}
            aria-label="Send message"
            className="shrink-0 rounded-full bg-primary p-2.5 text-white shadow-md shadow-primary/30 disabled:opacity-60"
          >
            <PaperPlaneTilt size={18} weight="fill" />
          </motion.button>
        </form>
      </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
});
