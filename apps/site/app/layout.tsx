import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { CookieBar } from "@/components/CookieBar";
import { SiteOverlays } from "@/components/SiteOverlays";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500"],
  variable: "--font",
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
