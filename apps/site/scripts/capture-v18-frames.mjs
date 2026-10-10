import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const PORT = process.env.PORT || "3130";
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = "/opt/cursor/artifacts/frames/v18";

async function dismissCookie(page) {
  try {
    await page.getByRole("button", { name: "Принят все" }).click({ timeout: 500 });
  } catch {
    try {
      await page.getByRole("button", { name: "Принять все" }).click({ timeout: 2500 });
    } catch {
      /* ok */
    }
  }
}

async function openMenu(page) {
  await dismissCookie(page);
  await page.getByRole("button", { name: "Меню" }).click();
  await page.waitForSelector("#mobile-menu", { state: "visible" });
  await page.waitForTimeout(400);
}

async function measureButtons(page) {
  return page.evaluate(() => {
    const btns = [...document.querySelectorAll(".mobile-menu .btn-light, .mobile-menu button.btn-light")];
    return btns.map((b) => Math.round(b.getBoundingClientRect().height));
  });
}

const browser = await chromium.launch();
await mkdir(OUT, { recursive: true });
const metrics = {};

for (const spec of [
  { w: 375, h: 667, tag: "375-top", scroll: 0 },
  { w: 375, h: 667, tag: "375-scrolled", scroll: 9999 },
  { w: 390, h: 844, tag: "390-top", scroll: 0 },
]) {
  const page = await browser.newPage({ viewport: { width: spec.w, height: spec.h } });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await openMenu(page);
  if (spec.scroll) {
    await page.locator(".mobile-menu").evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(200);
  }
  await writeFile(path.join(OUT, `menu-${spec.tag}.png`), await page.screenshot({ type: "png" }));
  metrics[spec.tag] = await measureButtons(page);
  await page.close();
}

await writeFile(path.join(OUT, "metrics.json"), JSON.stringify(metrics, null, 2));
await browser.close();
console.log(JSON.stringify(metrics, null, 2));
