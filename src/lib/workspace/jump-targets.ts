export type JumpTarget = { label: string; hint: string; href: string; keywords?: string };

export const CANDIDATE_JUMP_TARGETS: readonly JumpTarget[] = [
  { label: "Overview", hint: "What needs your attention and your invitations", href: "/app/candidate", keywords: "home dashboard invitations" },
  { label: "Projects", hint: "Every project and its Builder Report", href: "/app/candidate/work-record", keywords: "repositories repos reports" },
  { label: "Add a GitHub repository", hint: "Import a public repository by link", href: "/app/candidate/work-record#add-repository", keywords: "import new project github repo" },
  { label: "Upload a project folder or ZIP", hint: "VS Code, Cursor or any local project", href: "/app/candidate/work-record?upload=1#upload-project", keywords: "upload zip folder local vscode cursor files private" },
  { label: "Builder Analysis", hint: "Create or read the analysis of your projects", href: "/app/candidate/reports", keywords: "report analysis capability evaluate" },
  { label: "Switch or disconnect GitHub", hint: "Change the GitHub account and remove its repositories", href: "/app/candidate/work-record#connected-accounts", keywords: "github account change remove connected accounts" },
  { label: "Share profile", hint: "Create or stop share links", href: "/app/candidate/work-record#share", keywords: "share link public send" },
  { label: "Preview what recipients see", hint: "Your profile as a share link shows it", href: "/app/candidate/work-record/preview", keywords: "preview recipient share" },
  { label: "Profile & Passport", hint: "Name, headline, photo, X, Instagram and LinkedIn", href: "/app/candidate/profile", keywords: "profile edit bio social twitter instagram linkedin photo" },
  { label: "Applications", hint: "Roles you applied to", href: "/app/candidate/applications", keywords: "jobs applied" },
  { label: "Practice simulation", hint: "Try a sample task and see the report", href: "/app/candidate/practice", keywords: "demo practice sandbox try" },
  { label: "Settings", hint: "Account, sharing and data", href: "/app/candidate/settings", keywords: "account password email" },
  { label: "Export your data", hint: "Download everything Fydell holds about you", href: "/app/candidate/settings#data-heading", keywords: "export download data privacy gdpr" },
  { label: "Delete account", hint: "Permanently remove your account and data", href: "/app/candidate/settings#delete-heading", keywords: "delete remove close account" },
  { label: "Get the desktop app", hint: "Fydell for Windows, from the Microsoft Store", href: "/download", keywords: "install download windows mac desktop app" },
  { label: "Help and support", hint: "Contact the Fydell team", href: "/contact", keywords: "help support contact" },
];

export const EMPLOYER_JUMP_TARGETS: readonly JumpTarget[] = [
  { label: "Overview", hint: "Today's work and setup steps", href: "/app/employer", keywords: "home dashboard today" },
  { label: "Create a simulation", hint: "Start from a simulation template or write your own", href: "/app/employer/work-samples/new", keywords: "new work sample simulation template task" },
  { label: "Work samples", hint: "Simulations your team has written or adapted", href: "/app/employer/work-samples", keywords: "simulations tasks" },
  { label: "Assessments", hint: "Create an assessment and invite candidates", href: "/app/employer/engineering", keywords: "assessment invite candidate create" },
  { label: "Roles", hint: "Open roles and their requirements", href: "/app/employer/openings", keywords: "jobs openings positions" },
  { label: "Open a new role", hint: "Write the role and what evidence it needs", href: "/app/employer/openings/new", keywords: "new job opening create role" },
  { label: "Candidates", hint: "Everyone you invited or who applied", href: "/app/employer/candidates", keywords: "applicants people" },
  { label: "Reviews", hint: "Builder Profiles and submissions to review", href: "/app/employer/passports", keywords: "review decision evidence profiles" },
  { label: "Example review", hint: "A fictional applicant in your demo workspace", href: "/app/employer/demo", keywords: "demo example sample try" },
  { label: "Team", hint: "Invite teammates and manage access", href: "/app/employer/team", keywords: "members invite teammates" },
  { label: "Settings", hint: "Workspace details and data", href: "/app/employer/settings", keywords: "workspace account" },
  { label: "Trust and data handling", hint: "How candidate data is protected", href: "/trust", keywords: "security privacy trust" },
  { label: "Contact support", hint: "Reach the Fydell team", href: "/contact", keywords: "help support contact" },
];
