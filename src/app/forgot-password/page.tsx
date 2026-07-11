"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import FydellBrand from "@/components/brand/FydellBrand";
import TurnstileField from "@/components/security/TurnstileField";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/platform/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, captchaToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#050609]">
      <div className="pointer-events-none absolute right-[-8%] top-[-8%] h-[480px] w-[580px] rounded-full bg-[#3B5BFF]/[0.06] blur-[160px]" />
      <header className="relative z-10 mx-auto flex h-[72px] max-w-[1320px] items-center justify-between px-6 lg:px-10">
        <FydellBrand markSize={34} />
        <Link
          href="/login"
          className="text-[14px] font-medium text-white/[0.55] transition hover:text-white"
        >
          Sign in
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100dvh-72px)] max-w-[440px] items-center px-6 pb-16">
        <div className="w-full overflow-hidden rounded-[20px] border border-white/[0.10] bg-[#080B12] p-7 sm:p-9">
          <h1 className="text-[24px] font-semibold tracking-[-0.04em] text-white">
            Reset your password
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-white/[0.55]">
            We&apos;ll email you a secure link to choose a new password.
          </p>

          {sent ? (
            <div className="mt-7 space-y-4">
              <p className="rounded-[10px] border border-[#3B5BFF]/30 bg-[#3B5BFF]/10 px-3.5 py-2.5 text-[13px] font-medium text-[#a8b8ff]">
                If an account exists for that email, a reset link has been sent. Check your inbox
                (and spam).
              </p>
              <Link
                href="/login"
                className="inline-flex text-[13px] font-semibold text-white hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-7 grid gap-4">
              <label className="block">
                <span className="text-[13px] font-medium text-white/[0.66]">Work email</span>
                <input
                  className="platform-input mt-1.5"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                />
              </label>
              <TurnstileField onToken={setCaptchaToken} />
              {error && (
                <p
                  role="alert"
                  className="rounded-[10px] border border-[#fb7185]/30 bg-[#fb7185]/10 px-3.5 py-2.5 text-[13px] font-medium text-[#fda4b0]"
                >
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="group mt-1 inline-flex h-12 items-center justify-center gap-2.5 rounded-[10px] bg-[#3B5BFF] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#2f4fe0] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send reset link"}
                {!loading && (
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                )}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
