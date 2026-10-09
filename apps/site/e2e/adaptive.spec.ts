import { expect, test } from "@playwright/test";

// Ширины из ТЗ и границы брейкпоинтов (телефон ≤767 · планшет 768–1100 · десктоп ≥1101).
const WIDTHS = [360, 390, 767, 768, 900, 1024, 1100, 1101, 1280, 1440];
const PAGES = [
  "/",
  "/specialists",
  "/report",
  "/course",
  "/course/lessons",
  "/labs",
  "/blog",
  "/blog/skrytaya-neperenosimost-laktozy-i-glyutena",
  "/blog/authors",
  "/blog/authors/kseniya-ellinskaya",
  "/faq",
  "/certificates",
  "/reviews",
  "/contacts",
  "/privacy",
  "/no-such-page-404",
];

// Горизонтальные ленты, которые прокручиваются внутри себя, — не переполнение страницы.
const SCROLLERS = "[data-allow-x], .chips, .marquee, .cert-row, .review-row, .table-wrap, .leaflet-container, .product-list";

test.describe("no horizontal scroll at any breakpoint", () => {
  // Ширины перебираются внутри теста, второй проект ничего нового не даст.

  for (const path of PAGES) {
    test(`${path}`, async ({ browser, baseURL }) => {
      test.skip(test.info().project.name !== "1440", "runs once, in the 1440 project");
      test.setTimeout(120_000);
      const problems: string[] = [];
      for (const width of WIDTHS) {
        const phone = width < 768;
        const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: phone, isMobile: phone, baseURL });
        await context.addInitScript(() => localStorage.setItem("fox-cookie", JSON.stringify({ necessary: true, analytics: false, ads: false })));
        const page = await context.newPage();
        await page.goto(path);
        await page.waitForLoadState("load");
        await page.waitForTimeout(300);
        const found = await page.evaluate((scrollers) => {
          const vw = document.documentElement.clientWidth;
          const out: string[] = [];
          if (document.documentElement.scrollWidth > vw + 1) out.push(`scrollWidth ${document.documentElement.scrollWidth} > ${vw}`);
          for (const el of document.querySelectorAll("body *")) {
            if ((el as HTMLElement).closest(scrollers)) continue;
            const style = getComputedStyle(el);
            if (style.position === "fixed" || style.visibility === "hidden" || style.display === "none") continue;
            const rect = el.getBoundingClientRect();
            if (rect.width < 8 || rect.height < 8) continue;
            // элементы, обрезанные предком с overflow (карусели, маски), пользователь не видит
            let clipped = false;
            for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
              const o = getComputedStyle(p).overflowX;
              if (o === "hidden" || o === "clip" || o === "auto" || o === "scroll") { clipped = true; break; }
            }
            if (clipped) continue;
            if (rect.right > vw + 2 || rect.left < -2) {
              out.push(`${el.tagName.toLowerCase()}.${String((el as HTMLElement).className).slice(0, 40)} [${Math.round(rect.left)}..${Math.round(rect.right)}]`);
              if (out.length > 4) break;
            }
          }
          return out;
        }, SCROLLERS);
        if (found.length) problems.push(`@${width}: ${found.join(" | ")}`);
        await context.close();
      }
      expect(problems, path).toEqual([]);
    });
  }
});
