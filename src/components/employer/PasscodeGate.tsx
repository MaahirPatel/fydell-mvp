"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";

export default function PasscodeGate({
  token,
  employerName
}: {
  token: string;
  employerName: string;
}) {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/employer/${token}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Incorrect passcode.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-sm animate-fade-up">
        <Logo size={28} className="mb-8 justify-center" />
        <div className="rounded-2xl border border-line bg-white p-8 shadow-[var(--shadow-card)]">
          <h1 className="text-2xl">{employerName}</h1>
          <p className="mt-1 text-sm text-muted">
            Enter the passcode shared by the Fydell team to view your candidate
            leaderboard.
          </p>
          <form onSubmit={submit} className="mt-6 grid gap-4">
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-ink-2">Passcode</span>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                required
                className="rounded-xl border border-line bg-bg px-4 py-3 outline-none transition-colors focus:border-blue"
              />
            </label>
            {error && (
              <div className="rounded-xl border border-coral/30 bg-coral/5 px-4 py-2.5 text-sm text-coral-600">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-navy px-5 font-semibold text-white transition-all duration-200 enabled:hover:-translate-y-0.5 enabled:hover:bg-teal disabled:opacity-45"
            >
              {loading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
              View leaderboard
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
