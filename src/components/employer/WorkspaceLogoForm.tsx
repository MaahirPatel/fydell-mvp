"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";

export default function WorkspaceLogoForm({ canEdit }: { canEdit: boolean }) {
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  if (!canEdit) {
    return <p className="text-app-body text-[var(--text-tertiary)]">Only an owner or admin can set the logo.</p>;
  }
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/proof/logo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ logo_url: url }),
    });
    if (res.ok) {
      setMessage("Logo saved.");
      return;
    }
    const json = (await res.json().catch(() => null)) as { error?: string } | null;
    setMessage(json?.error ?? "Could not save logo.");
  }
  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
      <Button type="submit" size="sm">Save</Button>
      {message ? <span className="text-app-meta text-[var(--text-secondary)]">{message}</span> : null}
    </form>
  );
}
