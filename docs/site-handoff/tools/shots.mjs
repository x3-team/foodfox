// Usage: node shots.mjs <base> <outdir> <width>[,<width>...]
import { chromium } from "/workspace/foodfox-autologin/apps/site/node_modules/playwright/index.mjs";
import fs from "node:fs";
const [base, dir, widths] = process.argv.slice(2);
const PAGES = { home: "/", specialists: "/specialists", report: "/report", course: "/course", "course-lessons": "/course/lessons", labs: "/labs", blog: "/blog", "blog-article": "/blog/skrytaya-neperenosimost-laktozy-i-glyutena", "blog-authors": "/blog/authors", "blog-author": "/blog/authors/kseniya-ellinskaya", faq: "/faq", certificates: "/certificates", reviews: "/reviews", contacts: "/contacts", privacy: "/privacy", "404": "/no-such-page-404" };
const H = { 1440: 900, 1280: 800, 1024: 768, 768: 1024, 390: 844, 360: 780 };
const b = await chromium.launch();
const log = [];
for (const w of widths.split(",").map(Number)) {
  const m = w < 700;
  for (const [name, path] of Object.entries(PAGES)) {
    const c = await b.newContext({ viewport: { width: w, height: H[w] }, deviceScaleFactor: 1, hasTouch: m, isMobile: m });
    await c.addInitScript(() => localStorage.setItem("fox-cookie", JSON.stringify({ necessary: true, analytics: false, ads: false })));
    const p = await c.newPage();
    try {
      const res = await p.goto(base + path, { waitUntil: "networkidle", timeout: 60000 });
      await p.waitForTimeout(1500);
      fs.mkdirSync(`${dir}/${name}`, { recursive: true });
      if (!process.env.FULL_ONLY) await p.screenshot({ path: `${dir}/${name}/${w}-top.png` });
      // walk down so scroll-reveals and lazy images fire, then back to top
      const total = await p.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < total; y += Math.round(H[w] * 0.6)) { await p.evaluate((yy) => window.scrollTo(0, yy), y); await p.waitForTimeout(250); }
      await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(800);
      await p.waitForLoadState("networkidle").catch(() => {});
      await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(700);
      const info = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h: document.documentElement.scrollHeight }));
      // animations: "disabled" — Playwright resizes the viewport for a full-page shot, which restarts scroll-reveal
      // animations; without it sections are captured half-transparent.
      await p.screenshot({ path: `${dir}/${name}/${w}-full.png`, fullPage: true, animations: "disabled" });
      log.push({ name, w, status: res?.status(), ...info });
    } catch (e) { log.push({ name, w, error: String(e).slice(0, 200) }); }
    await c.close();
  }
}
fs.writeFileSync(`${dir}/_log-${widths.replace(/,/g, "_")}.json`, JSON.stringify(log, null, 1));
await b.close();
console.log("done", widths);
