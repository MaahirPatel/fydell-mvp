"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ROLE_BY_KEY } from "@/lib/simulations/roles";
import type { RoleKey } from "@/lib/simulations/types";
import {
  DURATION_OPTIONS,
  EVIDENCE_CHOICES,
  HELP_OPTIONS,
  HIRING_STEP_OPTIONS,
  INTERVIEW_VALUE_OPTIONS,
  PILOT_INTEREST_OPTIONS,
  PILOT_ROLE_ORDER,
  PILOT_SIMS,
  SCORE_PREFERENCE_OPTIONS,
  TRUST_OPTIONS,
  YES_NO_OPTIONS,
} from "@/components/pilot/pilot-data";
import { ROLE_QUESTIONS } from "@/components/pilot/role-questions";
import {
  readPilotProfile,
  savePilotProfile,
  type PilotProfile,
} from "@/components/pilot/profile-storage";
import {
  ChoiceGroup,
  PilotSection,
  PrimaryButton,
  RatingScale,
  TextAreaField,
} from "@/components/pilot/PilotUi";

type SubmitStatus = "idle" | "submitting" | "error";

export default function PilotFeedbackForm() {
  const router = useRouter();
  const [profile, setProfile] = useState<PilotProfile>({});
  const [loaded, setLoaded] = useState(false);

  // Which simulation was completed (from localStorage, or picked here).
  const [roleKey, setRoleKey] = useState<RoleKey | null>(null);

  // Product clarity
  const [clarity, setClarity] = useState<number | null>(null);
  const [initialImpression, setInitialImpression] = useState("");
  const [clearestPart, setClearestPart] = useState("");
  const [confusingPart, setConfusingPart] = useState("");

  // Simulation experience
  const [taskEase, setTaskEase] = useState<number | null>(null);
  const [realism, setRealism] = useState<number | null>(null);
  const [completedWithoutHelp, setCompletedWithoutHelp] = useState<string | null>(null);
  const [hesitation, setHesitation] = useState("");
  const [controlIssues, setControlIssues] = useState("");
  const [duration, setDuration] = useState<string | null>(null);

  // Scoring and evidence
  const [resultAccuracy, setResultAccuracy] = useState<number | null>(null);
  const [unsupportedConclusion, setUnsupportedConclusion] = useState("");
  const [mostUsefulEvidence, setMostUsefulEvidence] = useState<string | null>(null);
  const [leastUsefulEvidence, setLeastUsefulEvidence] = useState<string | null>(null);
  const [trust, setTrust] = useState<string | null>(null);
  const [trustReason, setTrustReason] = useState("");
  const [scorePreference, setScorePreference] = useState<string | null>(null);

  // Hiring value
  const [interviewValue, setInterviewValue] = useState<string | null>(null);
  const [hiringStep, setHiringStep] = useState<string | null>(null);
  const [changesNeeded, setChangesNeeded] = useState("");
  const [rolesForOrg, setRolesForOrg] = useState("");
  const [annualHires, setAnnualHires] = useState("");
  const [pilotInterest, setPilotInterest] = useState<string | null>(null);
  const [contactOk, setContactOk] = useState<string | null>(null);

  // Role-specific answers, indexed by question position.
  const [roleAnswers, setRoleAnswers] = useState<string[]>(Array(8).fill(""));

  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    const saved = readPilotProfile();
    setProfile(saved);
    if (saved.roleKey && ROLE_BY_KEY[saved.roleKey]) setRoleKey(saved.roleKey);
    setLoaded(true);
  }, []);

  const roleQuestions = roleKey ? ROLE_QUESTIONS[roleKey] : null;

  const simPickerOptions = useMemo(
    () =>
      PILOT_ROLE_ORDER.map(
        (key) => `${ROLE_BY_KEY[key].title}: ${PILOT_SIMS[key].title}`
      ),
    []
  );

  function pickSimulation(label: string) {
    const key = PILOT_ROLE_ORDER.find(
      (k) => `${ROLE_BY_KEY[k].title}: ${PILOT_SIMS[k].title}` === label
    );
    if (!key) return;
    setRoleKey(key);
    setRoleAnswers(Array(8).fill(""));
    const next = savePilotProfile({
      roleKey: key,
      templateSlug: PILOT_SIMS[key].slug,
      simulationTitle: PILOT_SIMS[key].title,
    });
    setProfile(next);
  }

  function hasAnyAnswer(): boolean {
    const ratings = [clarity, taskEase, realism, resultAccuracy];
    const choices = [
      completedWithoutHelp,
      duration,
      mostUsefulEvidence,
      leastUsefulEvidence,
      trust,
      scorePreference,
      interviewValue,
      hiringStep,
      pilotInterest,
      contactOk,
    ];
    const texts = [
      initialImpression,
      clearestPart,
      confusingPart,
      hesitation,
      controlIssues,
      unsupportedConclusion,
      trustReason,
      changesNeeded,
      rolesForOrg,
      annualHires,
      ...roleAnswers,
    ];
    return (
      ratings.some((r) => r !== null) ||
      choices.some((c) => c !== null) ||
      texts.some((t) => t.trim().length > 0)
    );
  }

  async function submit() {
    setSubmitError(null);
    setValidationError(null);

    if (!hasAnyAnswer()) {
      setValidationError("Please answer at least one question before submitting.");
      return;
    }

    const answeredRoleQuestions =
      roleKey && roleQuestions
        ? roleQuestions
            .map((question, i) => ({ question, answer: roleAnswers[i]?.trim() || "" }))
            .filter((qa) => qa.answer.length > 0)
        : [];

    const payload = {
      templateSlug: roleKey ? PILOT_SIMS[roleKey].slug : null,
      roleKey: roleKey || null,
      simulationTitle: roleKey ? PILOT_SIMS[roleKey].title : null,
      profile: {
        perspective: profile.perspective || null,
        familiarity: profile.familiarity || null,
        name: profile.name || null,
        email: profile.email || null,
        organization: profile.organization || null,
      },
      ratings: {
        clarity,
        taskEase,
        realism,
        resultAccuracy,
      },
      completedWithoutHelp,
      durationOpinion: duration,
      trustScore: trust,
      interviewValue,
      candidatePilotInterest: pilotInterest,
      contactOk,
      text: {
        initialImpression: initialImpression.trim(),
        clearestPart: clearestPart.trim(),
        confusingPart: confusingPart.trim(),
        hesitation: hesitation.trim(),
        controlIssues: controlIssues.trim(),
        unsupportedConclusion: unsupportedConclusion.trim(),
        trustReason: trustReason.trim(),
        changesNeeded: changesNeeded.trim(),
        rolesForOrg: rolesForOrg.trim(),
        annualHires: annualHires.trim(),
      },
      evidence: {
        mostUseful: mostUsefulEvidence,
        leastUseful: leastUsefulEvidence,
        scorePreference,
      },
      roleAnswers: answeredRoleQuestions,
    };

    setStatus("submitting");
    try {
      const res = await fetch("/api/pilot-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setStatus("error");
        setSubmitError(
          typeof data?.error === "string"
            ? data.error
            : "Could not save your feedback. Please try again."
        );
        return;
      }
      router.push("/pilot/thanks");
    } catch {
      setStatus("error");
      setSubmitError("Network error. Please check your connection and try again.");
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void submit();
  }

  if (!loaded) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-[16px] border border-white/[0.09] bg-white/[0.025] px-5 py-10 text-center text-[15px] text-[rgba(244,245,247,0.55)]"
      >
        Loading your details...
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      <PilotSection
        title="Which simulation did you complete?"
        description={
          roleKey
            ? "We saved your choice from the role page. Change it here if needed."
            : "Pick the simulation you just finished so we can show the right questions."
        }
      >
        <ChoiceGroup
          label="Completed simulation"
          options={simPickerOptions}
          value={roleKey ? `${ROLE_BY_KEY[roleKey].title}: ${PILOT_SIMS[roleKey].title}` : null}
          onChange={pickSimulation}
          stacked
        />
      </PilotSection>

      <PilotSection title="Product clarity">
        <RatingScale
          label="How clear was Fydell overall?"
          value={clarity}
          onChange={setClarity}
          lowLabel="Very unclear"
          highLabel="Very clear"
        />
        <TextAreaField
          label="What did you initially think Fydell was?"
          optional
          value={initialImpression}
          onChange={setInitialImpression}
        />
        <TextAreaField
          label="Which part of the website made the product clearest?"
          optional
          value={clearestPart}
          onChange={setClearestPart}
        />
        <TextAreaField
          label="Which part was confusing or unnecessary?"
          optional
          value={confusingPart}
          onChange={setConfusingPart}
        />
      </PilotSection>

      <PilotSection title="Simulation experience">
        <RatingScale
          label="How easy was the task to work through?"
          value={taskEase}
          onChange={setTaskEase}
          lowLabel="Very hard"
          highLabel="Very easy"
        />
        <RatingScale
          label="How realistic did the scenario feel?"
          value={realism}
          onChange={setRealism}
          lowLabel="Not realistic"
          highLabel="Very realistic"
        />
        <ChoiceGroup
          label="Did you complete it without help?"
          options={HELP_OPTIONS}
          value={completedWithoutHelp}
          onChange={setCompletedWithoutHelp}
        />
        <TextAreaField
          label="Where did you hesitate?"
          optional
          value={hesitation}
          onChange={setHesitation}
        />
        <TextAreaField
          label="Did any control fail or behave unexpectedly?"
          optional
          value={controlIssues}
          onChange={setControlIssues}
        />
        <ChoiceGroup
          label="Was five minutes:"
          options={DURATION_OPTIONS}
          value={duration}
          onChange={setDuration}
        />
      </PilotSection>

      <PilotSection title="Scoring and evidence">
        <RatingScale
          label="Did the result accurately describe what you did?"
          value={resultAccuracy}
          onChange={setResultAccuracy}
          lowLabel="Not at all"
          highLabel="Completely"
        />
        <TextAreaField
          label="Did any conclusion feel unsupported?"
          optional
          value={unsupportedConclusion}
          onChange={setUnsupportedConclusion}
        />
        <ChoiceGroup
          label="Which evidence was most useful?"
          options={EVIDENCE_CHOICES}
          value={mostUsefulEvidence}
          onChange={setMostUsefulEvidence}
        />
        <ChoiceGroup
          label="Which evidence was least useful?"
          options={EVIDENCE_CHOICES}
          value={leastUsefulEvidence}
          onChange={setLeastUsefulEvidence}
        />
        <ChoiceGroup
          label="Did you trust the score?"
          options={TRUST_OPTIONS}
          value={trust}
          onChange={setTrust}
        />
        <TextAreaField label="Why?" optional value={trustReason} onChange={setTrustReason} />
        <ChoiceGroup
          label="How should results be presented?"
          options={SCORE_PREFERENCE_OPTIONS}
          value={scorePreference}
          onChange={setScorePreference}
          stacked
        />
      </PilotSection>

      <PilotSection title="Hiring value">
        <ChoiceGroup
          label="Would this help decide who receives an interview?"
          options={INTERVIEW_VALUE_OPTIONS}
          value={interviewValue}
          onChange={setInterviewValue}
        />
        <ChoiceGroup
          label="What hiring step could this replace or improve?"
          options={HIRING_STEP_OPTIONS}
          value={hiringStep}
          onChange={setHiringStep}
        />
        <TextAreaField
          label="What would need to change before using it with real candidates?"
          optional
          value={changesNeeded}
          onChange={setChangesNeeded}
        />
        <TextAreaField
          label="Which roles would your organization use this for?"
          optional
          value={rolesForOrg}
          onChange={setRolesForOrg}
          rows={2}
        />
        <TextAreaField
          label="Roughly how many people does your organization hire for these roles each year?"
          optional
          value={annualHires}
          onChange={setAnnualHires}
          rows={2}
        />
        <ChoiceGroup
          label="Would you test this with five real candidates?"
          options={PILOT_INTEREST_OPTIONS}
          value={pilotInterest}
          onChange={setPilotInterest}
        />
        <ChoiceGroup
          label="May Fydell contact you about a structured pilot?"
          options={YES_NO_OPTIONS}
          value={contactOk}
          onChange={setContactOk}
        />
      </PilotSection>

      {roleKey && roleQuestions ? (
        <PilotSection
          title={`About the ${ROLE_BY_KEY[roleKey].title} simulation`}
          description="All optional. Answer the ones you have a view on."
        >
          {roleQuestions.map((question, i) => (
            <TextAreaField
              key={question}
              label={question}
              optional
              value={roleAnswers[i] || ""}
              onChange={(v) =>
                setRoleAnswers((prev) => {
                  const next = [...prev];
                  next[i] = v;
                  return next;
                })
              }
              rows={2}
            />
          ))}
        </PilotSection>
      ) : null}

      {validationError ? (
        <p
          role="alert"
          className="rounded-[10px] border border-[rgba(242,107,130,0.3)] bg-[rgba(242,107,130,0.1)] px-4 py-3 text-[14px] text-[#F6A6B4]"
        >
          {validationError}
        </p>
      ) : null}

      {submitError ? (
        <div
          role="alert"
          className="rounded-[10px] border border-[rgba(242,107,130,0.3)] bg-[rgba(242,107,130,0.1)] px-4 py-3"
        >
          <p className="text-[14px] leading-[1.55] text-[#F6A6B4]">{submitError}</p>
          <p className="mt-1 text-[13px] text-[rgba(244,245,247,0.55)]">
            Your answers are still on this page. Use the button below to retry.
          </p>
        </div>
      ) : null}

      <div className="flex items-center gap-4">
        <PrimaryButton type="submit" disabled={status === "submitting"}>
          {status === "submitting"
            ? "Saving your feedback..."
            : submitError
              ? "Retry submission"
              : "Submit feedback"}
        </PrimaryButton>
      </div>
    </form>
  );
}
