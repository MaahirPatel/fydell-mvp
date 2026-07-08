"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import GlassCard, { PlatformShell } from "./PlatformShell";

const STEPS = [
  {
    key: "hearAbout",
    title: "How did you hear about Fydell?",
    subtitle: "We're a small team - every referral teaches us where to focus.",
    type: "choice",
    options: [
      "LinkedIn / social",
      "Colleague or friend",
      "Conference or event",
      "Google search",
      "VC or investor intro",
      "Other"
    ]
  },
  {
    key: "companySize",
    title: "How big is your company?",
    type: "choice",
    options: ["1-50", "51-200", "201-1,000", "1,000+", "Enterprise (10k+)"]
  },
  {
    key: "yourRole",
    title: "What's your role in hiring?",
    type: "choice",
    options: [
      "Talent / recruiting lead",
      "Hiring manager",
      "People ops / HR",
      "Founder / executive",
      "Learning & development",
      "Other"
    ]
  },
  {
    key: "hiresPerYear",
    title: "How many people do you hire per year?",
    type: "choice",
    options: ["Under 10", "10-50", "50-200", "200+", "Seasonal spikes (e.g. intern class)"]
  },
  {
    key: "primaryUse",
    title: "What will you use Fydell for first?",
    type: "choice",
    options: [
      "Analyst / finance screening",
      "Intern or graduate pipeline",
      "Senior hire diligence",
      "Internal upskilling assessments",
      "Exploring - not sure yet"
    ]
  },
  {
    key: "hiringFor",
    title: "Which roles are you hiring for right now?",
    type: "text",
    placeholder: "e.g. Investment banking analysts, corporate finance associates..."
  },
  {
    key: "hiringPain",
    title: "What frustrates you most about how you assess candidates today?",
    type: "text",
    placeholder: "Interviews that sound good but don't predict on-the-job thinking..."
  },
  {
    key: "simulationPriority",
    title: "If Fydell could nail one thing for you, what would it be?",
    type: "choice",
    options: [
      "Real work instead of interviews",
      "Faster shortlisting with more signal",
      "Custom simulations per role",
      "Proctored / immersive candidate experience",
      "Employer-ready score reports"
    ]
  }
] as const;

type Answers = Record<string, string>;

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  function setAnswer(val: string) {
    setAnswers((a) => ({ ...a, [current.key]: val }));
  }

  async function finish() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/platform/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save");
      router.push("/platform");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  function next() {
    const val = answers[current.key]?.trim();
    if (!val) {
      setError("Choose or write an answer to continue.");
      return;
    }
    setError(null);
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish();
  }

  return (
    <PlatformShell>
      <div className="mx-auto max-w-2xl pt-6">
        <div className="mb-8">
          <div className="flex justify-between text-xs font-medium uppercase tracking-wider text-white/45">
            <span>Onboarding</span>
            <span>{step + 1} of {STEPS.length}</span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal to-blue transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <GlassCard className="animate-fade-up">
          {"subtitle" in current && current.subtitle && (
            <p className="text-sm text-teal/90">{current.subtitle}</p>
          )}
          <h1 className="mt-2 font-serif text-3xl leading-tight tracking-tight">{current.title}</h1>

          <div className="mt-8">
            {current.type === "choice" ? (
              <div className="grid gap-2">
                {current.options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAnswer(opt)}
                    className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                      answers[current.key] === opt
                        ? "border-teal/50 bg-teal/10 text-white"
                        : "border-white/10 bg-white/[0.03] text-white/75 hover:border-white/25"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <textarea
                className="platform-input min-h-[120px] resize-y"
                value={answers[current.key] ?? ""}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={current.placeholder}
              />
            )}
          </div>

          {error && (
            <p className="mt-4 rounded-lg border border-coral/30 bg-coral/10 px-3 py-2 text-sm text-coral-200">
              {error}
            </p>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep(step - 1)}
              className="platform-btn-ghost disabled:opacity-30"
            >
              Back
            </button>
            <button type="button" onClick={next} disabled={loading} className="platform-btn-primary">
              {loading ? "Saving..." : step === STEPS.length - 1 ? "Enter Fydell" : "Continue"}
            </button>
          </div>
        </GlassCard>
      </div>
    </PlatformShell>
  );
}
