import { getViewerProfile } from "@/lib/get-viewer-profile";
import { ModerationSidebar } from "./moderation-sidebar";

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

  return (
    <div className="flex flex-1 flex-row">
      <ModerationSidebar />
      <main className="flex flex-1 justify-center overflow-y-auto">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6">{children}</div>
      </main>
    </div>
  );
}
