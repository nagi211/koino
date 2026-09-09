// bible-api.com: free, no API key, CORS-open, and every translation it serves is
// public domain — no licensing concerns for storing/displaying the result.
const BIBLE_API_BASE = "https://bible-api.com";

// ESV is copyrighted (Crossway) — it's looked up through our own /api/esv-verse
// route instead, which holds the API key server-side (see fetchBibleVerse below).
export const BIBLE_TRANSLATIONS = [
  { id: "web", label: "World English Bible" },
  { id: "kjv", label: "King James Version" },
  { id: "asv", label: "American Standard Version" },
  { id: "esv", label: "English Standard Version" },
] as const;

export const BIBLE_BOOKS = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
  "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings",
  "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther",
  "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon",
  "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel",
  "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum",
  "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
  "Matthew", "Mark", "Luke", "John", "Acts", "Romans",
  "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians",
  "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy",
  "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter",
  "1 John", "2 John", "3 John", "Jude", "Revelation",
];

export type FetchedVerse = {
  reference: string;
  text: string;
  translation: string;
};

/**
 * Looks up a verse (or short range, e.g. "Romans 8:38-39") by free-text
 * reference. Throws with a message safe to show directly to the user.
 */
export async function fetchBibleVerse(reference: string, translationId: string): Promise<FetchedVerse> {
  const trimmed = reference.trim();
  if (!trimmed) throw new Error("Enter a reference, like \"John 3:16\".");

  if (translationId === "esv") return fetchEsvVerse(trimmed);

  const url = `${BIBLE_API_BASE}/${encodeURIComponent(trimmed)}?translation=${encodeURIComponent(translationId)}`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new Error("Couldn't reach the Bible lookup service — check your connection and try again.");
  }
  if (res.status === 404) throw new Error(`Couldn't find "${trimmed}" — check the reference and try again.`);
  if (!res.ok) throw new Error("Something went wrong looking that up — try again.");

  const data = (await res.json()) as { reference?: string; text?: string; translation_id?: string; error?: string };
  if (data.error || !data.text) throw new Error(data.error || `Couldn't find "${trimmed}".`);

  return {
    reference: (data.reference ?? trimmed).trim(),
    text: data.text.trim(),
    translation: data.translation_id ?? translationId,
  };
}

async function fetchEsvVerse(reference: string): Promise<FetchedVerse> {
  let res: Response;
  try {
    res = await fetch(`/api/esv-verse?reference=${encodeURIComponent(reference)}`);
  } catch {
    throw new Error("Couldn't reach the Bible lookup service — check your connection and try again.");
  }
  const data = (await res.json()) as { reference?: string; text?: string; translation?: string; error?: string };
  if (!res.ok || data.error || !data.text || !data.reference) {
    throw new Error(data.error || `Couldn't find "${reference}".`);
  }
  return { reference: data.reference, text: data.text, translation: data.translation ?? "esv" };
}
