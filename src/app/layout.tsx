import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

const geist = GeistSans;

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Fydell - Hire with Conviction",
  description:
    "Immersive simulations reveal how people think, decide, and perform so teams can hire based on real work.",
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
