"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Github } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormError, FormSuccess, Input } from "@/components/ui/Field";

const LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

type Mode = "view" | "edit" | "confirm-remove";

/**
 * The GitHub username on the profile. It is a label and a link to
 * github.com/<name>; Fydell imports public repositories without verifying
 * the account belongs to the engineer, and says so.
 */
export default function GithubUsernameControl({ initial }: { initial: string | null }) {
  const router = useRouter();
  const [login, setLogin] = useState(initial);
  const [mode, setMode] = useState<Mode>("view");
  const [draft, setDraft] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const clean = draft.trim().replace(/^@/, "");
  const invalid = clean.length > 0 && !LOGIN.test(clean);

  const startEdit = () => {
    setDraft(login ?? "");
    setError(null);
    setDone(null);
    setMode("edit");
  };

  async function save() {
    if (!clean || invalid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/passport/github", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: clean }),
      });
      const data = (await res.json().catch(() => ({}))) as { githubLogin?: string; error?: string };
      if (!res.ok || !data.githubLogin) {
        setError(data.error ?? "Could not save the username. Try again.");
        return;
      }
      setLogin(data.githubLogin);
      setMode("view");
      setDone(`GitHub username set to ${data.githubLogin}.`);
      router.refresh();
    } catch {
      setError("Fydell could not be reached. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/passport/github", { method: "DELETE" });
      if (!res.ok) {
        setError("Could not remove the username. Try again.");
        return;
      }
      setLogin(null);
      setMode("view");
      setDone("GitHub username removed. Projects you already imported are kept.");
      router.refresh();
    } catch {
      setError("Fydell could not be reached. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-app-meta font-medium text-[var(--text-primary)]">GitHub username</p>
          {mode !== "edit" ? (
            login ? (
              <p className="mt-1 inline-flex items-center gap-1.5 text-app-body text-[var(--text-primary)]">
                <Github className="h-4 w-4 text-[var(--text-tertiary)]" aria-hidden />
                <a href={`https://github.com/${login}`} target="_blank" rel="noopener noreferrer nofollow" className="hover:underline hover:underline-offset-4">
                  {login}
                </a>
                <span className="text-app-meta text-[var(--text-tertiary)]">· not verified</span>
              </p>
            ) : (
              <p className="mt-1 text-app-body text-[var(--text-secondary)]">None on your profile.</p>
            )
          ) : null}
        </div>
        {mode === "view" ? (
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" aria-label={login ? "Change GitHub username" : "Add GitHub username"} onClick={startEdit}>
              {login ? "Change" : "Add"}
            </Button>
            {login ? (
              <Button
                size="sm"
                variant="quiet"
                aria-label="Remove GitHub username"
                onClick={() => {
                  setError(null);
                  setDone(null);
                  setMode("confirm-remove");
                }}
              >
                Remove
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {mode === "edit" ? (
        <div>
          <label htmlFor="profile-github-login" className="sr-only">
            GitHub username
          </label>
          <div className="flex gap-2">
            <Input
              id="profile-github-login"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void save();
                }
              }}
              maxLength={40}
              placeholder="octocat"
              autoComplete="off"
              spellCheck={false}
              invalid={invalid}
              aria-describedby="profile-github-login-help"
              autoFocus
            />
            <Button size="md" variant="primary" loading={busy} disabled={!clean || invalid} onClick={() => void save()}>
              Save
            </Button>
            <Button size="md" variant="quiet" disabled={busy} onClick={() => setMode("view")}>
              Cancel
            </Button>
          </div>
          <p id="profile-github-login-help" className={`mt-1.5 text-app-meta leading-[1.5] ${invalid ? "text-[var(--fydell-risk)]" : "text-[var(--text-secondary)]"}`}>
            {invalid
              ? "Use up to 39 letters, numbers or single hyphens, not starting or ending with a hyphen."
              : "Shown on your profile with a link to github.com/<name>. Fydell does not verify that the account is yours."}
          </p>
        </div>
      ) : null}

      {mode === "confirm-remove" ? (
        <div className="rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-panel)] px-3.5 py-3">
          <p className="text-app-body text-[var(--text-primary)]">Remove {login} from your profile?</p>
          <p className="mt-1 text-app-meta leading-[1.5] text-[var(--text-secondary)]">
            The GitHub link disappears from your profile and share links. Projects you already imported stay until you remove them.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="destructive" loading={busy} onClick={() => void remove()}>
              Remove username
            </Button>
            <Button size="sm" variant="quiet" disabled={busy} onClick={() => setMode("view")}>
              Keep it
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <FormError>{error}</FormError> : null}
      {done && mode === "view" ? <FormSuccess>{done}</FormSuccess> : null}
    </div>
  );
}
