import { getReportsForModerator } from "@koino/core";
import { createClient } from "@/lib/supabase/server";
import { ReportsQueue } from "./reports-queue";

export default async function ModerationReportsPage() {
  const supabase = await createClient();
  const reports = await getReportsForModerator(supabase);

  return (
    <>
      <h1 className="text-2xl font-bold text-foreground">Reports</h1>
      <ReportsQueue reports={reports} />
    </>
  );
}
