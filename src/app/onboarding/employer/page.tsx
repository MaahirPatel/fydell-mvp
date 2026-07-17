"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FydellBrand from "@/components/brand/FydellBrand";

const OUTCOMES = [
  "Ship real deployment work independently",
  "Surface risks and edge cases early",
  "Communicate clearly with the customer",
  "Adapt when requirements change mid-task",
  "Write maintainable, tested changes",
  "Partner well with the hiring team",
  "Verify AI-assisted work before shipping",
];

export default function EmployerOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [industry, setIndustry] = useState("");
  const [roleTitle, setRoleTitle] = useState("Forward Deployed Engineer");
  const [outcomes, setOutcomes] = useState<string[]>([]);
  const [referral, setReferral] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/pilot/onboarding");
        if (res.ok) {
          const data = await res.json();
          const o = data.onboarding;
          if (o) {
            setStep(o.current_step || 1);
            setCompanyName(o.company_name || "");
            setCompanyWebsite(o.company_website || "");
            setJobTitle(o.job_title || "");
            setCompanySize(o.company_size || "");
            setIndustry(o.industry || "");
            setRoleTitle(o.role_title || "Forward Deployed Engineer");
            setOutcomes(o.first_90_day_outcomes || []);
            setReferral(o.referral_source || "");
            if (o.completed_at) {
              router.replace("/dashboard");
              return;
            }
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function saveStep(nextStep: number) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/pilot/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_step",
          currentStep: nextStep,
          companyName,
          companyWebsite,
          jobTitle,
          companySize,
          industry,
          roleTitle,
          outcomes,
          referralSource: referral,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setStep(nextStep);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function complete() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/pilot/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          companyName,
          companyWebsite,
          jobTitle,
          companySize,
          industry,
          roleTitle,
          outcomes,
          referralSource: referral,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not complete setup");
      router.push(data.redirectTo || "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete setup");
      setSaving(false);
    }
  }

  function toggleOutcome(item: string) {
    setOutcomes((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item].slice(0, 5)
    );
  }

  if (loading) {
    return <div className="min-h-[100dvh] bg-[#050609]" />;
  }

  return (
    <div className="min-h-[100dvh] bg-[#050609] text-[#F4F5F7]">
      <header className="mx-auto flex h-14 max-w-[760px] items-center justify-between px-5">
        <FydellBrand markSize={28} wordmarkSize={18} />
        <div className="flex items-center gap-4 text-[12px] text-white/50">
          <span>Saved as you go</span>
          <Link href="/login" className="hover:text-white">
            Log out
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] px-5 pb-16 pt-8">
        <div className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.08em] text-white/40">
            Employer setup · Step {step} of 5
          </p>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-[#3B5BFF] transition-all"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>

        {error ? (
          <p className="mb-4 rounded-[10px] border border-[#fb7185]/30 bg-[#fb7185]/10 px-3 py-2 text-[13px] text-[#fda4b0]">
            {error}
          </p>
        ) : null}

        {step === 1 && (
          <section>
            <h1 className="text-[28px]" style={{ fontWeight: 560, letterSpacing: "-0.03em" }}>
              Tell us about your company
            </h1>
            <p className="mt-2 text-[14px] text-white/55">
              This exact name becomes your organization. Reserved names like Fydell cannot be claimed.
            </p>
            <label className="mt-8 block text-[13px] text-white/65">
              Company name
              <input
                className="platform-input mt-1.5"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </label>
            <label className="mt-4 block text-[13px] text-white/65">
              Company website
              <input
                className="platform-input mt-1.5"
                value={companyWebsite}
                onChange={(e) => setCompanyWebsite(e.target.value)}
                placeholder="https://"
              />
            </label>
            <label className="mt-4 block text-[13px] text-white/65">
              Company size
              <input
                className="platform-input mt-1.5"
                value={companySize}
                onChange={(e) => setCompanySize(e.target.value)}
                placeholder="e.g. 51–200"
              />
            </label>
            <button
              type="button"
              disabled={saving || !companyName.trim()}
              onClick={() => saveStep(2)}
              className="mt-8 inline-flex h-10 items-center rounded-[9px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C] disabled:opacity-50"
            >
              Continue
            </button>
          </section>
        )}

        {step === 2 && (
          <section>
            <h1 className="text-[28px]" style={{ fontWeight: 560, letterSpacing: "-0.03em" }}>
              How will you use Fydell?
            </h1>
            <label className="mt-8 block text-[13px] text-white/65">
              Job title
              <input
                className="platform-input mt-1.5"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </label>
            <label className="mt-4 block text-[13px] text-white/65">
              Industry
              <input
                className="platform-input mt-1.5"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              />
            </label>
            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex h-10 items-center rounded-[9px] border border-white/20 px-4 text-[13px]"
              >
                Back
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => saveStep(3)}
                className="inline-flex h-10 items-center rounded-[9px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C]"
              >
                Continue
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <h1 className="text-[28px]" style={{ fontWeight: 560, letterSpacing: "-0.03em" }}>
              Set up your first mission role
            </h1>
            <label className="mt-8 block text-[13px] text-white/65">
              Role title
              <input
                className="platform-input mt-1.5"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
              />
            </label>
            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex h-10 items-center rounded-[9px] border border-white/20 px-4 text-[13px]"
              >
                Back
              </button>
              <button
                type="button"
                disabled={saving || !roleTitle.trim()}
                onClick={() => saveStep(4)}
                className="inline-flex h-10 items-center rounded-[9px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C] disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </section>
        )}

        {step === 4 && (
          <section>
            <h1 className="text-[28px]" style={{ fontWeight: 560, letterSpacing: "-0.03em" }}>
              First 90-day outcomes
            </h1>
            <p className="mt-2 text-[14px] text-white/55">Choose 3–5 outcomes.</p>
            <ul className="mt-6 space-y-2">
              {OUTCOMES.map((item) => {
                const on = outcomes.includes(item);
                return (
                  <li key={item}>
                    <button
                      type="button"
                      onClick={() => toggleOutcome(item)}
                      className={`w-full rounded-[10px] border px-4 py-3 text-left text-[13px] ${
                        on
                          ? "border-[#3B5BFF]/50 bg-[#3B5BFF]/10 text-white"
                          : "border-white/10 text-white/70 hover:border-white/20"
                      }`}
                    >
                      {item}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex h-10 items-center rounded-[9px] border border-white/20 px-4 text-[13px]"
              >
                Back
              </button>
              <button
                type="button"
                disabled={saving || outcomes.length < 3}
                onClick={() => saveStep(5)}
                className="inline-flex h-10 items-center rounded-[9px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C] disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </section>
        )}

        {step === 5 && (
          <section>
            <h1 className="text-[28px]" style={{ fontWeight: 560, letterSpacing: "-0.03em" }}>
              Review and create workspace
            </h1>
            <div className="mt-6 space-y-2 rounded-[14px] border border-white/10 bg-[#0A0C11] p-5 text-[13px] text-white/70">
              <p>
                <span className="text-white/45">Company:</span> {companyName}
              </p>
              <p>
                <span className="text-white/45">Role:</span> {roleTitle}
              </p>
              <p>
                <span className="text-white/45">Outcomes:</span> {outcomes.length}
              </p>
              <p>
                <span className="text-white/45">Simulation:</span> Project Relay
              </p>
            </div>
            <label className="mt-6 block text-[13px] text-white/65">
              How did you hear about Fydell? (optional)
              <input
                className="platform-input mt-1.5"
                value={referral}
                onChange={(e) => setReferral(e.target.value)}
                placeholder="LinkedIn, colleague, investor…"
              />
            </label>
            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="inline-flex h-10 items-center rounded-[9px] border border-white/20 px-4 text-[13px]"
              >
                Back
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={complete}
                className="inline-flex h-10 items-center rounded-[9px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C] disabled:opacity-50"
              >
                {saving ? "Creating…" : "Create workspace"}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
