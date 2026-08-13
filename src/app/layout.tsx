import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import StorageMigration from "@/components/layout/StorageMigration";
import "./globals.css";

const geist = GeistSans;

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
    <html lang="en" className={geist.variable}>
      <body className={geist.className}>
        <StorageMigration />
        {children}
      </body>
    </html>
  );
}
