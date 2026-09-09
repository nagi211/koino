"use client";

import { useState } from "react";
import { reportContent, reportSchema } from "@koino/core";
import type { ReportTarget } from "@koino/core";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "./modal";

const TARGET_LABEL: Record<ReportTarget, string> = {
  post: "post",
  profile_comment: "comment",
  message: "message",
};

export function ReportModal({
  open,
  onClose,
  reporterId,
  targetType,
  targetId,
}: {
  open: boolean;
  onClose: () => void;
  reporterId: string;
  targetType: ReportTarget;
  targetId: string;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const label = TARGET_LABEL[targetType];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = reportSchema.safeParse({ target_type: targetType, target_id: targetId, reason });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid report");
      return;
    }

    setPending(true);
    try {
      await reportContent(createClient(), reporterId, parsed.data);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="mb-4 text-lg font-semibold text-foreground">Report {label}</h2>
      {done ? (
        <p className="text-sm text-muted">Thanks — a leader will review this.</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <textarea
            className="w-full rounded-xl border border-card-border bg-input px-4 py-3 text-foreground placeholder:text-muted outline-none transition focus:border-olive-dark focus:ring-2 focus:ring-olive/50"
            placeholder={`What's wrong with this ${label}?`}
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-olive-dark px-4 py-3 font-medium text-white shadow-md transition hover:brightness-105 disabled:opacity-50"
          >
            {pending ? "Sending…" : "Submit report"}
          </button>
        </form>
      )}
    </Modal>
  );
}
