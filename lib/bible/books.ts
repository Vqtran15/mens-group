export interface BibleBook {
  id: string; // USFM code e.g. "JHN"
  name: string; // Display name e.g. "John"
  aliases: string[]; // lowercase abbreviations for parsing
  chapters: number;
}

export const BIBLE_BOOKS: BibleBook[] = [
  // Old Testament
  { id: "GEN", name: "Genesis", aliases: ["gen", "genesis"], chapters: 50 },
  { id: "EXO", name: "Exodus", aliases: ["ex", "exo", "exodus"], chapters: 40 },
  { id: "LEV", name: "Leviticus", aliases: ["lev", "leviticus"], chapters: 27 },
  { id: "NUM", name: "Numbers", aliases: ["num", "numbers"], chapters: 36 },
  { id: "DEU", name: "Deuteronomy", aliases: ["deu", "deut", "deuteronomy"], chapters: 34 },
  { id: "JOS", name: "Joshua", aliases: ["josh", "joshua"], chapters: 24 },
  { id: "JDG", name: "Judges", aliases: ["judg", "judges"], chapters: 21 },
  { id: "RUT", name: "Ruth", aliases: ["rut", "ruth"], chapters: 4 },
  { id: "1SA", name: "1 Samuel", aliases: ["1sa", "1sam", "1 sam", "1 samuel", "1samuel"], chapters: 31 },
  { id: "2SA", name: "2 Samuel", aliases: ["2sa", "2sam", "2 sam", "2 samuel", "2samuel"], chapters: 24 },
  { id: "1KI", name: "1 Kings", aliases: ["1ki", "1kin", "1 kin", "1 kings", "1kings"], chapters: 22 },
  { id: "2KI", name: "2 Kings", aliases: ["2ki", "2kin", "2 kin", "2 kings", "2kings"], chapters: 25 },
  { id: "1CH", name: "1 Chronicles", aliases: ["1ch", "1chr", "1 chr", "1 chronicles"], chapters: 29 },
  { id: "2CH", name: "2 Chronicles", aliases: ["2ch", "2chr", "2 chr", "2 chronicles"], chapters: 36 },
  { id: "EZR", name: "Ezra", aliases: ["ezr", "ezra"], chapters: 10 },
  { id: "NEH", name: "Nehemiah", aliases: ["neh", "nehemiah"], chapters: 13 },
  { id: "EST", name: "Esther", aliases: ["est", "esth", "esther"], chapters: 10 },
  { id: "JOB", name: "Job", aliases: ["job"], chapters: 42 },
  { id: "PSA", name: "Psalms", aliases: ["ps", "psa", "psalm", "psalms"], chapters: 150 },
  { id: "PRO", name: "Proverbs", aliases: ["pro", "prov", "proverbs"], chapters: 31 },
  { id: "ECC", name: "Ecclesiastes", aliases: ["ecc", "eccl", "ecclesiastes"], chapters: 12 },
  { id: "SNG", name: "Song of Solomon", aliases: ["sng", "song", "sos", "song of solomon", "song of songs"], chapters: 8 },
  { id: "ISA", name: "Isaiah", aliases: ["isa", "isaiah"], chapters: 66 },
  { id: "JER", name: "Jeremiah", aliases: ["jer", "jeremiah"], chapters: 52 },
  { id: "LAM", name: "Lamentations", aliases: ["lam", "lamentations"], chapters: 5 },
  { id: "EZK", name: "Ezekiel", aliases: ["ezk", "ezek", "ezekiel"], chapters: 48 },
  { id: "DAN", name: "Daniel", aliases: ["dan", "daniel"], chapters: 12 },
  { id: "HOS", name: "Hosea", aliases: ["hos", "hosea"], chapters: 14 },
  { id: "JOL", name: "Joel", aliases: ["jol", "joel"], chapters: 3 },
  { id: "AMO", name: "Amos", aliases: ["amo", "amos"], chapters: 9 },
  { id: "OBA", name: "Obadiah", aliases: ["oba", "obad", "obadiah"], chapters: 1 },
  { id: "JON", name: "Jonah", aliases: ["jon", "jonah"], chapters: 4 },
  { id: "MIC", name: "Micah", aliases: ["mic", "micah"], chapters: 7 },
  { id: "NAM", name: "Nahum", aliases: ["nam", "nahum"], chapters: 3 },
  { id: "HAB", name: "Habakkuk", aliases: ["hab", "habakkuk"], chapters: 3 },
  { id: "ZEP", name: "Zephaniah", aliases: ["zep", "zeph", "zephaniah"], chapters: 3 },
  { id: "HAG", name: "Haggai", aliases: ["hag", "haggai"], chapters: 2 },
  { id: "ZEC", name: "Zechariah", aliases: ["zec", "zech", "zechariah"], chapters: 14 },
  { id: "MAL", name: "Malachi", aliases: ["mal", "malachi"], chapters: 4 },
  // New Testament
  { id: "MAT", name: "Matthew", aliases: ["mat", "matt", "matthew"], chapters: 28 },
  { id: "MRK", name: "Mark", aliases: ["mrk", "mk", "mar", "mark"], chapters: 16 },
  { id: "LUK", name: "Luke", aliases: ["luk", "lk", "luke"], chapters: 24 },
  { id: "JHN", name: "John", aliases: ["jhn", "jn", "john"], chapters: 21 },
  { id: "ACT", name: "Acts", aliases: ["act", "acts"], chapters: 28 },
  { id: "ROM", name: "Romans", aliases: ["rom", "romans"], chapters: 16 },
  { id: "1CO", name: "1 Corinthians", aliases: ["1co", "1cor", "1 cor", "1 corinthians", "1corinthians"], chapters: 16 },
  { id: "2CO", name: "2 Corinthians", aliases: ["2co", "2cor", "2 cor", "2 corinthians", "2corinthians"], chapters: 13 },
  { id: "GAL", name: "Galatians", aliases: ["gal", "galatians"], chapters: 6 },
  { id: "EPH", name: "Ephesians", aliases: ["eph", "ephesians"], chapters: 6 },
  { id: "PHP", name: "Philippians", aliases: ["php", "phil", "philippians"], chapters: 4 },
  { id: "COL", name: "Colossians", aliases: ["col", "colossians"], chapters: 4 },
  { id: "1TH", name: "1 Thessalonians", aliases: ["1th", "1thes", "1 thes", "1 thessalonians"], chapters: 5 },
  { id: "2TH", name: "2 Thessalonians", aliases: ["2th", "2thes", "2 thes", "2 thessalonians"], chapters: 3 },
  { id: "1TI", name: "1 Timothy", aliases: ["1ti", "1tim", "1 tim", "1 timothy", "1timothy"], chapters: 6 },
  { id: "2TI", name: "2 Timothy", aliases: ["2ti", "2tim", "2 tim", "2 timothy", "2timothy"], chapters: 4 },
  { id: "TIT", name: "Titus", aliases: ["tit", "titus"], chapters: 3 },
  { id: "PHM", name: "Philemon", aliases: ["phm", "philem", "philemon"], chapters: 1 },
  { id: "HEB", name: "Hebrews", aliases: ["heb", "hebrews"], chapters: 13 },
  { id: "JAS", name: "James", aliases: ["jas", "james"], chapters: 5 },
  { id: "1PE", name: "1 Peter", aliases: ["1pe", "1pet", "1 pet", "1 peter", "1peter"], chapters: 5 },
  { id: "2PE", name: "2 Peter", aliases: ["2pe", "2pet", "2 pet", "2 peter", "2peter"], chapters: 3 },
  { id: "1JO", name: "1 John", aliases: ["1jo", "1jn", "1 jn", "1 john", "1john"], chapters: 5 },
  { id: "2JO", name: "2 John", aliases: ["2jo", "2jn", "2 jn", "2 john", "2john"], chapters: 1 },
  { id: "3JO", name: "3 John", aliases: ["3jo", "3jn", "3 jn", "3 john", "3john"], chapters: 1 },
  { id: "JUD", name: "Jude", aliases: ["jud", "jude"], chapters: 1 },
  { id: "REV", name: "Revelation", aliases: ["rev", "revelation", "revelations"], chapters: 22 },
];

// Build a flat lookup map: alias → book
const ALIAS_MAP = new Map<string, BibleBook>();
for (const book of BIBLE_BOOKS) {
  for (const alias of book.aliases) {
    ALIAS_MAP.set(alias.toLowerCase(), book);
  }
  ALIAS_MAP.set(book.name.toLowerCase(), book);
}

export function lookupBook(name: string): BibleBook | null {
  return ALIAS_MAP.get(name.trim().toLowerCase()) ?? null;
}
