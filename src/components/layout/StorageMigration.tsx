"use client";

import { useEffect } from "react";
import { runStorageMigration } from "@/lib/storage-migration";

/** Runs the one-time browser storage cleanup. Renders nothing. */
export default function StorageMigration() {
  useEffect(() => {
    runStorageMigration();
  }, []);

  return null;
}
