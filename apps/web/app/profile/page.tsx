import { redirect } from "next/navigation";
import { getMyProfile } from "@koino/core";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const profile = await getMyProfile(supabase);

  if (!profile) redirect("/");

  redirect(`/profile/${profile.username}`);
}
