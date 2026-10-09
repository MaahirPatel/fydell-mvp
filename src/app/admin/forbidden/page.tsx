import Link from "next/link";

export default function AdminForbiddenPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--surface-canvas)] px-6 text-[var(--text-primary)]">
      <div className="max-w-md text-center">
        <h1 className="text-app-page" style={{ fontWeight: 500, letterSpacing: "-0.03em" }}>
          Access restricted
        </h1>
        <p className="mt-3 text-app-body leading-[1.55] text-[var(--text-secondary)]">
          This account is signed in but does not have an active platform administration role.
          Contact a Fydell super administrator.
        </p>
        <Link
          href="/login?next=%2Fadmin%2Foverview"
          className="mt-6 inline-flex h-9 items-center rounded-[8px] bg-[var(--control-solid)] px-4 text-app-meta text-[var(--control-solid-ink)]"
          style={{ fontWeight: 500 }}
        >
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
