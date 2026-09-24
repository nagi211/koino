// Shared by every route segment's loading.tsx — Next.js renders this
// automatically as a Suspense fallback while that segment's Server Component
// awaits its data, so navigation always shows something moving instead of a
// frozen previous page.
export function LoadingSpinner() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-olive-dark border-t-transparent" />
        <p className="text-sm text-muted">Loading…</p>
      </div>
    </main>
  );
}
