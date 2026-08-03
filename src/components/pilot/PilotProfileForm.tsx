"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FAMILIARITY_OPTIONS,
  PERSPECTIVE_OPTIONS,
  isValidEmail,
} from "@/components/pilot/pilot-data";
import { readPilotProfile, savePilotProfile } from "@/components/pilot/profile-storage";
import { ChoiceGroup, PrimaryButton, TextField } from "@/components/pilot/PilotUi";

export default function PilotProfileForm() {
  const router = useRouter();
  const [perspective, setPerspective] = useState<string | null>(null);
  const [familiarity, setFamiliarity] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [errors, setErrors] = useState<{ perspective?: string; familiarity?: string; email?: string }>({});

  // Pre-fill from a previous visit.
  useEffect(() => {
    const saved = readPilotProfile();
    if (saved.perspective) setPerspective(saved.perspective);
    if (saved.familiarity) setFamiliarity(saved.familiarity);
    if (saved.name) setName(saved.name);
    if (saved.email) setEmail(saved.email);
    if (saved.organization) setOrganization(saved.organization);
  }, []);

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
