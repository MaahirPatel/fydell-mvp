import type { Metadata } from "next";
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
    "Fydell shows hiring teams how a candidate works. Candidates complete a realistic evaluation and your team reviews the conclusion alongside the evidence behind it.",
  icons: {
    icon: [{ url: "/brand/fydell-chain-mark.png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className={GeistSans.className}>
        <StorageMigration />
        {children}
      </body>
    </html>
  );
}
