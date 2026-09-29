import Link from "next/link";
import MarketingShell from "@/components/layout/MarketingShell";
import ProductStage from "@/components/marketing/home/ProductStage";

export const metadata = {
  title: "Demo",
  description:
    "Walk through an example Engineering Passport, a Python / FastAPI simulation, and the evidence report an employer reviews. Example data only.",
  alternates: { canonical: "/demo" },
};

export default function DemoPage() {
  return (
    <MarketingShell>
      <div className="mx-auto w-full max-w-[1240px] px-5 pb-16 pt-[104px] sm:px-8 sm:pt-[112px] lg:px-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-app-body font-medium text-[var(--text-secondary)]">Product demo · example data</p>
            <h1 className="mt-2 text-[clamp(2rem,3.6vw,2.75rem)] font-[600] leading-[1.08] tracking-[-0.025em]">
              From a repository to a hiring decision.
            </h1>
            <p className="mt-3 max-w-[60ch] text-[var(--step-0)] leading-[1.6] text-[var(--text-secondary)]">
              Follow one fictional candidate through four steps. Nothing here is a real scan or a real
              assessment, and nothing you do is saved.
            </p>
          </div>
          <Link
            href="/get-started"
            className="inline-flex h-11 items-center rounded-full bg-[var(--control-solid)] px-5 text-app-body font-medium text-[var(--control-solid-ink)] hover:bg-[var(--control-solid-hover)]"
          >
            Get started
          </Link>
        </div>
        <div className="mt-8">
          <ProductStage />
        </div>
      </div>
    </MarketingShell>
  );
}
