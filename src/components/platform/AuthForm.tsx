"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import FydellBrand from "@/components/brand/FydellBrand";

const HIGHLIGHTS = [
  "Work trials configured for your FP&A role",
  "Evidence reports from how candidates actually worked",
  "Candidate progress visible to your hiring team",
];

export default function AuthForm({ mode }: { mode: "signup" | "login" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const url = isSignup ? "/api/platform/signup" : "/api/platform/login";
    const body = isSignup ? { email, password, companyName } : { email, password };
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      router.push(data.onboardingComplete ? "/platform" : "/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#050609]">
      {/* Subtle ambient — toned down, no vivid purple blob */}
      <div className="pointer-events-none absolute right-[-8%] top-[-8%] h-[480px] w-[580px] rounded-full bg-[#3B5BFF]/[0.06] blur-[160px]" />
      <div className="pointer-events-none absolute left-[-6%] bottom-[-10%] h-[400px] w-[500px] rounded-full bg-[#3B5BFF]/[0.04] blur-[160px]" />

      {/* Nav */}
      <header className="relative z-10 mx-auto flex h-[72px] max-w-[1320px] items-center justify-between px-6 lg:px-10">
        <FydellBrand markSize={34} />
        <Link
          href={isSignup ? "/login" : "/signup"}
          className="text-[14px] font-medium text-white/[0.55] transition hover:text-white"
        >
          {isSignup ? "Sign in" : "Create account"}
        </Link>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100dvh-72px)] max-w-[1320px] items-center gap-16 px-6 pb-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
        {/* Brand / value side */}
        <section className="hidden max-w-[500px] lg:block">
          <h1
            className="text-white"
            style={{
              fontSize: "clamp(2.4rem,3.2vw,3.4rem)",
              lineHeight: 1.04,
              letterSpacing: "-0.04em",
              fontWeight: 650,
            }}
          >
            {isSignup
              ? "Create your Fydell workspace."
              : "Sign in to your Fydell workspace."}
          </h1>
          <p className="mt-5 text-[17px] leading-[1.65] text-white/[0.55]">
            Review work trials, evidence reports, and candidate progress.
          </p>
          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-3 text-[15px] text-white/[0.66]">
                <span className="mt-2 h-1 w-3 shrink-0 rounded-full bg-[#3B5BFF]" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Form side */}
        <section className="w-full max-w-[440px] justify-self-center lg:justify-self-end">
          <div className="overflow-hidden rounded-[20px] border border-white/[0.10] bg-[#080B12] p-7 sm:p-9">
            <h2 className="text-[24px] font-semibold tracking-[-0.04em] text-white">
              {isSignup ? "Create your workspace" : "Welcome back"}
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-white/[0.55]">
              {isSignup
                ? "Start with one FP&A role."
                : "Sign in to your Fydell workspace."}
            </p>

            <form onSubmit={submit} className="mt-7 grid gap-4">
              {isSignup && (
                <label className="block">
                  <span className="text-[13px] font-medium text-white/[0.66]">
                    Company name
                  </span>
                  <input
                    className="platform-input mt-1.5"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Your company"
                    required
                  />
                </label>
              )}
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
              <label className="block">
                <span className="text-[13px] font-medium text-white/[0.66]">Password</span>
                <input
                  className="platform-input mt-1.5"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignup ? "Min. 8 characters" : "Your password"}
                  minLength={8}
                  required
                />
              </label>

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
                {loading ? "Working..." : isSignup ? "Create account" : "Sign in"}
                {!loading && (
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-[13px] text-white/[0.38]">
              {isSignup ? "Already have an account? " : "New to Fydell? "}
              <Link
                href={isSignup ? "/login" : "/signup"}
                className="font-semibold text-white hover:underline"
              >
                {isSignup ? "Sign in" : "Create an account"}
              </Link>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
