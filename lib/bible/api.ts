// Primary Bible data source: Free Use Bible API (bible.helloao.org)
// Zero-config, no API key, unlimited, 1250+ translations.
// YouVersion SDK (api.bible) can be layered on top when NEXT_PUBLIC_YOUVERSION_API_KEY is set
// to unlock licensed translations like NIV and ESV.

const BASE = "https://bible.helloao.org/api";

export interface BibleVerse {
  number: number;
  text: string;
}

export interface BibleChapter {
  translation: string;
  bookName: string;
  bookId: string;
  chapter: number;
  verses: BibleVerse[];
}

export type TranslationId = "WEB" | "KJV" | "BSB";

export const TRANSLATIONS: { id: TranslationId; label: string }[] = [
  { id: "WEB", label: "WEB" },
  { id: "KJV", label: "KJV" },
  { id: "BSB", label: "BSB" },
];

// Normalise the helloao.org response into a flat verses array.
// The API returns content as an array of objects with type "verse" or "heading".
function normaliseChapter(raw: unknown): BibleChapter | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  // Extract book name
  const bookObj = r.book as Record<string, unknown> | undefined;
  const bookName =
    (bookObj?.commonName as string) ??
    (bookObj?.name as string) ??
    "Unknown";
  const bookId = (bookObj?.id as string) ?? "";

  // Extract translation id
  const transObj = r.translation as Record<string, unknown> | undefined;
  const translation =
    (transObj?.id as string) ??
    (typeof r.translation === "string" ? r.translation : "");

  // Chapter number
  const chapterObj = r.chapter as Record<string, unknown> | undefined;
  const chapterNum =
    typeof chapterObj?.number === "number"
      ? chapterObj.number
      : typeof r.chapter === "number"
        ? r.chapter
        : 0;

  // Verses — the API wraps content as an array; each item with type:"verse" has a number + content array
  const contentArr = (chapterObj?.content ?? r.verses ?? r.content) as unknown[];
  if (!Array.isArray(contentArr)) return null;

  const verses: BibleVerse[] = [];
  for (const item of contentArr) {
    if (!item || typeof item !== "object") continue;
    const v = item as Record<string, unknown>;
    if (v.type !== "verse" && v.type !== undefined) continue; // skip headings etc. unless no type field
    const num = typeof v.number === "number" ? v.number : null;
    if (num === null) continue;

    // content is either a string or an array of strings/objects
    let text = "";
    if (typeof v.content === "string") {
      text = v.content;
    } else if (Array.isArray(v.content)) {
      text = (v.content as unknown[])
        .map((c) => {
          if (typeof c === "string") return c;
          if (c && typeof c === "object") {
            const co = c as Record<string, unknown>;
            return typeof co.text === "string" ? co.text : "";
          }
          return "";
        })
        .join("")
        .trim();
    } else if (typeof v.text === "string") {
      text = v.text;
    }

    if (text) verses.push({ number: num, text: text.trim() });
  }

  return { translation, bookName, bookId, chapter: chapterNum, verses };
}

export async function fetchChapter(
  translation: TranslationId,
  bookId: string,
  chapter: number
): Promise<BibleChapter> {
  const url = `${BASE}/${translation}/${bookId}/${chapter}.json`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`Bible fetch failed: ${res.status}`);
  const raw = await res.json();
  const result = normaliseChapter(raw);
  if (!result) throw new Error("Unexpected Bible API response shape");
  return result;
}

// Daily verse rotation — curated list, no API call needed.
// Selected by day-of-year so it's consistent for the whole day.
const DAILY_VERSES: { ref: string; bookId: string; chapter: number; verse: number }[] = [
  { ref: "John 3:16", bookId: "JHN", chapter: 3, verse: 16 },
  { ref: "Jeremiah 29:11", bookId: "JER", chapter: 29, verse: 11 },
  { ref: "Philippians 4:13", bookId: "PHP", chapter: 4, verse: 13 },
  { ref: "Romans 8:28", bookId: "ROM", chapter: 8, verse: 28 },
  { ref: "Psalm 23:1", bookId: "PSA", chapter: 23, verse: 1 },
  { ref: "Isaiah 40:31", bookId: "ISA", chapter: 40, verse: 31 },
  { ref: "Matthew 6:33", bookId: "MAT", chapter: 6, verse: 33 },
  { ref: "Proverbs 3:5", bookId: "PRO", chapter: 3, verse: 5 },
  { ref: "John 14:6", bookId: "JHN", chapter: 14, verse: 6 },
  { ref: "Romans 8:1", bookId: "ROM", chapter: 8, verse: 1 },
  { ref: "Psalm 46:1", bookId: "PSA", chapter: 46, verse: 1 },
  { ref: "Ephesians 2:8", bookId: "EPH", chapter: 2, verse: 8 },
  { ref: "Matthew 28:19", bookId: "MAT", chapter: 28, verse: 19 },
  { ref: "Galatians 2:20", bookId: "GAL", chapter: 2, verse: 20 },
  { ref: "Isaiah 41:10", bookId: "ISA", chapter: 41, verse: 10 },
  { ref: "Romans 12:2", bookId: "ROM", chapter: 12, verse: 2 },
  { ref: "Psalm 119:105", bookId: "PSA", chapter: 119, verse: 105 },
  { ref: "Hebrews 11:1", bookId: "HEB", chapter: 11, verse: 1 },
  { ref: "Matthew 11:28", bookId: "MAT", chapter: 11, verse: 28 },
  { ref: "1 Corinthians 13:4", bookId: "1CO", chapter: 13, verse: 4 },
  { ref: "Psalm 27:1", bookId: "PSA", chapter: 27, verse: 1 },
  { ref: "John 1:1", bookId: "JHN", chapter: 1, verse: 1 },
  { ref: "2 Timothy 3:16", bookId: "2TI", chapter: 3, verse: 16 },
  { ref: "Colossians 3:23", bookId: "COL", chapter: 3, verse: 23 },
  { ref: "Micah 6:8", bookId: "MIC", chapter: 6, verse: 8 },
  { ref: "Joshua 1:9", bookId: "JOS", chapter: 1, verse: 9 },
  { ref: "Psalm 1:1", bookId: "PSA", chapter: 1, verse: 1 },
  { ref: "Romans 5:8", bookId: "ROM", chapter: 5, verse: 8 },
  { ref: "John 10:10", bookId: "JHN", chapter: 10, verse: 10 },
  { ref: "Ephesians 6:10", bookId: "EPH", chapter: 6, verse: 10 },
];

export function getDailyVerseRef() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000
  );
  return DAILY_VERSES[dayOfYear % DAILY_VERSES.length];
}

export const QUICK_PASSAGES = [
  { label: "Psalm 23", bookId: "PSA", chapter: 23 },
  { label: "Romans 8", bookId: "ROM", chapter: 8 },
  { label: "John 14", bookId: "JHN", chapter: 14 },
  { label: "Isaiah 40", bookId: "ISA", chapter: 40 },
  { label: "1 Cor. 13", bookId: "1CO", chapter: 13 },
  { label: "Phil 4", bookId: "PHP", chapter: 4 },
];
