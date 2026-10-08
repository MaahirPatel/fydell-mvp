import type { Metadata } from "next";
import SandboxLibrary from "@/components/sandbox/demo/SandboxLibrary";

export const metadata: Metadata = {
  title: "Try a simulation",
  description:
    "Try a Fydell engineering simulation without an account: read the brief, work in a full workspace with real test runs in your browser and simulated teammates, then see your report.",
};

export default function SandboxPage() {
  return <SandboxLibrary />;
}
