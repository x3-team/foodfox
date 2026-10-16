import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const PORT = process.env.PORT || "3055";
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = "/opt/cursor/artifacts/frames/v16";
const WIDTHS = [375, 390, 768, 1100, 1101, 1280, 1440];

async function dismissCookie(page) {
  const btn = page.getByRole("button", { name: "Принять все" });
  try {
    await btn.waitFor({ state: "visible", timeout: 2500 });
    await btn.click();
  } catch {
    /* ok */
  }
}

async function clipSection(page, selector) {
  const el = page.locator(selector).first();
  await el.waitFor({ state: "attached", timeout: 20_000 });
  await el.scrollIntoViewIfNeeded();
  await el.waitFor({ state: "visible", timeout: 10_000 });
  return el.screenshot({ type: "png" });
}

async function measureCerts(page) {
  return page.evaluate(() => {
    const list = document.querySelector("[data-s='c01'] .c-facts");
    const cols = list ? getComputedStyle(list).gridTemplateColumns.split(" ").length : 0;
    const items = [...document.querySelectorAll("[data-s='c01'] .c-facts li")];
    return {
      cols,
      gap: list ? Math.round(parseFloat(getComputedStyle(list).gap) || 0) : null,
      items: items.map((li) => {
        const b = li.querySelector("b");
        const span = li.querySelector("span");
        const lr = li.getBoundingClientRect();
        const sr = span?.getBoundingClientRect();
        const overflow =
          sr && (sr.right > lr.right + 0.5 || sr.left < lr.left - 0.5);
        return {
          titlePx: b ? Math.round(parseFloat(getComputedStyle(b).fontSize)) : null,
          h: Math.round(lr.height),
          overflow: !!overflow,
          ellipsis: span ? span.scrollWidth > span.clientWidth + 1 : false,
        };
      }),
    };
  });
}

async function measureLessonLayers(page) {
  return page.evaluate(() => {
    const m04 = document.querySelector(".m04");
    const sticky = document.querySelector(".ls-sticky");
    const menu = document.querySelector(".mobile-menu");
    const rect = (el) => (el ? el.getBoundingClientRect() : null);
    const vis = (el) => el && getComputedStyle(el).display !== "none" && rect(el).height > 0;
    const rM = rect(m04);
    const rS = rect(sticky);
    return {
      m04Visible: vis(m04),
      m04Bottom: rM ? Math.round(rM.bottom) : null,
      stickyTop: rS ? Math.round(rS.top) : null,
      stickyDisplay: sticky ? getComputedStyle(sticky).display : null,
      menuVisible: vis(menu),
    };
  });
}

const browser = await chromium.launch();
const metrics = {};

await mkdir(OUT, { recursive: true });

for (const w of WIDTHS) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  await page.goto(`${BASE}/certificates`, { waitUntil: "networkidle" });
  await dismissCookie(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await writeFile(path.join(OUT, `c01-${w}.png`), await clipSection(page, "[data-s='c01']"));
  metrics[`cert-${w}`] = await measureCerts(page);

  if (w <= 1100) {
    await page.goto(`${BASE}/specialists`, { waitUntil: "networkidle" });
    await dismissCookie(page);
    await page.locator("[data-s='p09']").scrollIntoViewIfNeeded();
    await writeFile(path.join(OUT, `p09-${w}.png`), await clipSection(page, "[data-s='p09']"));
  }

  await page.close();
}

for (const spec of [
  { w: 375, h: 667, tag: "375-scroll" },
  { w: 375, h: 667, tag: "375-menu", menu: true },
  { w: 390, h: 844, tag: "390-scroll" },
]) {
  const page = await browser.newPage({ viewport: { width: spec.w, height: spec.h } });
  await page.goto(`${BASE}/course/lessons`, { waitUntil: "networkidle" });
  await dismissCookie(page);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  if (spec.menu) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator(".burger").evaluate((el) => el.click());
    await page.waitForSelector("#mobile-menu", { state: "visible" });
    await page.waitForTimeout(200);
  }
  await writeFile(path.join(OUT, `lesson-${spec.tag}.png`), await page.screenshot({ type: "png" }));
  metrics[`lesson-${spec.tag}`] = await measureLessonLayers(page);
  await page.close();
}

await writeFile(path.join(OUT, "metrics.json"), JSON.stringify(metrics, null, 2));
await browser.close();
console.log("Wrote frames to", OUT);
console.log(JSON.stringify(metrics, null, 2));
