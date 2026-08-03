"use client";

/**
 * Product showcase for the marketing hero: Linear-style window under the copy.
 * Full-width framed workbench preview with role tabs and auto-advancing steps.
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
    mission:
      "The dashboard reports zero delayed revenue. The service team says two delayed orders are missing. Find out why.",
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
    reply: "They should not. Some teams enter IDs with hyphens and some do not.",
    stakeholder: "Dana Whitfield, Operations",
    answerLabel: "Corrected delayed revenue",
    answerValue: "$1,300",
    eventText: "Evidence recorded: corrected value after stakeholder confirmation",
    resultBand: "Strong evidence",
    resultScore: "90 / 100",
  },
  {
    role: "Solutions Engineer",
    sim: "Promise or Product Fit",
    mission:
      "A prospect wants SSO, CRM import and real-time bidirectional updates. Sales needs an answer before tomorrow's demo.",
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
    role: "Technical Support",
    sim: "The Green Status Page",
    mission:
      "Customers cannot log in, but the status page shows green. Work out what is broken and what is safe to say.",
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
    findingText:
      "Errors start two minutes after the auth release. The status check uses a different login path.",
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

const STEP_MS = 1600;

function MiniTable({
  title,
  rows,
  highlightRow,
}: {
  title: string;
  rows: [string, string][];
  highlightRow?: number;
}) {
  return (
    <div className="min-w-0 flex-1 rounded-[10px] border border-white/[0.08] bg-[#0A0B10] p-3">
      <p className="truncate text-[10px] font-medium uppercase tracking-[0.08em] text-white/35">
        {title}
      </p>
      <div className="mt-2 space-y-1">
        {rows.map((r, i) => (
          <div
            key={i}
            className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[12px] ${
              highlightRow === i
                ? "bg-[#5B8CFF]/15 text-[#B8D0FF]"
                : "text-white/65"
            }`}
          >
            <span className="truncate font-mono text-[11.5px]">{r[0]}</span>
            <span className="truncate text-white/40">{r[1]}</span>
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
      className="relative w-full select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Soft pedestal glow under the product window */}
      <div
        className="pointer-events-none absolute -inset-x-8 bottom-[-18%] top-[40%] -z-10"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 50% 40%, rgba(91,140,255,0.22), transparent 70%), radial-gradient(ellipse 40% 30% at 55% 55%, rgba(242,107,130,0.12), transparent 72%)",
        }}
        aria-hidden
      />

      <div
        className="overflow-hidden rounded-[14px] border border-white/[0.1] bg-[#0C0D12]"
        style={{
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.04), 0 40px 100px rgba(0,0,0,0.55), 0 0 80px rgba(91,140,255,0.08)",
        }}
      >
        {/* Window chrome */}
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3">
          <div className="flex items-center gap-2" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          </div>
          <div className="flex gap-1" role="tablist" aria-label="Preview role">
            {STORIES.map((s, i) => (
              <button
                key={s.role}
                role="tab"
                aria-selected={i === roleIdx}
                onClick={() => {
                  setRoleIdx(i);
                  setStepIdx(0);
                }}
                className={`rounded-md px-2.5 py-1 text-[11.5px] transition ${
                  i === roleIdx
                    ? "bg-white/[0.08] font-medium text-white"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                {s.role}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10.5px] font-medium text-emerald-300">
              Saved
            </span>
            <span className="rounded-md bg-white/[0.06] px-2 py-0.5 font-mono text-[11px] text-white/55">
              4:12
            </span>
          </div>
        </div>

        <div className="grid min-h-[340px] lg:grid-cols-[200px_1fr]">
          {/* Side rail */}
          <aside className="hidden border-r border-white/[0.06] bg-[#090A0F] p-4 lg:block">
            <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-white/30">
              Workbench
            </p>
            <ul className="mt-3 space-y-1">
              {["Briefing", "Data tables", "Decisions", "Stakeholder", "Review"].map(
                (item, i) => (
                  <li
                    key={item}
                    className={`rounded-md px-2.5 py-2 text-[12.5px] ${
                      i === Math.min(stepIdx, 4)
                        ? "bg-white/[0.06] text-white"
                        : "text-white/40"
                    }`}
                  >
                    {item}
                  </li>
                )
              )}
            </ul>
          </aside>

          {/* Main stage */}
          <div className="flex min-h-[340px] flex-col">
            <div className="border-b border-white/[0.06] px-5 py-3.5">
              <p className="text-[14px] font-semibold text-white">{story.sim}</p>
              <p className="mt-0.5 text-[12px] text-white/40">{story.role}</p>
            </div>

            <div className="flex-1 p-5" aria-live="polite">
              {step.view === "mission" && (
                <div className="flex h-full flex-col justify-center">
                  <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#8AB4FF]">
                    Your task
                  </p>
                  <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/85">
                    {story.mission}
                  </p>
                  <p className="mt-5 text-[12px] text-white/35">
                    Five minutes. Real materials. One decision.
                  </p>
                </div>
              )}
              {step.view === "resources" && (
                <div className="flex h-full flex-col">
                  <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-white/35">
                    Resources
                  </p>
                  <div className="mt-3 flex flex-1 gap-3">
                    <MiniTable title={story.resourceA.title} rows={story.resourceA.rows} />
                    <MiniTable title={story.resourceB.title} rows={story.resourceB.rows} />
                  </div>
                </div>
              )}
              {step.view === "finding" && (
                <div className="flex h-full flex-col">
                  <div className="flex flex-1 gap-3 opacity-85">
                    <MiniTable
                      title={story.resourceA.title}
                      rows={story.resourceA.rows}
                      highlightRow={1}
                    />
                    <MiniTable
                      title={story.resourceB.title}
                      rows={story.resourceB.rows}
                      highlightRow={0}
                    />
                  </div>
                  <div className="mt-3 rounded-[10px] border border-[#5B8CFF]/25 bg-[#5B8CFF]/10 px-3.5 py-2.5">
                    <p className="text-[13px] text-[#D4E4FF]">
                      <span className="font-semibold">{story.findingHighlight}.</span>{" "}
                      {story.findingText}
                    </p>
                  </div>
                </div>
              )}
              {step.view === "chat" && (
                <div className="flex h-full flex-col justify-center gap-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-white/35">
                    {story.stakeholder}
                  </p>
                  <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-[#5B8CFF] px-3.5 py-2.5 text-[13px] text-white">
                    {story.question}
                  </div>
                  <div className="mr-auto max-w-[80%] rounded-2xl rounded-bl-md border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-[13px] text-white/80">
                    {story.reply}
                  </div>
                </div>
              )}
              {step.view === "answer" && (
                <div className="flex h-full flex-col justify-center">
                  <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-white/35">
                    {story.answerLabel}
                  </p>
                  <div className="mt-3 rounded-[10px] border border-white/[0.1] bg-[#0A0B10] px-4 py-3.5">
                    <p className="text-[18px] font-semibold text-white">{story.answerValue}</p>
                  </div>
                  <span className="mt-4 inline-flex w-fit rounded-full bg-white px-4 py-2 text-[12.5px] font-medium text-black">
                    Continue to review
                  </span>
                </div>
              )}
              {step.view === "event" && (
                <div className="flex h-full flex-col items-start justify-center gap-3">
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3.5 py-1.5 text-[12.5px] font-medium text-emerald-300">
                    {story.eventText}
                  </span>
                  <p className="max-w-md text-[13px] leading-relaxed text-white/45">
                    Every meaningful action becomes citable evidence: resources opened, questions
                    asked, answers revised.
                  </p>
                </div>
              )}
              {step.view === "result" && (
                <div className="flex h-full flex-col justify-center">
                  <div className="rounded-[12px] border border-white/[0.1] bg-[#0A0B10] p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[13px] font-medium text-white">Simulation completed</p>
                      <span className="rounded-full bg-[#5B8CFF]/15 px-2.5 py-1 text-[11.5px] font-medium text-[#B8D0FF]">
                        {story.resultBand}
                      </span>
                    </div>
                    <p className="mt-3 text-[28px] font-semibold tracking-tight text-white">
                      {story.resultScore}
                    </p>
                    <p className="mt-2 text-[12.5px] text-white/40">
                      Answers, reasoning, and stakeholder questions, all cited.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3">
              <p className="text-[12px] text-white/40">
                {stepIdx + 1}. {step.label}
              </p>
              <div className="flex gap-1.5" role="group" aria-label="Preview steps">
                {STEPS.map((s, i) => (
                  <button
                    key={i}
                    aria-label={`Step ${i + 1}: ${s.label}`}
                    onClick={() => setStepIdx(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === stepIdx ? "w-5 bg-[#5B8CFF]" : "w-1.5 bg-white/15 hover:bg-white/30"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fade the bottom of the showcase into the page */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
        style={{
          background: "linear-gradient(to bottom, transparent, #050507)",
        }}
        aria-hidden
      />
    </div>
  );
}
