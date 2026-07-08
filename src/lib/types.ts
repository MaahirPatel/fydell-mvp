// Database row types (mirror supabase/schema.sql)

export type CandidateStatus = "invited" | "started" | "completed";

export type Stage =
  | "associate_update"
  | "manager_read"
  | "market_update"
  | "final_q1"
  | "final_q2"
  | "final_q3";

export interface Employer {
  id: string;
  name: string;
  passcode: string;
  token: string;
  created_at: string;
}

export interface Candidate {
  id: string;
  employer_id: string;
  name: string;
  email: string;
  role: string;
  invitation_token: string;
  status: CandidateStatus;
  created_at: string;
}

export interface Session {
  id: string;
  candidate_id: string;
  started_at: string | null;
  submitted_at: string | null;
  time_spent_seconds: number | null;
}

export interface Response {
  id: string;
  candidate_id: string;
  stage: Stage;
  response_text: string | null;
  submitted_at: string;
}

export interface Score {
  id: string;
  candidate_id: string;
  error_1_found: boolean;
  error_2_found: boolean;
  error_3_found: boolean;
  uncertainty_communicated: boolean;
  updated_view: boolean;
  genuine_reasoning: boolean;
  admin_notes: string | null;
  scored_at: string | null;
}

export interface Feedback {
  id: string;
  employer_id: string;
  q1_rating: number | null;
  q1_text: string | null;
  q2_rating: number | null;
  q2_text: string | null;
  q3_rating: number | null;
  q3_text: string | null;
  submitted_at: string;
}

export const RUBRIC_FIELDS: { key: keyof Score; label: string }[] = [
  { key: "error_1_found", label: "Identified the terminal growth rate error (4.8% vs about 2-3% peers)" },
  { key: "error_2_found", label: "Identified the change-of-control $340M debt obligation" },
  { key: "error_3_found", label: "Identified the synergies double-count ($18M already in base case)" },
  { key: "uncertainty_communicated", label: "Communicated uncertainty appropriately in the preliminary read" },
  { key: "updated_view", label: "Updated their view based on new information" },
  { key: "genuine_reasoning", label: "Reasoning showed genuine financial understanding, not framework recitation" }
];

export const ERROR_FIELDS: (keyof Score)[] = ["error_1_found", "error_2_found", "error_3_found"];
