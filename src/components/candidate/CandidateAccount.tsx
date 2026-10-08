"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { avatarUrlFrom, displayNameFrom, type AuthIdentityMetadata } from "@/lib/workspace/identity";
import type { WorkspaceContexts } from "@/lib/workspace/account";

export type CandidateAccount = {
  name: string;
  email: string;
  avatarUrl: string | null;
  /** The organizations this person also works in. Null where they could not be loaded. */
  contexts: WorkspaceContexts | null;
};

const AccountContext = createContext<CandidateAccount | null>(null);

/** Supplied once by the `/app/candidate` layout so every page's sidebar shows the same person. */
export function CandidateAccountProvider({ account, children }: { account: CandidateAccount; children: React.ReactNode }) {
  return <AccountContext.Provider value={account}>{children}</AccountContext.Provider>;
}

/**
 * The signed-in engineer for the sidebar. Pages outside `/app/candidate`
 * (the evaluation flow under `/assess`) have no layout to provide it, so they
 * read the browser session instead: name and email, no profile photo.
 */
export function useCandidateAccount(): CandidateAccount | null {
  const provided = useContext(AccountContext);
  const [session, setSession] = useState<CandidateAccount | null>(null);

  useEffect(() => {
    if (provided) return;
    let alive = true;
    createBrowserSupabaseClient()
      .auth.getUser()
      .then(({ data }) => {
        const user = data.user;
        if (!alive || !user) return;
        const meta = (user.user_metadata ?? null) as AuthIdentityMetadata | null;
        const email = user.email ?? "";
        setSession({
          name: displayNameFrom(null, meta) || email.split("@")[0] || "Account",
          email,
          avatarUrl: avatarUrlFrom(null, meta),
          contexts: null,
        });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [provided]);

  return provided ?? session;
}
