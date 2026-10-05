import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const PORT = process.env.PORT || "3045";
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = "/opt/cursor/artifacts/frames/v15";
const WIDTHS = [390, 768, 1101, 1200, 1280, 1440];

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
    const items = [...document.querySelectorAll("[data-s='c01'] .c-facts li")];
    return items.map((li) => {
      const span = li.querySelector("span");
      const lr = li.getBoundingClientRect();
      const sr = span?.getBoundingClientRect();
      const overflow =
        sr && (sr.right > lr.right + 0.5 || sr.left < lr.left - 0.5);
      return {
        h: Math.round(lr.height),
        overflow: !!overflow,
        spanRight: sr ? Math.round(sr.right) : null,
        liRight: Math.round(lr.right),
      };
    });
  });
}

async function measureP09(page) {
  return page.evaluate(() => {
    const root = document.querySelector("[data-s='p09'] .sp-course");
    const bar = document.querySelector("[data-s='p09'] .sp-bar");
    if (!root || !bar) return null;
    const rr = root.getBoundingClientRect();
    const br = bar.getBoundingClientRect();
    const children = [...root.children].filter((c) => c.offsetParent !== null);
    const gaps = [];
    for (let i = 0; i < children.length - 1; i++) {
      const a = children[i].getBoundingClientRect();
      const b = children[i + 1].getBoundingClientRect();
      gaps.push(Math.round(b.top - a.bottom));
    }
    return {
      courseH: Math.round(rr.height),
      barW: Math.round(br.width),
      gaps,
    };
  });
}

const browser = await chromium.launch();
const metrics = {};

for (const w of WIDTHS) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  await page.goto(`${BASE}/certificates`, { waitUntil: "networkidle" });
  await dismissCookie(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  const certBuf = await clipSection(page, "[data-s='c01']");
  await mkdir(OUT, { recursive: true });
  await writeFile(path.join(OUT, `c01-${w}.png`), certBuf);
  metrics[`cert-${w}`] = await measureCerts(page);

  await page.goto(`${BASE}/specialists`, { waitUntil: "networkidle" });
  await dismissCookie(page);
  await page.locator("[data-s='p09']").scrollIntoViewIfNeeded();
  const p09Buf = await clipSection(page, "[data-s='p09']");
  await writeFile(path.join(OUT, `p09-${w}.png`), p09Buf);
  metrics[`p09-${w}`] = await measureP09(page);

  if (w <= 1100) {
    await page.locator("[data-s='p02']").scrollIntoViewIfNeeded();
    const p02Buf = await clipSection(page, "[data-s='p02'] .area-panel, [data-s='p02']");
    await writeFile(path.join(OUT, `p02-${w}.png`), p02Buf);
  }

  if (w === 390) {
    await page.goto(`${BASE}/course/lessons`, { waitUntil: "networkidle" });
    await dismissCookie(page);
    await page.evaluate(() => window.scrollTo(0, 400));
    const lessonBuf = await page.screenshot({ type: "png", fullPage: false });
    await writeFile(path.join(OUT, `lesson-390.png`), lessonBuf);
    const sticky = await page.evaluate(() => {
      const el = document.querySelector(".ls-sticky");
      if (!el) return null;
      const st = getComputedStyle(el);
      const aboutP = document.querySelector(".ls-about > p");
      return {
        position: st.position,
        bottom: st.bottom,
        aboutBg: aboutP ? getComputedStyle(aboutP).backgroundColor : null,
      };
    });
    metrics["lesson-390"] = sticky;
  }

  await page.close();
}

await writeFile(path.join(OUT, "metrics.json"), JSON.stringify(metrics, null, 2));
await browser.close();
console.log("Wrote frames to", OUT);
console.log(JSON.stringify(metrics, null, 2));
