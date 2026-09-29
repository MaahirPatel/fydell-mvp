import { useCallback, useState } from "react";
import { api, EngineerProfileView } from "../lib/tauri";
import { messageOf } from "../App";
import { BrandLockup } from "./Brand";

/* ============================================================================
   Onboarding — first-run guided setup. A new user with no profile gets a
   guided flow, not a dumped-into-console home.

   Steps: welcome → identity → skills → first simulation → done.
   Progress indicator throughout. Skippable but encouraged.

   Identity (display name, headline, role) saves to the platform via
   PATCH /api/profile. Skills, years, and GitHub handle are kept on this
   device until the platform profile supports them — the UI says so.
   ========================================================================== */

export interface OnboardingProfile {
  displayName: string;
  headline: string;
  role: string;
  skills: string[];
  yearsExperience: string;
  githubLogin: string;
}

const SKILL_OPTIONS = [
  "Python",
  "TypeScript",
  "JavaScript",
  "Go",
  "Rust",
  "Java",
  "SQL",
  "React",
  "Node.js",
  "Django",
  "Flask",
  "FastAPI",
  "AWS",
  "Docker",
  "Kubernetes",
  "CI/CD",
  "System design",
  "Debugging",
  "Testing",
  "Code review",
];

const YEAR_OPTIONS = ["< 1 year", "1-2 years", "3-5 years", "6-10 years", "10+ years"];

const STEPS = ["Welcome", "Identity", "Skills", "First simulation"] as const;

function StepDots({ step }: { step: number }) {
  return (
    <div className="onboard-dots" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
      {STEPS.map((label, i) => (
        <div key={label} className="onboard-dot-wrap">
          <div className={`onboard-dot ${i < step ? "done" : i === step ? "now" : ""}`} />
          <span className={`onboard-dot-label ${i === step ? "now" : ""}`}>{label}</span>
        </div>
      ))}
    </div>
  );
}

export default function Onboarding({
  email,
  onDone,
  onSkip,
}: {
  email: string | null;
  onDone: (profile: OnboardingProfile) => void;
  onSkip: () => void;
}) {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [headline, setHeadline] = useState("");
  const [role, setRole] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [years, setYears] = useState("");
  const [github, setGithub] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSkill = useCallback((s: string) => {
    setSkills((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }, []);

  const saveIdentity = useCallback(async () => {
    const name = displayName.trim();
    if (!name) {
      setError("Enter the name employers should see.");
      return false;
    }
    setBusy(true);
    setError(null);
    try {
      const saved: EngineerProfileView = await api.updateProfile(
        name,
        headline.trim(),
        role.trim()
      );
      setDisplayName(saved.displayName);
      return true;
    } catch (e) {
      setError(messageOf(e));
      return false;
    } finally {
      setBusy(false);
    }
  }, [displayName, headline, role]);

  const finish = useCallback(() => {
    const profile: OnboardingProfile = {
      displayName: displayName.trim(),
      headline: headline.trim(),
      role: role.trim(),
      skills,
      yearsExperience: years,
      githubLogin: github.trim(),
    };
    // Skills, years, and GitHub live on this device until the platform
    // profile supports them. Stored per account, never uploaded silently.
    try {
      localStorage.setItem(
        `fydell-onboarding-${email ?? "anon"}`,
        JSON.stringify(profile)
      );
    } catch {}
    onDone(profile);
  }, [displayName, headline, role, skills, years, github, email, onDone]);

  const next = useCallback(async () => {
    if (step === 1) {
      if (await saveIdentity()) setStep(2);
    } else if (step === 3) {
      finish();
    } else {
      setStep((s) => Math.min(s + 1, 3));
    }
  }, [step, saveIdentity, finish]);

  const back = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);

  return (
    <div className="screen onboard">
      <div className="card wide onboard-card">
        <div className="brand">
          <BrandLockup />
        </div>
        <StepDots step={step} />

        {step === 0 && (
          <>
            <h1>Welcome to Fydell</h1>
            <p>
              Fydell is a proof-of-work hiring network. You complete real
              engineering simulations. Employers review evidence, not resumes.
            </p>
            <div className="onboard-what">
              <div className="onboard-what-row">
                <span className="onboard-num">1</span>
                <div>
                  <div className="strong">Build your engineering profile</div>
                  <div className="muted">Two minutes. Name, headline, skills.</div>
                </div>
              </div>
              <div className="onboard-what-row">
                <span className="onboard-num">2</span>
                <div>
                  <div className="strong">Take a simulation</div>
                  <div className="muted">A real codebase, a real task, a timer. Your work is the application.</div>
                </div>
              </div>
              <div className="onboard-what-row">
                <span className="onboard-num">3</span>
                <div>
                  <div className="strong">Get reviewed on evidence</div>
                  <div className="muted">A human reviews every submission. Nothing is auto-rejected.</div>
                </div>
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1>Your engineering profile</h1>
            <p className="muted">
              This is how employers see you. You can change it anytime from the
              Profile tab.
            </p>
            {error && <div className="error">{error}</div>}
            <div className="field">
              <label htmlFor="ob-name">Display name</label>
              <input
                id="ob-name"
                className="input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ada Lovelace"
                autoComplete="name"
              />
            </div>
            <div className="field">
              <label htmlFor="ob-headline">Headline</label>
              <input
                id="ob-headline"
                className="input"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Backend engineer who fixes the on-call pain"
                maxLength={120}
              />
            </div>
            <div className="field">
              <label htmlFor="ob-role">Current or target role</label>
              <input
                id="ob-role"
                className="input"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Senior backend engineer"
                maxLength={120}
              />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1>What do you work with</h1>
            <p className="muted">
              Pick the skills you actually use. This stays on this device for
              now. It helps us suggest the right simulations.
            </p>
            <div className="skill-grid" role="group" aria-label="Skills">
              {SKILL_OPTIONS.map((s) => (
                <button
                  key={s}
                  className={`chip-select ${skills.includes(s) ? "on" : ""}`}
                  onClick={() => toggleSkill(s)}
                  aria-pressed={skills.includes(s)}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="field mt-4">
              <label htmlFor="ob-years">Years of experience</label>
              <div className="chip-row" role="radiogroup" aria-label="Years of experience">
                {YEAR_OPTIONS.map((y) => (
                  <button
                    key={y}
                    role="radio"
                    aria-checked={years === y}
                    className={`chip-select ${years === y ? "on" : ""}`}
                    onClick={() => setYears(y)}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label htmlFor="ob-github">GitHub username (optional)</label>
              <input
                id="ob-github"
                className="input mono"
                value={github}
                onChange={(e) => setGithub(e.target.value)}
                placeholder="octocat"
                spellCheck={false}
                autoComplete="off"
              />
              <p className="muted">For linking public work later. Skip it if you like.</p>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1>Your first simulation</h1>
            <p>
              Simulations live in your <strong>Inbox</strong>. When an employer
              invites you, the assignment appears there with the brief, the
              codebase, and the timer.
            </p>
            <div className="onboard-demo">
              <div className="strong">Try one right now</div>
              <p className="muted">
                Paste the demo code in your Inbox to run a full practice
                simulation. Nothing is scored. It is the fastest way to see how
                this works.
              </p>
              <div className="demo-code-row">
                <code className="mono demo-code">FYDELL-DEMO</code>
              </div>
            </div>
            <p className="muted">
              Inside a simulation you get a real editor, a test runner, a team
              thread with simulated teammates, and a code analysis view. Submit
              when you are done. A human reviews it.
            </p>
          </>
        )}

        <div className="row mt-4 onboard-nav">
          {step > 0 ? (
            <button className="btn ghost" onClick={back} disabled={busy}>
              Back
            </button>
          ) : (
            <button className="btn ghost" onClick={onSkip}>
              Skip setup
            </button>
          )}
          <div className="spacer" />
          {step > 0 && (
            <button className="btn ghost" onClick={onSkip}>
              Skip
            </button>
          )}
          <button className="btn" onClick={() => void next()} disabled={busy}>
            {busy ? "Saving…" : step === 3 ? "Open Fydell" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
