"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function SignOutButton({
  className = "",
  role,
  tabIndex,
}: {
  className?: string;
  /** Set to "menuitem" when the button sits inside a menu. */
  role?: "menuitem";
  tabIndex?: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    try {
      // The server clears the Supabase session cookies plus the company and
      // admin cookies; the client sign-out drops any in-memory session.
      await fetch("/api/platform/logout", { method: "POST" }).catch(() => undefined);
      await createBrowserSupabaseClient().auth.signOut({ scope: "local" }).catch(() => undefined);
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      role={role}
      tabIndex={tabIndex}
      onClick={() => void signOut()}
      disabled={loading}
      className={
        className ||
        "inline-flex h-9 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border-strong)] px-4 text-app-body font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-50"
      }
    >
      {loading ? "Signing out" : "Sign out"}
    </button>
  );
}
