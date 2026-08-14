import Link from "next/link";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import { Surface } from "@/components/ui/Surface";

export const metadata = { title: "This link has been retired | Fydell" };

/*
 * Retired disclosure path.
 *
 * This route used to resolve a plaintext `sim_sessions.share_token` and render
 * the candidate's complete analysis result to anyone holding the URL. The token
 * had no expiry, no field scoping, and no way for the candidate to withdraw it,
 * which is the opposite of what a Work Receipt is for.
 *
 * It now renders nothing about the attempt. It does not read the token, does not
 * look up a session, and does not touch the database, so a leaked or guessed URL
 * discloses nothing. The route is kept rather than deleted so that links already
 * in circulation explain themselves instead of returning a bare 404.
 *
 * The token column still exists on `sim_sessions`. Dropping it belongs with the
 * retirement of the other superseded paths, once that can be verified against a
 * real database.
 */
export default function RetiredResultLinkPage() {
  return (
    <CandidateShell width="narrow">
      <h1 className="text-[20px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">
        This link has been retired
      </h1>
      <p className="mt-3 text-[14.5px] leading-[1.65] text-[var(--text-secondary)]">
        It was an older kind of share link. It showed a complete result, it never
        expired, and the person who did the work had no way to turn it off. We
        stopped honouring links of this shape rather than leave someone&rsquo;s
        work exposed on a URL they did not choose to hand out.
      </p>

      <Surface tone="panel" className="mt-6 px-5 py-4">
        <h2 className="text-[13px] font-medium text-[var(--text-primary)]">
          If you were sent this to review someone
        </h2>
        <p className="mt-2 text-[13px] leading-[1.65] text-[var(--text-secondary)]">
          Ask them for a Work Receipt. They choose which parts of their result it
          includes and how long it stays open, and they can close it afterwards.
          It will open straight away, with no account needed.
        </p>
      </Surface>

      <Surface tone="panel" className="mt-3 px-5 py-4">
        <h2 className="text-[13px] font-medium text-[var(--text-primary)]">
          If this was your work
        </h2>
        <p className="mt-2 text-[13px] leading-[1.65] text-[var(--text-secondary)]">
          Nothing has been lost. Your result and the evidence behind it are still
          on your dashboard, and you can issue a Work Receipt from there whenever
          you want to share it.
        </p>
        <Link
          href="/app/candidate"
          className="mt-3 inline-flex text-[13px] font-medium text-[var(--text-primary)] underline underline-offset-4 hover:text-[var(--text-secondary)]"
        >
          Go to your dashboard
        </Link>
      </Surface>
    </CandidateShell>
  );
}
