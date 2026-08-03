import type { RoleKey } from "@/lib/simulations/types";

/**
 * Client-side storage for the pilot tester profile. Answers from
 * /pilot/profile and the role choice from /pilot/roles live here so the
 * feedback form can attach them to the submission.
 */

export const PILOT_PROFILE_KEY = "fydell.pilot.profile";

export interface PilotProfile {
  perspective?: string;
  familiarity?: string;
  name?: string;
  email?: string;
  organization?: string;
  roleKey?: RoleKey;
  templateSlug?: string;
  simulationTitle?: string;
  updatedAt?: string;
}

export function readPilotProfile(): PilotProfile {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PILOT_PROFILE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as PilotProfile) : {};
  } catch {
    return {};
  }
}

export function savePilotProfile(patch: Partial<PilotProfile>): PilotProfile {
  const next: PilotProfile = {
    ...readPilotProfile(),
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(PILOT_PROFILE_KEY, JSON.stringify(next));
    } catch {
      // Storage may be unavailable (private mode). The flow still works;
      // the tester can re-enter details on the feedback page.
    }
  }
  return next;
}
