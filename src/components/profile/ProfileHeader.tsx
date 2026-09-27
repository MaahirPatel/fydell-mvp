import type { EngineerProfile } from "@/lib/profile/types";

/** Identity header shared by the owner view and the public profile view. */
export default function ProfileHeader({ profile }: { profile: EngineerProfile }) {
  const initial = (profile.displayName.trim()[0] ?? "?").toUpperCase();
  return (
    <div className="flex items-start gap-4">
      <div
        aria-hidden
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] bg-[var(--surface-selected)] text-[20px] font-semibold text-[var(--text-primary)]"
      >
        {initial}
      </div>
      <div className="min-w-0">
        <h1 className="text-app-page font-semibold tracking-[-0.02em]">{profile.displayName || "Your profile"}</h1>
        {profile.headline ? (
          <p className="mt-1 text-[15px] leading-[1.5] text-[var(--text-secondary)]">{profile.headline}</p>
        ) : null}
        {profile.role ? (
          <p className="mt-1 text-[13px] font-medium text-[var(--text-tertiary)]">{profile.role}</p>
        ) : null}
      </div>
    </div>
  );
}
