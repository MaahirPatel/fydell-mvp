"use client";

import PassportBuilder from "@/components/passport/PassportBuilder";

/**
 * Passport builder wired into the profile hub. The first import that names a
 * GitHub user links that username to the profile on the server; later imports
 * never replace it, so importing someone else's repository can't relabel the
 * profile. The engineer changes it from Edit profile.
 */
export default function PassportConnectSection({
  initialLogin,
  initialRepos,
}: {
  initialLogin: string;
  initialRepos: string[];
}) {
  return <PassportBuilder signedIn initialLogin={initialLogin} initialRepos={initialRepos} showPreview={false} />;
}
