// Usage: node imgq.mjs <base> <out.json>  — for every <img> and CSS background on each page (1440 and 390, DPR 2),
// compares the intrinsic pixel size with the rendered size × DPR.
import { chromium } from "/workspace/foodfox-autologin/apps/site/node_modules/playwright/index.mjs";
import fs from "node:fs";
const [base, outFile] = process.argv.slice(2);
const PAGES = ["/", "/specialists", "/report", "/course", "/course/lessons", "/labs", "/blog", "/blog/skrytaya-neperenosimost-laktozy-i-glyutena", "/blog/authors", "/blog/authors/kseniya-ellinskaya", "/faq", "/certificates", "/reviews", "/contacts", "/privacy", "/no-such-page-404"];
const b = await chromium.launch(); const rows = [];
for (const [w, h, m] of [[1440, 900, false], [390, 844, true]]) {
  for (const path of PAGES) {
    const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: m, isMobile: m });
    await c.addInitScript(() => localStorage.setItem("fox-cookie", JSON.stringify({ necessary: true, analytics: false, ads: false })));
    const p = await c.newPage();
    await p.goto(base + path, { waitUntil: "networkidle" }).catch(() => {});
    const total = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < total; y += 600) { await p.evaluate((yy) => scrollTo(0, yy), y); await p.waitForTimeout(150); }
    await p.waitForLoadState("networkidle").catch(() => {});
    const found = await p.evaluate(async () => {
      const out = [];
      for (const img of document.querySelectorAll("img")) {
        const r = img.getBoundingClientRect();
        if (r.width < 40 || r.height < 40 || !img.naturalWidth) continue;
        const src = img.currentSrc || img.src;
        if (/\.svg(\?|$)/.test(src)) continue;
        // object-fit: cover needs the larger ratio
        const fit = getComputedStyle(img).objectFit;
        const need = fit === "cover" ? Math.max(r.width / img.naturalWidth, r.height / img.naturalHeight) : Math.min(r.width / img.naturalWidth, r.height / img.naturalHeight);
        out.push({ kind: "img", src, nat: `${img.naturalWidth}x${img.naturalHeight}`, shown: `${Math.round(r.width)}x${Math.round(r.height)}`, scale: +need.toFixed(2) });
      }
      const bgs = [];
      for (const el of document.querySelectorAll("body *")) {
        const bg = getComputedStyle(el).backgroundImage;
        const mm = bg && bg.match(/url\("?([^")]+\.(?:png|jpe?g|webp|avif))"?\)/);
        if (!mm) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 80 || r.height < 80) continue;
        bgs.push([mm[1], r.width, r.height, getComputedStyle(el).backgroundSize]);
      }
      for (const [src, rw, rh, size] of bgs) {
        const im = new Image(); im.src = src; try { await im.decode(); } catch { continue; }
        const need = size === "contain" ? Math.min(rw / im.naturalWidth, rh / im.naturalHeight) : Math.max(rw / im.naturalWidth, rh / im.naturalHeight);
        out.push({ kind: "bg", src: im.src, nat: `${im.naturalWidth}x${im.naturalHeight}`, shown: `${Math.round(rw)}x${Math.round(rh)}`, scale: +need.toFixed(2), size });
      }
      return out;
    });
    for (const f of found) rows.push({ page: path, w, ...f, x2: +(f.scale * 2).toFixed(2) });
    await c.close();
  }
}
fs.writeFileSync(outFile, JSON.stringify(rows, null, 1));
await b.close(); console.log(rows.length);
