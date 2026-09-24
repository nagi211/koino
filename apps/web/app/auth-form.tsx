"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp, signInSchema, signUpSchema } from "@koino/core";
import { createClient } from "@/lib/supabase/client";

export function AuthForm({
  initialMode = "sign-up",
  onSuccess,
}: {
  initialMode?: "sign-in" | "sign-up";
  onSuccess?: () => void;
} = {}) {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "sign-up">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // router.refresh() re-fetches everything server-rendered but doesn't await —
  // without this, the caller (e.g. AuthModal) closed immediately on the old,
  // still-signed-out page underneath, which sat frozen until the refresh
  // quietly landed a moment later. Wrapping it in a transition makes
  // isRefreshing track that gap, so the button/modal can stay in a loading
  // state for the whole thing instead of just the API call.
  const [isRefreshing, startTransition] = useTransition();
  const awaitingRefresh = useRef(false);

  useEffect(() => {
    if (awaitingRefresh.current && !isRefreshing) {
      awaitingRefresh.current = false;
      onSuccess?.();
    }
  }, [isRefreshing, onSuccess]);

  function validateField(field: "username" | "email" | "password", value: string) {
    const schema = mode === "sign-up" ? signUpSchema : signInSchema;
    const shape = schema.shape as Record<string, { safeParse: (v: string) => { success: boolean; error?: { issues: { message: string }[] } } }>;
    const fieldSchema = shape[field];
    if (!fieldSchema) return;

    const result = fieldSchema.safeParse(value);
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (result.success) {
        delete next[field];
      } else {
        next[field] = result.error?.issues[0]?.message ?? "Invalid value";
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setFormError(null);

    const client = createClient();
    const parsed =
      mode === "sign-up"
        ? signUpSchema.safeParse({ email, password, username })
        : signInSchema.safeParse({ email, password });

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setPending(true);
    try {
      if (mode === "sign-up") {
        await signUp(client, parsed.data as { email: string; password: string; username: string });
      } else {
        await signIn(client, parsed.data as { email: string; password: string });
      }
      awaitingRefresh.current = true;
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  const submitting = pending || isRefreshing;

  const inputClasses =
    "w-full rounded-xl border border-card-border bg-input px-4 py-3 text-foreground placeholder:text-muted outline-none transition focus:border-olive-dark focus:ring-2 focus:ring-olive/50";

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
      <div className="flex gap-4 text-sm">
        <button
          type="button"
          className={mode === "sign-up" ? "font-semibold text-foreground underline underline-offset-4" : "text-muted"}
          onClick={() => setMode("sign-up")}
        >
          Sign up
        </button>
        <button
          type="button"
          className={mode === "sign-in" ? "font-semibold text-foreground underline underline-offset-4" : "text-muted"}
          onClick={() => setMode("sign-in")}
        >
          Sign in
        </button>
      </div>

      {mode === "sign-up" && (
        <div className="flex flex-col gap-1">
          <input
            className={inputClasses}
            placeholder="Username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              validateField("username", e.target.value);
            }}
          />
          {fieldErrors.username && <p className="text-sm text-danger">{fieldErrors.username}</p>}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <input
          className={inputClasses}
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            validateField("email", e.target.value);
          }}
        />
        {fieldErrors.email && <p className="text-sm text-danger">{fieldErrors.email}</p>}
      </div>
      <div className="flex flex-col gap-1">
        <input
          className={inputClasses}
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            validateField("password", e.target.value);
          }}
        />
        {fieldErrors.password && <p className="text-sm text-danger">{fieldErrors.password}</p>}
      </div>

      {formError && <p className="text-sm text-danger">{formError}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="mt-1 w-full rounded-xl bg-olive-dark px-4 py-3 font-medium text-white shadow-md transition hover:brightness-105 disabled:opacity-50"
      >
        {submitting ? "Please wait…" : mode === "sign-up" ? "Create account" : "Sign in"}
      </button>

      {mode === "sign-up" && (
        <p className="text-xs text-muted">
          New accounts start as a guest so you can look around. When you&rsquo;re ready, say hello to request to talk
          with a community leader.
        </p>
      )}
    </form>
  );
}
