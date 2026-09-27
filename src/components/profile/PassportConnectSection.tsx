"use client";

import PassportBuilder from "@/components/passport/PassportBuilder";
import type { PassportProject } from "@/lib/passport/view";

/**
 * Passport builder wired into the profile hub: every successful project save
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
  async function handleSaved(project: PassportProject, githubLogin: string | null) {
    if (!githubLogin) return;
    try {
      await fetch("/api/profile/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "github",
          label: githubLogin,
          meta: { login: githubLogin, lastRepo: project.repoFullName },
        }),
      });
    } catch {
      // Registry bookkeeping is cosmetic; the project is already saved.
    }
  }

  return (
    <PassportBuilder
      signedIn
      initialLogin={initialLogin}
      initialRepos={initialRepos}
      showPreview={false}
      onProjectSaved={handleSaved}
    />
  );
}
