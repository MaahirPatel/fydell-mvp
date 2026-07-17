const RECORDED = [
  {
    title: "Workspace file saves",
    body: "The contents of files you save inside the Project Relay workspace, so your final and in-progress work can be reviewed.",
  },
  {
    title: "Command output",
    body: "The command you ran (e.g. test, pytest, evals) and its exit code / output — not your terminal history outside those allowlisted commands.",
  },
  {
    title: "Customer chat messages",
    body: "Messages you choose to send in the in-session customer chat, and the simulated customer's replies.",
  },
  {
    title: "Session timing",
    body: "When the session started, heartbeats, and any connectivity gaps — used only to account for technical interruptions, never as a productivity score.",
  },
  {
    title: "Mid-session events",
    body: "System events like a curveball being revealed, and your final submission snapshot at the moment you submit.",
  },
];

const NOT_RECORDED = [
  "No keystroke-level logging — we don't capture every keypress, only what you save.",
  "No webcam or microphone access, ever.",
  "No screen recording or screenshots.",
  "No monitoring outside the active Project Relay workspace tab.",
  "No tracking before you start a session or after you submit it.",
  "No inference of a single \"score\" from activity volume, typing speed, or time spent — those are explicitly excluded from evidence by the evaluation contract.",
];

export default function FdePrivacyPage() {
  return (
    <div className="mx-auto max-w-[720px]">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">Privacy</p>
      <h1
        className="mt-1 text-[28px] text-[#F4F5F7] sm:text-[34px]"
        style={{ fontWeight: 560, letterSpacing: "-0.035em" }}
      >
        What we record, and what we don't
      </h1>
      <p className="mt-2 max-w-[58ch] text-[14px] leading-relaxed text-white/55">
        Project Relay is a simulated deployment session, not a surveillance tool. This page is the
        full account of what's captured during a session and what happens to it afterward.
      </p>

      <section className="mt-8 rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/85 p-5">
        <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">
          What's recorded during a session
        </h2>
        <ul className="mt-4 space-y-4">
          {RECORDED.map((item) => (
            <li key={item.title}>
              <p className="text-[13.5px] font-semibold text-white">{item.title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-white/60">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-[16px] border border-[#8EE4B8]/20 bg-[#8EE4B8]/[0.04] p-5">
        <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-[#8EE4B8]/90">
          What's never recorded
        </h2>
        <ul className="mt-4 space-y-2.5">
          {NOT_RECORDED.map((line) => (
            <li key={line} className="flex gap-2.5 text-[13px] leading-relaxed text-white/70">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#8EE4B8]" />
              {line}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/85 p-5">
        <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">
          Who can see what
        </h2>
        <div className="mt-4 space-y-4 text-[13px] leading-relaxed text-white/70">
          <p>
            <span className="font-semibold text-white">During the session:</span> only you and the
            system recording events. The employer who invited you cannot watch you work in real
            time.
          </p>
          <p>
            <span className="font-semibold text-white">After you submit:</span> rule-based evidence
            findings are generated from the recorded events above. The employer that invited you can
            see those findings and the decision history for their own mission — not your raw file
            contents beyond what's summarized in the findings.
          </p>
          <p>
            <span className="font-semibold text-white">Your work receipt:</span> is yours. Nothing
            is shared with anyone else until you explicitly generate a share link from{" "}
            <span className="text-white/85">Work Receipts</span>, and you can revoke that link at
            any time.
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/85 p-5">
        <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">
          Retention, access, and disputes
        </h2>
        <div className="mt-4 space-y-3 text-[13px] leading-relaxed text-white/70">
          <p>
            Session evidence is retained for the inviting employer&apos;s hiring process and your
            own Work Receipt. You can dispute a finding and add context notes after submit.
          </p>
          <p>
            No biometrics, emotion inference, social-media scraping, or third-party background data
            are used in Project Relay.
          </p>
          <p>
            Enterprise customers remain responsible for their own EEO, OFCCP, GDPR/CCPA, and
            internal retention policies when they use this evidence in a hiring decision.
          </p>
        </div>
      </section>

      <p className="mt-6 text-[12.5px] leading-relaxed text-white/35">
        After submit, Fydell computes dimensional fit scores and a prototype predictive hire
        probability from work-sample evidence (versioned formulas). Activity volume is still
        excluded. A human employer must record the final decision with rationale — the model is
        decision support, not an automated hiring determination.
      </p>
    </div>
  );
}
