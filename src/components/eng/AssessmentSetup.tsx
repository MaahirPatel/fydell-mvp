"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormError, Input } from "@/components/ui/Field";
import { Panel, PanelSection } from "@/components/ui/Panel";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/contact";
import type { CandidateView } from "@/lib/eng/candidate-view";
import { engFetch } from "./api";
import { BulletList, Disclosure, EnvironmentList, Facts, PolicyDisclosures } from "./CandidateParts";
import { CommandBlock } from "./CommandBlock";

type View = CandidateView;

function StepNumber({ n, done }: { n: number; done?: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[13px] tabular-nums ${
        done ? "bg-[var(--fy-accent)] text-white" : "border border-[var(--fy-accent-line)] bg-[var(--fy-accent-field)] text-[var(--fy-accent-ink)]"
      }`}
    >
      {done ? "✓" : n}
    </span>
  );
}

function Step({ n, title, children, done }: { n: number; title: string; children: React.ReactNode; done?: boolean }) {
  return (
    <li className="grid grid-cols-[24px_minmax(0,1fr)] gap-x-3 px-5 py-4 lg:px-6">
      <StepNumber n={n} done={done} />
      <div className="min-w-0">
        <h3 className="text-app-section font-medium text-[var(--text-primary)]">{title}</h3>
        <div className="mt-2 grid gap-3 text-app-body leading-[1.6] text-[var(--text-secondary)]">{children}</div>
      </div>
    </li>
  );
}

export function ConsentStep({ view, onView }: { view: View; onView: (v: View) => void }) {
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Panel>
      <PanelSection title="Before you set up" description="Nothing is timed yet. These are the ground rules for the task.">
        <Facts
          items={[
            { label: "Window", value: `${view.attempt.allowedMinutes + view.attempt.extensionMinutes} minutes once you press Start, for about ${view.scenario.targetMinutes} minutes of work` },
            { label: "Tools", value: "Any editor, documentation, search and AI assistant, as at work" },
            { label: "Recorded", value: "Team messages, setup result, your ZIP and handoff" },
            { label: "Not recorded", value: "Your screen, editor, files or AI conversations" },
            { label: "The employer receives", value: "Your ZIP, handoff, team messages, test results and the report their team writes" },
            { label: "You receive", value: "The same report once the hiring team releases it, without their private notes or interview questions. It cannot be hidden from the employer after you submit." },
          ]}
        />
      </PanelSection>
      <PanelSection>
        <PolicyDisclosures aiPolicy={view.scenario.aiPolicy} accommodations={view.scenario.accommodations} />
      </PanelSection>
      <PanelSection>
        <div className="grid gap-3">
          <FormError>{error}</FormError>
          <label className="flex items-start gap-2.5 text-app-body text-[var(--text-primary)]">
            <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--fydell-brand-blue)]" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            I have read the rules above and will do this task myself.
          </label>
          <div>
            <Button
              variant="accent"
              disabled={!agree}
              loading={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                const res = await engFetch<{ view: View }>(`/api/eng/attempts/${view.attempt.id}/consent`, { body: {} });
                setBusy(false);
                if (res.ok === false) setError(res.error);
                else onView(res.data.view);
              }}
            >
              Continue to setup
            </Button>
          </div>
        </div>
      </PanelSection>
    </Panel>
  );
}

export function SetupStep({ view, onView }: { view: View; onView: (v: View) => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const root = view.scenario.starterRoot;

  async function confirm() {
    setBusy(true);
    setError(null);
    const res = await engFetch<{ view: View }>(`/api/eng/attempts/${view.attempt.id}/preflight`, { body: { code } });
    setBusy(false);
    if (res.ok === false) setError(res.error);
    else onView(res.data.view);
  }

  return (
    <Panel>
      <PanelSection title="Set up on your computer" description="Setup time does not count. The timer starts only when you press Start." />
      <ol className="divide-y divide-[var(--border-subtle)]">
        <Step n={1} title="Download and extract the starter project">
          <div>
            <a
              href={`/api/eng/attempts/${view.attempt.id}/starter`}
              download
              className="inline-flex h-9 items-center rounded-[8px] border border-[var(--border-strong)] px-3.5 text-[13.5px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
            >
              Download {root}.zip
            </a>
          </div>
          <p>
            Extract it anywhere you like. On Windows, right-click the ZIP and choose <span className="text-[var(--text-primary)]">Extract All</span>; on macOS, double-click it.
            Opening the ZIP without extracting it will not work.
          </p>
        </Step>
        <Step n={2} title="Open the folder in your editor and run the setup check">
          <p>
            In VS Code or Cursor, choose <span className="text-[var(--text-primary)]">File → Open Folder</span> and pick the extracted <code className="font-mono text-[13px] text-[var(--text-primary)]">{root}</code> folder (the one containing{" "}
            <code className="font-mono text-[13px] text-[var(--text-primary)]">preflight.py</code>). Open a terminal there with <span className="text-[var(--text-primary)]">Terminal → New Terminal</span> and run:
          </p>
          <CommandBlock label="Setup check command" commands={view.scenario.setupCommands} />
          <p className="text-app-meta">Some public tests fail at this point. That is the incident you will fix, not a setup problem.</p>
        </Step>
        <Step n={3} title="Paste the setup result">
          <p>
            Run the setup check locally, then paste its result here. Copy the last line it prints, which starts with{" "}
            <code className="font-mono text-[13px] text-[var(--text-primary)]">Setup code:</code>.
          </p>
          <form
            className="flex flex-wrap items-start gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.trim() && !busy) void confirm();
            }}
          >
            <label htmlFor="setup-code" className="sr-only">
              Setup result
            </label>
            <Input
              id="setup-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Setup code: …"
              autoComplete="off"
              spellCheck={false}
              className="max-w-[340px] font-mono"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "setup-error" : undefined}
            />
            <Button type="submit" variant="accent" loading={busy} disabled={!code.trim()}>
              {busy ? "Checking…" : "Confirm setup"}
            </Button>
          </form>
          {error ? (
            <div id="setup-error" className="grid gap-2">
              <FormError>{error}</FormError>
            </div>
          ) : null}
          <div>
            <Disclosure summary="Troubleshooting" defaultOpen={Boolean(error)}>
              <BulletList
                items={[
                  "“python is not recognized” (Windows): try py preflight.py. If that also fails, install Python 3.12 from python.org and tick “Add python.exe to PATH”, then open a new terminal.",
                  "“command not found: python” (macOS or Linux): use python3 preflight.py.",
                  "“not supported for this task”: install Python 3.11, 3.12 or 3.13 and run the check again.",
                  "“public tests could not be collected”: the terminal is in the wrong folder. Open the folder that contains preflight.py and run it there.",
                  "You can paste the whole line or just the code. Trying again never creates a new attempt.",
                ]}
              />
              <p className="mt-2">
                Still stuck? Email{" "}
                <a href={CONTACT_MAILTO} className="text-[var(--text-primary)] underline underline-offset-2">
                  {CONTACT_EMAIL}
                </a>
                . Setup problems are never held against you.
              </p>
            </Disclosure>
          </div>
        </Step>
      </ol>
      <PanelSection>
        <p className="mb-2 text-app-meta font-medium text-[var(--text-tertiary)]">Supported setups</p>
        <EnvironmentList environments={view.scenario.supportedEnvironments} />
      </PanelSection>
    </Panel>
  );
}

export function StartStep({ view, onView, onStarted }: { view: View; onView: (v: View) => void; onStarted: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const minutes = view.attempt.allowedMinutes + view.attempt.extensionMinutes;
  return (
    <Panel>
      <PanelSection title="Ready to start" description={`Setup confirmed${view.attempt.preflightRuntime ? ` on ${view.attempt.preflightRuntime.replace("python", "Python")}` : ""}.`}>
        <Facts
          items={[
            { label: "Window", value: `${minutes} minutes from when you press Start, for about ${view.scenario.targetMinutes} minutes of work` },
            { label: "You will submit", value: "Your project as a ZIP, and three short handoff answers" },
            { label: "Team messages", value: `Keep this page open. One requirement update arrives about ${view.scenario.updateAfterMinutes} minutes in` },
            { label: "Leaving the page", value: "The timer keeps running on the server. Refreshing never restarts it" },
          ]}
        />
      </PanelSection>
      <PanelSection>
        <div className="grid gap-3">
          <p className="max-w-[68ch] text-app-body leading-[1.6] text-[var(--text-secondary)]">
            Your project files stay on your computer. Fydell saves your team messages and handoff drafts as you type, but it does not back up code you have not submitted.
          </p>
          <FormError>{error}</FormError>
          <div>
            <Button
              variant="accent"
              size="lg"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                const res = await engFetch<{ view: View }>(`/api/eng/attempts/${view.attempt.id}/start`, { body: {} });
                setBusy(false);
                if (res.ok === false) setError(res.error);
                else {
                  onView(res.data.view);
                  onStarted();
                }
              }}
            >
              Start simulation
            </Button>
          </div>
        </div>
      </PanelSection>
    </Panel>
  );
}
