import type { ReactNode } from "react";
import Link from "next/link";
import ClosingCTA from "@/components/marketing/ClosingCTA";
import { ProductStage, StageDescription } from "@/components/fydell/ProductStage";
import { DesktopStage } from "@/components/fydell/ProductDesktop";
import { ChangedFactsDiff } from "@/components/fydell/ChangedFactsDiff";
import { ReportInspector } from "@/components/fydell/ReportInspector";
import HeroSimPreview from "@/components/marketing/home/HeroSimPreview";
import {
  NORTHLINE_DEFENSE_PROMPT,
  NORTHLINE_RECEIPT,
  NORTHLINE_RESOURCES,
  NORTHLINE_SCENARIO,
} from "@/lib/fixtures/northline";

const DIVIDE = "border-t border-[var(--border-subtle)]";
const BAND = "bg-[var(--surface-band)]";
const CHAPTER = `${DIVIDE} mkt-section-chapter`;

function FeatureLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group mt-6 inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--action-ink)] transition-colors duration-150 hover:text-[var(--text-primary)]"
    >
      {children}
      <span
        aria-hidden
        className="transition-transform duration-150 ease-[var(--ease)] group-hover:translate-x-[3px]"
      >
        →
      </span>
    </Link>
  );
}

function FeatureCopy({
  heading,
  body,
  href,
  linkLabel,
}: {
  heading: string;
  body: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="max-w-[380px]">
      <h2 className="feature-heading">{heading}</h2>
      <p className="mt-3.5 text-[1rem] leading-[1.6] text-[var(--text-secondary)]">
        {body}
      </p>
      <FeatureLink href={href}>{linkLabel}</FeatureLink>
    </div>
  );
}

/**
 * One copy column against one dominant visual, alternating sides down the page.
 * The copy column is deliberately narrow: it is a caption for the product, not
 * a competing block of text.
 */
function FeatureSplit({
  heading,
  body,
  href,
  linkLabel,
  side,
  children,
}: {
  heading: string;
  body: string;
  href: string;
  linkLabel: string;
  side: "left" | "right";
  children: ReactNode;
}) {
  return (
    <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
      <div
        className={
          side === "right"
            ? "lg:col-span-4"
            : "lg:col-span-4 lg:order-2 lg:col-start-9"
        }
      >
        <FeatureCopy
          heading={heading}
          body={body}
          href={href}
          linkLabel={linkLabel}
        />
      </div>
      <div
        className={
          side === "right"
            ? "min-w-0 lg:col-span-8"
            : "min-w-0 lg:order-1 lg:col-span-8 lg:col-start-1 lg:row-start-1"
        }
      >
        <DesktopStage>{children}</DesktopStage>
      </div>
    </div>
  );
}

export default function HomeProductStory() {
  return (
    <>
      {/* The workbench is a three-panel scene. It gets the full canvas because
          at two thirds width its data table stops being readable, and an
          unreadable product visual proves nothing. */}
      <section className={CHAPTER}>
        <div className="mkt-content">
          <div className="max-w-[480px]">
            <h2 className="feature-heading">Work becomes evidence</h2>
            <p className="mt-3.5 text-[1rem] leading-[1.6] text-[var(--text-secondary)]">
              Follow how the candidate moves from source files to claims,
              citations, and a final conclusion.
            </p>
            <FeatureLink href="/product">See the work trail</FeatureLink>
          </div>
          <DesktopStage className="mt-10">
            <HeroSimPreview />
          </DesktopStage>
        </div>
      </section>

      <section className={`${CHAPTER} ${BAND}`}>
        <div className="mkt-content">
          <FeatureSplit
            side="right"
            heading="Every claim opens onto its source"
            body="Review the exact rows, definitions, and revisions behind the candidate's conclusion."
            href="/product"
            linkLabel="Explore the evidence report"
          >
            <ProductStage
              title="Evidence report"
              source={`${NORTHLINE_SCENARIO.company} · synthetic`}
              label="The employer report, with each claim openable to its cited source"
            >
              <ReportInspector />
              <StageDescription>
                An employer opening a claim to the cited source rows and the
                candidate action that produced it.
              </StageDescription>
            </ProductStage>
          </FeatureSplit>
        </div>
      </section>

      <section className={CHAPTER}>
        <div className="mkt-content">
          <FeatureSplit
            side="left"
            heading="When the facts change"
            body="See what the candidate revises, what they preserve, and how they explain the difference."
            href="/simulations"
            linkLabel="View the changed-fact workflow"
          >
            <ProductStage
              title="Changed fact"
              source={NORTHLINE_SCENARIO.evaluation}
              label="Original brief beside the new information and the candidate revision"
            >
              <div className="p-4">
                <ChangedFactsDiff />
              </div>
            </ProductStage>
          </FeatureSplit>
        </div>
      </section>

      <section className={`${CHAPTER} ${BAND}`}>
        <div className="mkt-content">
          <FeatureSplit
            side="right"
            heading="The interview starts where the evidence stops"
            body="Generate focused follow-up questions from the candidate's claims, limitations, and revisions."
            href="/simulations"
            linkLabel="See the oral defense"
          >
            <ProductStage
              title="Oral defense"
              source={NORTHLINE_SCENARIO.role}
              label="A follow-up question generated from a limitation the candidate recorded"
            >
              <div className="p-5 sm:p-6">
                <p
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius-tag)] px-1.5 py-0.5 text-[11.5px] font-medium"
                  style={{
                    background: "rgba(242,107,130,0.12)",
                    color: "var(--fydell-risk)",
                  }}
                >
                  Limitation the candidate recorded
                </p>
                <p
                  className="mt-3 pl-3 text-[14px] leading-[1.6] text-[var(--text-secondary)]"
                  style={{ borderLeft: "2px solid var(--fydell-risk)" }}
                >
                  {NORTHLINE_DEFENSE_PROMPT.tiedTo}
                </p>

                <p
                  className="mt-7 inline-flex items-center gap-1.5 rounded-[var(--radius-tag)] px-1.5 py-0.5 text-[11.5px] font-medium"
                  style={{
                    background: "rgba(176,127,208,0.14)",
                    color: "var(--fydell-verified)",
                  }}
                >
                  Follow-up question
                </p>
                <p className="mt-3 text-[19px] leading-[1.4] tracking-[-0.018em] text-[var(--text-primary)]">
                  {NORTHLINE_DEFENSE_PROMPT.question}
                </p>
                <StageDescription>
                  A follow-up question tied to the specific limitation the
                  candidate wrote down, rather than a generic interview prompt.
                </StageDescription>
              </div>
            </ProductStage>
          </FeatureSplit>
        </div>
      </section>

      <section className={CHAPTER}>
        <div className="mkt-content">
          <FeatureSplit
            side="left"
            heading="The candidate keeps their own record"
            body="A private Work Receipt captures what they did and lets them control what gets shared."
            href="/trust"
            linkLabel="See the Work Receipt"
          >
            <ProductStage
              title="Work Receipt"
              source={NORTHLINE_SCENARIO.evaluation}
              label="A candidate Work Receipt, showing what it contains and who can read it"
            >
              <div className="grid sm:grid-cols-2">
                <div className="border-b border-[var(--border-subtle)] sm:border-b-0 sm:border-r sm:border-[var(--border-subtle)]">
                  <p className="px-5 pb-1.5 pt-4 text-[12.5px] font-medium text-[var(--text-tertiary)]">
                    What it contains
                  </p>
                  <ul>
                    {NORTHLINE_RECEIPT.includes.map((item) => (
                      <li
                        key={item.label}
                        className="flex items-center justify-between gap-4 px-5 py-2.5"
                      >
                        <span className="text-[13.5px] leading-[1.45] text-[var(--text-secondary)]">
                          {item.label}
                        </span>
                        <span
                          className="shrink-0 text-[12.5px] font-medium"
                          style={{
                            color: item.included
                              ? "var(--fydell-good)"
                              : "var(--text-tertiary)",
                          }}
                        >
                          {item.included ? "Included" : "Not included"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="px-5 pb-1.5 pt-4 text-[12.5px] font-medium text-[var(--text-tertiary)]">
                    Who can read it
                  </p>
                  <ul>
                    {NORTHLINE_RECEIPT.access.map((row) => (
                      <li
                        key={row.party}
                        className="flex items-center justify-between gap-4 px-5 py-2.5"
                      >
                        <span className="text-[13.5px] leading-[1.45] text-[var(--text-secondary)]">
                          {row.party}
                        </span>
                        <span
                          className="shrink-0 text-[12.5px] font-medium"
                          style={{
                            color:
                              row.state === "Full access"
                                ? "var(--fydell-evidence)"
                                : "var(--text-tertiary)",
                          }}
                        >
                          {row.state}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <StageDescription>
                The candidate&rsquo;s own record of the evaluation, and the
                three parties and what each of them can read.
              </StageDescription>
            </ProductStage>
          </FeatureSplit>
        </div>
      </section>

      <ClosingCTA
        title="Run it on one real hire."
        body="Create your workspace, invite a Data Analyst candidate, and read the evidence report. There is one evaluation, built properly."
        note={`Provided materials include ${NORTHLINE_RESOURCES.map((r) => r.name).join(", ")}.`}
        primary={{ href: "/signup", label: "Create your workspace" }}
        secondary={{ href: "/trust", label: "Read how access works" }}
      />
    </>
  );
}
