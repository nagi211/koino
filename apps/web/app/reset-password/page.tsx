import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-3xl border border-card-border bg-card p-8 shadow-xl">
        <h1 className="mb-4 text-lg font-semibold text-foreground">Set a new password</h1>
        <ResetPasswordForm />
      </div>
    </main>
  );
}
