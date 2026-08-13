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

/** Pure parse, so components can derive a profile from a stored string. */
export function parsePilotProfile(raw: string | null): PilotProfile {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as PilotProfile) : {};
  } catch {
    return {};
  }
}

export function readPilotProfile(): PilotProfile {
  if (typeof window === "undefined") return {};
  try {
    return parsePilotProfile(window.localStorage.getItem(PILOT_PROFILE_KEY));
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
      /*
       * The browser only fires `storage` at *other* tabs, so components in this
       * one reading the profile as an external store would keep showing the old
       * value. Announce the write locally as well.
       */
      window.dispatchEvent(new StorageEvent("storage", { key: PILOT_PROFILE_KEY }));
    } catch {
      // Storage may be unavailable (private mode). The flow still works;
      // the tester can re-enter details on the feedback page.
    }
  }
  return next;
}
