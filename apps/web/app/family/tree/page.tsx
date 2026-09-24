import { redirect } from "next/navigation";
import { getFamilyTree, getMyProfile, getProfilesByIds } from "@koino/core";
import { createClient } from "@/lib/supabase/server";
import { FamilyTreeView } from "./family-tree-view";

export default async function FamilyTreePage() {
  const supabase = await createClient();
  const profile = await getMyProfile(supabase);

  if (!profile) redirect("/");

  const edges = await getFamilyTree(supabase);

  const personIds = new Set<string>([profile.id]);
  for (const edge of edges) {
    personIds.add(edge.person_a);
    personIds.add(edge.person_b);
  }
  const profiles = await getProfilesByIds(supabase, Array.from(personIds));

  return <FamilyTreeView viewer={profile} edges={edges} profiles={profiles} />;
}
