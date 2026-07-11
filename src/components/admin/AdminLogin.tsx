"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

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
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Invalid email or password.");
      }
      router.push("/admin/pilot-requests");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <label className="block">
        <span className="text-[13px] font-medium text-white/[0.66]">Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="username"
          placeholder="admin@fydell.com"
          className="platform-input mt-1.5"
        />
      </label>
      <label className="block">
        <span className="text-[13px] font-medium text-white/[0.66]">Password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="platform-input mt-1.5"
        />
      </label>

      {error ? (
        <p
          role="alert"
          className="rounded-[10px] border border-[#fb7185]/30 bg-[#fb7185]/10 px-3.5 py-2.5 text-[13px] font-medium text-[#fda4b0]"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="group mt-1 inline-flex h-12 items-center justify-center gap-2.5 rounded-[10px] bg-[#F1F2F4] px-6 text-[15px] font-semibold text-[#08090C] transition-[filter,transform] duration-150 hover:-translate-y-px hover:brightness-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Signing in…" : "Sign in"}
        {!loading ? (
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        ) : null}
      </button>
    </form>
  );
}
