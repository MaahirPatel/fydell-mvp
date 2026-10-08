"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton";

/** The form restores itself from sessionStorage, so it renders on the client only. */
const CreatorForm = dynamic(() => import("./CreatorForm"), {
  ssr: false,
  loading: () => (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Skeleton className="h-[640px] w-full" />
      <Skeleton className="h-[320px] w-full" />
    </div>
  ),
});

export default CreatorForm;
