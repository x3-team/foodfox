import { chromium } from "../../../apps/site/node_modules/playwright/index.mjs";
import fs from "fs";
const base = process.argv[2], out = process.argv[3];
const widths = (process.argv[4] || "1440,390").split(",").map(Number);
const PAGES = (process.env.ONLY ? process.env.ONLY.split(",") : ["/", "/specialists", "/report", "/course", "/course/lessons", "/labs", "/blog", "/blog/pervye-priznaki-pishchevoy-neperenosimosti", "/blog/authors", "/blog/authors/kseniya-ellinskaya", "/faq", "/certificates", "/reviews", "/contacts", "/privacy", "/nope-404"]);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const res = {};
for (const w of widths) {
  const mobile = w < 768;
  const ctx = await b.newContext({ viewport: { width: w, height: mobile ? 844 : 900 }, isMobile: mobile, hasTouch: mobile });
  await ctx.addInitScript(() => localStorage.setItem("fox-cookie", JSON.stringify({ necessary: true, analytics: false, ads: false })));
  for (const p of PAGES) {
    const page = await ctx.newPage();
    await page.goto(base + p, { waitUntil: "networkidle" }).catch(() => {});
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo({ top: y, behavior: "instant" }); await new Promise(r => setTimeout(r, 60)); } window.scrollTo({ top: 0, behavior: "instant" }); });
    await page.waitForTimeout(600);
    res[`${w} ${p}`] = await page.evaluate((w) => {
      const G = w >= 1101 ? Math.max(48, (w - 1344) / 2) : w >= 768 ? 48 : 20; // expected content left (approx for tablet)
      const secs = [...document.querySelectorAll("main section, main > div > section, main [data-s]")].filter(s => !s.parentElement.closest("main [data-s]") || s.matches("[data-s]") && !s.parentElement.closest("[data-s]"));
      const rows = [];
      const sy = window.scrollY;
      for (const s of secs) {
        const sr = s.getBoundingClientRect(); if (sr.height < 40) continue;
        const cs = getComputedStyle(s);
        // first heading/text element
        const t = [...s.querySelectorAll("h1,h2,h3,p,a.btn,button.btn")].find(e => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== "hidden" && c.display !== "none" && e.textContent.trim(); });
        if (!t) continue;
        const tr = t.getBoundingClientRect();
        // text left edges in section: headings and paragraphs, min x
        const xs = [...s.querySelectorAll("h1,h2,h3,p")].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && e.textContent.trim() && getComputedStyle(e).position !== "absolute"; }).map(e => Math.round(e.getBoundingClientRect().left));
        const minx = xs.length ? Math.min(...xs) : null;
        const lastEl = [...s.querySelectorAll("*")].filter(e => { const r = e.getBoundingClientRect(); return r.height > 0 && r.width > 0 && getComputedStyle(e).position !== "fixed"; }).reduce((m, e) => Math.max(m, e.getBoundingClientRect().bottom), -1e9);
        rows.push({ s: s.dataset.s || s.className.split(" ").slice(0, 2).join("."), top: Math.round(tr.top - sr.top), bot: Math.round(sr.bottom - lastEl), minx, G, first: t.tagName + ":" + t.textContent.trim().slice(0, 20), h: Math.round(sr.height) });
      }
      return rows;
    }, w);
    await page.close();
  }
  await ctx.close();
}
await b.close();
fs.writeFileSync(out, JSON.stringify(res, null, 1));
for (const [k, v] of Object.entries(res)) { console.log("==", k); for (const r of v) console.log(`  ${String(r.s).padEnd(22)} top ${String(r.top).padStart(4)} bot ${String(r.bot).padStart(4)} x ${r.minx}${r.minx !== r.G ? " (≠" + r.G + ")" : ""}  ${r.first}`); }
