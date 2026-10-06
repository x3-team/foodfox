import { chromium } from "playwright";
import { mkdir, writeFile, copyFile, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const PORT = process.env.PORT || "3140";
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = "/opt/cursor/artifacts/frames/v19";
const FIGMA = "/workspace/apps/site/public/figma/home/references/figma-home-top1000.png";

async function stitch(figma, live, out) {
  for (const args of [
    ["magick", [figma, live, "+append", out]],
    ["convert", [figma, live, "+append", out]],
  ]) {
    const r = spawnSync(args[0], args[1], { encoding: "utf8" });
    if (r.status === 0) return true;
  }
  return false;
}

async function metrics(page) {
  return page.evaluate(() => {
    const photo = document.querySelector("[data-s='s01'] .hero-media img");
    const h1 = document.querySelector("[data-s='s01'] h1");
    const header = document.querySelector(".site-header");
    if (!photo || !h1 || !header) return null;
    const p = photo.getBoundingClientRect();
    const h = h1.getBoundingClientRect();
    const head = header.getBoundingClientRect();
    return {
      headerHome: header.classList.contains("is-home-top"),
      photoTop: Math.round(p.top),
      photoH: Math.round(p.height),
      h1Top: Math.round(h.top),
      gapPhotoH1: Math.round(h.top - p.bottom),
      textBelowPhoto: h.top >= p.bottom + 18,
    };
  });
}

async function shot(page, name) {
  await writeFile(path.join(OUT, `${name}.png`), await page.screenshot({ type: "png" }));
}

async function main() {
  await mkdir(OUT, { recursive: true });
  try {
    await readFile(FIGMA);
    await copyFile(FIGMA, path.join(OUT, "figma-home-top1000.png"));
  } catch {
    /* optional */
  }

  const browser = await chromium.launch();
  const report = {};

  for (const { width, height, tag } of [
    { width: 390, height: 844, tag: "390" },
    { width: 375, height: 667, tag: "375" },
    { width: 430, height: 932, tag: "430" },
    { width: 768, height: 1024, tag: "768" },
  ]) {
    for (const cookie of ["nocookie", "cookie"]) {
      const page = await browser.newPage({ viewport: { width, height } });
      if (cookie === "nocookie") {
        await page.addInitScript(() => localStorage.setItem("fox-cookie", JSON.stringify({ necessary: true, analytics: false })));
        await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
      } else {
        await page.addInitScript(() => localStorage.removeItem("fox-cookie"));
        await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
        await page.waitForTimeout(4300);
      }
      await page.waitForTimeout(400);
      await shot(page, `live-hero-${tag}-${cookie}`);
      if (cookie === "nocookie") report[tag] = await metrics(page);
      await page.close();
    }
  }

  await browser.close();
  await writeFile(path.join(OUT, "metrics-stack.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));

  for (const tag of ["390", "375"]) {
    const live = path.join(OUT, `live-hero-${tag}-nocookie.png`);
    const out = path.join(OUT, `compare-hero-${tag}.png`);
    try {
      await readFile(FIGMA);
      await readFile(live);
      await stitch(FIGMA, live, out);
    } catch {
      /* skip */
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
