import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";

// Display/UI face — names, buttons, labels, nav. See "Koino Field Notes" for the
// rationale (a warm sans with real character, replacing the default Geist Sans).
const fontDisplay = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
});

// Reading face — post bodies, bios, verses. Applied selectively via `font-serif`,
// not globally: the split is what makes long-form content feel literary without
// slowing down the UI chrome around it.
const fontRead = Newsreader({
  variable: "--font-read",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Koino",
  description: "A trust-gated Christian community app",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fontDisplay.variable} ${fontRead.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
