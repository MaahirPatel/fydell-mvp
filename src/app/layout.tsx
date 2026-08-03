import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import StorageMigration from "@/components/layout/StorageMigration";
import "./globals.css";

const geist = GeistSans;

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fydell",
  description:
    "Fydell evaluates Applied Technical Roles through realistic work simulations. Candidates solve a real problem in five minutes and receive an evidence-backed result.",
  icons: {
    icon: [{ url: "/brand/fydell-chain-mark.png" }]
  }
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} ${inter.variable}`}>
      <body className={geist.className}>
        <StorageMigration />
        {children}
      </body>
    </html>
  );
}
