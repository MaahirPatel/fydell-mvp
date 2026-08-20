export function SandboxUnavailable() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface-canvas)] px-6 text-[var(--text-primary)]">
      <div className="max-w-lg">
        <p className="text-app-meta uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Fydell sandbox</p>
        <h1 className="mt-4 text-app-page">Interactive demo temporarily unavailable</h1>
        <p className="mt-4 text-app-body text-[var(--text-secondary)]">
          The public sandbox is paused until the development environment, fixture version, and health check all agree. Nothing here is a hiring record.
        </p>
      </div>
    </main>
  );
}
