# Koino

A trust-gated Christian/positive-content social app. See
`/Users/gian/.claude/plans/federated-whistling-llama.md` for the full architecture plan.

## Setup

1. **Install dependencies**

   ```sh
   pnpm install
   ```

2. **Apply the database schema**

   Open your Supabase project's SQL editor and run `supabase/migrations/0001_init.sql`.
   It creates all tables, enables row-level security, and adds the trigger/RPC functions
   that enforce the vouching and posting rules. (If you'd rather use the Supabase CLI —
   `supabase link` then `supabase db push` — that works too, but the SQL editor is the
   fastest path for now since there's only one migration.)

3. **Configure environment variables**

   ```sh
   cp apps/web/.env.local.example apps/web/.env.local
   cp apps/mobile/.env.example apps/mobile/.env.local
   ```

   Fill in both files with your Supabase project's URL and anon key (Project Settings →
   API in the Supabase dashboard).

4. **Run both apps**

   ```sh
   pnpm dev
   ```

   Web runs at http://localhost:3000. For mobile, the Expo dev server will print a QR
   code — scan it with Expo Go, or press `i`/`a` for an iOS/Android simulator.

## What's here (Phase 1)

- `apps/web` — Next.js app with sign up/sign in and a profile status screen.
- `apps/mobile` — Expo Router app, same auth screen, native.
- `packages/core` — shared types, zod validation, and Supabase query functions used by
  both apps.
- `supabase/migrations` — the schema: profiles, vouch requests, conversations/messages,
  posts, reports, and the RLS policies that enforce who can post/join rooms/vouch.

New accounts start with `status='pending'` (a guest) — nothing but browsing works until
a `role='leader'` profile vouches for them via the `vouch_for_user` RPC. There's no UI
for the leader/vouch flow yet — that's Phase 2. To manually test the flow now, promote a
profile to leader directly in the Supabase table editor (`update profiles set
role='leader' where id='...'`), then call the RPCs from the SQL editor or via
`supabase.rpc(...)`.
