import { chromium } from "playwright";
import { mkdir, writeFile, copyFile, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const PORT = process.env.PORT || "3140";
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = "/opt/cursor/artifacts/frames/v19";
const FIGMA_CANDIDATES = [
  "/workspace/foodfox-audit/eyes/v19/figma-390-top.png",
  "/opt/cursor/artifacts/frames/v19/figma-home-390.png",
];

async function stitch(figma, live, out) {
  for (const cmd of [
    ["magick", [figma, live, "+append", out]],
    ["convert", [figma, live, "+append", out]],
  ]) {
    const r = spawnSync(cmd[0], cmd[1], { encoding: "utf8" });
    if (r.status === 0) return true;
  }
  return false;
}

async function metrics(page) {
  return page.evaluate(() => {
    const h1 = document.querySelector("[data-s='s01'] h1");
    const img = document.querySelector("[data-s='s01'] .hero-media img");
    const hero = document.querySelector("[data-s='s01']");
    const lab = document.querySelector(".lab-marquee");
    const overlapFace = () => {
      if (!h1 || !img) return null;
      const H = h1.getBoundingClientRect();
      const I = img.getBoundingClientRect();
      const probeY = I.top + I.height * 0.32;
      return H.top < probeY;
    };
    return {
      heroH: hero ? Math.round(hero.getBoundingClientRect().height) : null,
      viewportH: window.innerHeight,
      h1Top: h1 ? Math.round(h1.getBoundingClientRect().top) : null,
      textOnFace: overlapFace(),
      labTop: lab ? Math.round(lab.getBoundingClientRect().top) : null,
      labBelowFold: lab ? lab.getBoundingClientRect().top >= window.innerHeight - 1 : null,
      headerOverlay: document.querySelector(".site-header")?.classList.contains("is-home-overlay") ?? false,
    };
  });
}

async function shot(page, tag) {
  const file = path.join(OUT, `${tag}.png`);
  await writeFile(file, await page.screenshot({ type: "png" }));
  return file;
}

async function main() {
  await mkdir(OUT, { recursive: true });
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
      } else {
        await page.addInitScript(() => localStorage.removeItem("fox-cookie"));
        await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
        await page.waitForTimeout(4300);
      }
      if (cookie === "nocookie") await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
      await page.waitForTimeout(400);
      await shot(page, `live-hero-${tag}-${cookie}`);
      if (cookie === "nocookie") report[tag] = await metrics(page);
      await page.close();
    }
  }

  await browser.close();
  await writeFile(path.join(OUT, "metrics-overlay.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));

  let figma = null;
  for (const candidate of FIGMA_CANDIDATES) {
    try {
      await readFile(candidate);
      figma = candidate;
      await copyFile(figma, path.join(OUT, "figma-390-top.png"));
      break;
    } catch {
      /* try next */
    }
  }
  if (figma) {
    for (const tag of ["390", "375"]) {
      await stitch(figma, path.join(OUT, `live-hero-${tag}-nocookie.png`), path.join(OUT, `compare-hero-${tag}.png`));
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
