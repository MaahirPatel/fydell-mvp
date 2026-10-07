/* eslint-disable @next/next/no-img-element -- photos come from Supabase Storage at a per-upload URL; next/image would need a remote pattern per project */

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export default function Avatar({ name, url, size }: { name: string; url: string; size: number }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name ? `${name}'s profile photo` : "Profile photo"}
        width={size}
        height={size}
        className="shrink-0 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-deep)] object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-deep)] font-semibold tracking-[-0.02em] text-[var(--text-secondary)]"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}
    >
      {initials(name || "?")}
    </div>
  );
}
