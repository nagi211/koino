import { getUnreadMessageCount } from "@koino/core";
import { getViewerProfile } from "@/lib/get-viewer-profile";
import { createClient } from "@/lib/supabase/server";
import { ModerationMobileNav, ModerationSidebar } from "./moderation-sidebar";

export default async function ModerationLayout({ children }: { children: React.ReactNode }) {
  const profile = await getViewerProfile();

  // Suspension revokes moderation authority too, not just posting/commenting/
  // messaging — a suspended leader/admin shouldn't retain either.
  if (!profile || (profile.role !== "leader" && profile.role !== "admin") || profile.status !== "active") {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted">Only active leaders and admins can review posts.</p>
      </main>
    );
  }

  const supabase = await createClient();
  const unreadMessageCount = await getUnreadMessageCount(supabase, profile.id);

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <ModerationSidebar profile={profile} unreadMessageCount={unreadMessageCount} />
      <div className="flex flex-1 flex-col overflow-y-auto">
        <ModerationMobileNav profile={profile} unreadMessageCount={unreadMessageCount} />
        <main className="flex flex-1 justify-center">
          <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
