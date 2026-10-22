"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePassword, updatePasswordSchema } from "@koino/core";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError(null);
    setFormError(null);

    const parsed = updatePasswordSchema.safeParse({ password });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Invalid password");
      return;
    }

    setPending(true);
    try {
      // Only succeeds while the recovery session from the email link (see
      // apps/web/app/auth/callback/route.ts) is still active — a visitor who
      // lands here without one gets supabase's own error surfaced below.
      await updatePassword(createClient(), parsed.data.password);
      setDone(true);
      setTimeout(() => router.push("/"), 1500);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  const inputClasses =
    "w-full rounded-xl border border-card-border bg-input px-4 py-3 text-foreground placeholder:text-muted outline-none transition focus:border-olive-dark focus:ring-2 focus:ring-olive/50";

  if (done) {
    return <p className="text-sm text-olive-dark">Password updated — taking you back in…</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <input
          className={inputClasses}
          placeholder="New password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {fieldError && <p className="text-sm text-danger">{fieldError}</p>}
      </div>

      {formError && <p className="text-sm text-danger">{formError}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 w-full rounded-xl bg-olive-dark px-4 py-3 font-medium text-white shadow-md transition hover:brightness-105 disabled:opacity-50"
      >
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
