import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import "lenis/dist/lenis.css";
import "./globals.css";

const geist = GeistSans;

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Fydell — Know who can do finance work before the interview",
  description:
    "Fydell runs FP&A candidates through a realistic 25-minute work trial and gives hiring teams an evidence memo showing how they model, catch risk, use AI, and communicate judgment.",
  icons: {
    icon: [{ url: "/brand/fydell-chain-mark.png" }]
  }
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} ${inter.variable}`}>
      <body className={geist.className}>{children}</body>
    </html>
  );
}
