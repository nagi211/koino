import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@koino/core";

// Generous enough that a household signing up together on one shared
// connection doesn't get blocked, tight enough to stop a scripted burst of
// accounts from one source.
const SIGNUP_LIMIT = 5;
const SIGNUP_WINDOW_MINUTES = 60;

// Stateless anon-key client — this call happens before the signup it's
// gating even exists, so there's no session/cookies to carry; the actual
// privileged work (reading/writing signup_attempts) happens inside the
// SECURITY DEFINER function itself, not via this client's own permissions.
function anonClient() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

/**
 * Called by the signup form before it hits supabase's own signUp — the IP
 * has to be read here, server-side, from the request itself (Vercel
 * populates x-forwarded-for reliably); a client-supplied IP could never be
 * trusted, since a script could just lie about its own address to bypass
 * this entirely.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";

  const { data, error } = await anonClient().rpc("check_and_record_signup_attempt", {
    p_ip: ip,
    p_limit: SIGNUP_LIMIT,
    p_window_minutes: SIGNUP_WINDOW_MINUTES,
  });

  if (error) {
    // Fail open on an unexpected error — a broken rate-limit check
    // shouldn't be the thing that locks everyone out of signing up.
    return NextResponse.json({ ok: true });
  }

  if (!data) {
    return NextResponse.json({ ok: false, error: "Too many accounts created recently — please try again later." }, { status: 429 });
  }

  return NextResponse.json({ ok: true });
}
