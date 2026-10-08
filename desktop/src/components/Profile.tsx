import { useCallback, useEffect, useState } from "react";
import {
  api,
  PassportProjectView,
  PassportView,
} from "../lib/tauri";
import { profileCompleteness } from "../lib/pure";
import { messageOf } from "../App";
import { Dialog, EmptyState, ProvenanceTag, Skeleton } from "./ui";

/* ============================================================================
   Profile — the candidate's evidence passport, built in-app. Flagship
   surface: a clear completeness story, rich project cards, and a satisfying
   add/remove flow. The meter measures data presence, never quality — a thin
   profile says nothing about ability.
   ========================================================================== */

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function ProjectCard({
  project,
  onRemove,
  removing,
}: {
  project: PassportProjectView;
  onRemove: () => void;
  removing: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <article className="project-card">
      <div className="project-card-top">
        <div>
          <div className="mono strong">{project.repository}</div>
          <div className="project-meta">
            {project.primaryLanguage && (
              <span className="chip">{project.primaryLanguage}</span>
            )}
            <span className={`chip ${project.status === "complete" ? "chip-ok" : "chip-warn"}`}>
              {project.status}
            </span>
            {project.evidenceCount > 0 && (
              <span className="muted">
                {project.evidenceCount} evidence finding{project.evidenceCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>
        <button
          className="btn ghost danger-ghost"
          disabled={removing}
          onClick={() => setConfirming(true)}
          aria-label={`Remove ${project.repository}`}
        >
          {removing ? "Removing…" : "Remove"}
        </button>
      </div>
      {project.contributionStatement ? (
        <p className="project-contrib">“{project.contributionStatement}”</p>
      ) : (
        <p className="muted">No contribution note yet — add one to make this evidence yours.</p>
      )}
      {project.url && (
        <a
          className="project-link"
          href={project.url}
          target="_blank"
          rel="noreferrer"
        >
          {project.url.replace(/^https?:\/\//, "")}
        </a>
      )}
      {confirming && (
        <Dialog
          title="Remove this project?"
          onClose={() => setConfirming(false)}
          actions={[
            { label: "Keep it", kind: "ghost", onClick: () => setConfirming(false) },
            {
              label: removing ? "Removing…" : "Remove project",
              kind: "danger",
              onClick: () => {
                setConfirming(false);
                onRemove();
              },
              disabled: removing,
            },
          ]}
        >
          <p>
            <span className="mono strong">{project.repository}</span> leaves your
            passport. Previously shared records keep pointing at the evidence
            they cited — they are never silently rewritten.
          </p>
        </Dialog>
      )}
    </article>
  );
}

function AddProjectForm({ onAdded }: { onAdded: () => void }) {
  const [repo, setRepo] = useState("");
  const [contribution, setContribution] = useState("");
  const [githubLogin, setGithubLogin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const submit = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.addProject(
        repo.trim(),
        contribution.trim(),
        githubLogin.trim() || null
      );
      // The platform returns analysis outcomes verbatim: result.status may be
      // "failed" (e.g. repo not found) — explain, don't crash.
      const result = res["result"] as { status?: string; error?: string } | undefined;
      if (result?.status === "failed") {
        setError(
          (result.error as string) ||
            "The analysis couldn't read that repository. Check the name and try again."
        );
        return;
      }
      if (res["error"]) {
        setError(String(res["error"]));
        return;
      }
      setRepo("");
      setContribution("");
      setExpanded(false);
      onAdded();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }, [repo, contribution, githubLogin, onAdded]);

  if (!expanded) {
    return (
      <button className="add-project-card" onClick={() => setExpanded(true)}>
        <span className="add-project-plus" aria-hidden="true">+</span>
        <span>
          <span className="strong">Add a repository</span>
          <span className="muted"> — Fydell reads its public files and extracts skill evidence</span>
        </span>
      </button>
    );
  }

  return (
    <div className="add-project-form">
      <div className="section-label">Add a repository</div>
      {error && <div className="error mb-3">{error}</div>}
      <div className="field">
        <label htmlFor="add-repo">Repository</label>
        <input
          id="add-repo"
          className="input mono"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          placeholder="owner/repository"
          spellCheck={false}
          autoFocus
        />
      </div>
      <div className="field">
        <label htmlFor="add-contrib">What did you actually do here?</label>
        <textarea
          id="add-contrib"
          className="textarea"
          value={contribution}
          onChange={(e) => setContribution(e.target.value)}
          placeholder="One honest paragraph — your role, the hard parts, what you'd do differently."
          rows={3}
        />
        <p className="muted">Your words, attributed to you. Never auto-generated.</p>
      </div>
      <div className="field">
        <label htmlFor="add-login">GitHub username <span className="muted">(optional)</span></label>
        <input
          id="add-login"
          className="input mono"
          value={githubLogin}
          onChange={(e) => setGithubLogin(e.target.value)}
          placeholder="octocat"
          spellCheck={false}
        />
      </div>
      <div className="row">
        <button className="btn ghost" disabled={busy} onClick={() => setExpanded(false)}>
          Cancel
        </button>
        <div className="spacer" />
        <button className="btn" disabled={busy || !repo.trim()} onClick={() => void submit()}>
          {busy ? "Analyzing repository…" : "Analyze & add"}
        </button>
      </div>
      {busy && (
        <p className="muted mt-2">
          Reading the repository’s public files. This can take up to a minute —
          nothing is claimed until the analysis finishes.
        </p>
      )}
    </div>
  );
}

export default function Profile() {
  const [passport, setPassport] = useState<PassportView | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingRepo, setRemovingRepo] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setPassport(await api.getPassport());
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    let live = true;
    api
      .getPassport()
      .then(
        (p) => live && setPassport(p),
        (e: unknown) => live && setError(messageOf(e)),
      )
      .finally(() => live && setLoaded(true));
    return () => {
      live = false;
    };
  }, []);

  const remove = useCallback(
    async (repo: string) => {
      setRemovingRepo(repo);
      setError(null);
      try {
        await api.removeProject(repo);
        await load();
      } catch (e) {
        setError(messageOf(e));
      } finally {
        setRemovingRepo(null);
      }
    },
    [load]
  );

  const completeness = profileCompleteness(passport);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Profile</h1>
          <p className="page-sub">
            Your evidence passport — projects you’ve added, skills extracted
            from real work, and what employers can see.
          </p>
        </div>
        <ProvenanceTag kind="observed" />
      </header>

      {error && <div className="error mb-3">{error}</div>}

      {!loaded ? (
        <section className="profile-hero" aria-busy="true" aria-label="Loading profile">
          <div className="profile-identity">
            <div className="skeleton skeleton-avatar" aria-hidden="true" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Skeleton width="55%" height={16} />
              <div className="mt-2">
                <Skeleton width="80%" height={12} />
              </div>
            </div>
          </div>
          <div className="completeness-block">
            <Skeleton height={8} />
            <div className="mt-3">
              <Skeleton height={12} />
            </div>
            <div className="mt-2">
              <Skeleton height={12} width="75%" />
            </div>
          </div>
        </section>
      ) : (
        <>
          {/* Identity + completeness */}
          <section className="profile-hero">
            <div className="profile-identity">
              <div className="avatar" aria-hidden="true">
                {initials(passport?.displayName ?? "?")}
              </div>
              <div>
                <div className="profile-name">
                  {passport?.displayName || "Unnamed profile"}
                </div>
                {passport?.headline && (
                  <div className="muted">{passport.headline}</div>
                )}
                {passport?.githubLogin && (
                  <div className="mono muted">@{passport.githubLogin}</div>
                )}
              </div>
            </div>
            <div className="completeness-block">
              <div className="completeness-head">
                <span className="section-label">Profile completeness</span>
                <span className="completeness-pct">{completeness.percent}%</span>
              </div>
              <div
                className="completeness-bar large"
                role="progressbar"
                aria-valuenow={completeness.percent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="completeness-fill" style={{ width: `${completeness.percent}%` }} />
              </div>
              <ul className="checklist">
                {completeness.steps.map((s) => (
                  <li key={s.id} className={s.done ? "done" : ""}>
                    <span className="check" aria-hidden="true">{s.done ? "✓" : "○"}</span>
                    <span>
                      <span className="strong">{s.label}</span>
                      {!s.done && <span className="muted"> — {s.hint}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Projects */}
          <section className="profile-section">
            <div className="section-label">Projects · {passport?.projects.length ?? 0}</div>
            {(passport?.projects.length ?? 0) === 0 ? (
              <EmptyState
                icon="file"
                title="No projects yet"
                body="Add a GitHub repository and Fydell extracts skill evidence from your real work. This says nothing about ability — simulations need no GitHub history."
              />
            ) : (
              <div className="project-grid">
                {passport!.projects.map((p) => (
                  <ProjectCard
                    key={p.repository}
                    project={p}
                    removing={removingRepo === p.repository}
                    onRemove={() => void remove(p.repository)}
                  />
                ))}
              </div>
            )}
            <div className="mt-3">
              <AddProjectForm onAdded={() => void load()} />
            </div>
          </section>

          {/* Capabilities */}
          <section className="profile-section">
            <div className="section-label">
              Capabilities · {passport?.capabilities.length ?? 0}
            </div>
            {(passport?.capabilities.length ?? 0) === 0 ? (
              <p className="muted">
                Capabilities appear here as Fydell analyzes your projects —
                each one cites the evidence behind it.
              </p>
            ) : (
              <ul className="capability-list">
                {passport!.capabilities.map((c, i) => (
                  <li key={i}>
                    <ProvenanceTag kind="observed" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Role suggestions */}
          {(passport?.roleSuggestions.length ?? 0) > 0 && (
            <section className="profile-section">
              <div className="section-label">Suggested roles</div>
              <div className="chip-row">
                {passport!.roleSuggestions.map((r, i) => (
                  <span key={i} className="chip">
                    {r}
                  </span>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
