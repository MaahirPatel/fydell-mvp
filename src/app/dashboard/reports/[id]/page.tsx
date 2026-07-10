"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { ReportDetail } from "@/components/dashboard/ReportDetail";
import { DEMO_REPORTS } from "@/lib/dashboard-demo";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ReportPage({ params }: PageProps) {
  const { id } = use(params);

  const report =
    DEMO_REPORTS.find((r) => r.candidateId === id || r.id === id) ?? null;

  if (!report) {
    notFound();
  }

  return <ReportDetail report={report} />;
}
