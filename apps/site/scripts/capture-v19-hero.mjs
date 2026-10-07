import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const PORT = process.env.PORT || "3140";
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = "/opt/cursor/artifacts/frames/v19d";
const FIGMA_HERO_2X = "/workspace/apps/site/public/figma/home/references/hero-export@2x.png";
const FIGMA_HERO_1X = path.join(OUT, "figma-hero-390x854.png");

function pil(args) {
  const script = `
from PIL import Image
import sys
cmd = sys.argv[1]
if cmd == "resize":
    im = Image.open(sys.argv[2]).convert("RGB")
    im = im.resize((390, 854), Image.Resampling.LANCZOS)
    im.save(sys.argv[3])
elif cmd == "fit390":
    im = Image.open(sys.argv[2]).convert("RGB")
    w, h = im.size
    if w != 390:
        nh = max(1, round(h * (390 / w)))
        im = im.resize((390, nh), Image.Resampling.LANCZOS)
    im.save(sys.argv[3])
elif cmd == "stitch":
    a, b, out = sys.argv[2:5]
    ia, ib = Image.open(a).convert("RGB"), Image.open(b).convert("RGB")
    h = max(ia.height, ib.height)
    def pad(im):
        if im.height == h: return im
        c = Image.new("RGB", (im.width, h), (0,0,0))
        c.paste(im, (0,0))
        return c
    ia, ib = pad(ia), pad(ib)
    w = ia.width + ib.width
    out_im = Image.new("RGB", (w, h))
    out_im.paste(ia, (0,0))
    out_im.paste(ib, (ia.width, 0))
    out_im.save(out)
`;
  const r = spawnSync("python3", ["-c", script, ...args], { encoding: "utf8" });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    throw new Error(`pil ${args[0]} failed`);
  }
}

async function cropLiveHero(page, outPath) {
  const box = await page.evaluate(() => {
    const el = document.querySelector("[data-s='s01'].home-hero");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  if (!box) throw new Error("hero section not found");
  await page.screenshot({
    path: outPath,
    clip: { x: box.x, y: box.y, width: Math.min(box.width, 390), height: Math.min(box.height, 854) },
  });
}

async function metrics(page) {
  return page.evaluate(() => {
    const photo = document.querySelector("[data-s='s01'] .hero-media");
    const h1 = document.querySelector("[data-s='s01'] h1 .hero-h1-mobile");
    const header = document.querySelector(".site-header");
    if (!photo || !h1 || !header) return null;
    const p = photo.getBoundingClientRect();
    const h = h1.getBoundingClientRect();
    const lh = parseFloat(getComputedStyle(h1.closest("h1")).lineHeight);
    return {
      headerHome: header.classList.contains("is-home-top"),
      photoH: Math.round(p.height),
      gapPhotoH1: Math.round(h.top - p.bottom),
      h1FontSize: getComputedStyle(h1.closest("h1")).fontSize,
      h1LineHeight: getComputedStyle(h1.closest("h1")).lineHeight,
      approxH1Lines: Math.round((h.height / lh) * 10) / 10,
    };
  });
}

async function shot(page, name) {
  await writeFile(path.join(OUT, `${name}.png`), await page.screenshot({ type: "png" }));
}

async function main() {
  await mkdir(OUT, { recursive: true });
  pil(["resize", FIGMA_HERO_2X, FIGMA_HERO_1X]);

  const browser = await chromium.launch();
  const report = {};

  for (const { width, height, tag } of [
    { width: 390, height: 844, tag: "390" },
    { width: 375, height: 667, tag: "375" },
    { width: 430, height: 932, tag: "430" },
    { width: 768, height: 1024, tag: "768" },
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.addInitScript(() =>
      localStorage.setItem("fox-cookie", JSON.stringify({ necessary: true, analytics: false })),
    );
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await shot(page, `live-viewport-${tag}`);
    if (tag === "390" || tag === "375") {
      const heroLive = path.join(OUT, `live-hero-section-${tag}.png`);
      const heroLive390 = path.join(OUT, `live-hero-section-${tag}-390w.png`);
      await cropLiveHero(page, heroLive);
      pil(["fit390", heroLive, heroLive390]);
      pil(["stitch", FIGMA_HERO_1X, heroLive390, path.join(OUT, `compare-hero-section-${tag}.png`)]);
      const figmaViewport = path.join(OUT, `figma-viewport-${tag}.png`);
      pil(["resize", FIGMA_HERO_2X, figmaViewport]);
      const liveVp = path.join(OUT, `live-viewport-${tag}.png`);
      pil(["stitch", figmaViewport, liveVp, path.join(OUT, `compare-viewport-${tag}.png`)]);
    }
    report[tag] = await metrics(page);
    await page.close();
  }

  await browser.close();
  await writeFile(path.join(OUT, "metrics-v19d.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
