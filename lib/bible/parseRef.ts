import { lookupBook, type BibleBook } from "./books";

export interface BibleRef {
  book: BibleBook;
  chapter: number;
  startVerse: number | null;
  endVerse: number | null;
}

// Parses strings like:
//   "John 3:16"
//   "Romans 8:28-39"
//   "Psalm 23"
//   "1 Corinthians 13:4-7"
//   "Genesis 1"
export function parseRef(input: string): BibleRef | null {
  const s = input.trim();
  if (!s) return null;

  // Match: (optional number + space + book name) chapter (optional :verse(-endVerse))
  // e.g. "1 John 3:16-18" or "John 3" or "Psalm 23:1"
  const match = s.match(
    /^(\d\s+)?([a-zA-Z\s]+?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/
  );
  if (!match) return null;

  const prefix = match[1]?.trim() ?? ""; // "1", "2", "3" or ""
  const bookRaw = (prefix ? `${prefix} ${match[2].trim()}` : match[2].trim());
  const chapter = parseInt(match[3], 10);
  const startVerse = match[4] ? parseInt(match[4], 10) : null;
  const endVerse = match[5] ? parseInt(match[5], 10) : null;

  const book = lookupBook(bookRaw);
  if (!book) return null;
  if (chapter < 1 || chapter > book.chapters) return null;

  return { book, chapter, startVerse, endVerse };
}
