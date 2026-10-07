"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Instagram, Linkedin, Plus, Twitter, X } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Notice } from "@/components/ui/report";
import Avatar from "@/components/profile/Avatar";
import GithubUsernameControl from "@/components/profile/GithubUsernameControl";
import {
  OPEN_TO,
  OPEN_TO_LABEL,
  SOCIAL_LABEL,
  type EngineerProfile,
  type OpenTo,
  type ProfileLink,
  type SocialKind,
  type SocialProfiles,
} from "@/lib/profile/types";

const SOCIAL_FIELDS: { kind: SocialKind; Icon: typeof Linkedin; placeholder: string }[] = [
  { kind: "linkedin", Icon: Linkedin, placeholder: "linkedin.com/in/your-name" },
  { kind: "x", Icon: Twitter, placeholder: "@handle" },
  { kind: "instagram", Icon: Instagram, placeholder: "@handle" },
];

const inputClass =
  "w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-canvas)] px-3 py-2 text-app-body text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:outline-none focus:ring-[3px] focus:ring-[var(--accent-line)]";
const labelClass = "mb-1 block text-app-meta font-medium text-[var(--text-secondary)]";
const primaryClass =
  "inline-flex h-9 items-center rounded-[8px] bg-[var(--control-solid)] px-4 text-[14px] font-medium text-white shadow-[0_1px_2px_rgba(16,24,40,0.12)] hover:bg-[var(--control-solid-hover)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--accent-line)] disabled:cursor-not-allowed disabled:bg-[var(--surface-deep)] disabled:text-[var(--text-disabled)] disabled:shadow-none";
const quietClass =
  "inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)] px-3 text-[14px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--accent-line)]";

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-app-meta text-[var(--text-tertiary)]">{hint}</p> : null}
    </div>
  );
}

/** "Edit profile" button plus the sheet that edits everything a visitor sees at the top of the profile. */
function formFrom(initial: EngineerProfile) {
  // A LinkedIn address saved as a plain link before the dedicated field
  // existed moves into the LinkedIn field the next time the form opens.
  const legacy = initial.social.linkedin ? -1 : initial.links.findIndex((l) => /linkedin\.com\//i.test(l.url));
  return {
    displayName: initial.displayName,
    handle: initial.handle,
    headline: initial.headline,
    role: initial.role,
    location: initial.location,
    bio: initial.bio,
    website: initial.website,
    openTo: initial.openTo,
    social: { ...initial.social, ...(legacy >= 0 ? { linkedin: initial.links[legacy].url } : {}) } as SocialProfiles,
    links: initial.links.filter((_, i) => i !== legacy) as ProfileLink[],
  };
}

export default function ProfileIdentityForm({
  initial,
  githubLogin,
  label = "Edit profile",
}: {
  initial: EngineerProfile;
  githubLogin?: string | null;
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => formFrom(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState(initial.avatarUrl);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadPhoto(file: File) {
    setPhotoError(null);
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError("Use an image under 2 MB.");
      return;
    }
    setPhotoBusy(true);
    try {
      const body = new FormData();
      body.append("photo", file);
      const res = await fetch("/api/profile/photo", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { avatarUrl?: string; error?: string };
      if (!res.ok || typeof data.avatarUrl !== "string") {
        setPhotoError(data.error ?? "Could not upload the photo.");
        return;
      }
      setPhoto(data.avatarUrl);
      router.refresh();
    } catch {
      setPhotoError("Fydell could not be reached. Try the upload again.");
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removePhoto() {
    setPhotoError(null);
    setPhotoBusy(true);
    try {
      const res = await fetch("/api/profile/photo", { method: "DELETE" });
      if (!res.ok) {
        setPhotoError("Could not remove the photo.");
        return;
      }
      setPhoto("");
      router.refresh();
    } catch {
      setPhotoError("Fydell could not be reached. Try again.");
    } finally {
      setPhotoBusy(false);
    }
  }

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => ({}))) as { profile?: EngineerProfile; error?: string };
      if (!res.ok || !data.profile) {
        setError(data.error ?? "Could not save your profile.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Fydell could not be reached. Check your connection; your edits are still here.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={quietClass}
        onClick={() => {
          setForm(formFrom(initial));
          setPhoto(initial.avatarUrl);
          setError(null);
          setPhotoError(null);
          setOpen(true);
        }}
      >
        {label}
      </button>
      <Sheet
        open={open}
        title="Edit profile"
        description="Visible to anyone you share a link with. Nothing here is checked by Fydell."
        onClose={() => setOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button type="button" className={quietClass} onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="button" className={primaryClass} disabled={saving} aria-busy={saving} onClick={() => void save()}>
              {saving ? "Saving…" : "Save profile"}
            </button>
          </div>
        }
      >
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          {error ? <Notice tone="error">{error}</Notice> : null}
          <div>
            <p className={labelClass}>Photo</p>
            <div className="flex items-center gap-4">
              <Avatar name={form.displayName} url={photo} size={64} />
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileRef}
                  id="profile-photo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadPhoto(file);
                  }}
                />
                <button type="button" className={quietClass} disabled={photoBusy} aria-busy={photoBusy} onClick={() => fileRef.current?.click()}>
                  <Camera className="h-4 w-4" aria-hidden />
                  {photoBusy ? "Uploading…" : photo ? "Replace photo" : "Upload photo"}
                </button>
                {photo ? (
                  <button type="button" aria-label="Remove photo" className="inline-flex h-9 items-center rounded-[8px] px-3 text-[14px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]" disabled={photoBusy} onClick={() => void removePhoto()}>
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
            <p className="mt-2 text-app-meta text-[var(--text-tertiary)]">PNG, JPEG or WebP, up to 2 MB. A square photo of your face works best. Saved as soon as it uploads.</p>
            {photoError ? <p role="alert" className="mt-1 text-app-meta text-[var(--badge-failed-ink)]">{photoError}</p> : null}
          </div>
          <Field id="profile-display-name" label="Name">
            <input id="profile-display-name" className={inputClass} value={form.displayName} onChange={(e) => set("displayName", e.target.value)} maxLength={120} autoComplete="name" required />
          </Field>
          <Field id="profile-handle" label="Handle" hint="Employers can invite you by @handle without seeing your email. 3 to 30 lowercase letters, numbers or underscores.">
            <div className="relative">
              <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-[var(--text-tertiary)]">@</span>
              <input
                id="profile-handle"
                className={`${inputClass} pl-7`}
                value={form.handle}
                onChange={(e) => set("handle", e.target.value.replace(/^@/, "").toLowerCase())}
                maxLength={30}
                placeholder="maya"
                autoComplete="username"
                spellCheck={false}
              />
            </div>
          </Field>
          <Field id="profile-headline" label="Headline" hint="One line about the work you do.">
            <input id="profile-headline" className={inputClass} value={form.headline} onChange={(e) => set("headline", e.target.value)} maxLength={160} placeholder="Backend engineer who ships reliable payment systems" />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="profile-role" label="Current role">
              <input id="profile-role" className={inputClass} value={form.role} onChange={(e) => set("role", e.target.value)} maxLength={120} placeholder="Senior Backend Engineer" autoComplete="organization-title" />
            </Field>
            <Field id="profile-location" label="Location">
              <input id="profile-location" className={inputClass} value={form.location} onChange={(e) => set("location", e.target.value)} maxLength={80} placeholder="Toronto, or Remote" autoComplete="address-level2" />
            </Field>
          </div>
          <Field id="profile-open-to" label="Open to">
            <select id="profile-open-to" className={inputClass} value={form.openTo} onChange={(e) => set("openTo", e.target.value as OpenTo)}>
              {OPEN_TO.map((v) => (
                <option key={v} value={v}>
                  {OPEN_TO_LABEL[v]}
                </option>
              ))}
            </select>
          </Field>
          <Field id="profile-bio" label="About" hint={`${form.bio.length} of 1,200 characters.`}>
            <textarea
              id="profile-bio"
              className={`${inputClass} min-h-[140px] leading-[1.6]`}
              value={form.bio}
              onChange={(e) => set("bio", e.target.value)}
              maxLength={1200}
              placeholder="What you build, what you care about, and the kind of team you work best in."
            />
          </Field>
          <fieldset className="space-y-3">
            <legend className={labelClass}>Social profiles</legend>
            {SOCIAL_FIELDS.map((f) => (
              <div key={f.kind} className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3">
                <label htmlFor={`profile-social-${f.kind}`} className="inline-flex items-center gap-2 text-app-body text-[var(--text-primary)]">
                  <f.Icon className="h-4 w-4 text-[var(--text-tertiary)]" aria-hidden />
                  {SOCIAL_LABEL[f.kind]}
                </label>
                <input
                  id={`profile-social-${f.kind}`}
                  className={inputClass}
                  value={form.social[f.kind]}
                  onChange={(e) => set("social", { ...form.social, [f.kind]: e.target.value })}
                  maxLength={200}
                  placeholder={f.placeholder}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            ))}
            <p className="text-app-meta text-[var(--text-tertiary)]">Paste the profile address or type your handle. Leave a field empty to hide it.</p>
          </fieldset>
          {githubLogin !== undefined ? (
            <div className="border-y border-[var(--border-subtle)] py-4">
              <GithubUsernameControl initial={githubLogin} />
            </div>
          ) : null}
          <Field id="profile-website" label="Website">
            <input id="profile-website" className={inputClass} value={form.website} onChange={(e) => set("website", e.target.value)} maxLength={200} placeholder="https://example.com" inputMode="url" autoComplete="url" />
          </Field>
          <fieldset>
            <legend className={labelClass}>Other links</legend>
            <div className="space-y-2">
              {form.links.map((link, i) => (
                <div key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_36px] gap-2">
                  <input
                    aria-label={`Link ${i + 1} label`}
                    className={inputClass}
                    value={link.label}
                    onChange={(e) => set("links", form.links.map((l, j) => (j === i ? { ...l, label: e.target.value } : l)))}
                    maxLength={40}
                    placeholder="Portfolio"
                  />
                  <input
                    aria-label={`Link ${i + 1} address`}
                    className={inputClass}
                    value={link.url}
                    onChange={(e) => set("links", form.links.map((l, j) => (j === i ? { ...l, url: e.target.value } : l)))}
                    maxLength={200}
                    placeholder="https://"
                    inputMode="url"
                  />
                  <button
                    type="button"
                    aria-label={`Remove link ${i + 1}`}
                    className="grid h-[38px] w-9 place-items-center rounded-[8px] text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                    onClick={() => set("links", form.links.filter((_, j) => j !== i))}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              ))}
            </div>
            {form.links.length < 5 ? (
              <button type="button" className={`${quietClass} mt-2`} onClick={() => set("links", [...form.links, { label: "", url: "" }])}>
                <Plus className="h-4 w-4" aria-hidden /> Add link
              </button>
            ) : null}
          </fieldset>
          <button type="submit" hidden aria-hidden tabIndex={-1} />
        </form>
      </Sheet>
    </>
  );
}
