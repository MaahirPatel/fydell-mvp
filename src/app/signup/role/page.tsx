"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Briefcase, Wrench, Handshake, ArrowRight } from "lucide-react";
import FydellBrand from "@/components/brand/FydellBrand";
import { partnerSignupEnabled } from "@/lib/fde/flags";

type Role = "employer" | "fde" | "partner";

export default function SignupRolePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Role | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [firmName, setFirmName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showPartner = partnerSignupEnabled();

  async function submitRole(role: Role, extra: Record<string, unknown> = {}) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/fde/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      router.push(data.redirectTo || "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  function toggle(role: Role) {
    setError(null);
    setSelected((prev) => (prev === role ? null : role));
    if (role === "fde") {
      submitRole("fde");
    }
  }

  function submitEmployer(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) {
      setError("Company name is required.");
      return;
    }
    submitRole("employer", {
      companyName: companyName.trim(),
      companyWebsite: companyWebsite.trim() || undefined,
    });
  }

  function submitPartner(e: React.FormEvent) {
    e.preventDefault();
    submitRole("partner", { firmName: firmName.trim() || undefined });
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#050609]">
      <div className="pointer-events-none absolute right-[-8%] top-[-8%] h-[480px] w-[580px] rounded-full bg-[#3B5BFF]/[0.06] blur-[160px]" />
      <div className="pointer-events-none absolute left-[-6%] bottom-[-10%] h-[400px] w-[500px] rounded-full bg-[#3B5BFF]/[0.04] blur-[160px]" />

      <header className="relative z-10 mx-auto flex h-[72px] max-w-[1320px] items-center justify-between px-6 lg:px-10">
        <FydellBrand markSize={42} wordmarkSize={24} />
        <Link
          href="/login"
          className="text-[14px] font-medium text-white/[0.55] transition hover:text-white"
        >
          Sign in
        </Link>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100dvh-72px)] max-w-[720px] items-center px-6 pb-16">
        <section className="w-full">
          <h1
            className="text-white"
            style={{
              fontSize: "clamp(2rem,3vw,2.8rem)",
              lineHeight: 1.06,
              letterSpacing: "-0.04em",
              fontWeight: 650,
            }}
          >
            How will you use Fydell?
          </h1>
          <p className="mt-4 max-w-[52ch] text-[15px] leading-[1.65] text-white/[0.55]">
            Pick a path — you can always reach the others from your account settings later.
          </p>

          <div className="mt-8 grid gap-3">
            <button
              type="button"
              onClick={() => toggle("employer")}
              disabled={loading}
              className="group flex items-start gap-4 rounded-[14px] border border-white/[0.10] bg-[#0A0C11] px-5 py-4 text-left transition hover:border-white/20 hover:bg-[#0E1118] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-[#3B5BFF]/15">
                <Briefcase className="h-4.5 w-4.5 text-[#a8b8ff]" strokeWidth={1.7} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-white">
                  Business — hire FDEs
                </span>
                <span className="mt-1 block text-[13px] leading-relaxed text-white/55">
                  Post a mission, invite an FDE, and review evidence from real deployment work.
                </span>
              </span>
              <ArrowRight className="mt-1.5 h-4 w-4 shrink-0 text-white/30 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-white/60" />
            </button>

            {selected === "employer" && (
              <form
                onSubmit={submitEmployer}
                className="grid gap-3 rounded-[14px] border border-white/[0.10] bg-[#080B12] px-5 py-4"
              >
                <label className="block">
                  <span className="text-[13px] font-medium text-white/[0.66]">Company name</span>
                  <input
                    className="platform-input mt-1.5"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Your company"
                    autoFocus
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-[13px] font-medium text-white/[0.66]">
                    Company website <span className="text-white/35">(optional)</span>
                  </span>
                  <input
                    className="platform-input mt-1.5"
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    placeholder="acme.com"
                  />
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[#3B5BFF] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[#2f4fe0] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Working..." : "Continue"}
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => toggle("fde")}
              disabled={loading}
              className="group flex items-start gap-4 rounded-[14px] border border-white/[0.10] bg-[#0A0C11] px-5 py-4 text-left transition hover:border-white/20 hover:bg-[#0E1118] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-[#3B5BFF]/15">
                <Wrench className="h-4.5 w-4.5 text-[#a8b8ff]" strokeWidth={1.7} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-white">I&apos;m an FDE</span>
                <span className="mt-1 block text-[13px] leading-relaxed text-white/55">
                  Get invited to missions, run Project Relay, and build a portable work receipt.
                </span>
              </span>
              <ArrowRight className="mt-1.5 h-4 w-4 shrink-0 text-white/30 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-white/60" />
            </button>

            {showPartner && (
              <>
                <button
                  type="button"
                  onClick={() => toggle("partner")}
                  disabled={loading}
                  className="group flex items-start gap-4 rounded-[14px] border border-white/[0.10] bg-[#0A0C11] px-5 py-4 text-left transition hover:border-white/20 hover:bg-[#0E1118] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-[#3B5BFF]/15">
                    <Handshake className="h-4.5 w-4.5 text-[#a8b8ff]" strokeWidth={1.7} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold text-white">
                      I&apos;m a partner
                    </span>
                    <span className="mt-1 block text-[13px] leading-relaxed text-white/55">
                      Refer FDEs or employers into the network. Subject to approval.
                    </span>
                  </span>
                  <ArrowRight className="mt-1.5 h-4 w-4 shrink-0 text-white/30 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-white/60" />
                </button>

                {selected === "partner" && (
                  <form
                    onSubmit={submitPartner}
                    className="grid gap-3 rounded-[14px] border border-white/[0.10] bg-[#080B12] px-5 py-4"
                  >
                    <label className="block">
                      <span className="text-[13px] font-medium text-white/[0.66]">
                        Firm / organization name <span className="text-white/35">(optional)</span>
                      </span>
                      <input
                        className="platform-input mt-1.5"
                        value={firmName}
                        onChange={(e) => setFirmName(e.target.value)}
                        placeholder="Your firm"
                        autoFocus
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[#3B5BFF] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[#2f4fe0] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? "Working..." : "Continue"}
                    </button>
                  </form>
                )}
              </>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="mt-5 rounded-[10px] border border-[#fb7185]/40 bg-[#fb7185]/15 px-3.5 py-2.5 text-[13px] font-medium text-[#fecdd3]"
            >
              {error}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
