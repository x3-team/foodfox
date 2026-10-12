import type { Metadata } from "next";
import localFont from "next/font/local";
import { CookieBar } from "@/components/CookieBar";
import { SiteOverlays } from "@/components/SiteOverlays";
import "./globals.css";
import "./adaptive/shared.css";

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

// Section entrance, first screen: runs as soon as the page markup is parsed, before the first paint, and marks the
// sections already on screen `is-in` so their entrance starts with the first frame. Before, they stayed hidden
// (opacity 0) until React hydrated and SiteOverlays added the class — 0.5–2 s of an empty page on a slow phone,
// and blocks with their own load animation (.rise) played it, vanished and rose a second time.
// The rest of the page is revealed on scroll by the observer in SiteOverlays.
const REVEAL_BOOT = `(function(){try{var r=matchMedia("(prefers-reduced-motion: reduce)").matches,l=innerHeight*0.92;document.querySelectorAll("[data-s]").forEach(function(n){if(r||n.getBoundingClientRect().top<l)n.classList.add("is-in")})}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-scroll-behavior: Next keeps the page-level smooth scrolling (globals.css) for anchors but jumps instantly
    // on route changes instead of animating the old page up.
    <html lang="ru" data-scroll-behavior="smooth">
      <body className={manrope.variable} style={{ fontFamily: "var(--font), Manrope, sans-serif" }}>
        <a className="skip-link" href="#content">К содержанию</a>
        <div id="content">{children}</div>
        <script dangerouslySetInnerHTML={{ __html: REVEAL_BOOT }} />
        <CookieBar />
        <SiteOverlays />
      </body>
    </html>
  );
}
