export interface CompanyUser {
  id: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  companyName: string;
  createdAt: string;
  onboardingComplete: boolean;
  onboarding?: OnboardingAnswers;
}

export interface OnboardingAnswers {
  hearAbout: string;
  companySize: string;
  yourRole: string;
  hiresPerYear: string;
  primaryUse: string;
  hiringFor: string;
  hiringPain: string;
  simulationPriority: string;
}

export interface SimulationDocument {
  id: string;
  title: string;
  type: "dcf" | "legal" | "presentation" | "memo" | "data";
  content: string;
  html?: string;
}

export interface SimulationTask {
  id: string;
  label: string;
  type: "input" | "textarea" | "select" | "radio";
  documentId?: string;
  placeholder?: string;
  minChars?: number;
  options?: { value: string; label: string }[];
  required: boolean;
}

export interface SimulationNotification {
  triggerMinute: number;
  from: string;
  kind: "message" | "market";
  body: string;
  stage: string;
  responseLabel: string;
  required: boolean;
  minChars?: number;
}

export interface CompanyRole {
  id: string;
  companyUserId: string;
  title: string;
  department?: string;
  level?: string;
  skills: string[];
  createdAt: string;
}

export interface GeneratedSimulation {
  id: string;
  companyUserId: string;
  roleId?: string;
  title: string;
  role: string;
  industry: string;
  durationMinutes: number;
  brief: string;
  scenarioHeader: string;
  documents: SimulationDocument[];
  tasks: SimulationTask[];
  notifications: SimulationNotification[];
  finalQuestions: { stage: string; prompt: string }[];
  embeddedErrors: string[];
  createdAt: string;
  promptSummary: string;
}

export interface GenerateSimulationInput {
  industry: string;
  role: string;
  scenarioBrief: string;
  skills: string[];
  durationMinutes: number;
  difficulty: "standard" | "advanced";
}
