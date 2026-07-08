"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import FydellBrand from "@/components/brand/FydellBrand";

const HIGHLIGHTS = [
  "Role-specific simulations that mirror the real job",
  "Structured, evidence-based candidate scoring",
  "Decision-ready reports for your hiring committee"
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
        body: JSON.stringify(body)
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
    <div className="fydell-page relative min-h-[100dvh] overflow-hidden">
      <div className="pointer-events-none absolute right-[-12%] top-[-10%] h-[620px] w-[760px] rounded-full bg-[#7c5cff]/20 blur-[150px]" />
      <div className="pointer-events-none absolute left-[-8%] bottom-[-12%] h-[520px] w-[640px] rounded-full bg-[#2563eb]/18 blur-[150px]" />

      <header className="relative z-10 mx-auto flex h-[76px] max-w-[1320px] items-center justify-between px-6 lg:px-10">
        <FydellBrand markSize={36} />
        <Link
          href={isSignup ? "/login" : "/signup"}
          className="text-[14px] font-semibold text-white/72 transition hover:text-white"
        >
          {isSignup ? "Sign in" : "Create account"}
        </Link>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100dvh-76px)] max-w-[1320px] items-center gap-16 px-6 pb-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
        {/* Brand / value side */}
        <section className="hidden max-w-[520px] lg:block">
          <p className="eyebrow">Fydell for teams</p>
          <h1 className="mt-7 text-[clamp(2.6rem,3.6vw,3.8rem)] font-extrabold leading-[1.02] tracking-[-0.055em] text-white">
            Hire on real work,{" "}
            <span className="text-gradient">not polished resumes.</span>
          </h1>
          <p className="mt-6 text-[18px] leading-[1.6] text-[#9aa4b8]">
            Build immersive, role-specific simulations and review structured evidence from realistic
            work sessions, all from one workspace.
          </p>
          <ul className="mt-9 space-y-4">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-3 text-[15px] text-white/82">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#5b8cff]" strokeWidth={1.9} />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Form side */}
        <section className="w-full max-w-[460px] justify-self-center lg:justify-self-end">
          <div className="glass-card p-7 sm:p-9">
            <h2 className="text-[26px] font-extrabold tracking-[-0.04em] text-white">
              {isSignup ? "Create your workspace" : "Welcome back"}
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[#9aa4b8]">
              {isSignup
                ? "Start building simulations tailored to your roles."
                : "Sign in to your hiring workspace."}
            </p>

            <form onSubmit={submit} className="mt-7 grid gap-4">
              {isSignup && (
                <label className="block">
                  <span className="text-[13px] font-semibold text-white/82">Company name</span>
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
                <span className="text-[13px] font-semibold text-white/82">Work email</span>
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
                <span className="text-[13px] font-semibold text-white/82">Password</span>
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
                  className="rounded-xl border border-[#fb7185]/30 bg-[#fb7185]/10 px-3.5 py-2.5 text-[13px] font-medium text-[#fda4b0]"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="platform-btn-primary btn-lift group mt-1 h-12 gap-2.5 text-[15px]"
              >
                {loading ? "Working..." : isSignup ? "Create account" : "Sign in"}
                {!loading && (
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-[14px] text-white/55">
              {isSignup ? "Already have an account? " : "New to Fydell? "}
              <Link
                href={isSignup ? "/login" : "/signup"}
                className="font-semibold text-[#8ea7ff] transition hover:text-white"
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
