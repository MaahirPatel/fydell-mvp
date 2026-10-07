"use client";

import PassportBuilder from "@/components/passport/PassportBuilder";

/**
 * Passport builder wired into the profile hub: every accepted import
 * registers (or refreshes) the GitHub connected-account row, so the account
 * registry always reflects the extraction flow the engineer actually used.
 */
export default function PassportConnectSection({
  initialLogin,
  initialRepos,
}: {
  initialLogin: string;
  initialRepos: string[];
}) {
  async function handleStarted(repositories: string[], githubLogin: string | null) {
    if (!githubLogin) return;
    try {
      await fetch("/api/profile/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "github",
          label: githubLogin,
          meta: { login: githubLogin, lastRepo: repositories[repositories.length - 1] },
        }),
      });
    } catch {
      // Registry bookkeeping is cosmetic; the import is already queued.
    }
  }

  return (
    <PassportBuilder
      signedIn
      initialLogin={initialLogin}
      initialRepos={initialRepos}
      showPreview={false}
      onImportsStarted={handleStarted}
    />
  );
}
