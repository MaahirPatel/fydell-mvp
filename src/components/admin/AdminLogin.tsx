"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Invalid email or password.");
      }
      router.push("/admin/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <label className="grid gap-1.5">
        <span className="text-sm font-semibold text-ink-2">Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="username"
          className="rounded-xl border border-line bg-bg px-4 py-3 outline-none transition-colors focus:border-blue"
        />
      </label>
      <label className="grid gap-1.5">
        <span className="text-sm font-semibold text-ink-2">Password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
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
        className="mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-navy px-5 font-semibold text-white transition-all duration-200 enabled:hover:-translate-y-0.5 enabled:hover:bg-teal disabled:opacity-45"
      >
        {loading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        )}
        Sign in
      </button>
    </form>
  );
}
