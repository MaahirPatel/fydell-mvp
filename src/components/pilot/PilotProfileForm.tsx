"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FAMILIARITY_OPTIONS,
  PERSPECTIVE_OPTIONS,
  isValidEmail,
} from "@/components/pilot/pilot-data";
import {
  PILOT_PROFILE_KEY,
  parsePilotProfile,
  savePilotProfile,
} from "@/components/pilot/profile-storage";
import { useStoredString } from "@/lib/client/local-storage";
import { ChoiceGroup, PrimaryButton, TextField } from "@/components/pilot/PilotUi";

interface Draft {
  perspective: string | null;
  familiarity: string | null;
  name: string;
  email: string;
  organization: string;
}

export default function PilotProfileForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<{ perspective?: string; familiarity?: string; email?: string }>({});

  /*
   * A previous visit pre-fills the form. The stored profile is read as an
   * external store and the fields are derived from it, so nothing has to be
   * copied into state after mount.
   */
  const storedRaw = useStoredString(PILOT_PROFILE_KEY);
  const [edits, setEdits] = useState<Partial<Draft>>({});
  const { perspective, familiarity, name, email, organization } = useMemo<Draft>(() => {
    const saved = parsePilotProfile(storedRaw);
    return {
      perspective: saved.perspective ?? null,
      familiarity: saved.familiarity ?? null,
      name: saved.name ?? "",
      email: saved.email ?? "",
      organization: saved.organization ?? "",
      ...edits,
    };
  }, [storedRaw, edits]);

  const edit = <K extends keyof Draft>(key: K) => (value: Draft[K]) =>
    setEdits((prev) => ({ ...prev, [key]: value }));
  const setPerspective = edit("perspective");
  const setFamiliarity = edit("familiarity");
  const setName = edit("name");
  const setEmail = edit("email");
  const setOrganization = edit("organization");

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nextErrors: typeof errors = {};
    if (!perspective) nextErrors.perspective = "Please choose one option.";
    if (!familiarity) nextErrors.familiarity = "Please choose one option.";
    if (email.trim() && !isValidEmail(email)) {
      nextErrors.email = "That email does not look right. Please check it or leave it blank.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    savePilotProfile({
      perspective: perspective || undefined,
      familiarity: familiarity || undefined,
      name: name.trim() || undefined,
      email: email.trim() || undefined,
      organization: organization.trim() || undefined,
    });
    router.push("/pilot/roles");
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      <ChoiceGroup
        label="Which perspective are you testing from?"
        options={PERSPECTIVE_OPTIONS}
        value={perspective}
        onChange={(v) => {
          setPerspective(v);
          setErrors((prev) => ({ ...prev, perspective: undefined }));
        }}
        error={errors.perspective}
      />

      <ChoiceGroup
        label="How familiar are you with the role you will select?"
        options={FAMILIARITY_OPTIONS}
        value={familiarity}
        onChange={(v) => {
          setFamiliarity(v);
          setErrors((prev) => ({ ...prev, familiarity: undefined }));
        }}
        error={errors.familiarity}
        stacked
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <TextField
          label="Name"
          optional
          value={name}
          onChange={setName}
          placeholder="Your name"
          autoComplete="name"
        />
        <TextField
          label="Email"
          optional
          type="email"
          value={email}
          onChange={(v) => {
            setEmail(v);
            setErrors((prev) => ({ ...prev, email: undefined }));
          }}
          placeholder="you@company.com"
          autoComplete="email"
          error={errors.email}
        />
      </div>
      <TextField
        label="Organization"
        optional
        value={organization}
        onChange={setOrganization}
        placeholder="Company or team"
        autoComplete="organization"
      />

      <PrimaryButton type="submit">Continue to role selection</PrimaryButton>
    </form>
  );
}
