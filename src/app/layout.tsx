import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { GeistSans } from "geist/font/sans";
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
    "Fydell places Forward Deployed Engineers into real missions through Project Relay — a 50-minute simulated deployment session — and turns the recorded work into a portable, candidate-owned evidence receipt.",
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
