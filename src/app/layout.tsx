import type { Metadata } from "next";
import Script from "next/script";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import NavigationProgress from "@/components/layout/NavigationProgress";
import StorageMigration from "@/components/layout/StorageMigration";
import { SITE_URL } from "@/lib/seo/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Fydell",
    template: "%s | Fydell",
  },
  description:
    "Hire software engineers on real engineering work. Candidates work a real incident in the Fydell desktop app; your team reviews cited evidence and decides.",
  applicationName: "Fydell",
  openGraph: {
    siteName: "Fydell",
    type: "website",
    title: "Fydell: Hire engineers on the work itself",
    description:
      "Real codebases, a simulated team, a requirement that changes mid-task, hidden tests, and a report your team writes with every finding cited.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistMono.variable} ${GeistSans.variable}`}>
      <body className={GeistSans.className}>
        <Script
          id="vtag-ai-js"
          src="https://r2.leadsy.ai/tag.js"
          strategy="afterInteractive"
          data-pid="jjlY3ahiXndJV4RY"
          data-version="062024"
        />
        <StorageMigration />
        <NavigationProgress />
        {children}
      </body>
    </html>
  );
}
