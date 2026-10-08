/** Engineer questions, shown on /candidates. Moved off the homepage to keep it short. */
export const ENGINEER_FAQ = [
  {
    q: "Can I use private or employer code?",
    a: "You can upload a ZIP of a project you are allowed to share. It is analyzed the same way as a public repository and labelled as uploaded source, with no public link to the code. For work you can't share at all, describe the project in your own words; recipients see it labelled as your description, with no source analyzed.",
  },
  {
    q: "I don't have a public GitHub portfolio. Can I still use Fydell?",
    a: "Yes. Upload a project as a ZIP, describe projects in your own words, or accept an employer's invitation and take a simulation without any repositories. Having no public code is never counted against you.",
  },
  {
    q: "How is AI used?",
    a: "Findings come from reading the code in the files listed in each report. Where a language model writes a summary, the report says so. In simulations, the tool policy is shown before you start, and you describe any AI help in your own words; Fydell cannot see the tools you use.",
  },
  {
    q: "What if a finding is wrong?",
    a: "Flag it as inaccurate, add context, or propose a different reading. Your note is attributed to you and shown next to the finding. The original stays visible, so nobody mistakes your statement for a verified fact.",
  },
  {
    q: "What can an employer see?",
    a: "Only what you put in a share link: the projects you chose, at the versions you chose. You can see each link's scope, set an expiry, and revoke it. Revoking stops the link and any review built on it, but copies someone already saved cannot be recalled.",
  },
  {
    q: "What is a simulation?",
    a: "A disclosed work sample: a small working codebase, a brief, and a stated time and scope. Before you begin, you see exactly what is recorded, what the employer receives, and what you get back. Employers only ask for one when they want evidence your projects don't cover.",
  },
  {
    q: "Are there jobs on Fydell?",
    a: "There is no public job board yet. Roles reach you as invitations from the hiring teams that use Fydell. We will not show listings that aren't real.",
  },
] as const;
