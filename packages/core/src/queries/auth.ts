import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Profile } from "../types";
import type { SignInInput, SignUpInput, UpdateProfileInput } from "../schemas";

export async function signUp(client: SupabaseClient<Database>, input: SignUpInput) {
  const { data, error } = await client.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { username: input.username } },
  });
  if (error) throw error;
  return data;
}

export async function signIn(client: SupabaseClient<Database>, input: SignInInput) {
  const { data, error } = await client.auth.signInWithPassword(input);
  if (error) throw error;
  return data;
}

export async function signOut(client: SupabaseClient<Database>) {
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function getMyProfile(client: SupabaseClient<Database>): Promise<Profile | null> {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;

  const { data, error } = await client.from("profiles").select("*").eq("id", user.id).single();
  if (error) throw error;
  return data;
}

/** Profiles are publicly readable — used for the /profile/[username] page. */
export async function getProfileByUsername(client: SupabaseClient<Database>, username: string): Promise<Profile | null> {
  const { data, error } = await client.from("profiles").select("*").eq("username", username).maybeSingle();
  if (error) throw error;
  return data;
}

/** RLS allows updating your own row as long as status/role stay unchanged (enforced there, not here). */
export async function updateProfile(
  client: SupabaseClient<Database>,
  profileId: string,
  input: UpdateProfileInput
): Promise<Profile> {
  const { data, error } = await client.from("profiles").update(input).eq("id", profileId).select().single();
  if (error) throw error;
  return data;
}

/** Admin-only — grants or revokes the trust flag that skips post approval. */
export async function setProfileVerified(client: SupabaseClient<Database>, targetId: string, verified: boolean) {
  const { error } = await client.rpc("set_profile_verified", { p_target_id: targetId, verified_value: verified });
  if (error) throw error;
}

/** Admin-only — directly sets an account's status (e.g. suspend/reactivate). */
export async function setProfileStatus(client: SupabaseClient<Database>, targetId: string, status: Profile["status"]) {
  const { error } = await client.rpc("set_profile_status", { p_target_id: targetId, new_status: status });
  if (error) throw error;
}
