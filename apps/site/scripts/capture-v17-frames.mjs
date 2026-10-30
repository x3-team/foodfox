import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const PORT = process.env.PORT || "3120";
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = "/opt/cursor/artifacts/frames/v17";

async function dismissCookie(page) {
  const btn = page.getByRole("button", { name: "Принять все" });
  try {
    await btn.waitFor({ state: "visible", timeout: 2500 });
    await btn.click();
  } catch {
    /* ok */
  }
}

async function openMenuAfterScroll(page) {
  await dismissCookie(page);
  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.waitForTimeout(250);
  await page.evaluate(() => window.scrollTo(0, 700));
  await page.waitForTimeout(250);
  await page.locator(".burger").evaluate((el) => el.click());
  await page.waitForSelector("#mobile-menu", { state: "visible", timeout: 15_000 });
  await page.waitForTimeout(400);
}

async function measureMenu(page) {
  return page.evaluate(() => {
    const menu = document.querySelector(".mobile-menu");
    const header = document.querySelector(".site-header");
    if (!menu || !header) return null;
    const mr = menu.getBoundingClientRect();
    const last = menu.querySelector("button.btn-light:last-of-type, a.btn-light:last-of-type");
    return {
      vh: window.innerHeight,
      menuH: Math.round(mr.height),
      menuTop: Math.round(mr.top),
      headerScrolled: header.classList.contains("is-scrolled"),
      headerFilter: getComputedStyle(header).backdropFilter,
      ctaBottom: last ? Math.round(last.getBoundingClientRect().bottom) : null,
      sticky: document.querySelector(".ls-sticky")
        ? getComputedStyle(document.querySelector(".ls-sticky")).display
        : null,
    };
  });
}

const browser = await chromium.launch();
await mkdir(OUT, { recursive: true });
const metrics = {};

const menuChecks = [
  { path: "/specialists", w: 375, tag: "specialists-375" },
  { path: "/course/lessons", w: 375, tag: "lessons-375" },
  { path: "/specialists", w: 390, tag: "specialists-390" },
  { path: "/course/lessons", w: 768, tag: "lessons-768" },
  { path: "/specialists", w: 1100, tag: "specialists-1100" },
];

for (const check of menuChecks) {
  const page = await browser.newPage({ viewport: { width: check.w, height: 900 } });
  await page.goto(`${BASE}${check.path}`, { waitUntil: "networkidle" });
  await openMenuAfterScroll(page);
  const name = `menu-after-scroll-${check.tag}.png`;
  await writeFile(path.join(OUT, name), await page.screenshot({ type: "png" }));
  metrics[check.tag] = await measureMenu(page);
  await page.close();
}

for (const w of [360, 375, 390]) {
  const page = await browser.newPage({ viewport: { width: w, height: 800 } });
  await page.goto(`${BASE}/certificates`, { waitUntil: "networkidle" });
  await dismissCookie(page);
  await page.locator("[data-s='c01']").scrollIntoViewIfNeeded();
  await writeFile(path.join(OUT, `c01-${w}.png`), await page.locator("[data-s='c01']").screenshot({ type: "png" }));
  metrics[`cert-${w}`] = await page.evaluate(() => {
    const span = document.querySelector("[data-s='c01'] .c-facts li:nth-child(2) span");
    return {
      title: getComputedStyle(document.querySelector("[data-s='c01'] .c-facts b")).fontSize,
      ellipsis: span ? span.scrollWidth > span.clientWidth + 1 : null,
    };
  });
  await page.close();
}

{
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  await page.goto(`${BASE}/specialists`, { waitUntil: "networkidle" });
  await dismissCookie(page);
  await page.locator("[data-s='p09']").scrollIntoViewIfNeeded();
  await writeFile(path.join(OUT, "p09-390.png"), await page.locator("[data-s='p09']").screenshot({ type: "png" }));
  metrics["p09-390"] = await page.evaluate(() => {
    const bar = document.querySelector("[data-s='p09'] .sp-bar");
    return bar ? Math.round(bar.getBoundingClientRect().width) : null;
  });
  await page.close();
}

await writeFile(path.join(OUT, "metrics.json"), JSON.stringify(metrics, null, 2));
await browser.close();
console.log(JSON.stringify(metrics, null, 2));
