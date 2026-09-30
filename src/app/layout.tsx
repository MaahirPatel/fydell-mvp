import type { Metadata } from "next";
import Script from "next/script";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import StorageMigration from "@/components/layout/StorageMigration";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Fydell",
    template: "%s | Fydell",
  },
  description:
    "The Proof of Work Network for software engineers. Developers turn real projects into an Engineering Passport; hiring teams review it alongside realistic coding simulations.",
  applicationName: "Fydell",
  openGraph: {
    siteName: "Fydell",
    type: "website",
    title: "Fydell: A new way to hire. A better way to get hired.",
    description:
      "Engineering Passports built from GitHub projects and realistic coding simulations, for software and AI/ML engineers and the teams hiring them.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className={GeistSans.className}>
        <Script
          id="vtag-ai-js"
          src="https://r2.leadsy.ai/tag.js"
          strategy="afterInteractive"
          data-pid="jjlY3ahiXndJV4RY"
          data-version="062024"
        />
        <StorageMigration />
        {children}
      </body>
    </html>
  );
}
