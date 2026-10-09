export default function DeskLoading() {
  return (
    <div role="status" aria-live="polite" className="grid gap-4">
      <span className="sr-only">Loading</span>
      <div aria-hidden className="h-7 w-56 animate-pulse rounded-[6px] bg-[var(--surface-hover)]" />
      <div aria-hidden className="h-4 w-[min(520px,90%)] animate-pulse rounded-[6px] bg-[var(--surface-hover)]" />
      <div aria-hidden className="mt-4 h-40 animate-pulse rounded-[10px] bg-[var(--surface-panel)]" />
    </div>
  );
}
