"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Check, Copy, MagnifyingGlass, ShareNetwork, X } from "@phosphor-icons/react";
import {
  fetchChapter,
  getDailyVerseRef,
  QUICK_PASSAGES,
  TRANSLATIONS,
  type BibleChapter,
  type BibleVerse,
  type TranslationId,
} from "@/lib/bible/api";
import { parseRef } from "@/lib/bible/parseRef";
import { Skeleton } from "@/components/ui/Skeleton";

// ── Types ────────────────────────────────────────────────────────────────────

interface ViewState {
  kind: "home" | "chapter";
  chapter?: BibleChapter;
  highlightVerses?: Set<number>;
  label?: string; // e.g. "John 3:16" or "Psalm 23"
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatVerseText(verse: BibleVerse, bookName: string, chapter: number, translation: string) {
  return `"${verse.text}" — ${bookName} ${chapter}:${verse.number} (${translation})`;
}

function formatPassageText(verses: BibleVerse[], bookName: string, chapter: number, translation: string) {
  const body = verses.map((v) => `[${v.number}] ${v.text}`).join(" ");
  const ref = verses.length === 1
    ? `${bookName} ${chapter}:${verses[0].number}`
    : `${bookName} ${chapter}:${verses[0].number}–${verses[verses.length - 1].number}`;
  return `"${body}" — ${ref} (${translation})`;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

async function shareText(text: string) {
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return true;
    } catch {
      return false;
    }
  }
  return copyText(text);
}

// ── Sub-components ───────────────────────────────────────────────────────────

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const ok = await copyText(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 active:scale-95"
    >
      {copied ? <Check size={13} weight="bold" /> : <Copy size={13} weight="bold" />}
      {copied ? "Copied" : label}
    </button>
  );
}

function ShareButton({ text }: { text: string }) {
  const [shared, setShared] = useState(false);

  async function handleShare() {
    const ok = await shareText(text);
    if (ok) {
      setShared(true);
      setTimeout(() => setShared(false), 1800);
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-secondary transition-colors hover:bg-surface-muted active:scale-95"
    >
      {shared ? <Check size={13} weight="bold" /> : <ShareNetwork size={13} weight="bold" />}
      {shared ? "Shared" : "Share"}
    </button>
  );
}

function VerseCard({
  verse,
  bookName,
  chapter,
  translation,
  highlighted,
}: {
  verse: BibleVerse;
  bookName: string;
  chapter: number;
  translation: string;
  highlighted: boolean;
}) {
  const text = formatVerseText(verse, bookName, chapter, translation);
  return (
    <div
      className={`rounded-xl border p-3 transition-colors ${highlighted ? "border-primary/30 bg-primary/5" : "border-border/50 bg-white"}`}
    >
      <div className="mb-1.5 flex items-baseline gap-2">
        <span className="text-xs font-bold text-primary">v.{verse.number}</span>
        {highlighted && (
          <span className="text-xs font-semibold text-primary/60">{bookName} {chapter}:{verse.number}</span>
        )}
      </div>
      <p className="text-sm leading-relaxed text-secondary">{verse.text}</p>
      <div className="mt-2.5 flex gap-2">
        <CopyButton text={text} />
        <ShareButton text={text} />
      </div>
    </div>
  );
}

function ChapterView({
  chapter,
  highlightVerses,
  label,
  onBack,
}: {
  chapter: BibleChapter;
  highlightVerses?: Set<number>;
  label: string;
  onBack: () => void;
}) {
  const highlightRef = useRef<HTMLDivElement>(null);

  // Only the first highlighted verse gets the ref so scroll lands at the top of the range.
  const firstHighlightNum = highlightVerses?.size ? Math.min(...highlightVerses) : null;

  useEffect(() => {
    if (highlightRef.current && highlightVerses?.size) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightVerses]);

  const passageVerses = highlightVerses?.size
    ? chapter.verses.filter((v) => highlightVerses.has(v.number))
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="space-y-4 p-4"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full p-1.5 text-secondary transition-colors hover:bg-surface-muted"
          aria-label="Back"
        >
          <X size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold text-primary">
            {label || `${chapter.bookName} ${chapter.chapter}`}
          </h2>
          <p className="text-xs text-muted">{chapter.translation}</p>
        </div>
        {passageVerses && passageVerses.length > 0 && (
          <CopyButton
            text={formatPassageText(passageVerses, chapter.bookName, chapter.chapter, chapter.translation)}
            label="Copy passage"
          />
        )}
      </div>

      <div className="space-y-2">
        {chapter.verses.map((verse) => {
          const isHighlighted = highlightVerses?.has(verse.number) ?? false;
          return (
            <div key={verse.number} ref={verse.number === firstHighlightNum ? highlightRef : undefined}>
              <VerseCard
                verse={verse}
                bookName={chapter.bookName}
                chapter={chapter.chapter}
                translation={chapter.translation}
                highlighted={isHighlighted}
              />
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function DailyVerseCard({
  translation,
  onOpenChapter,
}: {
  translation: TranslationId;
  onOpenChapter: (bookId: string, chapter: number, verses: Set<number>, label: string) => void;
}) {
  const daily = getDailyVerseRef();
  const [verse, setVerse] = useState<BibleVerse | null>(null);
  const [bookName, setBookName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchChapter(translation, daily.bookId, daily.chapter)
      .then((ch) => {
        if (cancelled) return;
        const v = ch.verses.find((v) => v.number === daily.verse);
        setVerse(v ?? null);
        setBookName(ch.bookName);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) { setError(true); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, [translation, daily.bookId, daily.chapter, daily.verse]);

  if (loading) {
    return (
      <div className="space-y-2 rounded-2xl border border-border/60 bg-white p-4 shadow-sm">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }

  if (error || !verse) {
    return (
      <div className="rounded-2xl border border-border/60 bg-white p-4 text-sm text-muted shadow-sm">
        Couldn&apos;t load today&apos;s verse. Check your connection.
      </div>
    );
  }

  const text = formatVerseText(verse, bookName, daily.chapter, translation);

  return (
    <div className="rounded-2xl border border-border/60 bg-white p-4 shadow-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Today&apos;s verse</p>
      <blockquote className="mb-1 text-base font-medium leading-relaxed text-primary">
        &ldquo;{verse.text}&rdquo;
      </blockquote>
      <p className="mb-4 text-xs text-secondary">
        {daily.ref} ({translation})
      </p>
      <div className="flex flex-wrap gap-2">
        <CopyButton text={text} />
        <ShareButton text={text} />
        <button
          type="button"
          onClick={() =>
            onOpenChapter(daily.bookId, daily.chapter, new Set([daily.verse]), daily.ref)
          }
          className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-secondary transition-colors hover:bg-surface-muted active:scale-95"
        >
          <BookOpen size={13} />
          Read chapter
        </button>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function BibleView() {
  const [translation, setTranslation] = useState<TranslationId>("WEB");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [view, setView] = useState<ViewState>({ kind: "home" });

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Monotonic counter: only the latest request may update view state.
  const openChapterIdRef = useRef(0);

  // Cleanup pending debounce on unmount so stale setState calls never fire.
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const openChapter = useCallback(
    async (bookId: string, chapter: number, highlight?: Set<number>, label?: string) => {
      const id = ++openChapterIdRef.current;
      setSearching(true);
      setSearchError(null);
      try {
        const data = await fetchChapter(translation, bookId, chapter);
        if (id !== openChapterIdRef.current) return; // superseded by a newer request
        setView({
          kind: "chapter",
          chapter: data,
          highlightVerses: highlight,
          label: label ?? `${data.bookName} ${chapter}`,
        });
      } catch {
        if (id !== openChapterIdRef.current) return;
        setSearchError("Couldn't load that passage. Check your connection and try again.");
      } finally {
        if (id === openChapterIdRef.current) setSearching(false);
      }
    },
    [translation]
  );

  function handleSearch(value: string) {
    setQuery(value);
    setSearchError(null);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!value.trim()) return;

    searchTimeoutRef.current = setTimeout(() => {
      const ref = parseRef(value);
      if (!ref) {
        setSearchError('Try a reference like "John 3:16" or "Psalm 23".');
        return;
      }
      const highlight = ref.startVerse !== null
        ? new Set(
            Array.from(
              { length: (ref.endVerse ?? ref.startVerse) - ref.startVerse + 1 },
              (_, i) => ref.startVerse! + i
            )
          )
        : undefined;
      openChapter(ref.book.id, ref.chapter, highlight, value.trim());
    }, 600);
  }

  function handleClearSearch() {
    setQuery("");
    setSearchError(null);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    setView({ kind: "home" });
    inputRef.current?.focus();
  }

  // Re-fetch the current chapter when translation changes.
  // openChapter is intentionally omitted from deps — it only changes when translation
  // changes (same trigger), so including it would cause a double-fetch.
  useEffect(() => {
    if (view.kind === "chapter" && view.chapter) {
      openChapter(view.chapter.bookId, view.chapter.chapter, view.highlightVerses, view.label);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translation]);

  return (
    <div className="flex h-full flex-col">
      {/* Search + translation bar */}
      <div className="border-b border-border/60 bg-background px-4 pb-3 pt-2">
        <div className="relative mb-3">
          <MagnifyingGlass
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search a verse… e.g. John 3:16"
            className="w-full rounded-xl border border-border bg-white py-2.5 pl-9 pr-9 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {query && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted hover:text-secondary"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Translation pills */}
        <div className="flex gap-2">
          {TRANSLATIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTranslation(id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                translation === id
                  ? "bg-primary text-white"
                  : "border border-border text-secondary hover:bg-surface-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {searchError && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="border-b border-accent/20 bg-accent/5 px-4 py-2.5 text-sm text-accent"
          >
            {searchError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading overlay */}
      {searching && (
        <div className="space-y-3 p-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      )}

      {/* Main content */}
      {!searching && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <AnimatePresence mode="wait" initial={false}>
            {view.kind === "chapter" && view.chapter ? (
              <ChapterView
                key="chapter"
                chapter={view.chapter}
                highlightVerses={view.highlightVerses}
                label={view.label ?? ""}
                onBack={() => {
                  setView({ kind: "home" });
                  setQuery("");
                  setSearchError(null);
                }}
              />
            ) : (
              <motion.div
                key="home"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-5 p-4"
              >
                <DailyVerseCard translation={translation} onOpenChapter={openChapter} />

                {/* Quick access passages */}
                <div>
                  <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-muted">
                    Quick access
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_PASSAGES.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => openChapter(p.bookId, p.chapter, undefined, p.label)}
                        className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-secondary shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary active:scale-95"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tip */}
                <p className="text-center text-xs text-muted">
                  Search any verse or passage above — e.g. &ldquo;Romans 8:28-39&rdquo;
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
