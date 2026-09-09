import { NextResponse, type NextRequest } from "next/server";

const ESV_API_URL = "https://api.esv.org/v3/passage/text/";

/**
 * Server-side proxy for the ESV API — the key must never reach the browser,
 * so verse lookups for this translation go through here instead of being
 * fetched client-side the way the public-domain translations are.
 */
export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference")?.trim();
  if (!reference) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  const apiKey = process.env.ESV_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ESV lookup isn't configured" }, { status: 500 });
  }

  const url = new URL(ESV_API_URL);
  url.searchParams.set("q", reference);
  url.searchParams.set("include-headings", "false");
  url.searchParams.set("include-footnotes", "false");
  url.searchParams.set("include-verse-numbers", "false");
  url.searchParams.set("include-short-copyright", "false");
  url.searchParams.set("include-passage-references", "false");

  let res: Response;
  try {
    res = await fetch(url, { headers: { Authorization: `Token ${apiKey}` } });
  } catch {
    return NextResponse.json({ error: "Couldn't reach the ESV lookup service — try again." }, { status: 502 });
  }
  if (!res.ok) {
    return NextResponse.json({ error: "Something went wrong looking that up — try again." }, { status: 502 });
  }

  const data = (await res.json()) as { canonical?: string; passages?: string[] };
  const text = data.passages?.[0]?.trim();
  if (!text || !data.canonical) {
    return NextResponse.json({ error: `Couldn't find "${reference}" — check the reference and try again.` }, { status: 404 });
  }

  return NextResponse.json({ reference: data.canonical, text, translation: "esv" });
}
