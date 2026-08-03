"use client";

/**
 * Interactive hero preview: a short, looping walkthrough of a five-minute
 * simulation, built from the same visual language as the real runner.
 * Three role tabs change the storyline. Auto-advances every 1.5s (a ~10.5s
 * loop), pauses on hover/focus, has manual step dots, and respects
 * prefers-reduced-motion (no autoplay).
 */
import { useEffect, useRef, useState } from "react";

type Step = {
  label: string;
  view: "mission" | "resources" | "finding" | "chat" | "answer" | "event" | "result";
};

type RoleStory = {
  role: string;
  sim: string;
  mission: string;
  resourceA: { title: string; rows: [string, string][] };
  resourceB: { title: string; rows: [string, string][] };
  findingText: string;
  findingHighlight: string;
  question: string;
  reply: string;
  stakeholder: string;
  answerLabel: string;
  answerValue: string;
  eventText: string;
  resultBand: string;
  resultScore: string;
};

const STORIES: RoleStory[] = [
  {
    role: "Data Analyst",
    sim: "The Missing Delays",
    mission: "The dashboard reports zero delayed revenue. The service team says two delayed orders are missing. Find out why.",
    resourceA: {
      title: "orders.csv",
      rows: [
        ["A-101", "$1,200"],
        ["A-102", "$800"],
        ["A-103", "$500"],
      ],
    },
    resourceB: {
      title: "manual_delays.csv",
      rows: [
        ["A102", "Carrier capacity"],
        ["A103", "Weather"],
      ],
    },
    findingText: "The delay file drops the hyphens. The join on Order ID finds no matches.",
    findingHighlight: "A-102 vs A102",
    question: "Do the hyphens in the order IDs mean anything?",
    reply: "They should not be. Some teams enter IDs with hyphens and some do not.",
    stakeholder: "Dana Whitfield, Operations",
    answerLabel: "Corrected delayed revenue",
    answerValue: "$1,300",
    eventText: "Evidence recorded: corrected value entered after stakeholder confirmation",
    resultBand: "Strong evidence",
    resultScore: "90 / 100",
  },
  {
    role: "Solutions Engineer",
    sim: "Promise or Product Fit",
    mission: "A prospect wants SSO, CRM import and real-time bidirectional updates. Sales needs an answer before tomorrow's demo.",
    resourceA: {
      title: "Customer requirements",
      rows: [
        ["SAML SSO", "Required"],
        ["CRM import", "Required"],
        ["Real-time sync", "Requested"],
      ],
    },
    resourceB: {
      title: "Product capabilities",
      rows: [
        ["SAML SSO", "Supported"],
        ["Scheduled import", "Supported"],
        ["Real-time write-back", "Not supported"],
      ],
    },
    findingText: "Real-time bidirectional write-back is the one gap. Everything else is supported.",
    findingHighlight: "Real-time write-back",
    question: "Did we promise real-time sync to this customer?",
    reply: "I said we support CRM integration. I did not promise a sync method.",
    stakeholder: "Alex Morgan, Account Executive",
    answerLabel: "Recommended architecture",
    answerValue: "SSO + scheduled import + webhook",
    eventText: "Evidence recorded: gap named honestly in the customer explanation",
    resultBand: "Strong evidence",
    resultScore: "88 / 100",
  },
  {
    role: "Technical Support Engineer",
    sim: "The Green Status Page",
    mission: "Customers can't log in, but the status page shows green. Work out what's broken and what's safe to say.",
    resourceA: {
      title: "Tickets",
      rows: [
        ["#4411", "Login fails after 09:42"],
        ["#4412", "SSO error since morning"],
        ["#4413", "Team locked out"],
      ],
    },
    resourceB: {
      title: "Release timeline",
      rows: [
        ["09:40", "Auth config release"],
        ["09:42", "First login errors"],
        ["10:05", "Status page: green"],
      ],
    },
    findingText: "Errors start two minutes after the auth release. The status check uses a different login path.",
    findingHighlight: "09:40 release, 09:42 errors",
    question: "What changed in the 09:40 release?",
    reply: "A configuration update to the sign-in service. Nothing else shipped.",
    stakeholder: "Priya Nair, Engineering",
    answerLabel: "Recommended action",
    answerValue: "Roll back the config, notify affected customers",
    eventText: "Evidence recorded: issue correlated with the release before escalating",
    resultBand: "Strong evidence",
    resultScore: "91 / 100",
  },
];

const STEPS: Step[] = [
  { label: "Choose a role", view: "mission" },
  { label: "Open the evidence", view: "resources" },
  { label: "Spot the problem", view: "finding" },
  { label: "Ask the stakeholder", view: "chat" },
  { label: "Give the answer", view: "answer" },
  { label: "Evidence is recorded", view: "event" },
  { label: "See the result", view: "result" },
];

const STEP_MS = 1500;

function MiniTable({ title, rows, highlightRow }: { title: string; rows: [string, string][]; highlightRow?: number }) {
  return (
    <div className="min-w-0 flex-1 rounded-lg border border-white/[0.09] bg-[#0B0E15] p-2.5">
      <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-white/40">{title}</p>
      <div className="mt-1.5 space-y-1">
        {rows.map((r, i) => (
          <div
            key={i}
            className={`flex items-center justify-between gap-2 rounded px-1.5 py-1 text-[11px] ${
              highlightRow === i ? "bg-violet-500/20 text-violet-200" : "text-white/65"
            }`}
          >
            <span className="truncate font-mono">{r[0]}</span>
            <span className="truncate text-white/45">{r[1]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HeroSimPreview() {
  const [roleIdx, setRoleIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (paused || reducedMotion.current) return;
    const t = setInterval(() => setStepIdx((s) => (s + 1) % STEPS.length), STEP_MS);
    return () => clearInterval(t);
  }, [paused, roleIdx]);

  const story = STORIES[roleIdx];
  const step = STEPS[stepIdx];

  return (
    <div
      className="w-full max-w-[520px] select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Role tabs */}
      <div className="flex gap-1.5" role="tablist" aria-label="Preview role">
        {STORIES.map((s, i) => (
          <button
            key={s.role}
            role="tab"
            aria-selected={i === roleIdx}
            onClick={() => {
              setRoleIdx(i);
              setStepIdx(0);
            }}
            className={`rounded-t-lg px-3 py-2 text-[11.5px] font-semibold transition ${
              i === roleIdx
                ? "bg-[#10131C] text-white"
                : "bg-transparent text-white/40 hover:text-white/70"
            }`}
          >
            {s.role}
          </button>
        ))}
      </div>

      {/* Frame */}
      <div className="overflow-hidden rounded-xl rounded-tl-none border border-white/[0.1] bg-[#10131C] shadow-2xl shadow-black/40">
        {/* Runner header */}
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.07] bg-[#0B1220] px-3.5 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold text-white">{story.sim}</p>
            <p className="truncate text-[10.5px] text-white/40">{story.role}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
              Saved
            </span>
            <span className="rounded bg-white/[0.06] px-2 py-0.5 font-mono text-[11px] text-white/70">
              4:12
            </span>
          </div>
        </div>

        {/* Stage */}
        <div className="h-[240px] p-3.5" aria-live="polite">
          {step.view === "mission" && (
            <div className="flex h-full flex-col justify-center">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-violet-300">
                Your task
              </p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-white/85">{story.mission}</p>
              <p className="mt-4 text-[11px] text-white/35">Five minutes. Real materials. One decision.</p>
            </div>
          )}
          {step.view === "resources" && (
            <div className="flex h-full flex-col">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-white/40">Resources</p>
              <div className="mt-2 flex flex-1 gap-2.5">
                <MiniTable title={story.resourceA.title} rows={story.resourceA.rows} />
                <MiniTable title={story.resourceB.title} rows={story.resourceB.rows} />
              </div>
            </div>
          )}
          {step.view === "finding" && (
            <div className="flex h-full flex-col">
              <div className="flex flex-1 gap-2.5 opacity-80">
                <MiniTable title={story.resourceA.title} rows={story.resourceA.rows} highlightRow={1} />
                <MiniTable title={story.resourceB.title} rows={story.resourceB.rows} highlightRow={0} />
              </div>
              <div className="mt-2.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2">
                <p className="text-[11.5px] text-violet-200">
                  <span className="font-semibold">{story.findingHighlight}.</span> {story.findingText}
                </p>
              </div>
            </div>
          )}
          {step.view === "chat" && (
            <div className="flex h-full flex-col justify-center gap-2.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-white/40">
                {story.stakeholder}
              </p>
              <div className="ml-auto max-w-[85%] rounded-xl rounded-br-sm bg-violet-500/90 px-3 py-2 text-[12px] text-white">
                {story.question}
              </div>
              <div className="mr-auto max-w-[85%] rounded-xl rounded-bl-sm bg-white/[0.07] px-3 py-2 text-[12px] text-white/80">
                {story.reply}
              </div>
            </div>
          )}
          {step.view === "answer" && (
            <div className="flex h-full flex-col justify-center">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-white/40">
                {story.answerLabel}
              </p>
              <div className="mt-2 rounded-lg border border-white/[0.12] bg-[#0B0E15] px-3.5 py-3">
                <p className="text-[16px] font-semibold text-white">{story.answerValue}</p>
              </div>
              <button
                type="button"
                tabIndex={-1}
                className="pointer-events-none mt-3 w-fit rounded-lg bg-violet-500 px-4 py-2 text-[12px] font-semibold text-white"
              >
                Continue to review
              </button>
            </div>
          )}
          {step.view === "event" && (
            <div className="flex h-full flex-col items-start justify-center gap-3">
              <span className="rounded-full bg-emerald-500/15 px-3 py-1.5 text-[11.5px] font-semibold text-emerald-300">
                {story.eventText}
              </span>
              <p className="text-[11.5px] leading-relaxed text-white/45">
                Every meaningful action becomes citable evidence: resources opened, questions asked,
                answers revised.
              </p>
            </div>
          )}
          {step.view === "result" && (
            <div className="flex h-full flex-col justify-center">
              <div className="rounded-lg border border-white/[0.1] bg-[#0B0E15] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-semibold text-white">Simulation completed</p>
                  <span className="rounded-full bg-violet-500/20 px-2.5 py-1 text-[11px] font-semibold text-violet-300">
                    {story.resultBand}
                  </span>
                </div>
                <p className="mt-2 text-[22px] font-semibold text-white">{story.resultScore}</p>
                <p className="mt-1 text-[11px] text-white/40">
                  Objective answers, reasoning, stakeholder questions and communication, all cited.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Step controls */}
        <div className="flex items-center justify-between border-t border-white/[0.07] px-3.5 py-2.5">
          <p className="text-[11px] text-white/45">
            {stepIdx + 1}. {step.label}
          </p>
          <div className="flex gap-1.5" role="group" aria-label="Preview steps">
            {STEPS.map((s, i) => (
              <button
                key={i}
                aria-label={`Step ${i + 1}: ${s.label}`}
                onClick={() => setStepIdx(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === stepIdx ? "w-5 bg-violet-400" : "w-1.5 bg-white/20 hover:bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
