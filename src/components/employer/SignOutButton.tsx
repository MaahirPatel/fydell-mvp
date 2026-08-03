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
        "inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-[13.5px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      }
    >
      {loading ? "Signing out" : "Sign out"}
    </button>
  );
}
