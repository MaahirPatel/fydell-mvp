import type { RoleKey } from "@/lib/simulations/types";

/**
 * Role-specific pilot feedback questions. Eight authored questions per role,
 * shown as optional free-text fields on /pilot/feedback after a tester
 * completes that role's simulation.
 */
export const ROLE_QUESTIONS: Record<RoleKey, string[]> = {
  data_analyst: [
    "Did this resemble a problem a Data Analyst might actually receive?",
    "Was the data too simple, too difficult or appropriate for five minutes?",
    "Did the simulation distinguish analysis from guessing?",
    "Which action provided the strongest evidence of ability?",
    "What tool would a real Data Analyst expect but not find here?",
    "Did the report correctly explain the candidate's work?",
    "Would this evidence help you decide who receives an interview?",
    "What would a longer Data Analyst simulation need?",
  ],
  bi_analyst: [
    "Does metric-definition judgment matter when hiring BI Analysts?",
    "Did this test more than basic arithmetic?",
    "Was the business context sufficient?",
    "Would a strong resume reveal the same information?",
    "Did the scoring reward the right behavior?",
    "What BI tool or dashboard interaction would improve realism?",
    "Would you trust the metric-reasoning evidence?",
    "What should a longer BI assessment test?",
  ],
  solutions_engineer: [
    "Did this represent genuine Solutions Engineering work?",
    "Did it test both technical and customer-facing judgment?",
    "Was product documentation clear enough?",
    "Could someone pass without understanding the integration?",
    "Did the report capture honesty about limitations?",
    "Would you want to see the candidate present the solution verbally?",
    "What additional evidence would make the report trustworthy?",
    "What should a longer Solutions Engineer simulation include?",
  ],
  implementation_consultant: [
    "Did this resemble implementation work?",
    "Did the simulation reveal attention to data integrity?",
    "Was the launch context realistic?",
    "Did the task reveal risk-management judgment?",
    "Was the field-mapping interface usable?",
    "Did the report identify the important implementation risks?",
    "Would this help differentiate careful and careless candidates?",
    "What should a longer implementation simulation include?",
  ],
  technical_support_engineer: [
    "Did this resemble real technical support work?",
    "Was there enough evidence to make a decision?",
    "Did the task test troubleshooting rather than memorization?",
    "Did the scoring appropriately value safety?",
    "Was the customer-response requirement useful?",
    "Did the report distinguish diagnosis from unsupported assumptions?",
    "Would this evidence influence an interview decision?",
    "What should a longer support simulation include?",
  ],
  business_systems_analyst: [
    "Did this represent Business Systems Analyst work?",
    "Did the simulation test process and systems judgment?",
    "Was the compliance constraint realistic?",
    "Did the task reveal whether someone can handle exceptions?",
    "Did the report correctly explain the root cause?",
    "What system or process artifact was missing?",
    "Would this evidence help compare candidates?",
    "What should a longer systems-analysis simulation include?",
  ],
};
