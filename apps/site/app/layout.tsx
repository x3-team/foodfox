import type { Metadata } from "next";
import localFont from "next/font/local";
import { ContentProvider } from "@/components/ContentProvider";
import { CookieBar } from "@/components/CookieBar";
import { getContentOverrides } from "@/lib/cms/server";
import { BLOG_ARTICLES_KEY, type BlogArticle } from "@/lib/cms/blog";
import { PRICE_LABS_KEY } from "@/lib/cms/registry";
import type { Review } from "@/lib/site-data/reviews";
import { SiteOnly } from "@/components/SiteOnly";
import { SiteOverlays } from "@/components/SiteOverlays";
import "./globals.css";
import "./adaptive/shared.css";
import "./adaptive/system.css";

// Manrope v4.504 (same build Google Fonts serves; latin + cyrillic incl. ext), served from the repo:
// fetching Google Fonts at build time made VPS deploys flaky.
const manrope = localFont({
  src: "./fonts/Manrope-var.woff2",
  weight: "300 500",
  style: "normal",
  variable: "--font",
  display: "swap",
});

/* Saving in the admin re-renders the pages at once (revalidatePath). That mark lives in the server's memory, so a
   restart before anyone opened the page would bring back the HTML of the build; the minute below re-renders such a
   page on its own. */
export const revalidate = 60;

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

/* What may reach the browser. Drafts, hidden reviews (with the lead they came from), the partner fee and prices that
   are switched off stay on the server: they would otherwise be readable in the page source. */
function publicContent(saved: Record<string, unknown>): Record<string, unknown> {
  const content = { ...saved };
  const articles = saved[BLOG_ARTICLES_KEY] as BlogArticle[] | undefined;
  if (articles) content[BLOG_ARTICLES_KEY] = articles.filter((a) => !a.draft).map(({ blocks: _blocks, ...rest }) => rest);
  const reviews = saved["reviews.list"] as Review[] | undefined;
  if (reviews) content["reviews.list"] = reviews.filter((r) => !r.hidden).map(({ leadId: _leadId, ...rest }) => rest);
  delete content["prices.partnerFee"];
  if (saved["prices.show"] !== true) {
    delete content["prices.from"];
    delete content[PRICE_LABS_KEY];
  }
  return content;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Texts edited in /admin; empty when there is no database, then the site shows the defaults from the code.
  const saved = await getContentOverrides();
  // Every page carries the overrides to the browser: drafts stay on the server, and article bodies travel only with
  // their own page (ArticleView gets the article as a prop), so the payload stays small.
  const content = publicContent(saved);
  return (
    // data-scroll-behavior: Next keeps the page-level smooth scrolling (globals.css) for anchors but jumps instantly
    // on route changes instead of animating the old page up.
    <html lang="ru" data-scroll-behavior="smooth">
      <body className={manrope.variable} style={{ fontFamily: "var(--font), Manrope, sans-serif" }}>
        <a className="skip-link" href="#content">К содержанию</a>
        <ContentProvider values={content}>
          <div id="content">{children}</div>
          <script dangerouslySetInnerHTML={{ __html: REVEAL_BOOT }} />
          <SiteOnly>
            <CookieBar />
            <SiteOverlays />
          </SiteOnly>
        </ContentProvider>
      </body>
    </html>
  );
}
