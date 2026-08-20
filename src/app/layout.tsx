import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import StorageMigration from "@/components/layout/StorageMigration";
import "./globals.css";

/**
 * Inter carries the whole platform. It is loaded as a variable font so the
 * display sizes can sit at an optical weight between the static cuts, which is
 * what keeps large headings from reading as heavy.
 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

/** Data, identifiers, cited rows, and anything the reader may need to compare
 *  character by character. Never used for prose or navigation. */
const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains",
});

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
    <html lang="en" className={`${inter.variable} ${jetBrainsMono.variable}`}>
      <body className={inter.className}>
        <StorageMigration />
        {children}
      </body>
    </html>
  );
}
