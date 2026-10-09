"use client";

import PassportBuilder from "@/components/passport/PassportBuilder";

/**
 * Passport builder wired into the profile hub. The first import that names a
 * GitHub user links that username to the profile on the server; later imports
 * never replace it, so importing someone else's repository can't relabel the
 * profile. The engineer switches it from Connected accounts.
 */
export default function PassportConnectSection({
  initialLogin,
  initialRepos,
  autoFind = false,
}: {
  initialLogin: string;
  initialRepos: string[];
  autoFind?: boolean;
}) {
  return <PassportBuilder signedIn initialLogin={initialLogin} initialRepos={initialRepos} showPreview={false} autoFind={autoFind} />;
}
