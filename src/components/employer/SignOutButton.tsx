"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function SignOutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      disabled={loading}
      className={
        className ||
        "inline-flex h-9 items-center justify-center rounded-[8px] border border-[var(--border-strong)] px-4 text-[13.5px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-50"
      }
    >
      {loading ? "Signing out" : "Sign out"}
    </button>
  );
}
