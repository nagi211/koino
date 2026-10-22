import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Every supabase auth email (password reset, and email confirmation if that's
// ever turned on) links here with a `code` query param instead of landing
// directly on the destination page — exchanging it for a session is what
// actually signs the browser in; the destination page alone can't do that.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
