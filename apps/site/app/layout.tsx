import type { Metadata } from "next";
import localFont from "next/font/local";
import { CookieBar } from "@/components/CookieBar";
import { SiteOverlays } from "@/components/SiteOverlays";
import "./globals.css";

// Manrope v4.504 (same build Google Fonts serves; latin + cyrillic incl. ext), served from the repo:
// fetching Google Fonts at build time made VPS deploys flaky.
const manrope = localFont({
  src: "./fonts/Manrope-var.woff2",
  weight: "300 500",
  style: "normal",
  variable: "--font",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Блог о пищевой непереносимости — FOX Food Xplorer",
    template: "%s — FOX Food Xplorer",
  },
  description:
    "Статьи врачей и нутрициологов: как понять свои симптомы, что показывает тест FOX и что делать с результатом.",
  // Demo on foodfox.yuri.guru: public, but kept out of search engines.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={manrope.variable} style={{ fontFamily: "var(--font), Manrope, sans-serif" }}>
        <a className="skip-link" href="#content">К содержанию</a>
        <div id="content">{children}</div>
        <CookieBar />
        <SiteOverlays />
      </body>
    </html>
  );
}
