"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GlassCard, { PlatformShell } from "./PlatformShell";
import type { GeneratedSimulation } from "@/lib/platform-types";

const SKILL_OPTIONS = [
  "Financial modeling",
  "Credit / legal reading",
  "Valuation judgment",
  "Communication under pressure",
  "Synthesis across documents",
  "Risk identification"
];

export default function SimulationBuilder() {
  const router = useRouter();
  const [industry, setIndustry] = useState("Finance / investment banking");
  const [role, setRole] = useState("Investment banking analyst");
  const [brief, setBrief] = useState("");
  const [skills, setSkills] = useState<string[]>(["Financial modeling", "Risk identification"]);
  const [duration, setDuration] = useState(25);
  const [difficulty, setDifficulty] = useState<"standard" | "advanced">("standard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<GeneratedSimulation[]>([]);

  useEffect(() => {
    fetch("/api/platform/simulations")
      .then((r) => r.json())
      .then((d) => setRecent(d.simulations ?? []))
      .catch(() => {});
  }, []);

  function toggleSkill(s: string) {
    setSkills((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/platform/simulations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry,
          role,
          scenarioBrief: brief,
          skills,
          durationMinutes: duration,
          difficulty
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      router.push(`/platform/simulations/${data.simulation.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate");
      setLoading(false);
    }
  }

  function openImmersive(id: string) {
    const url = `/session/${id}?kiosk=1`;
    const w = window.open(url, "fydell_session", "popup,width=1280,height=800,noopener,noreferrer");
    if (!w) window.location.href = url;
  }

  return (
    <PlatformShell
      actions={
        <>
          <Link href="/platform" className="platform-btn-ghost">Dashboard</Link>
          <button
            type="button"
            className="platform-btn-ghost"
            onClick={async () => {
              await fetch("/api/platform/logout", { method: "POST" });
              router.push("/");
            }}
          >
            Sign out
          </button>
        </>
      }
    >
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] pt-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal">AI simulation studio</p>
          <h1 className="mt-3 font-serif text-4xl tracking-tight">Generate a simulation</h1>
          <p className="mt-3 max-w-lg text-white/65">
            Describe the role and scenario. Fydell builds documents, workbook tasks, timed updates,
            and reflection prompts - ready to run in an immersive session.
          </p>

          <GlassCard className="mt-8 grid gap-5">
            <label>
              <span className="text-sm text-white/75">Industry</span>
              <input className="platform-input mt-1.5" value={industry} onChange={(e) => setIndustry(e.target.value)} />
            </label>
            <label>
              <span className="text-sm text-white/75">Role being assessed</span>
              <input className="platform-input mt-1.5" value={role} onChange={(e) => setRole(e.target.value)} />
            </label>
            <label>
              <span className="text-sm text-white/75">Scenario brief (optional)</span>
              <textarea
                className="platform-input mt-1.5 min-h-[88px]"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="e.g. Unsolicited take-private at $2.4B - is it fair?"
              />
            </label>
            <div>
              <span className="text-sm text-white/75">Skills to test</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {SKILL_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSkill(s)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      skills.includes(s)
                        ? "bg-teal/20 text-teal border border-teal/40"
                        : "border border-white/15 text-white/60 hover:border-white/30"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="text-sm text-white/75">Duration (minutes)</span>
                <select
                  className="platform-select mt-1.5"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                >
                  {[15, 25, 35, 45].map((m) => (
                    <option key={m} value={m}>{m} minutes</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="text-sm text-white/75">Difficulty</span>
                <select
                  className="platform-select mt-1.5"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as "standard" | "advanced")}
                >
                  <option value="standard">Standard</option>
                  <option value="advanced">Advanced (skeptical IC)</option>
                </select>
              </label>
            </div>
            {error && (
              <p className="rounded-lg border border-coral/30 bg-coral/10 px-3 py-2 text-sm text-coral-200">{error}</p>
            )}
            <button type="button" disabled={loading} onClick={generate} className="platform-btn-primary">
              {loading ? "Generating simulation..." : "Generate with AI"}
            </button>
          </GlassCard>
        </div>

        <div>
          <GlassCard>
            <h2 className="font-semibold text-white">Your simulations</h2>
            <p className="mt-1 text-sm text-white/55">Launch immersive sessions in a focused window.</p>
            {recent.length === 0 ? (
              <p className="mt-6 text-sm text-white/45">No simulations yet - generate your first above.</p>
            ) : (
              <ul className="mt-6 grid gap-3">
                {recent.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20"
                  >
                    <p className="font-medium">{s.title}</p>
                    <p className="mt-1 text-xs text-white/50">{s.role} | {s.durationMinutes} min</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={`/platform/simulations/${s.id}`}
                        className="platform-btn-ghost !h-8 !px-3 !text-xs"
                      >
                        Review
                      </Link>
                      <button
                        type="button"
                        className="platform-btn-primary !h-8 !px-3 !text-xs"
                        onClick={() => openImmersive(s.id)}
                      >
                        Immersive session ↗
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
          <p className="mt-4 text-xs text-white/40 leading-relaxed">
            Immersive mode opens a separate window, requests camera and microphone access for
            proctoring-style sessions, and encourages fullscreen. True browser lockdown requires
            enterprise kiosk software - we maximize what the web can do safely.
          </p>
        </div>
      </div>
    </PlatformShell>
  );
}
