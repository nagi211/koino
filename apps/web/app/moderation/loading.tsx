// Not <LoadingSpinner /> here — that wraps itself in <main>, and this
// content already renders inside moderation/layout.tsx's own <main>.
export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-olive-dark border-t-transparent" />
        <p className="text-sm text-muted">Loading…</p>
      </div>
    </div>
  );
}
