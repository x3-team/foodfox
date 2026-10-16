import { chromium } from "playwright";
import { mkdir, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const PORT = process.env.PORT || "3140";
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = "/opt/cursor/artifacts/frames/v19";
const figmaSrc = "/workspace/foodfox-audit/v4/figma/home-390.png";

async function capture() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const metrics = {};

  for (const { width, height, tag } of [
    { width: 390, height: 844, tag: "390" },
    { width: 375, height: 667, tag: "375" },
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.addInitScript(() => localStorage.setItem("fox-cookie", JSON.stringify({ necessary: true, analytics: false })));
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await writeFile(path.join(OUT, `live-hero-${tag}.png`), await page.screenshot({ type: "png" }));
    metrics[tag] = await page.evaluate(() => {
      const h1 = document.querySelector("[data-s='s01'] h1");
      const img = document.querySelector("[data-s='s01'] .hero-media img");
      const btn = document.querySelector("[data-s='s01'] .hero-actions .btn-light");
      const link = document.querySelector("[data-s='s01'] .hero-report-link");
      const cap = document.querySelector(".menu-capsule-label");
      const r = (el) => (el ? Math.round(el.getBoundingClientRect().height) : null);
      const overlap = (a, b) => {
        if (!a || !b) return null;
        const A = a.getBoundingClientRect();
        const B = b.getBoundingClientRect();
        return !(A.bottom < B.top || A.top > B.bottom || A.right < B.left || A.left > B.right);
      };
      return {
        menuCapsule: cap?.textContent?.trim() ?? null,
        btnH: r(btn),
        linkDisplay: link ? getComputedStyle(link).display : null,
        h1OverFace: overlap(h1, img),
        headerHome: document.querySelector(".site-header")?.classList.contains("is-home-top") ?? false,
      };
    });
    await page.close();
  }

  await browser.close();
  await writeFile(path.join(OUT, "metrics.json"), JSON.stringify(metrics, null, 2) + "\n");
  console.log(JSON.stringify(metrics, null, 2));

  try {
    await copyFile(figmaSrc, path.join(OUT, "figma-home-390.png"));
    for (const tag of ["390", "375"]) {
      const out = path.join(OUT, `compare-hero-${tag}.png`);
      const r = spawnSync(
        "magick",
        [path.join(OUT, "figma-home-390.png"), path.join(OUT, `live-hero-${tag}.png`), "+append", out],
        { encoding: "utf8" },
      );
      if (r.status !== 0) {
        spawnSync("convert", [path.join(OUT, "figma-home-390.png"), path.join(OUT, `live-hero-${tag}.png`), "+append", out]);
      }
    }
  } catch (err) {
    console.warn("Compare stitch:", err.message);
  }
}

capture();
