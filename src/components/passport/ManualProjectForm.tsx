"use client";

import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import type { ManualProject, PassportData } from "@/lib/passport/view";

type LinkInput = { label: string; url: string };

/**
 * Manual project entry: for developers without public GitHub repos.
 * Everything entered here is self-reported — no code analysis runs.
 * The "self-reported" label is applied at render time, not as user input.
 */
export default function ManualProjectForm({
  onSaved,
}: {
  onSaved: (passport: PassportData, project: ManualProject) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contribution, setContribution] = useState("");
  const [techInput, setTechInput] = useState("");
  const [techStack, setTechStack] = useState<string[]>([]);
  const [links, setLinks] = useState<LinkInput[]>([]);
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addTech = () => {
    const t = techInput.trim();
    if (t && !techStack.includes(t) && techStack.length < 20) {
      setTechStack((s) => [...s, t]);
      setTechInput("");
    }
  };

  const addLink = () => {
    const url = linkUrl.trim();
    if (!url || links.length >= 10) return;
    if (!/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(url)) {
      setError("That link is not a valid http(s) URL.");
      return;
    }
    setLinks((l) => [...l, { label: linkLabel.trim() || url, url }]);
    setLinkLabel("");
    setLinkUrl("");
    setError(null);
  };

  const save = async () => {
    setError(null);
    if (!title.trim()) return setError("Give the project a title.");
    if (!description.trim()) return setError("Describe the project.");
    if (!contribution.trim()) return setError("Say what you personally built — this is the important part.");
    setSaving(true);
    try {
      const res = await fetch("/api/passport/projects/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          contributionStatement: contribution.trim(),
          techStack,
          links,
        }),
      });
      const data = (await res.json()) as { passport?: PassportData; error?: string };
      if (!res.ok || !data.passport) {
        setError(data.error ?? "Could not save the project.");
        return;
      }
      const project = data.passport.manualProjects[0] ?? null;
      if (project) onSaved(data.passport, project);
      // Reset for another entry
      setTitle("");
      setDescription("");
      setContribution("");
      setTechStack([]);
      setLinks([]);
    } catch {
      setError("Could not save the project. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-app-meta leading-[1.55] text-[var(--text-tertiary)]">
        No public GitHub? Describe a project here. It will be labeled{" "}
        <span className="font-medium text-[var(--text-primary)]">self-reported</span> — visible, but
        never presented as code-verified evidence.
      </p>

      <div>
        <label htmlFor="mp-title" className="mb-1 block text-app-meta font-medium">Project title</label>
        <input
          id="mp-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="e.g. Realtime delivery tracker"
          className="platform-input text-app-body"
        />
      </div>

      <div>
        <label htmlFor="mp-desc" className="mb-1 block text-app-meta font-medium">What is it?</label>
        <textarea
          id="mp-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="What the project does, who it serves, how it works."
          className="platform-input text-app-body"
        />
      </div>

      <div>
        <label htmlFor="mp-contrib" className="mb-1 block text-app-meta font-medium">What did you personally build?</label>
        <textarea
          id="mp-contrib"
          value={contribution}
          onChange={(e) => setContribution(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="Be specific: which parts you designed, wrote, or owned. This is shown separately from the project description."
          className="platform-input text-app-body"
        />
      </div>

      <div>
        <label htmlFor="mp-tech" className="mb-1 block text-app-meta font-medium">Technologies <span className="font-normal text-[var(--text-tertiary)]">(optional)</span></label>
        <div className="flex gap-2">
          <input
            id="mp-tech"
            value={techInput}
            onChange={(e) => setTechInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTech(); } }}
            maxLength={40}
            placeholder="e.g. TypeScript"
            className="platform-input text-app-body"
          />
          <button type="button" onClick={addTech} className="inline-flex h-10 shrink-0 items-center rounded-full border border-[var(--border-subtle)] px-4 text-app-body font-medium">
            Add
          </button>
        </div>
        {techStack.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {techStack.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-sunken)] px-3 py-1 text-app-meta">
                {t}
                <button type="button" aria-label={`Remove ${t}`} onClick={() => setTechStack((s) => s.filter((x) => x !== t))}>
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div>
        <span className="mb-1 block text-app-meta font-medium">Links <span className="font-normal text-[var(--text-tertiary)]">(optional, max 10)</span></span>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={linkLabel}
            onChange={(e) => setLinkLabel(e.target.value)}
            maxLength={60}
            placeholder="Label (e.g. Live demo)"
            aria-label="Link label"
            className="platform-input text-app-body"
          />
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://…"
            aria-label="Link URL"
            className="platform-input flex-1 text-app-body"
          />
          <button type="button" onClick={addLink} className="inline-flex h-10 shrink-0 items-center justify-center gap-1 rounded-full border border-[var(--border-subtle)] px-4 text-app-body font-medium">
            <Plus className="h-4 w-4" aria-hidden /> Add link
          </button>
        </div>
        {links.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {links.map((l) => (
              <li key={l.url} className="flex items-center justify-between gap-2 text-app-meta">
                <span className="truncate">{l.label} · <span className="text-[var(--text-tertiary)]">{l.url}</span></span>
                <button type="button" aria-label={`Remove link ${l.label}`} onClick={() => setLinks((ls) => ls.filter((x) => x.url !== l.url))} className="shrink-0">
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {error ? <p role="alert" className="text-app-meta text-[var(--evidence-counter)]">{error}</p> : null}

      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--control-solid)] px-5 text-app-body font-medium text-[var(--control-solid-ink)] hover:bg-[var(--control-solid-hover)] disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        {saving ? "Saving…" : "Add to passport"}
      </button>
    </div>
  );
}
