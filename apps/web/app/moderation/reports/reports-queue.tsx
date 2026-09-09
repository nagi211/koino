"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { resolveReport, setPostStatus } from "@koino/core";
import type { ReportWithContext } from "@koino/core";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "../../avatar";
import { PostCard } from "../../post-card";

export function ReportsQueue({ reports }: { reports: ReportWithContext[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function dismiss(reportId: string) {
    setError(null);
    setPendingId(reportId);
    try {
      await resolveReport(createClient(), reportId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPendingId(null);
    }
  }

  async function hidePost(report: ReportWithContext) {
    setError(null);
    setPendingId(report.id);
    try {
      const client = createClient();
      await setPostStatus(client, report.target_id, "hidden", report.reason);
      await resolveReport(client, report.id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPendingId(null);
    }
  }

  if (reports.length === 0) {
    return <p className="text-muted">No open reports.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-danger">{error}</p>}
      <ul className="flex flex-col gap-4">
        {reports.map((report) => (
          <li key={report.id} className="flex flex-col gap-3 rounded-2xl border border-card-border p-4">
            <div className="flex items-center justify-between gap-2 text-xs text-muted">
              <span>
                Reported by{" "}
                <Link href={`/profile/${report.reporter_username}`} className="hover:underline">
                  @{report.reporter_username}
                </Link>
              </span>
              <span>Reason: {report.reason}</span>
            </div>

            {report.post && (
              <PostCard
                post={report.post}
                actions={
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={pendingId === report.id}
                      onClick={() => dismiss(report.id)}
                      className="rounded-xl border border-card-border px-4 py-1.5 text-sm text-muted hover:text-foreground disabled:opacity-50"
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      disabled={pendingId === report.id}
                      onClick={() => hidePost(report)}
                      className="rounded-xl bg-danger px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                    >
                      Hide post
                    </button>
                  </div>
                }
              />
            )}

            {report.comment && (
              <div className="flex flex-col gap-3 rounded-2xl border border-card-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <Avatar url={report.comment.author_avatar_url} username={report.comment.author_username} size={32} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/profile/${report.comment.author_username}`} className="text-sm font-medium text-foreground hover:underline">
                      @{report.comment.author_username}
                    </Link>
                    <p className="text-sm text-foreground">{report.comment.body}</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={pendingId === report.id}
                  onClick={() => dismiss(report.id)}
                  className="self-start rounded-xl border border-card-border px-4 py-1.5 text-sm text-muted hover:text-foreground disabled:opacity-50"
                >
                  Dismiss
                </button>
              </div>
            )}

            {report.target_type === "message" && report.message_sender && (
              <div className="flex flex-col gap-3 rounded-2xl border border-card-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <Avatar url={report.message_sender.avatar_url} username={report.message_sender.username} size={32} />
                  <Link href={`/profile/${report.message_sender.username}`} className="text-sm font-medium text-foreground hover:underline">
                    @{report.message_sender.username}
                  </Link>
                </div>
                <p className="text-sm italic text-muted">Messages are private — the content isn&apos;t shown here, only who sent it.</p>
                <button
                  type="button"
                  disabled={pendingId === report.id}
                  onClick={() => dismiss(report.id)}
                  className="self-start rounded-xl border border-card-border px-4 py-1.5 text-sm text-muted hover:text-foreground disabled:opacity-50"
                >
                  Dismiss
                </button>
              </div>
            )}

            {!report.post && !report.comment && !(report.target_type === "message" && report.message_sender) && (
              <div className="flex flex-col items-start gap-2">
                <p className="text-sm italic text-muted">
                  {report.target_type === "message"
                    ? "Messages are private — the content isn't shown here, only that it was reported."
                    : "The reported content is no longer available."}
                </p>
                <button
                  type="button"
                  disabled={pendingId === report.id}
                  onClick={() => dismiss(report.id)}
                  className="rounded-xl border border-card-border px-4 py-1.5 text-sm text-muted hover:text-foreground disabled:opacity-50"
                >
                  Dismiss
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
