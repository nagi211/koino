import { redirect } from "next/navigation";
import { getMyProfile } from "@koino/core";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const profile = await getMyProfile(supabase);

  if (!profile) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted">Sign in to view your profile.</p>
      </main>
    );
  }

  redirect(`/profile/${profile.username}`);
}
